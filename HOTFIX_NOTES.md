# Hotfix for v2.3.7 - MCP Configuration Fix

## 🚨 Critical Issue Fixed

The v2.3.7 release had a critical bug that broke ALL MCP functionality.

### The Problem:
- Install script created config at: `~/.ken8n-coder/ken8n-coder.json`
- Application expected config at: `~/.config/ken8n-coder/ken8n-coder.json`
- This path mismatch caused all MCPs to be inaccessible

### The Fix:
- Updated install.sh to use the correct XDG config directory
- Config now properly created at `~/.config/ken8n-coder/`

## 🔧 How to Fix Your Installation

### Option 1: Re-run Install Script (Recommended)
```bash
curl -fsSL \
  https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install.sh \
  | bash
```

### Option 2: Manual Fix
```bash
# Move config to correct location
mkdir -p ~/.config/ken8n-coder
cp ~/.ken8n-coder/ken8n-coder.json ~/.config/ken8n-coder/ken8n-coder.json
```

## ✅ Verification

After applying the fix, verify MCPs are working:
1. Start ken8n-coder
2. The agent should have access to memory and other MCP tools
3. Check `~/.config/ken8n-coder/ken8n-coder.json` exists

## 📝 Note

The binaries themselves are unchanged - only the install script needed fixing.
This hotfix updates the installation process to put the configuration in the
correct location.

---

**Affected versions**: v2.3.7
**Fixed in**: install.sh (live on main branch)