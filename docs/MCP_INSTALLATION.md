# Ken8n-Coder MCP Installation Guide

## Overview

The ken8n-mcp server enables AI agents to deploy workflows directly to your n8n instance. This guide explains how to install and configure the MCP server for use with ken8n-coder.

## Installation Methods

### Method 1: During Ken8n-Coder Installation (Recommended)

When you install ken8n-coder via curl, you'll be prompted to optionally install the MCP server:

```bash
curl -fsSL https://raw.githubusercontent.com/KenKaiii/ken8n-coder/main/install.sh | bash
```

During installation, you'll see:

```
Would you like to install the n8n MCP server for workflow deployment?
This allows AI agents to deploy workflows directly to your n8n instance.
Install MCP server? (y/N)
```

Select `y` to install the MCP server locally.

### Method 2: Standalone Installation

If you already have ken8n-coder installed, you can add the MCP server later:

```bash
curl -fsSL https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install-mcp.sh | bash
```

### Method 3: Manual NPM Installation

If you prefer to manage the installation yourself:

```bash
# Create local MCP directory
mkdir -p ~/.ken8n-coder/mcp
cd ~/.ken8n-coder/mcp

# Install the MCP server
npm init -y
npm install @kenkaiii/ken8n-mcp
```

## Configuration

After installation, configure your n8n connection:

```bash
ken8n-coder mcp setup
```

You'll be prompted for:

1. **n8n API Key**: Your n8n API key (found in n8n Settings → API)
2. **n8n Base URL**: Your n8n instance URL (default: <http://localhost:5678>)

The setup will:

- Test your n8n connection
- Validate your API key
- Save the configuration to your ken8n-coder.json

## How It Works

### Installation Structure

```
~/.ken8n-coder/
├── bin/
│   └── ken8n-coder          # Main executable
├── mcp/
│   ├── package.json         # Local NPM package
│   └── node_modules/
│       └── @kenkaiii/
│           └── ken8n-mcp/   # MCP server
└── validation-scripts/      # Workflow validation tools
```

### Configuration Location

The MCP configuration is stored in:

- Project-specific: `./ken8n-coder.json` (in your project directory)
- Global: `~/.config/ken8n-coder/ken8n-coder.json`

Example configuration:

```json
{
  "mcp": {
    "n8n": {
      "type": "local",
      "command": ["node", "/home/user/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp/dist/index.js"],
      "environment": {
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "n8n_api_..."
      },
      "enabled": true
    }
  }
}
```

### Command Determination

The setup command automatically detects the best way to run the MCP server:

1. **Local Installation** (Preferred): If MCP is installed in `~/.ken8n-coder/mcp/`, uses direct node execution
2. **NPX Fallback**: If Node.js is available but MCP isn't installed locally, uses `npx -y @kenkaiii/ken8n-mcp`
3. **Warning**: If Node.js isn't installed, saves config anyway but warns the user

## Available MCP Tools

Once configured, AI agents can use these tools:

- `n8n_deploy` - Deploy workflows to n8n
- `n8n_test` - Test workflow execution
- `n8n_update` - Update existing workflows
- `n8n_get_execution` - Get execution details
- `n8n_list_workflows` - List workflows
- `n8n_delete` - Delete workflows

## Requirements

- **Node.js**: Version 18 or higher recommended
- **npm**: For package installation
- **n8n**: Running instance with API access enabled
- **API Key**: Valid n8n API key with appropriate permissions

## Troubleshooting

### Node.js Not Found

If you see "Node.js not found" during setup:

1. Install Node.js from <https://nodejs.org/>

2. Run the MCP installation script again
3. Run `ken8n-coder mcp setup` to configure

### Connection Failed

If the n8n connection test fails:

1. Verify n8n is running and accessible

2. Check your API key is correct
3. Ensure the URL includes the protocol (http:// or https://)
4. Check firewall/network settings

### MCP Server Not Starting

If the MCP server fails to start:

1. Check Node.js is installed: `node --version`

2. Verify the installation: `ls ~/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp`
3. Try reinstalling: `curl -fsSL https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install-mcp.sh | bash`

## Security Notes

- API keys are stored in your local configuration file
- Never commit ken8n-coder.json files containing API keys to version control
- Use environment variables for shared configurations:

  ```bash
  export N8N_BASE_URL="http://localhost:5678"
  export N8N_API_KEY="your-api-key"
  ```

## Updating

To update the MCP server to the latest version:

```bash
cd ~/.ken8n-coder/mcp
npm update @kenkaiii/ken8n-mcp
```

Or use the install script with update option:

```bash
curl -fsSL https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install-mcp.sh | bash
```

## Support

For issues or questions:

- Ken8n-Coder: <https://github.com/kenkaiii/ken8n-coder/issues>
- MCP Server: <https://www.npmjs.com/package/@kenkaiii/ken8n-mcp>
