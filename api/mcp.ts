import buildExaServer from '../src/index.js';

// Build the MCP server once on cold-start. Vercel will reuse the same instance
// across invocations when possible.
const handler = buildExaServer({
  config: {
    exaApiKey: process.env.EXA_API_KEY,
    enabledTools: process.env.MCP_TOOLS?.split(',').filter(Boolean),
    debug: process.env.DEBUG === 'true'
  }
});

export default handler;
