import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { getExaClient } from "../utils/axiosClient.js";
import { formatSearchResponse, formatSearchResponseJSON, formatErrorResponse, ContentLevel, OutputFormat } from "../utils/responseFormatter.js";

export function registerWikipediaSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "wikipedia_search",
    "Searches Wikipedia encyclopedia. Returns: article summaries, factual content. Use when: need encyclopedic or reference information.",
    {
      query: z.string().describe("Search query (e.g., 'quantum mechanics', 'World War II', 'Python programming')"),
      numResults: z.number().optional().describe("Number of articles to return (1-20, default: 5)"),
      content_level: z.enum(['summary', 'standard', 'full']).optional().describe(
        "Detail level: summary (~150 tok/result), standard (~500 tok/result), full (~1500 tok/result). Default: standard"
      ),
      output_format: z.enum(['markdown', 'json']).optional().describe(
        "Response format: markdown (human-readable, default) or json (code-friendly for filtering/transformation)"
      )
    },
    async ({ query, numResults, content_level, output_format }) => {
      const requestId = `wikipedia_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'wikipedia_search');
      
      logger.start(query);
      
      try {
        // Use shared axios client with keep-alive
        const axiosInstance = getExaClient(config);

        const searchRequest: ExaSearchRequest = {
          query: `${query} Wikipedia`,
          type: "neural",
          numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
          contents: {
            text: {
              maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
            },
            livecrawl: 'fallback'
          },
          includeDomains: ["wikipedia.org"]
        };
        
        logger.log("Sending request to Exa API for Wikipedia search");
        
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
              text: "No Wikipedia articles found. Please try a different query."
            }]
          };
        }

        logger.log(`Found ${response.data.results.length} Wikipedia articles`);

        // Format response based on output format
        const actualContentLevel: ContentLevel = content_level || 'standard';
        const actualOutputFormat: OutputFormat = output_format || 'markdown';

        if (actualOutputFormat === 'json') {
          const jsonResponse = formatSearchResponseJSON(
            response.data,
            query,
            actualContentLevel
          );

          logger.log(`Formatted JSON response: ~${jsonResponse.metadata.tokenEstimate} tokens`);

          const result = {
            content: [{
              type: "text" as const,
              text: JSON.stringify(jsonResponse, null, 2)
            }]
          };

          logger.complete();
          return result;
        } else {
          const formatted = formatSearchResponse(
            response.data,
            query,
            actualContentLevel,
            25000
          );

          logger.log(`Formatted response: ~${formatted.metadata.totalTokens} tokens`);

          const result = {
            content: [{
              type: "text" as const,
              text: formatted.text
            }]
          };

          logger.complete();
          return result;
        }
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
              text: `Wikipedia search error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Wikipedia search error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 