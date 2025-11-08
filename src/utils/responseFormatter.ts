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
    `### Result ${index}: ${result.title}\n`,
    `**URL**: ${result.url}`,
    `**Published**: ${result.publishedDate || 'Unknown'}`,
    `**Author**: ${result.author || 'Unknown'}`,
    `**Score**: ${result.score?.toFixed(2) || 'N/A'}\n`,
    `**Content**:\n${contentPreview}\n`
  ];

  return lines.join('\n');
}

/**
 * Create full result (complete detail)
 * Target: ~1000-2000 tokens per result
 */
function createResultFull(result: ExaSearchResult, index: number): string {
  const lines = [
    `### Result ${index}: ${result.title}\n`,
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
  lines.push('**Full Content**:\n');
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
    `**Cache ID**: \`${cacheId}\`\n`,
    `**Progressive Disclosure**`,
    `- Use cache ID + result index [0-${results.length - 1}] with retrieve_result tool`,
    `- Cache expires in 5 minutes`,
    `- Current response: ~${metadata.tokenEstimate.estimatedTokens.toLocaleString()} tokens\n`,
    `---\n`
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
    `## Retrieved from Cache\n`,
    `**Cache ID**: \`${cacheId}\``,
    `**Result**: ${index + 1} of ${totalResults}\n`,
    `---\n`
  ].join('\n');

  return header + fullResult;
}

/**
 * Format error message with token-awareness
 */
export function formatErrorResponse(error: Error | string, query?: string): string {
  const errorMessage = error instanceof Error ? error.message : error;

  const lines = [
    `## Search Error\n`,
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

/**
 * Format guidance for Claude on token management
 */
export function getTokenManagementGuidance(): string {
  return `
📖 TOKEN MANAGEMENT GUIDE FOR THIS MCP SERVER

CONTENT LEVELS:
• summary   → ~150 tokens/result  | Use for: Quick scanning, high-level overview
• standard  → ~500 tokens/result  | Use for: Balanced detail, most common use case
• full      → ~1500 tokens/result | Use for: Deep analysis, comprehensive research

RECOMMENDED PATTERNS:
1. Start with 'summary' to see what's available (low token cost)
2. Request specific results by index for deep analysis
3. Use 'standard' for balanced exploration
4. Use 'full' only when you need complete content

PROGRESSIVE DISCLOSURE:
• All results are cached for 5 minutes
• Request specific results by: cache_id + result_index
• This prevents loading unnecessary content into context

TOKEN BUDGETS:
• 3 results (summary):  ~500 tokens   | Cost: ~$0.0015
• 3 results (standard): ~1,500 tokens | Cost: ~$0.0045
• 3 results (full):     ~4,500 tokens | Cost: ~$0.0135
• 10 results (full):    ~15,000 tokens| Cost: ~$0.0450

AVOID TOKEN OVERFLOW:
• Keep num_results ≤ 5 for 'full' content
• Use 'summary' for num_results > 5
• Request specific results instead of returning all
• Monitor the token estimate in response metadata
`.trim();
}
