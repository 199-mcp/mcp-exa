import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { getExaClient } from "../utils/axiosClient.js";

export function registerCompetitorFinderTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "competitor_search",
    "Finds business competitors. Returns: similar companies, market analysis. Use when: asked 'who competes with X' or competitive analysis.",
    {
      companyName: z.string().describe("Company to analyze (e.g., 'Uber', 'Netflix')"),
      industry: z.string().optional().describe("Industry sector (e.g., 'ride-sharing', 'streaming entertainment')"),
      numResults: z.number().optional().describe("Number of competitors to find (1-20, default: 5)")
    },
    async ({ companyName, industry, numResults }) => {
      const requestId = `competitor_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'competitor_search');
      
      logger.start(`${companyName} ${industry ? `in ${industry}` : ''}`);
      
      try {
        // Use shared axios client with keep-alive
        const axiosInstance = getExaClient(config);

        const searchQuery = industry 
          ? `${companyName} competitors similar companies ${industry} industry competitive landscape`
          : `${companyName} competitors similar companies competitive landscape market`;

        const searchRequest: ExaSearchRequest = {
          query: searchQuery,
          type: "neural",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            livecrawl: 'fallback'
          },
          includeDomains: ["crunchbase.com", "bloomberg.com", "techcrunch.com", "forbes.com", "businessinsider.com", "reuters.com", "linkedin.com"]
        };
        
        logger.log("Sending request to Exa API for competitor analysis");
        
        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest
        );
        
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.results) {
          logger.log("Warning: Empty or invalid response from Exa API");
          return {
            content: [{
              type: "text" as const,
              text: "No competitor information found. Please try a different company name or industry."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} competitor analysis results`);
        
        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };
        
        logger.complete();
        return result;
      } catch (error) {
        logger.error(error);
        
        if (axios.isAxiosError(error)) {
          // Handle Axios errors specifically
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;
          
          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Competitor finder error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Competitor finder error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 