# Exa MCP Server 🔍
[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa)](https://smithery.ai/server/exa)

A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way.

## 🔀 About This Fork

This is an enhanced fork of the original [Exa MCP Server](https://github.com/exa-labs/exa-mcp-server) by the Exa team. This fork adds support for Server-Sent Events (SSE) to enable remote MCP connections for any platform that supports SSE-based communication.

### Key Improvements
- **SSE Support**: Added Server-Sent Events transport for remote MCP connections
- **Secure API Key Handling**: Enhanced security by accepting API keys as URL parameters instead of environment variables
- **Vercel Deployment**: Improved deployment configuration for self-hosting on Vercel

### Credits
- **Original Authors**: The Exa team at [Exa AI](https://exa.ai)
- **Fork Maintainer**: [Boris Djordjevic](https://github.com/BorisDjordje) at [199 Biotechnologies](https://github.com/199-biotechnologies)

## Installation Options

### Option 1: Remote Hosted Server (Recommended) 🌐

Connect directly to Exa's hosted MCP server without running anything locally.

#### For Claude Desktop

Add this to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.exa.ai/mcp?exaApiKey=your-exa-api-key"
      ]
    }
  }
}
```

Replace `your-exa-api-key` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

#### For SSE-Compatible Platforms

For platforms that support SSE-based MCP connections (like ElevenLabs Conversational AI), use:

- **Server type**: SSE
- **URL**: `https://exa.atp.dev/api/mcp?exaApiKey=your-exa-api-key`

Replace `your-exa-api-key` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### Option 2: Local Installation

#### NPM Installation

```bash
npm install -g exa-mcp-server
```

#### Using Smithery

To install the Exa MCP server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/exa):

```bash
npx -y @smithery/cli install exa --client claude
```

## Configuration ⚙️

### 1. Configure Claude Desktop to recognize the Exa MCP server

You can find claude_desktop_config.json inside the settings of Claude Desktop app:

Open the Claude Desktop app and enable Developer Mode from the top-left menu bar. 

Once enabled, open Settings (also from the top-left menu bar) and navigate to the Developer Option, where you'll find the Edit Config button. Clicking it will open the claude_desktop_config.json file, allowing you to make the necessary edits. 

OR (if you want to open claude_desktop_config.json from terminal)

#### For macOS:

1. Open your Claude Desktop configuration:

```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### For Windows:

1. Open your Claude Desktop configuration:

```powershell
code %APPDATA%\Claude\claude_desktop_config.json
```

### 2. Add the Exa server configuration:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Replace `your-api-key-here` with your actual Exa API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

### 3. Available Tools & Tool Selection

The Exa MCP server includes the following tools, which can be enabled by adding the `--tools`:

- **web_search**: Searches the web in real-time. Returns: page content, titles, URLs. Use when: need current information beyond training data.
- **academic_search**: Searches academic papers and research. Returns: paper abstracts, citations, authors. Use when: need peer-reviewed sources.
- **company_search**: Searches company information and news. Returns: business data, financials, recent news. Use when: researching businesses or organizations.
- **url_content**: Extracts full content from specific URLs. Returns: complete page text, metadata. Use when: have exact URL to analyze.
- **competitor_search**: Finds business competitors. Returns: similar companies, market analysis. Use when: asked 'who competes with X' or competitive analysis.
- **linkedin_search**: Searches LinkedIn profiles and companies. Returns: professional profiles, company pages. Use when: researching people or professional networks.
- **wikipedia_search**: Searches Wikipedia encyclopedia. Returns: article summaries, factual content. Use when: need encyclopedic or reference information.
- **github_search**: Searches GitHub repositories and code. Returns: repos, code snippets, READMEs. Use when: looking for code examples or open source projects.

You can choose which tools to enable by adding the `--tools` parameter to your Claude Desktop configuration:

#### Specify which tools to enable:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=web_search,academic_search,company_search,url_content,competitor_search,linkedin_search,wikipedia_search,github_search"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

For enabling multiple tools, use a comma-separated list:

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "--tools=web_search,academic_search,company_search,url_content,competitor_search,linkedin_search,wikipedia_search,github_search"
      ],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

If you don't specify any tools, all tools enabled by default will be used.

### 4. Restart Claude Desktop

For the changes to take effect:

1. Completely quit Claude Desktop (not just close the window)
2. Start Claude Desktop again
3. Look for the icon to verify the Exa server is connected

## Using via NPX

If you prefer to run the server directly, you can use npx:

```bash
# Run with all tools enabled by default
npx exa-mcp-server

# Enable specific tools only
npx exa-mcp-server --tools=web_search

# Enable multiple tools
npx exa-mcp-server --tools=web_search,academic_search

# List all available tools
npx exa-mcp-server --list-tools
```

## Self-Hosting on Vercel 🚀

You can deploy your own instance of the Exa MCP server on Vercel:

1. Fork this repository
2. Deploy to Vercel using the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/exa-labs/exa-mcp-server)

3. Your server will be available at `https://your-project.vercel.app/api/mcp`

### Using Your Self-Hosted Server

#### With Claude Desktop
```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-project.vercel.app/api/mcp?exaApiKey=your-exa-api-key"
      ]
    }
  }
}
```

#### With SSE-Compatible Platforms
- **Server type**: SSE
- **URL**: `https://your-project.vercel.app/api/mcp?exaApiKey=your-exa-api-key`

Replace `your-exa-api-key` with your actual Exa API key.

## Troubleshooting 🔧

### Common Issues

1. **Server Not Found**
   * Verify the npm link is correctly set up
   * Check Claude Desktop configuration syntax (json file)

2. **API Key Issues**
   * Confirm your EXA_API_KEY is valid
   * Check the EXA_API_KEY is correctly set in the Claude Desktop config
   * Verify no spaces or quotes around the API key

3. **Connection Issues**
   * Restart Claude Desktop completely
   * Check Claude Desktop logs:

---

Fork enhanced with SSE support by [Boris Djordjevic](https://github.com/BorisDjordje) at [199 Biotechnologies](https://github.com/199-biotechnologies)