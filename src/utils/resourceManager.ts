/**
 * MCP Resource Manager
 *
 * Implements MCP Resources pattern for cached search results.
 * Allows Claude to access cached results via resource:// URIs.
 *
 * Benefits:
 * - Native MCP integration
 * - Better context management in Claude
 * - Automatic listing of available cached searches
 */

import { resultCache, CachedSearchResult } from './resultCache.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface SearchResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Generate resource URI for a cached search
 */
export function generateResourceUri(cacheId: string): string {
  return `exa://search/${cacheId}`;
}

/**
 * Parse resource URI to extract cache ID
 */
export function parseCacheIdFromUri(uri: string): string | null {
  const match = uri.match(/^exa:\/\/search\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Register MCP resources for cached searches
 */
export function registerResourceHandlers(server: McpServer): void {
  // List all available cached searches as resources
  server.resource({
    list: async () => {
      const stats = resultCache.getCacheStats();

      if (stats.totalCached === 0) {
        return {
          resources: []
        };
      }

      // Get all cache files
      const fs = await import('fs');
      const files = fs.readdirSync(stats.cacheDir)
        .filter(f => f.startsWith('exa-') && f.endsWith('.json'));

      const resources: SearchResource[] = [];

      for (const file of files) {
        try {
          const filePath = `${stats.cacheDir}/${file}`;
          const content = fs.readFileSync(filePath, 'utf-8');
          const cached: CachedSearchResult = JSON.parse(content);

          // Check if expired
          if (Date.now() - cached.timestamp > cached.ttl) {
            continue;
          }

          const age = Math.floor((Date.now() - cached.timestamp) / 1000);
          const ageStr = age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;

          resources.push({
            uri: generateResourceUri(cached.cacheId),
            name: `Search: ${cached.query}`,
            description: `${cached.totalResults} results, cached ${ageStr} (expires in ${Math.floor((cached.ttl - (Date.now() - cached.timestamp)) / 1000)}s)`,
            mimeType: 'application/json'
          });
        } catch (error) {
          // Skip invalid cache files
          continue;
        }
      }

      return {
        resources: resources.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        }))
      };
    }
  });

  // Read specific cached search by resource URI
  server.resource({
    read: async ({ uri }) => {
      const cacheId = parseCacheIdFromUri(uri);

      if (!cacheId) {
        throw new Error(`Invalid resource URI: ${uri}`);
      }

      const cached = resultCache.getCachedResults(cacheId);

      if (!cached) {
        throw new Error(`Cache not found or expired: ${cacheId}`);
      }

      // Return cached results as JSON
      const content = JSON.stringify({
        cacheId: cached.cacheId,
        query: cached.query,
        timestamp: cached.timestamp,
        totalResults: cached.totalResults,
        results: cached.results.map((r, i) => ({
          index: i,
          id: r.id,
          title: r.title,
          url: r.url,
          publishedDate: r.publishedDate,
          author: r.author,
          text: r.text,
          score: r.score,
          image: r.image,
          favicon: r.favicon
        })),
        metadata: cached.metadata
      }, null, 2);

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: content
        }]
      };
    }
  });
}

/**
 * Create resource reference for response
 */
export function createResourceReference(cacheId: string, query: string, totalResults: number): string {
  const uri = generateResourceUri(cacheId);

  return `
📚 RESOURCE AVAILABLE

This search has been cached as an MCP resource:

URI: ${uri}
Query: "${query}"
Results: ${totalResults}
Access: Use MCP resource protocol to read full results

Example (in Claude):
\`\`\`
Read resource: ${uri}
\`\`\`

Or use the get_search_result tool with cache_id: ${cacheId}
`;
}
