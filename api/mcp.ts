import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import buildExaServer from '../src/index.js';

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`[${requestId}] ${req.method} /api/mcp`, {
    query: req.query,
    headers: {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent']
    },
    timestamp: new Date().toISOString()
  });
  
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }
  
  // Handle SSE connection (GET request)
  if (req.method === 'GET') {
    try {
      // Extract API key from query parameter
      const exaApiKey = req.query.exaApiKey || req.query.apiKey;
      
      if (!exaApiKey) {
        console.error(`[${requestId}] Missing API key`);
        res.status(400).send('Missing exaApiKey parameter. Please provide your Exa API key in the URL.');
        return;
      }
      
      console.log(`[${requestId}] API key provided, establishing SSE connection`);
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Set SSE headers to prevent proxy buffering
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      // Create a new SSE transport for the client
      const transport = new SSEServerTransport('/api/mcp', res);
      
      // Store the transport by session ID
      const sessionId = (transport as any)._sessionId;
      transports[sessionId] = transport;
      
      // Set up SSE heartbeat to prevent proxy timeouts
      const heartbeatInterval = setInterval(() => {
        try {
          // Send SSE comment as keep-alive
          res.write(':keep-alive\n\n');
          // Force flush past proxy buffers
          res.flush?.();
        } catch (error) {
          // Connection closed, clean up
          clearInterval(heartbeatInterval);
        }
      }, 20000); // Send heartbeat every 20 seconds
      
      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        clearInterval(heartbeatInterval);
        delete transports[sessionId];
      };
      
      // Connect the transport to the MCP server
      const enabledTools = req.query.tools?.split(',').filter(Boolean) || process.env.MCP_TOOLS?.split(',').filter(Boolean);
      console.log(`[${requestId}] Building MCP server with tools:`, enabledTools || 'default');
      
      const mcpServer = buildExaServer({
        config: {
          exaApiKey: exaApiKey as string,
          enabledTools,
          debug: req.query.debug === 'true' || process.env.DEBUG === 'true'
        }
      });
      
      console.log(`[${requestId}] Connecting transport...`);
      await mcpServer.connect(transport);
      console.log(`[${requestId}] SSE connection established successfully`);
    } catch (error) {
      console.error(`[${requestId}] Error establishing SSE stream:`, error);
      console.error(`[${requestId}] Stack trace:`, (error as Error).stack);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  }
  // Handle POST messages
  else if (req.method === 'POST') {
    // Set CORS headers for POST requests too
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    console.log(`[${requestId}] POST request received:`, {
      sessionId: req.query.sessionId,
      body: req.body
    });
    
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
      console.log(`[${requestId}] Processing message for session ${sessionId}`);
      await transport.handlePostMessage(req, res, req.body);
      console.log(`[${requestId}] Message processed successfully`);
    } catch (error) {
      console.error(`[${requestId}] Error handling request:`, error);
      console.error(`[${requestId}] Stack trace:`, (error as Error).stack);
      if (!res.headersSent) {
        res.status(500).send('Error handling request');
      }
    }
  } else {
    console.log(`[${requestId}] Method not allowed: ${req.method}`);
    res.status(405).send('Method not allowed');
  }
  
  const duration = Date.now() - startTime;
  console.log(`[${requestId}] Request completed in ${duration}ms`);
}