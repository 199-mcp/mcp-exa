# Next Steps Analysis: Code Execution Integration

## Context
After reading Anthropic's article "Code Execution with MCP", we identified opportunities to optimize our Exa MCP server for Claude's code execution environment.

## Current State Assessment

### ✅ Strengths
1. **Progressive Disclosure**: 78-94% token reduction via summary/standard/full levels
2. **Token Awareness**: Conservative estimates, metadata in every response
3. **Optimized Tool Descriptions**: 93% reduction (1000 → 63 tokens)
4. **Security**: Path traversal protection, periodic cache cleanup
5. **Caching**: 5-minute TTL for follow-up queries

### ⚠️ Gap: Not Optimized for Code Execution
Our responses are formatted as markdown strings, not structured data that code can easily manipulate.

## Proposed Improvements

### Option 1: Add Structured Data Output Mode (RECOMMENDED)
**Effort**: Low | **Impact**: High | **Breaking**: No

Add a new parameter `output_format: 'markdown' | 'json'` to all tools:

```typescript
// Current (markdown):
web_search({ query: "AI papers", content_level: "summary" })
// Returns: "## Response Metadata\n- Results: 5/5\n### Result 0: Paper Title..."

// New (JSON for code):
web_search({ query: "AI papers", output_format: "json" })
// Returns structured object:
{
  metadata: {
    totalResults: 5,
    tokenEstimate: 1200,
    cacheId: "exa-123-abc"
  },
  results: [
    {
      id: "...",
      title: "Paper Title",
      url: "...",
      publishedDate: "2024-01-15",
      author: "...",
      text: "...",
      score: 0.95
    },
    // ...
  ]
}
```

**Benefits**:
- Claude can write: `results.filter(r => r.score > 0.9).map(r => r.title)`
- Zero token cost for filtering/transformation
- Backward compatible (default: markdown)
- Works with existing caching infrastructure

**Implementation**:
1. Add `output_format` parameter to all tools (default: 'markdown')
2. Create `formatSearchResponseJSON()` alongside existing markdown formatter
3. Update tool descriptions to mention both formats

---

### Option 2: Implement "Detail Level" Parameter (ALREADY DOING THIS) ✅
**Status**: COMPLETE

We already have `content_level: 'summary' | 'standard' | 'full'` which is exactly what the article recommends for controlling information density.

---

### Option 3: Create Code-Friendly Wrapper Module (MEDIUM EFFORT)
**Effort**: Medium | **Impact**: Medium | **Breaking**: No

Provide a TypeScript module that agents can import:

```typescript
// File: mcp-exa-sdk/index.ts
export class ExaSearch {
  constructor(private mcpClient: McpClient) {}

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const response = await this.mcpClient.callTool('web_search', {
      query,
      output_format: 'json',
      ...options
    });
    return JSON.parse(response.content[0].text);
  }

  async filterByDate(results: SearchResult[], after: Date): SearchResult[] {
    return results.filter(r => new Date(r.publishedDate) > after);
  }

  async filterByScore(results: SearchResult[], minScore: number): SearchResult[] {
    return results.filter(r => r.score >= minScore);
  }

  // More utility methods...
}
```

**Benefits**:
- Agents can use native TypeScript instead of MCP tool calls
- Code execution handles all data manipulation
- Reusable skill library

**Drawbacks**:
- Requires maintaining separate SDK package
- Only works in code execution environments

---

### Option 4: Add Pagination/Filtering at Retrieval Layer (HIGH EFFORT)
**Effort**: High | **Impact**: High | **Breaking**: Maybe

Add server-side filtering parameters:

```typescript
web_search({
  query: "AI papers",
  filters: {
    minScore: 0.9,
    afterDate: "2024-01-01",
    maxResults: 3,
    excludeDomains: ["example.com"]
  }
})
```

**Benefits**:
- Filtering happens before token consumption
- Reduces API response size
- Better performance

**Drawbacks**:
- Exa API may not support all filter types
- Increases tool complexity
- Need to maintain filter documentation

---

## Recommended Immediate Action

### ✅ Option 1: Add JSON Output Format

**Rationale**:
1. **Low effort**: ~2 hours implementation
2. **High impact**: Enables code-based workflows immediately
3. **No breaking changes**: Defaults to current markdown behavior
4. **Future-proof**: Foundation for Options 3 & 4

**Implementation Plan**:
```typescript
// Step 1: Add parameter to tool schema
server.tool(
  "web_search",
  "...",
  {
    // ... existing params
    output_format: z.enum(['markdown', 'json']).optional().describe(
      "Response format: markdown (human-readable) or json (code-friendly). Default: markdown"
    )
  },
  async ({ query, output_format = 'markdown', ... }) => {
    // ...

    if (output_format === 'json') {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            metadata: {
              cacheId,
              totalResults: results.length,
              tokenEstimate: estimatedTokens,
              contentLevel
            },
            results: results.map(r => ({
              id: r.id,
              title: r.title,
              url: r.url,
              publishedDate: r.publishedDate,
              author: r.author,
              text: r.text,
              score: r.score,
              image: r.image,
              favicon: r.favicon
            }))
          }, null, 2)
        }]
      };
    }

    // Existing markdown formatting
    return formatSearchResponse(...);
  }
);
```

**Files to modify**:
- `src/tools/webSearch.ts` (add parameter, add JSON formatter)
- `src/tools/researchPaperSearch.ts` (same)
- `src/tools/companyResearch.ts` (same)
- `src/utils/responseFormatter.ts` (add `formatSearchResponseJSON()`)
- `TOKEN_MANAGEMENT.md` (document JSON mode)

**Testing**:
1. Test with `output_format: 'json'` - verify valid JSON
2. Test default behavior - verify markdown unchanged
3. Test code execution: `JSON.parse(response).results.filter(...)`
4. Verify token estimates for both formats

---

## Long-Term Considerations

### When to Implement Options 3 & 4:

**Option 3 (SDK)**: When we see repeated patterns in agent code
- Wait for 10+ production usage examples
- Identify common filtering/transformation patterns
- Build SDK from proven patterns

**Option 4 (Server Filters)**: When Exa API adds filter support
- Monitor Exa API changelog
- Wait for native filtering capabilities
- Avoid reimplementing what API should do

---

## Decision: What Should We Do Now?

### My Recommendation: **Implement Option 1 (JSON Output)**

**Reasons**:
1. **Aligns with Anthropic's article**: "filtering happens in code, not in context"
2. **Low risk**: Backward compatible, no breaking changes
3. **High value**: Unlocks code execution workflows immediately
4. **Quick win**: ~2 hours implementation, high ROI

**Alternative: Do Nothing**

**Reasons to wait**:
1. Current implementation already achieves 78-94% token reduction
2. Progressive disclosure via caching works well
3. No user complaints about current design
4. Focus efforts on fixing MCP resources (still disabled)

**My vote**: Implement Option 1 this week. It's a natural evolution that makes our MCP more versatile without adding complexity.

---

## Questions for User

1. **Do you want JSON output format added?** (Option 1)
2. **Should we fix MCP resources first?** (currently disabled due to API errors)
3. **Are Claude Skills/Agents using code execution?** (affects priority)
4. **Any specific filtering patterns you've noticed?** (informs Option 4)

---

## Success Metrics

If we implement Option 1, measure:
- **Adoption**: % of calls using `output_format: 'json'`
- **Token savings**: Compare tokens consumed with/without code filtering
- **User feedback**: Does JSON mode improve workflows?
- **Error rates**: Does JSON parsing introduce bugs?

Target: 30%+ adoption within 2 weeks of release
