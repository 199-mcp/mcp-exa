#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import tool implementations
import { registerWebSearchTool } from "./tools/webSearch.js";
import { registerResearchPaperSearchTool } from "./tools/researchPaperSearch.js";
import { registerCompanyResearchTool } from "./tools/companyResearch.js";
import { registerCrawlingTool } from "./tools/crawling.js";
import { registerCompetitorFinderTool } from "./tools/competitorFinder.js";
import { registerLinkedInSearchTool } from "./tools/linkedInSearch.js";
import { registerWikipediaSearchTool } from "./tools/wikipediaSearch.js";
import { registerGithubSearchTool } from "./tools/githubSearch.js";
import { log } from "./utils/logger.js";

// Configuration schema for the EXA API key and tool selection
export const configSchema = z.object({
  exaApiKey: z.string().optional().describe("Exa AI API key for search operations"),
  enabledTools: z.array(z.string()).optional().describe("List of tools to enable (if not specified, all tools are enabled)"),
  debug: z.boolean().default(false).describe("Enable debug logging")
});

// Tool registry for managing available tools
const availableTools = {
  'web_search': { name: 'Web Search', description: 'Real-time web search', enabled: true },
  'academic_search': { name: 'Academic Search', description: 'Search academic papers and research', enabled: true },
  'company_search': { name: 'Company Search', description: 'Research companies and organizations', enabled: true },
  'url_content': { name: 'URL Content', description: 'Extract content from specific URLs', enabled: true },
  'competitor_search': { name: 'Competitor Search', description: 'Find business competitors', enabled: true },
  'linkedin_search': { name: 'LinkedIn Search', description: 'Search LinkedIn profiles and companies', enabled: true },
  'wikipedia_search': { name: 'Wikipedia Search', description: 'Search Wikipedia articles', enabled: true },
  'github_search': { name: 'GitHub Search', description: 'Search GitHub repositories and code', enabled: true }
};

/**
 * Exa AI Web Search MCP Server
 * 
 * This MCP server integrates Exa AI's search capabilities with Claude and other MCP-compatible clients.
 * Exa is a search engine and API specifically designed for up-to-date web searching and retrieval,
 * offering more recent and comprehensive results than what might be available in an LLM's training data.
 * 
 * The server provides tools that enable:
 * - Real-time web searching with configurable parameters
 * - Research paper searches
 * - Company research and analysis
 * - Competitive intelligence
 * - And more!
 */

export default function ({ config }: { config?: z.infer<typeof configSchema> } = {}) {
  try {
    // Default config if not provided
    const actualConfig = config || {
      exaApiKey: process.env.EXA_API_KEY,
      enabledTools: undefined, // This will enable all tools
      debug: false
    };
    
    // Set the API key in environment for tool functions to use
    // process.env.EXA_API_KEY = actualConfig.exaApiKey;
    
    if (actualConfig.debug) {
      log("Starting Exa MCP Server in debug mode");
    }

    // Create MCP server
    const server = new McpServer({
      name: "exa-search-server",
      version: "1.0.0"
    });
    
    log("Server initialized with modern MCP SDK and Smithery CLI support");

    // Helper function to check if a tool should be registered
    const shouldRegisterTool = (toolId: string): boolean => {
      if (actualConfig.enabledTools && actualConfig.enabledTools.length > 0) {
        return actualConfig.enabledTools.includes(toolId);
      }
      return availableTools[toolId as keyof typeof availableTools]?.enabled ?? false;
    };

    // Register tools based on configuration
    const registeredTools: string[] = [];
    
    if (shouldRegisterTool('web_search')) {
      registerWebSearchTool(server, actualConfig);
      registeredTools.push('web_search');
    }
    
    if (shouldRegisterTool('academic_search')) {
      registerResearchPaperSearchTool(server, actualConfig);
      registeredTools.push('academic_search');
    }
    
    if (shouldRegisterTool('company_search')) {
      registerCompanyResearchTool(server, actualConfig);
      registeredTools.push('company_search');
    }
    
    if (shouldRegisterTool('url_content')) {
      registerCrawlingTool(server, actualConfig);
      registeredTools.push('url_content');
    }
    
    if (shouldRegisterTool('competitor_search')) {
      registerCompetitorFinderTool(server, actualConfig);
      registeredTools.push('competitor_search');
    }
    
    if (shouldRegisterTool('linkedin_search')) {
      registerLinkedInSearchTool(server, actualConfig);
      registeredTools.push('linkedin_search');
    }
    
    if (shouldRegisterTool('wikipedia_search')) {
      registerWikipediaSearchTool(server, actualConfig);
      registeredTools.push('wikipedia_search');
    }
    
    if (shouldRegisterTool('github_search')) {
      registerGithubSearchTool(server, actualConfig);
      registeredTools.push('github_search');
    }
    
    if (actualConfig.debug) {
      log(`Registered ${registeredTools.length} tools: ${registeredTools.join(', ')}`);
    }
    
    // Return the server object (Smithery CLI handles transport)
    return server.server;
    
  } catch (error) {
    log(`Server initialization error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}