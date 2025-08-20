# Release v2.3.7

## 🎉 New Features

### Memory Support for Workflow Agent

- **Added ken-you-remember MCP integration** - The workflow agent can now remember:
  - User requirements and preferences
  - API structures and response formats
  - Successful workflow patterns
  - Field mappings and naming conventions
  - Optimization techniques that worked
- **Automatic memory installation** - The install script now automatically
  sets up the memory MCP server
- **Context7 MCP integration** - Added support for technical documentation lookups

### Workflow Management Improvements

- **File-based workflow management** - All workflows are now saved as JSON
  files in the current directory
- **Efficient workflow updates** - Edit specific nodes without regenerating
  entire workflows
- **Workflow refinement** - Agent can optimize existing workflows from the
  `./workflows/` folder
- **Reference library** - Use workflows from `./workflows/` as templates

## 🐛 Bug Fixes

### Webhook Configuration

- Fixed responseMode values: Now correctly uses `"responseNode"` instead of
  `"responseViaWebhook"`
- GET webhooks no longer incorrectly specify httpMethod (it's the default)
- POST webhooks now correctly require explicit `httpMethod: "POST"`
- Webhook paths use descriptive names instead of UUIDs

### Workflow JSON Structure

- Removed problematic fields that break deployment (pinData, meta,
  instanceId)
- Cleaned up workflow JSON to only include necessary fields

## 📝 Documentation Updates

### workflow.txt Enhancements

- Added memory-first approach - always check memory before creating workflows
- Updated MCP tool names to correct format (`mcp__ken-you-remember__*`)
- Added comprehensive memory usage guidelines
- Clarified webhook configuration based on use case
- Added workflow refinement and optimization guidelines

## 🔧 Installation Improvements

### Enhanced Install Script

- Automatically installs ken-you-remember MCP server
- Creates default MCP configuration file with memory and context7
- Better error handling and user feedback
- Updated to handle all MCP dependencies

## 💡 Usage Notes

### For New Users

After installation, the workflow agent will automatically have memory
capabilities. No additional setup required!

### For Existing Users

Run the updated install script to get the memory MCP:

```bash
curl -fsSL \
  https://github.com/kenkaiii/ken8n-coder/releases/download/v2.3.7/install.sh \
  | bash
```

### Memory Usage in Workflows

The agent will now:

- Remember your preferences (webhook methods, response modes)
- Store API structures to avoid repeated testing
- Learn from successful workflow patterns
- Apply previous optimizations automatically

## 🚀 How to Install

```bash
# Fresh installation
curl -fsSL \
  https://github.com/kenkaiii/ken8n-coder/releases/download/v2.3.7/install.sh \
  | bash

# The installation will:
# 1. Install ken8n-coder v2.3.7
# 2. Install n8n MCP server
# 3. Install ken-you-remember MCP server
# 4. Configure Context7 MCP
# 5. Create default configuration file
```

## 📦 What's Included

- Updated workflow.txt with memory-first approach
- ken-you-remember MCP integration
- Context7 MCP configuration
- File-based workflow management
- Workflow refinement capabilities
- Corrected webhook configurations
- Clean workflow JSON generation

## 🔄 Breaking Changes

None - this release is fully backward compatible.

## 📈 Performance Improvements

- Reduced agent memory usage by using file-based workflow management
- Faster workflow creation by remembering API structures
- More reliable updates through file editing instead of regeneration

---

**Full Changelog**:
<https://github.com/kenkaiii/ken8n-coder/compare/v2.3.6...v2.3.7>
