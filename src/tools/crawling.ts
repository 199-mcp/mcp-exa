import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";
import { getExaClient } from "../utils/axiosClient.js";
import { ExaCrawlRequest } from "../types.js";

export function registerCrawlingTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "url_content",
    "Extracts full content from specific URLs. Returns: complete page text, metadata. Use when: have exact URL to analyze.",
    {
      url: z.string().describe("URL to extract content from (e.g., 'https://example.com/article')"),
      maxCharacters: z.number().optional().describe("Maximum characters to extract (1000-10000, default: 3000)"),
      liveCrawl: z.enum(['always', 'auto', 'fallback', 'never']).optional().describe("Content fetching: 'always' = fresh content, 'auto' = balance speed/freshness, 'fallback' = cache first, 'never' = cache only (default: auto)")
    },
    async ({ url, maxCharacters, liveCrawl }) => {
      const requestId = `url_content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'url_content');
      
      logger.start(url);
      
      try {
        // Use shared axios client with keep-alive
        const axiosInstance = getExaClient(config);

        const crawlRequest: ExaCrawlRequest = {
          urls: [url],
          text: {
            maxCharacters: maxCharacters || API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: liveCrawl || 'auto'
        };
        
        logger.log("Sending crawl request to Exa API");
        
        const response = await axiosInstance.post(
          API_CONFIG.ENDPOINTS.CONTENTS,
          crawlRequest
        );
        
        logger.log("Received response from Exa API");

        if (!response.data || !response.data.contents) {
          logger.log("Warning: Empty or invalid response from Exa API");
          return {
            content: [{
              type: "text" as const,
              text: "No content found for the provided URL."
            }]
          };
        }

        logger.log(`Successfully crawled content from URL`);
        
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
              text: `Crawling error (${statusCode}): ${errorMessage}`
            }],
            isError: true,
          };
        }
        
        // Handle generic errors
        return {
          content: [{
            type: "text" as const,
            text: `Crawling error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true,
        };
      }
    }
  );
} 