/**
 * Token Estimation Utility
 *
 * Provides accurate token counting for MCP responses to help Claude manage context.
 * Uses the standard approximation: 1 token ≈ 0.75 words ≈ 4 characters
 */

export interface TokenEstimate {
  characters: number;
  estimatedTokens: number;
  words: number;
}

export interface ResponseMetadata {
  totalResults: number;
  returnedResults: number;
  tokenEstimate: TokenEstimate;
  truncated: boolean;
  hasMore: boolean;
  contentLevel: 'summary' | 'standard' | 'full';
  costEstimate?: {
    inputTokens: number;
    estimatedCostUSD: number;
  };
}

/**
 * Estimate tokens from text using industry-standard approximation with safety margin
 *
 * Formula: tokens ≈ (characters / 4) × 1.3
 * - Base ratio (chars/4) works well for English
 * - 30% safety margin accounts for:
 *   - CJK languages (Chinese, Japanese, Korean): ~2-4x more tokens
 *   - Code-heavy content: ~20-40% more tokens
 *   - URLs and special characters: ~20-50% more tokens
 *
 * This conservative estimate prevents overflow for multilingual/mixed content
 */
export function estimateTokens(text: string): TokenEstimate {
  const characters = text.length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;

  // Base estimate with 30% safety margin for non-English content
  const baseTokens = characters / 4;
  const estimatedTokens = Math.ceil(baseTokens * 1.3);

  return {
    characters,
    estimatedTokens,
    words
  };
}

/**
 * Calculate cost estimate for Claude API consumption
 * Based on current pricing: $3/MTok input, $15/MTok output for Sonnet 3.5
 */
export function calculateCostEstimate(tokens: number): { inputTokens: number; estimatedCostUSD: number } {
  const COST_PER_MILLION_INPUT = 3.00; // Claude Sonnet 3.5
  const costUSD = (tokens / 1_000_000) * COST_PER_MILLION_INPUT;

  return {
    inputTokens: tokens,
    estimatedCostUSD: parseFloat(costUSD.toFixed(6))
  };
}

/**
 * Create response metadata for MCP responses
 */
export function createResponseMetadata(
  text: string,
  totalResults: number,
  returnedResults: number,
  contentLevel: 'summary' | 'standard' | 'full',
  truncated: boolean = false
): ResponseMetadata {
  const tokenEstimate = estimateTokens(text);
  const costEstimate = calculateCostEstimate(tokenEstimate.estimatedTokens);

  return {
    totalResults,
    returnedResults,
    tokenEstimate,
    truncated,
    hasMore: returnedResults < totalResults,
    contentLevel,
    costEstimate
  };
}

/**
 * Format metadata as human-readable text for Claude
 */
export function formatMetadataForClaude(metadata: ResponseMetadata): string {
  const lines = [
    `## Response Metadata`,
    '',
    `- Results: ${metadata.returnedResults}/${metadata.totalResults} (${metadata.hasMore ? 'more available' : 'complete'})`,
    `- Content Level: ${metadata.contentLevel.toUpperCase()}`,
    `- Token Estimate: ~${metadata.tokenEstimate.estimatedTokens.toLocaleString()} tokens`,
    `- Characters: ${metadata.tokenEstimate.characters.toLocaleString()}`,
    `- Cost Estimate: ~$${metadata.costEstimate?.estimatedCostUSD.toFixed(4)} (input only)`,
  ];

  if (metadata.truncated) {
    lines.push(`- Warning: Content truncated to prevent token overflow`);
  }

  if (metadata.hasMore) {
    lines.push(`- Tip: Request specific results by index for full content`);
  }

  lines.push(``);

  return lines.join('\n');
}

/**
 * Check if response would exceed safe token limits
 * Returns true if response needs truncation
 */
export function exceedsSafeLimit(tokens: number, safeLimit: number = 25000): boolean {
  return tokens > safeLimit;
}

/**
 * Calculate recommended max characters per result based on desired token budget
 */
export function calculateMaxCharacters(
  numResults: number,
  targetTotalTokens: number = 20000,
  metadataOverhead: number = 1000
): number {
  const availableTokens = targetTotalTokens - metadataOverhead;
  const tokensPerResult = Math.floor(availableTokens / numResults);
  const charsPerResult = tokensPerResult * 4; // tokens × 4 chars/token

  return Math.max(500, Math.min(charsPerResult, 5000)); // Clamp between 500-5000
}
