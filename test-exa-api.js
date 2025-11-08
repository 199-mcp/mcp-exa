#!/usr/bin/env node

import https from 'https';

const API_KEY = '2d8d1aab-4fad-4861-9563-40e53092f0a2';

console.log('Testing Exa API directly...\n');

const data = JSON.stringify({
  query: 'latest news',
  type: 'auto',
  numResults: 2
});

const options = {
  hostname: 'api.exa.ai',
  path: '/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-api-key': API_KEY
  }
};

const req = https.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Status Message:', res.statusMessage);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();