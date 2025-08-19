# v2.3.0 Release Notes - Critical Workflow Debugging Fixes

## 🔥 Critical Fixes

### MCP Error Visibility (MAJOR FIX)
- **FIXED**: Agents were blind to workflow errors - now they can see EVERYTHING
- **FIXED**: Super Code syntax errors now visible with line numbers
- **FIXED**: API errors, credential issues, config problems all visible
- **FIXED**: MCP wasn't passing `includeData=true` to n8n API
- **83% smaller responses**: Reduced from 8,460 to 1,400 characters

### Workflow Structure Corrections
- **FIXED**: Removed `pinData` and `triggerCount` that broke deployments
- **CORRECTED**: `settings`, `staticData`, and `versionId` are actually allowed
- **CONFIRMED**: Webhook typeVersion 2.1 works correctly

### Installation Experience
- **IMPROVED**: Clear ASCII art banner on successful install
- **IMPROVED**: Step-by-step getting started guide
- **FIXED**: All curl installation URLs now use correct GitHub raw paths

## 📦 Updated Components

### MCP Server (@kenkaiii/ken8n-mcp v2.2.1)
- Complete error extraction from executions
- Compact response format (83% smaller)
- Returns all error types, not just Super Code
- Includes broken code for debugging

### Workflow Instructions
- Updated with correct workflow JSON structure
- Documented which properties break deployment
- Added error visibility documentation
- Clarified Super Code First philosophy

## 🚀 Installation

```bash
# Quick install with latest fixes
curl -fsSL https://raw.githubusercontent.com/KenKaiii/ken8n-coder/main/install.sh | bash
```

## 💡 What This Means

**Before v2.3.0:**
- Agents couldn't see syntax errors in Super Code
- Deployments failed with mysterious errors
- 8KB+ responses bloated context

**After v2.3.0:**
- Complete visibility into ALL workflow errors
- Clean 1.4KB error responses
- Agents can fix syntax errors on first try
- No more deployment failures from wrong properties

## Breaking Changes
None - all changes are fixes and improvements

## Next Steps
After installing, run:
1. `ken8n-coder auth login` - Set up authentication
2. `ken8n-coder mcp setup` - Configure n8n connection
3. Start creating workflows with full error visibility!