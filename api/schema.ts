import buildExaServer from '../src/index.js';

export default function handler(req: any, res: any) {
  // Build the server to get tool definitions
  const mcpServer = buildExaServer({
    config: {
      exaApiKey: 'dummy', // Just for initialization
      enabledTools: undefined, // Get all tools
      debug: false
    }
  });

  // Extract tool information from the server
  const tools = (mcpServer as any)._tools || {};
  
  const schema = Object.entries(tools).map(([name, tool]: [string, any]) => ({
    name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ tools: schema });
}