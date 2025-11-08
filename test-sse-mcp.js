#!/usr/bin/env node

import https from 'https';
import { URL } from 'url';

const EXA_API_KEY = '2d8d1aab-4fad-4861-9563-40e53092f0a2';
const baseUrl = 'https://exa.atp.dev/api/mcp';

// Enable all tools
const tools = 'web_search,linkedin_search,academic_search,company_search,url_content,competitor_search,wikipedia_search,github_search';
const fullUrl = `${baseUrl}?exaApiKey=${EXA_API_KEY}&tools=${tools}`;

console.log('Testing MCP server with SSE at:', baseUrl);
console.log('Enabled tools:', tools.split(',').join(', '));
console.log('\nEstablishing SSE connection...\n');

// Store SSE responses
let sessionId = null;
const sseResponses = [];

// Create SSE connection
const url = new URL(fullUrl);
const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
};

const req = https.request(options, (res) => {
  console.log('Response status:', res.statusCode);
  
  if (res.statusCode !== 200) {
    console.error('Failed to connect:', res.statusCode);
    res.on('data', chunk => console.error(chunk.toString()));
    return;
  }
  
  res.on('data', (chunk) => {
    const data = chunk.toString();
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('event:')) {
        console.log('SSE Event:', line);
      } else if (line.startsWith('data:')) {
        console.log('SSE Data:', line);
        
        // Parse session ID from endpoint event
        if (line.includes('sessionId=')) {
          const match = line.match(/sessionId=([^&\s]+)/);
          if (match) {
            sessionId = match[1];
            console.log('\nSession ID extracted:', sessionId);
            
            // Send initialize request after getting session ID
            setTimeout(() => {
              sendInitializeRequest(sessionId);
            }, 500);
          }
        }
        
        // Store other SSE data
        try {
          const jsonData = JSON.parse(line.substring(5));
          sseResponses.push(jsonData);
          console.log('Parsed SSE response:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          // Not JSON data
        }
      }
    }
  });
  
  res.on('error', (err) => {
    console.error('SSE error:', err);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.end();

function sendInitializeRequest(sessionId) {
  console.log('\n--- Sending initialize request ---');
  
  const initPayload = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: 'init-1'
  };
  
  sendRequest(sessionId, initPayload, () => {
    // After initialization, list available tools
    setTimeout(() => {
      sendListToolsRequest(sessionId);
    }, 1000);
  });
}

function sendListToolsRequest(sessionId) {
  console.log('\n--- Listing available tools ---');
  
  const listPayload = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 'list-1'
  };
  
  sendRequest(sessionId, listPayload, () => {
    // After listing tools, test web search
    setTimeout(() => {
      sendWebSearchRequest(sessionId);
    }, 1000);
  });
}

function sendWebSearchRequest(sessionId) {
  console.log('\n--- Testing web search ---');
  
  const searchPayload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'web_search',
      arguments: {
        query: 'latest AI news 2025',
        numResults: 2,
        liveCrawl: 'auto'
      }
    },
    id: 'search-1'
  };
  
  sendRequest(sessionId, searchPayload, () => {
    // After web search, test LinkedIn search
    setTimeout(() => {
      sendLinkedInSearchRequest(sessionId);
    }, 2000);
  });
}

function sendLinkedInSearchRequest(sessionId) {
  console.log('\n--- Testing LinkedIn search ---');
  
  const linkedinPayload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'linkedin_search',
      arguments: {
        query: 'AI engineer San Francisco',
        numResults: 2
      }
    },
    id: 'linkedin-1'
  };
  
  sendRequest(sessionId, linkedinPayload, () => {
    console.log('\n✅ Test completed!');
    setTimeout(() => {
      console.log('\nAll SSE responses received:', sseResponses.length);
      process.exit(0);
    }, 2000);
  });
}

function sendRequest(sessionId, payload, callback) {
  const postUrl = new URL(`${baseUrl}?sessionId=${sessionId}`);
  const postData = JSON.stringify(payload);
  
  console.log('Sending:', JSON.stringify(payload, null, 2));
  
  const postOptions = {
    hostname: postUrl.hostname,
    path: postUrl.pathname + postUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };
  
  const postReq = https.request(postOptions, (res) => {
    console.log('Response status:', res.statusCode);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk.toString();
    });
    
    res.on('end', () => {
      console.log('Response body:', responseData);
      if (callback) callback();
    });
  });
  
  postReq.on('error', (err) => {
    console.error('POST request error:', err);
  });
  
  postReq.write(postData);
  postReq.end();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest interrupted');
  process.exit(0);
});