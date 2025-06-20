import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import buildExaServer from '../src/index.js';

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

export default async function handler(req: any, res: any) {
  // Handle SSE connection (GET request)
  if (req.method === 'GET') {
    try {
      // Extract API key from query parameter
      const exaApiKey = req.query.exaApiKey || req.query.apiKey;
      
      if (!exaApiKey) {
        res.status(400).send('Missing exaApiKey parameter. Please provide your Exa API key in the URL.');
        return;
      }
      
      // Create a new SSE transport for the client
      const transport = new SSEServerTransport('/api/mcp', res);
      
      // Store the transport by session ID
      const sessionId = (transport as any)._sessionId;
      transports[sessionId] = transport;
      
      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        delete transports[sessionId];
      };
      
      // Connect the transport to the MCP server
      const mcpServer = buildExaServer({
        config: {
          exaApiKey: exaApiKey as string,
          enabledTools: req.query.tools?.split(',').filter(Boolean) || process.env.MCP_TOOLS?.split(',').filter(Boolean),
          debug: req.query.debug === 'true' || process.env.DEBUG === 'true'
        }
      });
      
      await mcpServer.connect(transport);
    } catch (error) {
      console.error('Error establishing SSE stream:', error);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  }
  // Handle POST messages
  else if (req.method === 'POST') {
    // Extract session ID from URL query parameter
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId) {
      res.status(400).send('Missing sessionId parameter');
      return;
    }
    
    const transport = transports[sessionId];
    if (!transport) {
      res.status(404).send('Session not found');
      return;
    }
    
    try {
      // Handle the POST message with the transport
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error('Error handling request:', error);
      if (!res.headersSent) {
        res.status(500).send('Error handling request');
      }
    }
  } else {
    res.status(405).send('Method not allowed');
  }
}