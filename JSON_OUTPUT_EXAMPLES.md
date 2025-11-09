# JSON Output Format Examples

## Overview
All search tools now support `output_format: 'json'` parameter for code-friendly responses that enable filtering and transformation in code execution environments.

## Basic Usage

### Markdown Output (Default)
```typescript
web_search({
  query: "AI research papers 2024",
  content_level: "summary",
  output_format: "markdown" // or omit for default
})
```

Returns human-readable markdown:
```markdown
## Response Metadata

- Results: 5/5 (complete)
- Content Level: SUMMARY
- Token Estimate: ~1,200 tokens

**Cache ID**: `exa-1234567890-abc123`

**Progressive Disclosure**
- Use cache ID + result index [0-4] with retrieve_result tool
...
```

### JSON Output (Code-Friendly)
```typescript
web_search({
  query: "AI research papers 2024",
  content_level: "summary",
  output_format: "json"
})
```

Returns structured JSON:
```json
{
  "metadata": {
    "cacheId": "exa-1234567890-abc123",
    "totalResults": 5,
    "returnedResults": 5,
    "contentLevel": "summary",
    "tokenEstimate": 850,
    "requestId": "req-abc",
    "searchType": "neural"
  },
  "results": [
    {
      "id": "https://arxiv.org/abs/2401.12345",
      "title": "Advances in Large Language Models",
      "url": "https://arxiv.org/abs/2401.12345",
      "publishedDate": "2024-01-15",
      "author": "John Doe et al.",
      "text": "Abstract content here...",
      "score": 0.95,
      "image": null,
      "favicon": "https://arxiv.org/favicon.ico"
    }
    // ... more results
  ]
}
```

## Code Execution Examples

### Example 1: Filter by Publication Date
```typescript
// Get results as JSON
const response = await web_search({
  query: "AI research papers",
  num_results: 10,
  output_format: "json"
});

const data = JSON.parse(response);

// Filter in code (zero token cost!)
const recent = data.results.filter(r =>
  new Date(r.publishedDate) > new Date('2024-01-01')
);

console.log(`Found ${recent.length} papers from 2024`);
// Only filtered results enter Claude's context
```

### Example 2: Score-Based Filtering
```typescript
const response = await academic_search({
  query: "transformer architectures",
  output_format: "json",
  content_level: "full"
});

const data = JSON.parse(response);

// Get only high-confidence results
const highQuality = data.results
  .filter(r => r.score > 0.9)
  .sort((a, b) => b.score - a.score);

console.log(`Top ${highQuality.length} results:`,
  highQuality.map(r => r.title)
);
```

### Example 3: Domain-Specific Aggregation
```typescript
const response = await company_search({
  companyName: "tech startups",
  output_format: "json",
  num_results: 20
});

const data = JSON.parse(response);

// Group by domain
const byDomain = data.results.reduce((acc, r) => {
  const domain = new URL(r.url).hostname;
  acc[domain] = (acc[domain] || 0) + 1;
  return acc;
}, {});

console.log("Results by source:", byDomain);
```

### Example 4: Custom Data Transformation
```typescript
const response = await linkedin_search({
  query: "machine learning engineer",
  searchType: "profiles",
  output_format: "json",
  num_results: 15
});

const data = JSON.parse(response);

// Extract and format for downstream processing
const profiles = data.results.map(r => ({
  name: r.title.split('-')[0].trim(),
  url: r.url,
  snippet: r.text.substring(0, 200),
  relevance: r.score
}));

// Save to file or pass to another tool
fs.writeFileSync('profiles.json', JSON.stringify(profiles, null, 2));
```

## Token Efficiency Comparison

### Scenario: Find 2024 Papers from 20 Results

**Without JSON (Markdown)**:
1. Request 20 results → ~10,000 tokens in response
2. Claude reads all 20 in context
3. Claude filters in response → wastes tokens on excluded results
4. **Total**: ~10,000+ tokens

**With JSON (Code Execution)**:
1. Request 20 results as JSON → ~8,000 tokens raw
2. Filter in code: `results.filter(r => r.publishedDate.startsWith('2024'))`
3. Only 5 matching results enter Claude's context → ~2,000 tokens
4. **Total**: ~2,000 tokens

**Savings**: 80% token reduction + faster processing

## Supported Tools

All search tools support both output formats:
- `web_search` - General web search
- `academic_search` - Research papers
- `company_search` - Company information
- `linkedin_search` - LinkedIn profiles/companies
- `competitor_search` - Competitor analysis
- `wikipedia_search` - Wikipedia articles
- `github_search` - GitHub repositories/code

## Best Practices

### Use JSON When:
✅ You need to filter results (by date, score, domain, etc.)
✅ You want to transform data (map, reduce, aggregate)
✅ You're chaining multiple operations
✅ You need to save results to a file
✅ You're working in a code execution environment

### Use Markdown When:
✅ You need human-readable output
✅ You're presenting results directly to user
✅ You want formatted, styled content
✅ You don't need programmatic access

## Metadata Fields

The JSON response includes useful metadata:

| Field | Type | Description |
|-------|------|-------------|
| `cacheId` | string | Cache identifier for progressive disclosure (5min TTL) |
| `totalResults` | number | Total number of results returned |
| `returnedResults` | number | Number of results in this response |
| `contentLevel` | string | Detail level: 'summary', 'standard', or 'full' |
| `tokenEstimate` | number | Estimated tokens for this JSON response |
| `requestId` | string | Exa API request identifier |
| `searchType` | string | Search algorithm used ('neural', 'keyword', etc.) |

## Progressive Disclosure with JSON

You can combine JSON output with the caching system:

```typescript
// Step 1: Get summary with JSON
const summary = await web_search({
  query: "quantum computing advances",
  content_level: "summary",
  output_format: "json",
  num_results: 10
});

const data = JSON.parse(summary);
console.log(`Cache ID: ${data.metadata.cacheId}`);

// Step 2: Filter interesting results in code
const relevant = data.results
  .filter(r => r.score > 0.85)
  .map((r, idx) => ({ index: idx, title: r.title, score: r.score }));

// Step 3: Request full details for specific results
for (const item of relevant.slice(0, 3)) {
  const full = await retrieve_result({
    cache_id: data.metadata.cacheId,
    result_index: item.index
  });
  // Process full content...
}
```

## Error Handling

```typescript
try {
  const response = await web_search({
    query: "test query",
    output_format: "json"
  });

  const data = JSON.parse(response);

  if (data.metadata.totalResults === 0) {
    console.log("No results found");
  } else {
    // Process results...
  }
} catch (error) {
  console.error("Search failed:", error.message);
}
```

## Migration from Raw JSON

**Before** (raw Exa API response):
```typescript
academic_search({ query: "..." })
// Returns: { results: [...], requestId: "...", ... }
```

**After** (structured with metadata):
```typescript
academic_search({ query: "...", output_format: "json" })
// Returns: { metadata: {...}, results: [...] }
```

All existing code using the old format will continue to work since `output_format` defaults to `'markdown'`.
