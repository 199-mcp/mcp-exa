/**
 * Web Search Tool (v2 - Optimized)
 *
 * Token-aware web search with:
 * - Concise tool descriptions (80% reduction)
 * - Progressive disclosure pattern
 * - Optimized parameter schemas
 * - Simplified response formatting
 */

import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest, ExaSearchResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { getExaClient } from "../utils/axiosClient.js";
import { formatSearchResponse, formatSearchResponseJSON, formatSingleResult, formatErrorResponse, ContentLevel, OutputFormat } from "../utils/responseFormatter.js";
import { resultCache } from "../utils/resultCache.js";
import { calculateMaxCharacters } from "../utils/tokenEstimator.js";

export function registerWebSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  // Main search tool with token-aware responses
  server.tool(
    "web_search",
    "Real-time web search with configurable detail levels. Returns results with token estimates and cache ID for progressive retrieval.",
    {
      query: z.string().describe(
        "Search query text"
      ),
      num_results: z.number().min(1).max(20).optional().describe(
        "Number of results to return (default: 3 for standard/full, 5 for summary)"
      ),
      content_level: z.enum(['summary', 'standard', 'full']).optional().describe(
        "Detail level: summary (~150 tok/result), standard (~500 tok/result), full (~1500 tok/result). Default: summary"
      ),
      output_format: z.enum(['markdown', 'json']).optional().describe(
        "Response format: markdown (human-readable, default) or json (code-friendly for filtering/transformation)"
      ),
      live_crawl: z.enum(['always', 'auto', 'fallback', 'never']).optional().describe(
        "Content freshness: always=live, auto=balanced, fallback=cached, never=cache-only. Default: auto"
      ),
      max_chars_per_result: z.number().min(500).max(5000).optional().describe(
        "Override smart character limit per result (500-5000)"
      )
    },
    async ({ query, num_results, content_level, output_format, live_crawl, max_chars_per_result }) => {
      const requestId = `web_search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'web_search');

      logger.start(query);

      try {
        // Smart defaults based on content level
        const actualContentLevel: ContentLevel = content_level || 'summary';
        const defaultNumResults = actualContentLevel === 'summary' ? 5 : 3;
        const numResults = num_results || defaultNumResults;

        // Calculate smart max_characters based on token budget
        const maxChars = max_chars_per_result || calculateMaxCharacters(numResults, 20000);

        logger.log(`Content level: ${actualContentLevel}, Results: ${numResults}, MaxChars: ${maxChars}`);

        // Use shared axios client with keep-alive
        const axiosInstance = getExaClient(config);

        const searchRequest: ExaSearchRequest = {
          query,
          type: "auto",
          numResults,
          contents: {
            text: {
              maxCharacters: maxChars
            },
            livecrawl: live_crawl || 'auto'
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

        // Format response based on output format
        const actualOutputFormat: OutputFormat = output_format || 'markdown';

        if (actualOutputFormat === 'json') {
          // JSON format for code execution environments
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
          // Markdown format (default) for human-readable output
          const formatted = formatSearchResponse(
            response.data,
            query,
            actualContentLevel,
            25000 // Safe limit to prevent 32K overflow
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

        const errorText = formatErrorResponse(error as Error, query);

        return {
          content: [{
            type: "text" as const,
            text: errorText
          }],
          isError: true,
        };
      }
    }
  );

  // Tool to retrieve specific result from cache (progressive disclosure)
  server.tool(
    "retrieve_result",
    "Retrieve individual result from cached search by index. Use after web_search for progressive disclosure.",
    {
      cache_id: z.string().describe(
        "Cache identifier from previous web_search response (valid 5 minutes)"
      ),
      result_index: z.number().min(0).describe(
        "Zero-based index of result to retrieve (shown in search results)"
      )
    },
    async ({ cache_id, result_index }) => {
      const requestId = `retrieve_result-${Date.now()}`;
      const logger = createRequestLogger(requestId, 'retrieve_result');

      logger.start(`Cache: ${cache_id}, Index: ${result_index}`);

      try {
        // Security: Validate cache_id format to prevent path traversal
        const CACHE_ID_REGEX = /^exa-\d+-[a-z0-9]+$/;
        if (!CACHE_ID_REGEX.test(cache_id)) {
          logger.log(`Invalid cache_id format: ${cache_id}`);
          return {
            content: [{
              type: "text" as const,
              text: `Invalid cache ID format. Expected format: exa-{timestamp}-{random}\n\nExample: exa-1699564234-abc123`
            }],
            isError: true
          };
        }

        const cached = resultCache.getCachedResults(cache_id);

        if (!cached) {
          return {
            content: [{
              type: "text" as const,
              text: `Cache not found or expired: ${cache_id}\n\nCaches expire after 5 minutes. Please run web_search again.`
            }],
            isError: true
          };
        }

        const result = resultCache.getResultByIndex(cache_id, result_index);

        if (!result) {
          return {
            content: [{
              type: "text" as const,
              text: `Invalid result index: ${result_index}\n\nValid range: 0-${cached.totalResults - 1}`
            }],
            isError: true
          };
        }

        const formatted = formatSingleResult(result, result_index, cache_id, cached.totalResults);

        logger.complete();
        return {
          content: [{
            type: "text" as const,
            text: formatted
          }]
        };

      } catch (error) {
        logger.error(error);

        return {
          content: [{
            type: "text" as const,
            text: formatErrorResponse(error as Error)
          }],
          isError: true
        };
      }
    }
  );
}
