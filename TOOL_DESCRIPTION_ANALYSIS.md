# Tool Description Analysis & Optimization

## 🎯 Problem: Token Overhead in Tool Descriptions

### Current State

**Tool**: `web_search`
**Description Length**: ~500 tokens
**Impact**: Processed EVERY time Claude considers tools

```
Searches the web in real-time with TOKEN-AWARE responses...
[26 lines of guidance, examples, warnings]
```

**Issue**: If server has 8 tools with similar verbosity = 4000+ tokens just for tool selection overhead!

### Why This Matters

#### Tool Calling Process
1. Claude receives user request
2. Claude sees ALL tool names + descriptions
3. Pattern matches task → tool
4. Selects tool based on name + description
5. Constructs parameters from schema

**Key Insight**: Description should be CRISP and DISTINCTIVE, not comprehensive.

#### Token Cost Per Request
- Current: ~4000 tokens (8 tools × 500 tokens)
- Optimized: ~800 tokens (8 tools × 100 tokens)
- **Savings**: 3200 tokens per request with tools

At $3/MTok input:
- Current cost: $0.012 per request
- Optimized: $0.0024 per request
- **Savings**: 80% on tool overhead

#### Cognitive Load
- **Too verbose**: Claude spends tokens processing guidance instead of doing work
- **Confusion**: Mixed intentions (what tool does vs. how to use it)
- **Redundancy**: Information repeated in params, responses, docs

---

## 🔍 Detailed Analysis

### Current Tool Descriptions

#### 1. `web_search` (26 lines, ~500 tokens)

**Sections**:
- Description (1 line) ✅
- WHEN TO USE (3 bullets) ⚠️
- CONTENT LEVELS (3 bullets) ⚠️
- TOKEN MANAGEMENT (4 bullets) ❌
- RECOMMENDED USAGE (3 bullets) ❌
- AVOID TOKEN OVERFLOW (3 bullets) ❌

**What's essential**: Lines 1-2
**What's redundant**: Lines 3-26 (already in params, responses, docs)

**Estimated overhead**: ~450 tokens of unnecessary context

#### 2. `get_search_result` (~300 tokens)

```
Retrieves a SPECIFIC result from a previous search using progressive disclosure.

🎯 WHEN TO USE:
• You have a cache_id from a previous web_search
• Want full content of specific result without loading all results
• Need to deep-dive into one result while keeping token usage low

💡 PATTERN (Context Engineering):
[multi-line pattern example]

📊 TOKEN EFFICIENCY:
[comparison examples]
```

**Issue**: Teaching how to use progressive disclosure IN the tool description

**What's essential**: Line 1
**What's redundant**: Lines 2-15

#### 3. `get_token_guidance` (~200 tokens)

```
Returns comprehensive guidance on managing tokens when using Exa search tools.
Use when you need to optimize token usage or understand content level options.
```

**Issue**: Meta-tool (helps use other tools). Problematic because:
- If Claude is confused about tokens → calls this → gets 2000 more tokens → still confused
- Creates potential recursion
- Static information should be in server metadata, not callable tool

**Recommendation**: REMOVE this tool entirely

---

## ✅ Optimization Principles

### 1. Brevity
- **Target**: 1-3 sentences, ~30-50 tokens
- **Focus**: WHAT the tool does, not HOW to use it

### 2. Distinctiveness
- **Goal**: Clear differentiation from other tools
- **Method**: Unique action verb + domain

### 3. Action-Oriented
- **Pattern**: [Verb] [object] [with/using] [key differentiator]
- **Example**: "Search web content with configurable detail levels"

### 4. No Redundancy
- Don't repeat parameter descriptions
- Don't repeat response metadata content
- Don't repeat documentation

### 5. No Instructions
- Instructions belong in parameter descriptions
- Guidance belongs in responses
- Examples belong in docs

### 6. No Meta-Information
- Don't explain token management in tool description
- Don't teach Context Engineering patterns
- Server metadata handles this once

---

## 🎨 Redesigned Tool Descriptions

### Server Metadata (One-Time Context)

```typescript
const server = new McpServer({
  name: "exa-search-server",
  version: "2.0.0",
  description: "Token-aware web search with progressive disclosure. " +
               "Responses include token estimates and cache IDs. " +
               "Use content_level parameter to control detail (summary/standard/full). " +
               "Results cached 5min for follow-up retrieval."
});
```

**Impact**: Sets context ONCE, not on every tool call
**Length**: ~50 tokens (vs. 500+ in each tool)

### Tool 1: web_search

**BEFORE** (500 tokens):
```
Searches the web in real-time with TOKEN-AWARE responses to prevent context overflow.

🎯 WHEN TO USE:
• Need current information beyond training data
[...22 more lines...]
```

**AFTER** (35 tokens):
```
Real-time web search with configurable detail levels. Returns results with token estimates and cache ID for progressive retrieval.
```

**Rationale**:
- "Real-time web search" = clear action
- "configurable detail levels" = hints at content_level param
- "token estimates" = key differentiator
- "cache ID for progressive retrieval" = hints at follow-up pattern
- Everything else is in params or responses

