import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

export function registerCompanyResearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "company_search",
    "Searches company information and news. Returns: business data, financials, recent news. Use when: researching businesses or organizations.",
    {
      companyName: z.string().describe("Company name (e.g., 'OpenAI', 'Tesla Inc', 'Microsoft Corporation')"),
      numResults: z.number().optional().describe("Number of results to return (1-20, default: 5)")
    },
    async ({ companyName, numResults }) => {
      const requestId = `company_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'company_search');
      
      logger.start(companyName);
      
      try {
        // Create a fresh axios instance for each request
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || ''
          },
          timeout: 25000
        });

        const searchRequest: ExaSearchRequest = {
          query: `${companyName} company business corporation information news financial`,
          type: "neural",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            livecrawl: 'preferred'
          },
          includeDomains: ["bloomberg.com", "reuters.com", "crunchbase.com", "sec.gov", "linkedin.com", "forbes.com", "businesswire.com", "prnewswire.com"]
        };
        
        logger.log("Sending request to Exa API for company research");
        
        const response = await axiosInstance.post<ExaSearchResponse>(
          API_CONFIG.ENDPOINTS.SEARCH,
          searchRequest,
          { timeout: 25000 }
        );
        
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.results) {
          logger.log("Warning: Empty or invalid response from Exa API");
          return {
            content: [{
              type: "text" as const,
              text: "No company information found. Please try a different company name."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} company research results`);
        
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
              text: `Company research error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Company research error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 