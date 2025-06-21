// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: string;
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  includeText?: string[];
  excludeText?: string[];
  numResults: number;
  useAutoprompt?: boolean;
  contents?: {
    text?: {
      maxCharacters?: number;
      includeHtmlTags?: boolean;
    };
    highlights?: {
      query?: string;
      highlightsPerUrl?: number;
      numSentences?: number;
    };
    summary?: {
      query?: string;
    };
    livecrawl?: 'never' | 'fallback' | 'always' | 'auto';
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaCrawlRequest {
  urls: string[];
  text?: {
    maxCharacters?: number;
    includeHtmlTags?: boolean;
  };
  livecrawl?: 'never' | 'fallback' | 'always' | 'auto';
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString?: string;
  resolvedSearchType?: string;
  searchType?: string;
  results: ExaSearchResult[];
}

export interface FindSimilarRequest {
  url: string;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  excludeSourceDomain?: boolean;
  category?: string;
  contents?: {
    text?: {
      maxCharacters?: number;
      includeHtmlTags?: boolean;
    };
    highlights?: {
      query?: string;
      highlightsPerUrl?: number;
      numSentences?: number;
    };
    summary?: {
      query?: string;
    };
    livecrawl?: 'never' | 'fallback' | 'always' | 'auto';
  };
}

export interface FindSimilarResponse {
  requestId: string;
  results: ExaSearchResult[];
}

export interface AnswerRequest {
  query: string;
  stream?: boolean;
  model?: string;
  sourceFilters?: {
    includeDomains?: string[];
    excludeDomains?: string[];
    startPublishedDate?: string;
    endPublishedDate?: string;
    startCrawlDate?: string;
    endCrawlDate?: string;
  };
  extras?: {
    citations?: boolean;
    imageLinks?: boolean;
    links?: boolean;
  };
}

export interface AnswerCitation {
  text: string;
  url: string;
  startIndex: number;
  endIndex: number;
}

export interface AnswerResponse {
  requestId: string;
  answer: string;
  citations?: AnswerCitation[];
  images?: string[];
  links?: string[];
}

// Tool Types
export interface SearchArgs {
  query: string;
  numResults?: number;
  livecrawl?: 'never' | 'fallback' | 'always' | 'auto';
  useAutoprompt?: boolean;
  startPublishedDate?: string;
  endPublishedDate?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  includeText?: string[];
  excludeText?: string[];
}