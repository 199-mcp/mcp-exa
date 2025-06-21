import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { getExaClient } from "../utils/axiosClient.js";

export function registerWebSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "web_search",
    "Searches the web in real-time. Returns: page content, titles, URLs. Use when: need current information beyond training data.",
    {
      query: z.string().describe("Search query (e.g., 'OpenAI GPT-5 release', 'climate change 2024')"),
      numResults: z.number().optional().describe("Number of results to return (1-20, default: 5)"),
      liveCrawl: z.enum(['always', 'preferred', 'fallback']).optional().describe("Content fetching: 'always' = fresh content, 'preferred' = balance speed/freshness, 'fallback' = cache first (default: preferred)")
    },
    async ({ query, numResults, liveCrawl }) => {
      const requestId = `web_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'web_search');
      
      logger.start(query);
      
      try {
        // Use shared axios client with keep-alive
        const axiosInstance = getExaClient(config);

        const searchRequest: ExaSearchRequest = {
          query,
          type: "auto",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            livecrawl: liveCrawl || 'fallback'
          }
        };
        
        logger.log("Sending request to Exa API");
        
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
              text: "No search results found. Please try a different query."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} results`);
        
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
              text: `Search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 