### Tool 2: retrieve_result (renamed from get_search_result)

**BEFORE** (300 tokens):
```
Retrieves a SPECIFIC result from a previous search using progressive disclosure.

🎯 WHEN TO USE:
• You have a cache_id from a previous web_search
[...12 more lines...]
```

**AFTER** (28 tokens):
```
Retrieve individual result from cached search by index. Use after web_search for progressive disclosure.
```

**Changes**:
- Renamed: `get_search_result` → `retrieve_result` (clearer action verb)
- Removed: Usage patterns (obvious from params)
- Removed: Token efficiency examples (in docs)
- Added: "Use after web_search" = clear sequencing

### Tool 3: token_help (formerly get_token_guidance)

**BEFORE** (200 tokens + returns 2000 tokens):
```
Returns comprehensive guidance on managing tokens when using Exa search tools.
Use when you need to optimize token usage or understand content level options.
```

**AFTER**: **REMOVED**

**Rationale**:
- Meta-tool creates confusion
- Static content doesn't need tool call
- Information moved to:
  - Server description (brief)
  - Response metadata (contextual)
  - TOKEN_MANAGEMENT.md (comprehensive)

---

## 📊 Parameter Description Optimization

### Current Parameters (verbose)

```typescript
query: z.string().describe(
  "Search query (e.g., 'OpenAI GPT-5 release', 'climate change 2024')"
)
```

**Issue**: Examples in param descriptions can confuse tool calling

### Optimized Parameters

```typescript
query: z.string().describe(
  "Search query text"
)

num_results: z.number().min(1).max(20).optional().describe(
  "Number of results to return (default: 3 for standard/full, 5 for summary)"
)

content_level: z.enum(['summary', 'standard', 'full']).optional().describe(
  "Detail level: summary (~150 tok/result), standard (~500 tok/result), full (~1500 tok/result). Default: summary"
)

live_crawl: z.enum(['always', 'auto', 'fallback', 'never']).optional().describe(
  "Content freshness: always=live, auto=balanced, fallback=cached, never=cache-only. Default: auto"
)

max_chars_per_result: z.number().min(500).max(5000).optional().describe(
  "Override smart character limit per result (500-5000)"
)
```

**For retrieve_result**:

```typescript
cache_id: z.string().describe(
  "Cache identifier from previous web_search response (valid 5 minutes)"
)

result_index: z.number().min(0).describe(
  "Zero-based index of result to retrieve (shown in search results)"
)
```

**Changes**:
- Removed: Examples (Claude knows what a search query is)
- Added: Constraints (min/max) for validation
- Kept: Token estimates (essential for decision-making)
- Simplified: Explanations (one phrase, not sentences)

---

## 🚨 Potential Tool Conflicts

### Conflict 1: Multiple Search Tools

When we have:
- `web_search`
- `academic_search`
- `company_search`
- `linkedin_search`
- `wikipedia_search`
- `github_search`

**Risk**: "Search for quantum computing papers"
- Could match: `web_search` (has "search")
- Should match: `academic_search`

**Solution**: Domain-specific descriptions

```typescript
web_search: "Real-time web search across general internet content..."
academic_search: "Search academic papers, journals, and research publications with citation data..."
company_search: "Search company profiles, business intelligence, and corporate information..."
linkedin_search: "Search LinkedIn professional profiles, company pages, and job postings..."
wikipedia_search: "Search Wikipedia articles and encyclopedic knowledge base..."
github_search: "Search GitHub repositories, code, issues, and developer resources..."
```

**Pattern**: [Domain] first, then action, then differentiator

### Conflict 2: retrieve_result vs. web_search

**Scenario**: User says "get result 3"

**Risk**: Ambiguous whether this means:
- New search for query "result 3" (web_search)
- Retrieve index 3 from cache (retrieve_result)

**Current mitigation**:
- Tool name: `retrieve_result` (not `get_result`)
- Requires: `cache_id` parameter (not present in new search)
- Description: "from cached search" (clear context)

**Additional safeguard**: Parameter requirement

```typescript
// retrieve_result requires cache_id (mandatory)
// If no cache_id, Claude can't call this tool
cache_id: z.string()  // Not optional!
```

### Conflict 3: url_content vs. web_search

**Scenario**: User says "get content from https://example.com"

**Risk**: Both can fetch URL content

**Differentiation**:
```typescript
web_search: "Real-time web search..." // Emphasis: search
url_content: "Fetch and extract content from specific URLs..." // Emphasis: specific URL
```

**Parameter difference**:
- `web_search`: requires `query` (text)
- `url_content`: requires `url` (URL format)

---

## 📉 Response Formatting Optimization

### Current Format (emoji-heavy)

```
📊 RESPONSE METADATA
─────────────────────
Results: 3/3 (complete)
Content Level: STANDARD
Token Estimate: ~1,523 tokens
...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Token cost**: ~50-100 tokens for formatting

**Issues**:
- Emojis: 2-4 tokens each
- Box drawing: Extra tokens
- Repeated separators: Waste

### Optimized Format (markdown)

```markdown
## Search Results

