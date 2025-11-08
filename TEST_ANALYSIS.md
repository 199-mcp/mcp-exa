# MCP Server Test Analysis & Issues

**Date**: 2025-11-08
**Version**: 2.0
**Status**: In Testing

---

## ✅ Tests Passed

### 1. Build System
- [x] Build completes successfully
- [x] Bundle size: 1.81 MB (reasonable)
- [x] No TypeScript compilation errors
- [x] No dependency issues

### 2. File Structure
- [x] All new files created correctly
- [x] Imports resolve properly
- [x] No circular dependencies detected

### 3. Vercel Deployment
- [x] Deployed successfully to production
- [x] stdio build skipped in Vercel (fixed)
- [x] SHTTP transport built correctly

---

## ⚠️ Issues Found

### **Issue 1: Unused Function in responseFormatter.ts**

**Severity**: Low (Dead code)
**File**: `src/utils/responseFormatter.ts`
**Line**: 239-278

```typescript
export function getTokenManagementGuidance(): string {
  return `
📖 TOKEN MANAGEMENT GUIDE FOR THIS MCP SERVER
...
  `.trim();
}
```

**Problem**: This function is exported but never used. We removed the `get_token_guidance` tool but left the function.

**Impact**:
- Increases bundle size by ~2KB
- Dead code in production
- Confusing for future developers

**Fix**:
```typescript
// DELETE this entire function (lines 236-278)
```

**Action Required**: Yes

---

### **Issue 2: Token Estimation May Be Inaccurate for Non-English Content**

**Severity**: Medium (Accuracy concern)
**File**: `src/utils/tokenEstimator.ts`
**Line**: 23-30

```typescript
export function estimateTokens(text: string): TokenEstimate {
  const characters = text.length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const estimatedTokens = Math.ceil(characters / 4); // ← Assumption

  return { characters, estimatedTokens, words };
}
```

**Problem**: The `characters / 4` approximation works well for English but:
- CJK languages (Chinese, Japanese, Korean): 1 char ≈ 1-2 tokens (not 0.25)
- Code-heavy content: Often more tokens than characters/4
- URLs: Can be 1 token per URL component

**Example**:
```
English: "Hello world" = 11 chars / 4 = ~3 tokens ✓
Chinese: "你好世界" = 4 chars / 4 = 1 token ✗ (actually ~4 tokens)
URL: "https://example.com/path" = 24 chars / 4 = 6 tokens (actually ~8-10)
```

**Impact**:
- Token estimates could be 50-200% off for non-English content
- May still cause overflow for CJK-heavy responses
- Cost estimates inaccurate

**Possible Fixes**:
1. **Add language detection** and use different ratios
2. **Add content type detection** (code, URL, prose)
3. **Use actual tokenizer** (e.g., tiktoken for GPT-compatible counting)
4. **Add safety margin** (multiply estimate by 1.3x)

**Recommendation**: Add 30% safety margin for now:
```typescript
const estimatedTokens = Math.ceil((characters / 4) * 1.3); // 30% margin
```

**Action Required**: Recommended

---

### **Issue 3: Cache Cleanup Runs Only on Server Start**

**Severity**: Medium (Resource leak potential)
**File**: `src/utils/resultCache.ts`
**Line**: Constructor calls `cleanupOldCaches()`

```typescript
constructor() {
  this.cacheDir = path.join(os.tmpdir(), 'exa-mcp-cache');
  this.ensureCacheDir();
  this.cleanupOldCaches(); // ← Only called once on startup
}
```

**Problem**: Cleanup happens only when ResultCacheManager is instantiated (server start). After that:
- Expired caches remain on disk for hours
- No periodic cleanup
- Could accumulate 100+ cache files before eviction
- Disk space could grow unbounded on long-running servers

**Impact**:
- Temp directory bloat on long-running servers
- Potential disk space issues
- Stale cache files persist

**Fix**: Add periodic cleanup
```typescript
private cleanupInterval: NodeJS.Timeout | null = null;

constructor() {
  this.cacheDir = path.join(os.tmpdir(), 'exa-mcp-cache');
  this.ensureCacheDir();
  this.cleanupOldCaches();

  // Cleanup every 5 minutes
  this.cleanupInterval = setInterval(() => {
    this.cleanupOldCaches();
  }, 5 * 60 * 1000);
}

public destroy(): void {
  if (this.cleanupInterval) {
    clearInterval(this.cleanupInterval);
  }
}
```

**Action Required**: Yes

