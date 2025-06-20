import axios, { AxiosInstance } from 'axios';
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

// Cache axios instances by API key to truly reuse connections
const clientCache = new Map<string, AxiosInstance>();

// Create or get cached axios instance
const createExaClient = (apiKey: string): AxiosInstance => {
  // Check if we already have a client for this API key
  const cached = clientCache.get(apiKey);
  if (cached) {
    return cached;
  }

  // Create new client and cache it
  const client = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    httpsAgent,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-api-key': apiKey
    },
    timeout: 25000,
    validateStatus: (status) => status >= 200 && status < 300 // Only 2xx is success
  });

  clientCache.set(apiKey, client);
  return client;
};

// Export a factory function that tools can use
export const getExaClient = (config?: { exaApiKey?: string }): AxiosInstance => {
  const apiKey = config?.exaApiKey || process.env.EXA_API_KEY || '';
  
  // Naive cache size limit to prevent unbounded growth
  if (clientCache.size > 50) {
    clientCache.clear();
  }
  
  return createExaClient(apiKey);
};