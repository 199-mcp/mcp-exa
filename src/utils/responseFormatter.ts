/**
 * Response Formatter
 *
 * Formats MCP responses with token-awareness and progressive disclosure.
 * Implements Context Engineering 2.0 principles:
 * - Minimal Sufficient Context
 * - Structured Over Unstructured
 * - Progressive Disclosure
 */

import { ExaSearchResult, ExaSearchResponse } from '../types.js';
import { estimateTokens, formatMetadataForClaude, createResponseMetadata, calculateMaxCharacters } from './tokenEstimator.js';
import { resultCache } from './resultCache.js';

export type ContentLevel = 'summary' | 'standard' | 'full';

export interface FormattedResponse {
  text: string;
  metadata: {
    cacheId?: string;
    totalTokens: number;
    resultCount: number;
    contentLevel: ContentLevel;
  };
}

/**
 * Create compact summary of a single result
 * Target: ~100-150 tokens per result
 */
function createResultSummary(result: ExaSearchResult, index: number): string {
  const preview = result.text ? result.text.substring(0, 200).trim() + '...' : 'No preview available';

  const lines = [
    `[${index}] ${result.title}`,
    `URL: ${result.url}`,
    `Published: ${result.publishedDate || 'Unknown'}`,
    `Preview: ${preview}`,
    `Score: ${result.score?.toFixed(2) || 'N/A'}`,
    ''
  ];

  return lines.join('\n');
}

/**
 * Create standard result (moderate detail)
 * Target: ~400-600 tokens per result
 */
function createResultStandard(result: ExaSearchResult, index: number, maxChars: number = 1500): string {
  const contentPreview = result.text
    ? result.text.substring(0, maxChars).trim() + (result.text.length > maxChars ? '...' : '')
    : 'No content available';

  const lines = [
    `### Result ${index}: ${result.title}`,
    '',
    `**URL**: ${result.url}`,
    `**Published**: ${result.publishedDate || 'Unknown'}`,
    `**Author**: ${result.author || 'Unknown'}`,
    `**Score**: ${result.score?.toFixed(2) || 'N/A'}`,
    '',
    `**Content**:`,
    contentPreview,
    ''
  ];

  return lines.join('\n');
}

/**
 * Create full result (complete detail)
 * Target: ~1000-2000 tokens per result
 */
function createResultFull(result: ExaSearchResult, index: number): string {
  const lines = [
    `### Result ${index}: ${result.title}`,
    '',
    `**ID**: ${result.id}`,
    `**URL**: ${result.url}`,
    `**Published**: ${result.publishedDate || 'Unknown'}`,
    `**Author**: ${result.author || 'Unknown'}`,
    `**Score**: ${result.score?.toFixed(2) || 'N/A'}`,
  ];

  if (result.image) {
    lines.push(`**Image**: ${result.image}`);
  }

  if (result.favicon) {
    lines.push(`**Favicon**: ${result.favicon}`);
  }

  lines.push('');
  lines.push('**Full Content**:');
  lines.push('');
  lines.push(result.text || 'No content available');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format search response with smart token management
 */
export function formatSearchResponse(
  response: ExaSearchResponse,
  query: string,
  contentLevel: ContentLevel = 'standard',
  maxTotalTokens: number = 20000
): FormattedResponse {
  const results = response.results || [];

  if (results.length === 0) {
    return {
      text: 'No results found for your query.',
      metadata: {
        totalTokens: 10,
        resultCount: 0,
        contentLevel
      }
    };
  }

  let formattedText = '';
  let cacheId: string | undefined;

  // Always cache results for progressive disclosure
  cacheId = resultCache.cacheResults(
    query,
    results,
    {
      requestId: response.requestId,
      searchType: response.resolvedSearchType || response.searchType,
      autopromptString: response.autopromptString
    }
  );

  // Format based on content level
  if (contentLevel === 'summary') {
    // SUMMARY: Just titles and snippets (~150 tokens/result)
    const summaries = results.map((r, i) => createResultSummary(r, i));
    formattedText = summaries.join('\n');

  } else if (contentLevel === 'standard') {
    // STANDARD: Moderate detail with smart char limit
    const maxCharsPerResult = calculateMaxCharacters(results.length, maxTotalTokens);
    const standards = results.map((r, i) => createResultStandard(r, i, maxCharsPerResult));
    formattedText = standards.join('\n');

  } else {
    // FULL: Complete content (may exceed token budget)
    const fulls = results.map((r, i) => createResultFull(r, i));
    formattedText = fulls.join('\n');
  }

  // Add metadata header
  const metadata = createResponseMetadata(
    formattedText,
    results.length,
    results.length,
    contentLevel
  );

  const metadataHeader = formatMetadataForClaude(metadata);

  // Add cache instructions
  const cacheInstructions = [
    `**Cache ID**: \`${cacheId}\``,
    '',
    `**Progressive Disclosure**`,
    `- Use cache ID + result index [0-${results.length - 1}] with retrieve_result tool`,
    `- Cache expires in 5 minutes`,
    `- Current response: ~${metadata.tokenEstimate.estimatedTokens.toLocaleString()} tokens`,
    '',
    `---`,
    ''
  ];

  const fullText = [
    metadataHeader,
    cacheInstructions.join('\n'),
    formattedText
  ].join('\n');

  const finalTokens = estimateTokens(fullText).estimatedTokens;

  return {
    text: fullText,
    metadata: {
      cacheId,
      totalTokens: finalTokens,
      resultCount: results.length,
      contentLevel
    }
  };
}

/**
 * Format a single result retrieved from cache
 */
export function formatSingleResult(
  result: ExaSearchResult,
  index: number,
  cacheId: string,
  totalResults: number
): string {
  const fullResult = createResultFull(result, index);

  const header = [
    `## Retrieved from Cache`,
    '',
    `**Cache ID**: \`${cacheId}\``,
    `**Result**: ${index + 1} of ${totalResults}`,
    '',
    `---`,
    ''
  ].join('\n');

  return header + fullResult;
}

/**
 * Format error message with token-awareness
 */
export function formatErrorResponse(error: Error | string, query?: string): string {
  const errorMessage = error instanceof Error ? error.message : error;

  const lines = [
    `## Search Error`,
    '',
    `**Error**: ${errorMessage}`,
  ];

  if (query) {
    lines.push(`**Query**: "${query}"`);
  }

  lines.push('');
  lines.push('**Suggestions**:');
  lines.push('- Check your API key is valid');
  lines.push('- Verify the query format');
  lines.push('- Try reducing num_results or max_chars_per_result');
  lines.push('- Check Exa API status: https://status.exa.ai');

  return lines.join('\n');
}

// Removed: getTokenManagementGuidance() - dead code, not called anywhere
// Token management guidance is now in:
// 1. Server description (one-time context)
// 2. Response metadata (contextual)
// 3. TOKEN_MANAGEMENT.md (comprehensive docs)
