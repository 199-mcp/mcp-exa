import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { getExaClient } from "../utils/axiosClient.js";

export function registerLinkedInSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "linkedin_search",
    "Searches LinkedIn profiles and companies. Returns: professional profiles, company pages. Use when: researching people or professional networks.",
    {
      query: z.string().describe("Search query (e.g., 'John Doe software engineer', 'Apple Inc')"),
      searchType: z.enum(["profiles", "companies", "all"]).optional().describe("Filter: 'profiles' for people, 'companies' for orgs, 'all' for both (default: all)"),
      numResults: z.number().optional().describe("Number of results to return (1-20, default: 5)")
    },
    async ({ query, searchType, numResults }) => {
      const requestId = `linkedin_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'linkedin_search');
      
      logger.start(`${query} (${searchType || 'all'})`);
      
      try {
        // Use shared axios client with keep-alive
        const axiosInstance = getExaClient(config);

        let searchQuery = query;
        if (searchType === "profiles") {
          searchQuery = `${query} LinkedIn profile`;
        } else if (searchType === "companies") {
          searchQuery = `${query} LinkedIn company`;
        } else {
          searchQuery = `${query} LinkedIn`;
        }

        const searchRequest: ExaSearchRequest = {
          query: searchQuery,
          type: "neural",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            livecrawl: 'preferred'
          },
          includeDomains: ["linkedin.com"]
        };
        
        logger.log("Sending request to Exa API for LinkedIn search");
        
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
              text: "No LinkedIn content found. Please try a different query."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} LinkedIn results`);
        
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
              text: `LinkedIn search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `LinkedIn search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 