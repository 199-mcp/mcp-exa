import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import all tool registration functions
import { registerWebSearchTool } from '../src/tools/webSearch.js';
import { registerResearchPaperSearchTool } from '../src/tools/researchPaperSearch.js';
import { registerCompanyResearchTool } from '../src/tools/companyResearch.js';
import { registerCrawlingTool } from '../src/tools/crawling.js';
import { registerCompetitorFinderTool } from '../src/tools/competitorFinder.js';
import { registerLinkedInSearchTool } from '../src/tools/linkedInSearch.js';
import { registerWikipediaSearchTool } from '../src/tools/wikipediaSearch.js';
import { registerGithubSearchTool } from '../src/tools/githubSearch.js';

export default function handler(req: any, res: any) {
  // Create a temporary MCP server just to extract tool schemas
  const server = new McpServer({
    name: "exa-search-server",
    version: "1.0.0"
  });

  // Register all tools
  const config = { exaApiKey: 'dummy' };
  registerWebSearchTool(server, config);
  registerResearchPaperSearchTool(server, config);
  registerCompanyResearchTool(server, config);
  registerCrawlingTool(server, config);
  registerCompetitorFinderTool(server, config);
  registerLinkedInSearchTool(server, config);
  registerWikipediaSearchTool(server, config);
  registerGithubSearchTool(server, config);

  // Extract tool information from the server
  const registeredTools = (server as any)._registeredTools || {};
  
  const schema = Object.entries(registeredTools).map(([name, tool]: [string, any]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema?._def || tool.inputSchema
  }));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ tools: schema });
}