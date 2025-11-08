// Configuration for API
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
    CONTENTS: '/contents',
    FIND_SIMILAR: '/findSimilar',
    ANSWER: '/answer'
  },
  // Token-aware defaults (Context Engineering 2.0)
  DEFAULT_NUM_RESULTS: 3, // Reduced from 5 to prevent token overflow
  DEFAULT_MAX_CHARACTERS: 1500, // Reduced from 3000 - calculated for ~20K token budget

  // Content level defaults
  SUMMARY_MAX_CHARS: 500,   // ~125 tokens per result
  STANDARD_MAX_CHARS: 1500, // ~375 tokens per result
  FULL_MAX_CHARS: 5000,     // ~1250 tokens per result

  // Safety limits
  MAX_SAFE_TOTAL_TOKENS: 25000, // Leave 7K buffer before 32K limit
  CACHE_TTL_MS: 5 * 60 * 1000,  // 5 minutes
} as const; 