# Exa MCP Server 🔍
[![npm version](https://badge.fury.io/js/exa-mcp-server.svg)](https://www.npmjs.com/package/exa-mcp-server)
[![smithery badge](https://smithery.ai/badge/exa)](https://smithery.ai/server/exa)

A Model Context Protocol (MCP) server lets AI assistants like Claude use the Exa AI Search API for web searches. This setup allows AI models to get real-time web information in a safe and controlled way.

## 🔀 About This Fork

This is an enhanced fork of the original [Exa MCP Server](https://github.com/exa-labs/exa-mcp-server) by the Exa team. This fork adds support for Server-Sent Events (SSE) to enable compatibility with ElevenLabs Conversational AI and other platforms that require SSE-based MCP connections.

### Key Improvements
- **SSE Support**: Added Server-Sent Events support for ElevenLabs Conversational AI integration
- **Secure API Key Handling**: Enhanced security for API key management in hosted environments
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

#### For ElevenLabs Conversational AI

Use these settings when adding a custom MCP server:

- **Name**: Exa Search
- **Description**: Web search capabilities powered by Exa AI
- **Server type**: SSE
- **Server URL Type**: Value
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

- **web_search_exa**: Performs real-time web searches with optimized results and content extraction.
- **research_paper_search**: Specialized search focused on academic papers and research content.
- **company_research**: Comprehensive company research tool that crawls company websites to gather detailed information about businesses.
- **crawling**: Extracts content from specific URLs, useful for reading articles, PDFs, or any web page when you have the exact URL.
- **competitor_finder**: Identifies competitors of a company by searching for businesses offering similar products or services.
- **linkedin_search**: Search LinkedIn for companies and people using Exa AI. Simply include company names, person names, or specific LinkedIn URLs in your query.
- **wikipedia_search_exa**: Search and retrieve information from Wikipedia articles on specific topics, giving you accurate, structured knowledge from the world's largest encyclopedia.
- **github_search**: Search GitHub repositories using Exa AI - performs real-time searches on GitHub.com to find relevant repositories, issues, and GitHub accounts.

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
        "--tools=web_search_exa,research_paper_search,company_research,crawling,competitor_finder,linkedin_search,wikipedia_search_exa,github_search"
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
        "--tools=web_search_exa,research_paper_search,company_research,crawling,competitor_finder,linkedin_search,wikipedia_search_exa,github_search"
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
npx exa-mcp-server --tools=web_search_exa

# Enable multiple tools
npx exa-mcp-server --tools=web_search_exa,research_paper_search

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

#### With ElevenLabs
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

<br>

---

Built with ❤️ by team Exa

Fork enhanced with SSE support by [Boris Djordjevic](https://github.com/BorisDjordje) at [199 Biotechnologies](https://github.com/199-biotechnologies)