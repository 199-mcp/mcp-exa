/**
 * Result Cache Manager
 *
 * Manages temporary storage of large search results to enable progressive disclosure.
 * Implements Context Engineering 2.0 Pattern: Progressive Disclosure
 *
 * Usage:
 * 1. Store full results in cache
 * 2. Return summary to Claude with cache ID
 * 3. Claude can request specific results by cache ID + index
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ExaSearchResult } from '../types.js';

export interface CachedSearchResult {
  cacheId: string;
  query: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  totalResults: number;
  results: ExaSearchResult[];
  metadata: {
    requestId: string;
    searchType?: string;
    autopromptString?: string;
  };
}

class ResultCacheManager {
  private cacheDir: string;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached searches

  constructor() {
    // Use system temp directory for cache
    this.cacheDir = path.join(os.tmpdir(), 'exa-mcp-cache');
    this.ensureCacheDir();
    this.cleanupOldCaches();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate unique cache ID
   */
  private generateCacheId(): string {
    return `exa-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get cache file path
   */
  private getCacheFilePath(cacheId: string): string {
    return path.join(this.cacheDir, `${cacheId}.json`);
  }

  /**
   * Store search results in cache
   */
  public cacheResults(
    query: string,
    results: ExaSearchResult[],
    metadata: {
      requestId: string;
      searchType?: string;
      autopromptString?: string;
    },
    ttl: number = this.DEFAULT_TTL
  ): string {
    const cacheId = this.generateCacheId();
    const cached: CachedSearchResult = {
      cacheId,
      query,
      timestamp: Date.now(),
      ttl,
      totalResults: results.length,
      results,
      metadata
    };

    const filePath = this.getCacheFilePath(cacheId);
    fs.writeFileSync(filePath, JSON.stringify(cached, null, 2), 'utf-8');

    return cacheId;
  }

  /**
   * Retrieve cached results
   */
  public getCachedResults(cacheId: string): CachedSearchResult | null {
    const filePath = this.getCacheFilePath(cacheId);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cached: CachedSearchResult = JSON.parse(content);

      // Check if expired
      if (Date.now() - cached.timestamp > cached.ttl) {
        this.deleteCached(cacheId);
        return null;
      }

      return cached;
    } catch (error) {
      console.error(`Error reading cache ${cacheId}:`, error);
      return null;
    }
  }

  /**
   * Get specific result by index from cache
   */
  public getResultByIndex(cacheId: string, index: number): ExaSearchResult | null {
    const cached = this.getCachedResults(cacheId);

    if (!cached || index < 0 || index >= cached.results.length) {
      return null;
    }

    return cached.results[index];
  }

  /**
   * Get range of results from cache
   */
  public getResultRange(cacheId: string, startIndex: number, endIndex: number): ExaSearchResult[] | null {
    const cached = this.getCachedResults(cacheId);

    if (!cached) {
      return null;
    }

    const validStart = Math.max(0, startIndex);
    const validEnd = Math.min(cached.results.length, endIndex);

    return cached.results.slice(validStart, validEnd);
  }

  /**
   * Delete cached results
   */
  public deleteCached(cacheId: string): void {
    const filePath = this.getCacheFilePath(cacheId);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Cleanup old/expired caches
   */
  public cleanupOldCaches(): void {
    if (!fs.existsSync(this.cacheDir)) {
      return;
    }

    const files = fs.readdirSync(this.cacheDir);
    const cacheFiles = files.filter(f => f.startsWith('exa-') && f.endsWith('.json'));

    // Sort by modification time (oldest first)
    const filesWithStats = cacheFiles.map(f => ({
      name: f,
      path: path.join(this.cacheDir, f),
      mtime: fs.statSync(path.join(this.cacheDir, f)).mtime.getTime()
    }));

    filesWithStats.sort((a, b) => a.mtime - b.mtime);

    // Delete expired caches
    for (const file of filesWithStats) {
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        const cached: CachedSearchResult = JSON.parse(content);

        if (Date.now() - cached.timestamp > cached.ttl) {
          fs.unlinkSync(file.path);
        }
      } catch (error) {
        // If we can't parse it, delete it
        fs.unlinkSync(file.path);
      }
    }

    // If still too many caches, delete oldest
    const remainingFiles = fs.readdirSync(this.cacheDir)
      .filter(f => f.startsWith('exa-') && f.endsWith('.json'));

    if (remainingFiles.length > this.MAX_CACHE_SIZE) {
      const toDelete = remainingFiles.length - this.MAX_CACHE_SIZE;
      const oldestFiles = remainingFiles.slice(0, toDelete);

      for (const file of oldestFiles) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalCached: number;
    cacheDir: string;
    oldestCache: number | null;
    newestCache: number | null;
  } {
    if (!fs.existsSync(this.cacheDir)) {
      return {
        totalCached: 0,
        cacheDir: this.cacheDir,
        oldestCache: null,
        newestCache: null
      };
    }

    const files = fs.readdirSync(this.cacheDir)
      .filter(f => f.startsWith('exa-') && f.endsWith('.json'));

    let oldest: number | null = null;
    let newest: number | null = null;

    for (const file of files) {
      const stats = fs.statSync(path.join(this.cacheDir, file));
      const mtime = stats.mtime.getTime();

      if (oldest === null || mtime < oldest) {
        oldest = mtime;
      }
      if (newest === null || mtime > newest) {
        newest = mtime;
      }
    }

    return {
      totalCached: files.length,
      cacheDir: this.cacheDir,
      oldestCache: oldest,
      newestCache: newest
    };
  }
}

// Singleton instance
export const resultCache = new ResultCacheManager();
