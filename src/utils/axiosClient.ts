import axios from 'axios';
import https from 'https';
import { API_CONFIG } from '../tools/config.js';

// Create a single HTTPS agent with keep-alive enabled
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000, // Send TCP keep-alive packets every 30 seconds
  maxSockets: 50, // Maximum number of sockets per host
  maxFreeSockets: 10, // Maximum number of sockets to keep open in free state
  timeout: 60000, // Socket timeout in milliseconds
  rejectUnauthorized: true // Verify SSL certificates
});

// Create a shared axios instance with keep-alive
export const createExaClient = (apiKey: string) => {
  return axios.create({
    baseURL: API_CONFIG.BASE_URL,
    httpsAgent,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-api-key': apiKey
    },
    timeout: 25000,
    // Retry logic can be added here with axios-retry if needed
    validateStatus: (status) => status < 500 // Only throw for 5xx errors
  });
};

// Export a factory function that tools can use
export const getExaClient = (config?: { exaApiKey?: string }) => {
  const apiKey = config?.exaApiKey || process.env.EXA_API_KEY || '';
  return createExaClient(apiKey);
};