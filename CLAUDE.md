# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is the Exa AI MCP (Model Context Protocol) Server that provides web search capabilities to AI assistants. It offers 8 specialized search tools that can be enabled/disabled based on user needs.

## Development Commands
```bash
# Build the project (defaults to HTTP transport for Vercel)
npm run build

# Build for local npm package distribution (stdio transport)
npm run build:stdio

# Development mode using Smithery CLI
npm run dev

# Watch mode for TypeScript compilation
npm run watch

# Debug with MCP inspector
npm run inspector

# Deploy to Vercel production
vercel --prod
```

## Architecture
- **Transport Types**: Supports both stdio (npm package) and HTTP (Vercel) transports
- **Tool Structure**: Each tool in `/src/tools/` is a modular implementation with its own handler
- **Build System**: Uses Smithery CLI to build different transport bundles
- **Entry Points**:
  - Local: `build/index.js` (stdio transport)
  - Vercel: `api/mcp.ts` (HTTP transport)

## Key Implementation Details
- All tools extend a common pattern using `@modelcontextprotocol/sdk`
- Tools validate inputs using Zod schemas
- Each tool returns structured data with proper error handling
- Request IDs are generated for debugging (see `/src/utils/logging.ts`)
- API authentication via `EXA_API_KEY` environment variable

## Testing Individual Tools
To test a specific tool during development:
1. Use the MCP inspector: `npm run inspector`
2. Or test via the deployed Vercel endpoint with curl/httpie
3. Tools can be enabled/disabled via the `enabledTools` configuration

## Deployment Notes
- Vercel deployment is triggered manually with `vercel --prod`
- The `api/mcp.ts` handler builds the server instance on cold start
- Environment variable `EXA_API_KEY` must be set in Vercel
- Default configuration enables only `web_search_exa` tool on Vercel