---

### **Issue 4: No Validation of cache_id Format in retrieve_result**

**Severity**: Low (Security/UX)
**File**: `src/tools/webSearch.ts`
**Line**: 140-145

```typescript
async ({ cache_id, result_index }) => {
  // No validation of cache_id format
  const cached = resultCache.getCachedResults(cache_id);

  if (!cached) {
    return { content: [{ type: "text", text: `Cache not found...` }], isError: true };
  }
```

**Problem**:
- No validation that `cache_id` matches expected format (`exa-{timestamp}-{random}`)
- Could accept arbitrary strings leading to filesystem traversal attempts
- Error message is generic (doesn't distinguish malformed vs. expired)

**Security Risk**: Path traversal if `cache_id` contains `../`
**Current mitigation**: `getCacheFilePath()` uses `path.join(this.cacheDir, \`${cacheId}.json\`)` which sanitizes somewhat

**Example Attack**:
```typescript
retrieve_result({
  cache_id: "../../etc/passwd",
  result_index: 0
})
// Tries to read: /tmp/exa-mcp-cache/../../etc/passwd.json
```

**Fix**: Add validation
```typescript
// In retrieve_result tool
if (!/^exa-\d+-[a-z0-9]+$/.test(cache_id)) {
  return {
    content: [{
      type: "text" as const,
      text: `Invalid cache ID format. Expected: exa-{timestamp}-{random}`
    }],
    isError: true
  };
}
```

**Action Required**: Yes (security)

---

### **Issue 5: MCP Resources Not Registered in HTTP/SSE Transport**

**Severity**: Medium (Feature broken in production)
**File**: `src/index.ts`
**Line**: 130-132

```typescript
// Register MCP resource handlers for cached search results
registerResourceHandlers(server);
log("Resource handlers registered for cached search results");
```

**Problem**: MCP Resources work in stdio transport but may not work in HTTP/SSE (Vercel deployment)

**Why**: The `server.resource()` API requires different handling in different transports:
- **stdio**: Resources work via standard MCP protocol
- **HTTP/SSE**: Resources need HTTP endpoints

**Impact**:
- `exa://search/{cacheId}` URIs won't work in Vercel deployment
- Only stdio (local npm) deployment has resources
- Documentation promises feature that doesn't work in production

**Test**: Check if Vercel deployment supports resources API

**Fix Required**: Either:
1. Document that resources only work in stdio mode, OR
2. Implement HTTP resource endpoints for Vercel

**Action Required**: Yes (documentation or implementation)

---

### **Issue 6: Response Metadata Has Extra Newline in Markdown**

**Severity**: Low (Formatting)
**File**: `src/utils/tokenEstimator.ts`
**Line**: 88

```typescript
export function formatMetadataForClaude(metadata: ResponseMetadata): string {
  const lines = [
    `## Response Metadata\n`,  // ← Extra \n creates blank line
    `- Results: ${metadata.returnedResults}/${metadata.totalResults}...`,
```

**Problem**: Adding `\n` at end of header creates extra blank line:
```markdown
## Response Metadata

                        ← Extra blank line
- Results: 3/3
```

**Impact**: Wastes ~1 token per response

**Fix**:
```typescript
const lines = [
  `## Response Metadata`,  // Remove \n
  `- Results: ${metadata.returnedResults}/${metadata.totalResults}...`,
```

**Action Required**: Optional (micro-optimization)

---

### **Issue 7: cache_id Extraction Pattern Not Documented**

**Severity**: Low (UX)
**Files**: Documentation
**Lines**: N/A

**Problem**: Claude Skills need to extract `cache_id` from web_search responses, but the pattern isn't clearly documented.

**Current response format**:
```markdown
## Response Metadata
...
**Cache ID**: `exa-1699564234-abc123`
```

**Issue**: Claude has to parse markdown to extract the cache ID. Better to have it in structured location.

**Better approach**: Return cache_id in tool response metadata
```typescript
return {
  content: [{ type: "text", text: formatted.text }],
  _meta: { cache_id: cacheId }  // MCP metadata field
};
```

**Impact**: Claude has to do text parsing instead of structured access

**Fix**: Add cache_id to MCP response metadata (if supported by MCP SDK)

**Action Required**: Investigate MCP SDK capabilities

---

### **Issue 8: Error Messages Still Use Emojis**

**Severity**: Low (Inconsistency)
**File**: `src/utils/responseFormatter.ts`
**Line**: 218

**Wait, I need to check this:**
