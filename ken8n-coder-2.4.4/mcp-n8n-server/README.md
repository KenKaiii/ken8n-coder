# ken8n MCP - Deployment Server for ken8n-coder

```
 ██╗  ██╗███████╗███╗   ██╗ █████╗ ███╗   ██╗     ███╗   ███╗ ██████╗██████╗ 
 ██║ ██╔╝██╔════╝████╗  ██║██╔══██╗████╗  ██║     ████╗ ████║██╔════╝██╔══██╗
 █████╔╝ █████╗  ██╔██╗ ██║╚█████╔╝██╔██╗ ██║     ██╔████╔██║██║     ██████╔╝
 ██╔═██╗ ██╔══╝  ██║╚██╗██║██╔══██╗██║╚██╗██║     ██║╚██╔╝██║██║     ██╔═══╝ 
 ██║  ██╗███████╗██║ ╚████║╚█████╔╝██║ ╚████║     ██║ ╚═╝ ██║╚██████╗██║     
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚════╝ ╚═╝  ╚═══╝     ╚═╝     ╚═╝ ╚═════╝╚═╝     
```

**MCP server addon for [ken8n-coder](https://github.com/kenkaiii/ken8n-coder) - Deploy AI-generated workflows directly to n8n**

## What is This?

This is an MCP (Model Context Protocol) server that works alongside **ken8n-coder** to provide seamless deployment of AI-generated n8n workflows. While ken8n-coder creates workflows using natural language, this MCP server handles the deployment, testing, and management of those workflows in your n8n instance.

### The Complete Workflow

1. **ken8n-coder** - AI creates n8n workflow code from your description
2. **ken8n MCP** - Deploys that workflow directly to your n8n instance
3. **Result** - Your workflow is live and running, no manual copy-paste needed!

## Features

- 🚀 **Direct deployment** - Deploy workflows created by ken8n-coder straight to n8n
- 🔧 **Auto-fixes webhook issues** - Automatically corrects webhook versions and generates UUIDs
- 📊 **Test workflows** - Execute and monitor workflow results
- 🗑️ **Manage workflows** - List, update, and delete workflows
- ⚡ **No file management** - Works with JSON directly, no temp files
- 🛡️ **Bulletproof** - Handles all edge cases and errors gracefully

## Installation

### For ken8n-coder Users

If you're already using ken8n-coder, add this MCP server to enable deployment:

```bash
# Install ken8n-coder (if not already installed)
npm i -g ken8n-coder@latest

# Setup the MCP deployment server
npx @kenkaiii/ken8n-mcp ken8n-mcp-setup
```

The setup will guide you through:
1. Entering your n8n URL (e.g., http://localhost:5678)
2. Getting your n8n API key (Settings → n8n API → Create new key)
3. Adding the configuration to Claude Desktop

## Configuration

Add this to your `claude_mcp.json` file (usually at `~/.config/claude-desktop/claude_mcp.json`):

```json
{
  "mcpServers": {
    "ken8n": {
      "command": "npx",
      "args": ["-y", "@kenkaiii/ken8n-mcp"],
      "env": {
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-n8n-api-key-here"
      }
    }
  }
}
```

### Configuration Options

- `N8N_BASE_URL` - Your n8n instance URL (defaults to http://localhost:5678)
- `N8N_API_KEY` - Your n8n API key (required - get from n8n Settings)

## Available Tools for AI Agents

When using ken8n-coder with Claude, the following tools become available:

### `n8n_deploy`
Deploy a workflow created by ken8n-coder to n8n
```javascript
// AI agent can deploy workflows directly
n8n_deploy({ workflow: generatedWorkflow })
```

### `n8n_test`
Test a deployed workflow with sample data
```javascript
// Test the workflow with data
n8n_test({ workflowId: "abc123", testData: { test: "data" } })
```

### `n8n_list_workflows`
List all workflows in your n8n instance
```javascript
// See what's deployed
n8n_list_workflows({ limit: 20, active: true })
```

### `n8n_update`
Update an existing workflow
```javascript
// Modify deployed workflow
n8n_update({ workflowId: "abc123", updates: {...} })
```

### `n8n_delete`
Remove a workflow from n8n
```javascript
// Clean up workflows
n8n_delete({ workflowId: "abc123" })
```

### `n8n_get_execution`
Get details about a workflow execution
```javascript
// Check execution results
n8n_get_execution({ executionId: "456" })
```

## Usage with ken8n-coder

### Example Workflow

1. **User to ken8n-coder**: "Create a workflow that monitors RSS feeds and sends Slack notifications"

2. **ken8n-coder generates**: A complete n8n workflow with Super Code nodes

3. **User**: "Deploy this workflow to my n8n"

4. **ken8n MCP automatically**:
   - Validates the workflow structure
   - Fixes any webhook issues
   - Deploys to your n8n instance
   - Returns the webhook URL
   - Activates the workflow

5. **Result**: Your workflow is live and running!

## Auto-Fix Features

The MCP server automatically fixes common workflow issues:

| Issue | Auto-Fix Applied |
|-------|------------------|
| Webhook version < 2.1 | Upgrades to version 2.1 |
| Missing webhookId | Generates UUID |
| Non-UUID webhook paths | Converts to UUID |
| Missing httpMethod | Sets to POST |
| Missing settings object | Adds empty object |
| Missing connections | Adds empty object |

## Comparison: Direct Deployment vs Manual

| Task | Without MCP | With ken8n MCP |
|------|-------------|----------------|
| Deploy workflow | Copy JSON, paste in n8n UI | Automatic via AI command |
| Fix webhook issues | Manual editing | Auto-fixed on deploy |
| Test workflow | Navigate to n8n, trigger manually | Direct test with results |
| Update workflow | Find in UI, edit, save | Single command update |
| Delete workflows | Navigate to each, delete | Bulk delete possible |

## Requirements

- Node.js 16 or higher
- n8n instance with API access enabled
- n8n API key (create in Settings → n8n API)
- ken8n-coder for workflow creation

## Troubleshooting

### "N8N_API_KEY not found"
- Run `npx @kenkaiii/ken8n-mcp ken8n-mcp-setup` to configure
- Or add N8N_API_KEY to your claude_mcp.json env section

### "Cannot connect to n8n"
- Verify your n8n instance is running
- Check N8N_BASE_URL is correct
- Ensure API is enabled in n8n settings

### "Webhook not registered"
- The MCP server auto-fixes webhook issues
- Ensures webhook version is 2.1
- Generates proper webhook IDs

## Development

```bash
# Clone the repository
git clone https://github.com/kenkaiii/ken8n-coder.git
cd ken8n-coder/mcp-n8n-server

# Install dependencies
npm install

# Build
npm run build

# Test locally
N8N_BASE_URL=http://localhost:5678 \
N8N_API_KEY=your-key \
npm start
```

## License

MIT - Part of the [ken8n-coder](https://github.com/kenkaiii/ken8n-coder) project

## Credits

Created by [Ken Kai](https://github.com/kenkaiii) as an addon for ken8n-coder to enable seamless AI-powered n8n workflow deployment.

---

**Note**: This MCP server is designed to work with ken8n-coder. For the complete AI-powered n8n workflow creation experience, install both tools together.