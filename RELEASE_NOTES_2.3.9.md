# Release v2.3.9 - MCP Configuration Fixes

## 🔧 Critical Fixes

### Fixed MCP Setup Command

- `ken8n-coder mcp setup` now saves config to `~/.config/ken8n-coder/`
- Previously saved to current directory causing config mismatches
- Now properly follows XDG Base Directory specification

### Fixed MCP Configuration

- All MCPs now work correctly with proper config location
- Default config includes context7 and memory MCPs
- n8n MCP configured via `ken8n-coder mcp setup` (requires credentials)

## 📦 What's Fixed

1. **Config Location**: Standardized on `~/.config/ken8n-coder/ken8n-coder.json`
2. **MCP Setup**: Now saves to correct directory
3. **Search Order**: Checks XDG config first, then current directory
4. **Default MCPs**: Context7 and memory work out of the box

## 🚀 Installation

```bash
curl -fsSL \
  https://github.com/kenkaiii/ken8n-coder/releases/download/v2.3.9/install.sh \
  | bash
```

## 🔧 For n8n Users

After installation, configure n8n MCP:

```bash
ken8n-coder mcp setup
```

This will:

- Connect to your n8n instance
- Save credentials in the correct config location
- Enable n8n workflow creation from the agent

## 📝 Summary

This release fixes all MCP configuration issues introduced in v2.3.7-2.3.8.
The agent can now properly access all configured MCPs.

---

**Full Changelog**:
<https://github.com/kenkaiii/ken8n-coder/compare/v2.3.8...v2.3.9>
