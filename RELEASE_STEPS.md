# Release Steps for v2.3.7

## ✅ Completed
- [x] Updated workflow.txt with memory integration
- [x] Fixed MCP tool names (mcp__ken-you-remember__)
- [x] Updated install.sh to install memory MCP
- [x] Added default MCP configuration
- [x] Updated version to 2.3.7 in all files
- [x] Created comprehensive build script
- [x] Created release notes

## 📋 Ready to Execute

### 1. Build Binaries
```bash
cd /home/ken/Projects/ken8n-coder/ken8n-coder
./build-all.sh
```

### 2. Create Release Packages
```bash
cd packages/ken8n-coder/dist
for dir in ken8n-coder-*; do 
  zip -r "${dir}.zip" "$dir"
done
```

### 3. Create GitHub Release
- Go to: https://github.com/kenkaiii/ken8n-coder/releases/new
- Tag: `v2.3.7`
- Title: `v2.3.7 - Memory Support & Workflow Improvements`
- Copy content from `RELEASE_NOTES_2.3.7.md`
- Upload all `.zip` files from `packages/ken8n-coder/dist/`

### 4. Test Installation
```bash
# Test the new install script
curl -fsSL https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install.sh | bash
```

## 📦 Files Changed

### Core Changes
- `/packages/ken8n-coder/src/session/prompt/workflow.txt`
- `/install.sh`
- `/packages/ken8n-coder/package.json`
- `/packages/ken8n-coder/build-darwin.sh`

### New Files
- `/build-all.sh`
- `/RELEASE_NOTES_2.3.7.md`
- `/ken8n-coder.json` (created by install script)

## 🎯 Key Improvements

1. **Memory Integration**
   - Agent remembers user preferences
   - Stores API structures  
   - Learns from successful patterns

2. **File-Based Workflows**
   - Saves to CWD as JSON files
   - Enables surgical edits
   - Survives context resets

3. **Correct MCP Names**
   - Fixed function calls
   - Proper tool references

4. **Auto-Installation**
   - Memory MCP installed automatically
   - Default config created
   - Context7 configured

## 🚀 Impact

Users will get:
- Smarter workflow agent that remembers context
- More reliable workflow updates
- Better performance with file-based management
- Automatic memory capabilities out of the box