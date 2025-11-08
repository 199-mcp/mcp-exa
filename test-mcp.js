#!/usr/bin/env node

import https from 'https';
import { URL } from 'url';

// Replace with your actual Exa API key
const EXA_API_KEY = process.env.EXA_API_KEY || 'YOUR_API_KEY_HERE';

if (EXA_API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('Please set EXA_API_KEY environment variable');
  process.exit(1);
}

const baseUrl = 'https://exa.atp.dev/api/mcp';
const fullUrl = `${baseUrl}?exaApiKey=${EXA_API_KEY}`;

console.log('Testing MCP server at:', baseUrl);
console.log('Establishing SSE connection...\n');

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
  console.log('Response headers:', res.headers);
  
  if (res.statusCode !== 200) {
    console.error('Failed to connect:', res.statusCode);
    res.on('data', chunk => console.error(chunk.toString()));
    return;
  }
  
  let sessionId = null;
  
  res.on('data', (chunk) => {
    const data = chunk.toString();
    console.log('Received:', data);
    
    // Parse session ID from endpoint event
    const lines = data.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line.includes('sessionId=')) {
        const match = line.match(/sessionId=([^&\s]+)/);
        if (match) {
          sessionId = match[1];
          console.log('\nSession ID extracted:', sessionId);
          
          // Now send a test request
          setTimeout(() => {
            sendTestRequest(sessionId);
          }, 1000);
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

function sendTestRequest(sessionId) {
  console.log('\n--- Sending test web search request ---');
  
  const testPayload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'web_search',
      arguments: {
        query: 'latest AI news 2025',
        numResults: 3,
        liveCrawl: 'auto'
      }
    },
    id: 1
  };
  
  const postUrl = new URL(`${baseUrl}?sessionId=${sessionId}`);
  const postData = JSON.stringify(testPayload);
  
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
    console.log('Tool call response status:', res.statusCode);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk.toString();
    });
    
    res.on('end', () => {
      console.log('Tool call response:', responseData);
      
      // Test LinkedIn search
      setTimeout(() => {
        testLinkedInSearch(sessionId);
      }, 2000);
    });
  });
  
  postReq.on('error', (err) => {
    console.error('POST request error:', err);
  });
  
  postReq.write(postData);
  postReq.end();
}

function testLinkedInSearch(sessionId) {
  console.log('\n--- Testing LinkedIn search ---');
  
  const testPayload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'linkedin_search',
      arguments: {
        query: 'AI engineer San Francisco',
        numResults: 3
      }
    },
    id: 2
  };
  
  const postUrl = new URL(`${baseUrl}?sessionId=${sessionId}`);
  const postData = JSON.stringify(testPayload);
  
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
    console.log('LinkedIn search response status:', res.statusCode);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk.toString();
    });
    
    res.on('end', () => {
      console.log('LinkedIn search response:', responseData);
      console.log('\n✅ Test completed!');
      process.exit(0);
    });
  });
  
  postReq.on('error', (err) => {
    console.error('LinkedIn search error:', err);
  });
  
  postReq.write(postData);
  postReq.end();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nTest interrupted');
  process.exit(0);
});