**Metadata**
- Results: 3/3 (complete)
- Content Level: STANDARD
- Token Estimate: ~1,523 tokens
- Cost: ~$0.0046 (input)
- Cache ID: `exa-1699564234-abc123`

**Progressive Disclosure**
Use cache ID + result index (0-2) to retrieve specific results.
Cache expires in 5 minutes.

---

[RESULTS]
```

**Token cost**: ~30-40 tokens (40% reduction)

**Benefits**:
- Standard markdown = better parsing
- Less decorative overhead
- Same information density
- More LLM-friendly

---

## 🎯 Recommended Changes Summary

### 1. Shorten Tool Descriptions (80% reduction)
- `web_search`: 500 tok → 35 tok
- `retrieve_result`: 300 tok → 28 tok
- `token_help`: REMOVE (200 tok → 0 tok)
- **Total**: 1000 tok → 63 tok per MCP server instance

### 2. Add Server Metadata (one-time cost)
- Server description: 50 tokens (once per session)
- Replaces: 1000s of tokens repeated per tool call

### 3. Optimize Parameter Descriptions
- Remove examples
- Add constraints (min/max)
- Keep essential token estimates
- Simplify explanations

### 4. Simplify Response Formatting
- Replace emojis with markdown
- Remove decorative separators
- Keep information density
- ~40% token reduction in responses

### 5. Remove Meta-Tool
- Delete `get_token_guidance`
- Move to server metadata + response metadata + docs

### 6. Rename for Clarity
- `get_search_result` → `retrieve_result`
- More distinctive action verb
- Clearer differentiation from `web_search`

---

## 📊 Impact Projection

### Token Savings Per Request

**Tool Selection Overhead**:
- Before: 1000 tokens (3 tools with verbose descriptions)
- After: 63 tokens (3 tools with concise descriptions)
- **Savings**: 937 tokens per tool-using request

**Response Formatting**:
- Before: ~100 tokens (emojis + boxes per response)
- After: ~40 tokens (markdown)
- **Savings**: 60 tokens per response

**Meta-Tool Removal**:
- Before: 200 tok (description) + 2000 tok (response) if called
- After: 0 tok (removed)
- **Savings**: 2200 tokens when would have been called

### Cost Savings

**Per 1000 requests** (assume 50% use tools):
- Tool overhead: 937 tok × 500 req = 468,500 tokens saved
- Response format: 60 tok × 500 req = 30,000 tokens saved
- Total: ~500,000 tokens saved

At $3/MTok input:
- **Savings**: ~$1.50 per 1000 requests
- **Percentage**: ~30% reduction in tool-related token usage

### Latency Improvement
- Less tokens = faster processing
- Estimated: 10-15% faster tool selection
- Better: More reliable tool selection (less confusion)

---

## ✅ Implementation Checklist

- [ ] Update server metadata with concise description
- [ ] Shorten web_search description to 35 tokens
- [ ] Rename get_search_result → retrieve_result
- [ ] Shorten retrieve_result description to 28 tokens
- [ ] Remove get_token_guidance tool
- [ ] Optimize parameter descriptions (remove examples)
- [ ] Simplify response formatting (markdown over emojis)
- [ ] Test tool selection with ambiguous queries
- [ ] Validate token estimates
- [ ] Update documentation to reflect changes

---

## 🧪 Test Scenarios

### 1. Basic Search
**User**: "Search for quantum computing news"
**Expected Tool**: `web_search`
**Parameters**: `query="quantum computing news", content_level="summary"`

### 2. Progressive Disclosure
**User**: "Get result 3 from that search"
**Expected Tool**: `retrieve_result`
**Parameters**: `cache_id="exa-123...", result_index=3`
**Conflict Risk**: Should NOT call `web_search` with `query="result 3"`

### 3. Specific URL
**User**: "Get content from https://example.com"
**Expected Tool**: `url_content` (when implemented)
**Conflict Risk**: Should NOT call `web_search` with `query="https://example.com"`

### 4. Domain-Specific Search
**User**: "Find papers on protein folding"
**Expected Tool**: `academic_search` (when implemented)
**Conflict Risk**: Should NOT call `web_search`

### 5. Multiple Results
**User**: "Search AI news, get 10 results"
**Expected Tool**: `web_search`
**Expected Params**: `num_results=10, content_level="summary"` (smart default)

---

## 📚 Documentation Updates Needed

### TOKEN_MANAGEMENT.md
- [ ] Update tool names (retrieve_result)
- [ ] Remove references to get_token_guidance
- [ ] Add note about server metadata
- [ ] Update examples with new descriptions

### IMPLEMENTATION_SUMMARY.md
- [ ] Update tool list
- [ ] Add optimization metrics
- [ ] Document rename rationale

### QUICK_REFERENCE.md
- [ ] Update tool names
- [ ] Simplify tool descriptions
- [ ] Remove meta-tool references

---

**Recommendation**: Implement these changes immediately. The 80% reduction in tool description overhead will significantly improve performance and reliability of tool selection.
