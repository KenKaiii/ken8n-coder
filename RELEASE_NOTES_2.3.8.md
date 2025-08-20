# Release v2.3.8 - Critical MCP Configuration Fix

## 🚨 Critical Bug Fix

This release fixes a critical issue introduced in v2.3.7 that broke ALL MCP functionality.

### The Problem (v2.3.7)

- Install script created config at: `~/.ken8n-coder/ken8n-coder.json`
- Application expected config at: `~/.config/ken8n-coder/ken8n-coder.json`
- This mismatch caused all MCPs (memory, context7, n8n) to be inaccessible

### The Fix (v2.3.8)

- Config now correctly created at `~/.config/ken8n-coder/ken8n-coder.json`
- Follows XDG Base Directory specification
- All MCPs now work as intended

## 🔧 Installation

### New Users

```bash
curl -fsSL \
  https://github.com/kenkaiii/ken8n-coder/releases/download/v2.3.8/install.sh \
  | bash
```

### Existing Users (Upgrade from v2.3.7)

```bash
# Option 1: Re-run installer
curl -fsSL \
  https://github.com/kenkaiii/ken8n-coder/releases/download/v2.3.8/install.sh \
  | bash

# Option 2: Manual fix (if you just want MCPs working)
mkdir -p ~/.config/ken8n-coder
cp ~/.ken8n-coder/ken8n-coder.json ~/.config/ken8n-coder/ken8n-coder.json
```

## ✅ What's Working Now

- ✅ ken-you-remember MCP (memory functionality)
- ✅ Context7 MCP (documentation lookups)
- ✅ n8n MCP (workflow automation)
- ✅ All other MCP integrations

## 📝 Note

The binaries are unchanged from v2.3.7 - only the install script needed fixing.
If you manually fixed your config location, you don't need to update.

---

**Full Changelog**:
<https://github.com/kenkaiii/ken8n-coder/compare/v2.3.7...v2.3.8>
