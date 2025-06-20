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
  
  const schema = Object.entries(registeredTools).map(([name, tool]: [string, any]) => {
    // Extract the shape from Zod schema to get parameter info
    const shape = tool.inputSchema?.shape || {};
    const properties: any = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(shape)) {
      const zodSchema = value as any;
      properties[key] = {
        type: zodSchema._def?.typeName?.replace('Zod', '').toLowerCase() || 'string',
        description: zodSchema._def?.description || '',
        enum: zodSchema._def?.values || undefined
      };
      
      if (!zodSchema.isOptional()) {
        required.push(key);
      }
    }
    
    return {
      name,
      description: tool.description,
      inputSchema: {
        properties,
        required
      }
    };
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ tools: schema });
}