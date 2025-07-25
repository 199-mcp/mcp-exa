# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an enhanced fork of the Exa AI MCP (Model Context Protocol) Server that provides 8 specialized web search tools to AI assistants. The fork adds Server-Sent Events (SSE) support for remote MCP connections and improved deployment options.

## Development Commands
```bash
# Build the project (defaults to HTTP transport for Vercel)
npm run build

# Build for local npm package distribution (stdio transport)
npm run build:stdio

# Prepare for npm publishing (runs build:stdio)
npm run prepare

# Development mode using Smithery CLI
npm run dev

# Watch mode for TypeScript compilation
npm run watch

# Debug with MCP inspector (requires build directory)
npm run inspector

# Deploy to Vercel production
vercel --prod
```

## Architecture
- **Transport Types**: Supports both stdio (npm package) and HTTP/SSE (Vercel) transports
- **Tool Registry**: 8 tools managed through `availableTools` in `/src/index.ts`:
  - web_search: Real-time web searching
  - academic_search: Research paper searches
  - company_search: Company information research
  - url_content: URL content extraction
  - competitor_search: Business competitor analysis
  - linkedin_search: LinkedIn profile/company search
  - wikipedia_search: Wikipedia article search
  - github_search: GitHub repository/code search
- **Build System**: Uses Smithery CLI (@smithery/cli) to build different transport bundles
- **Entry Points**:
  - Local npm: `.smithery/index.cjs` (stdio transport, auto-generated)
  - Vercel: `api/mcp.ts` (HTTP/SSE transport)
  - Schema endpoint: `api/schema.ts`
  - Landing page: `api/index.ts`

## Key Implementation Details
- Tools are registered conditionally based on `enabledTools` configuration in `/src/index.ts`
- Each tool is a separate module in `/src/tools/` with its own Zod schema validation
- Axios client with connection pooling for better performance (`/src/utils/axiosClient.ts`)
- Logging utility with request ID generation (`/src/utils/logger.ts`)
- TypeScript target: ES2022, Module: Node16
- API authentication handled via:
  - Environment variable: `EXA_API_KEY` (for local/stdio)
  - URL parameter: `exaApiKey` (for SSE/remote connections)

## Testing Individual Tools
To test a specific tool during development:
1. Build the project first: `npm run watch` (for continuous compilation)
2. Use the MCP inspector: `npm run inspector`
3. Or test via deployed endpoints:
   - SSE endpoint: `https://your-project.vercel.app/api/mcp?exaApiKey=YOUR_KEY`
   - Schema viewer: `https://your-project.vercel.app/api/schema`

## Deployment Notes
- Vercel deployment requires manual trigger: `vercel --prod`
- The `api/mcp.ts` handler supports both SSE and HTTP transports
- Environment variable `EXA_API_KEY` must be set in Vercel for default operation
- SSE connections accept API key as URL parameter for security
- CORS is enabled for cross-origin requests
- Default configuration enables all tools unless specified otherwise