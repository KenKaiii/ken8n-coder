# Release Checklist for ken8n-coder

## ⚠️ CRITICAL: Read This First

This checklist MUST be followed for every release. Missing steps will break the release.
Do NOT let agents modify this process without understanding the full context.

---

## 📋 Pre-Release Checklist

### 1. Determine Version Number
- [ ] Check current version: `grep -h '"version"' packages/ken8n-coder/package.json`
- [ ] Decide on version bump:
  - Patch (2.3.6 → 2.3.7): Bug fixes, minor updates
  - Minor (2.3.7 → 2.4.0): New features, backward compatible
  - Major (2.3.7 → 3.0.0): Breaking changes

### 2. Update ALL Version References
**⚠️ CRITICAL: ALL of these must match or the release will fail**

- [ ] `/packages/ken8n-coder/package.json` - Line 3: `"version": "X.X.X"`
- [ ] `/packages/ken8n-coder/build-darwin.sh` - Line 4: `VERSION="X.X.X"`
- [ ] `/install.sh` - Line 13: `requested_version=${VERSION:-X.X.X}`
- [ ] `/build-all.sh` (if exists) - Line 4: `VERSION="X.X.X"`

**Verify all versions match:**
```bash
echo "package.json: $(grep '"version"' packages/ken8n-coder/package.json | cut -d'"' -f4)"
echo "build-darwin.sh: $(grep 'VERSION=' packages/ken8n-coder/build-darwin.sh | cut -d'"' -f2)"
echo "install.sh: $(grep 'requested_version=' install.sh | cut -d':' -f2 | cut -d'}' -f1 | tr -d '-')"
```

### 3. Update Dependencies (if needed)
- [ ] Update n8n MCP version in install.sh (if new version available)
- [ ] Update ken-you-remember version in install.sh (if new version available)
- [ ] Update any other MCP dependencies

---

## 🔨 Build Process

### 1. Clean Previous Builds
```bash
cd packages/ken8n-coder
rm -rf dist
```

### 2. Build All Platforms
**Option A: Using build-all.sh (Recommended)**
```bash
cd /home/ken/Projects/ken8n-coder/ken8n-coder
./build-all.sh
```

**Option B: Manual Build (if build-all.sh doesn't exist)**
Create the build script first - see build-all.sh in this repo

### 3. Verify Build Success
- [ ] Check that all 7 platforms built:
  - windows-x64
  - linux-arm64
  - linux-x64
  - linux-x64-baseline
  - darwin-x64
  - darwin-x64-baseline
  - darwin-arm64
- [ ] Verify binaries exist: `ls -la packages/ken8n-coder/dist/`

### 4. Test Local Binary
```bash
# Test the linux-x64 binary (or matching your platform)
./packages/ken8n-coder/dist/ken8n-coder-linux-x64/bin/ken8n-coder --version
# Should output: ken8n-coder vX.X.X
```

---

## 📦 Package Creation

### 1. Create Release Packages
```bash
cd packages/ken8n-coder/dist
for dir in ken8n-coder-*; do 
  zip -qr "${dir}.zip" "$dir"
done
```

### 2. Verify Packages
```bash
ls -lh *.zip
# Should show 7 zip files, each 30-50MB
```

---

## 📝 Release Notes

### 1. Create Release Notes
Create `RELEASE_NOTES_X.X.X.md` with:
- [ ] New Features (what's new)
- [ ] Bug Fixes (what's fixed)
- [ ] Breaking Changes (if any)
- [ ] Installation instructions
- [ ] Upgrade instructions for existing users

### 2. Format for GitHub
- Keep lines under 80 characters (markdown linters will complain)
- Use proper markdown formatting
- Include code examples where relevant

---

## 🚀 Git & GitHub Release

### 1. Stage and Commit Changes
```bash
git add -A
git status  # Verify files to be committed
git commit -m "Release vX.X.X: Brief description

- Key feature 1
- Key feature 2
- Key fix 1"
```

### 2. Push to GitHub
```bash
git push origin main
```

### 3. Create GitHub Release
**Option A: Using GitHub CLI (Recommended)**
```bash
gh release create vX.X.X \
  --title "vX.X.X - Release Title" \
  --notes-file RELEASE_NOTES_X.X.X.md \
  packages/ken8n-coder/dist/*.zip
```

**Option B: Manual via GitHub Web**
1. Go to https://github.com/kenkaiii/ken8n-coder/releases/new
2. Tag: `vX.X.X`
3. Title: `vX.X.X - Release Title`
4. Copy release notes content
5. Upload all 7 zip files
6. Publish release

---

## ✅ Post-Release Verification

### 1. Verify GitHub Release
- [ ] Check release page: https://github.com/kenkaiii/ken8n-coder/releases/tag/vX.X.X
- [ ] Verify all 7 platform zips are uploaded
- [ ] Verify release notes are formatted correctly

### 2. Test Installation
```bash
# Test the new install script
curl -fsSL \
  https://github.com/kenkaiii/ken8n-coder/releases/download/vX.X.X/install.sh \
  | bash
```

### 3. Verify Installed Version
```bash
ken8n-coder --version
# Should show: ken8n-coder vX.X.X
```

---

## ⚠️ Common Pitfalls to Avoid

### DON'T:
1. **DON'T** update only some version numbers - ALL must match
2. **DON'T** forget to test the binary before releasing
3. **DON'T** create release without all 7 platform zips
4. **DON'T** use wrong version format (must be X.X.X, not vX.X.X in files)
5. **DON'T** forget to update install.sh default version
6. **DON'T** commit dist/ folder to git (it's in .gitignore)
7. **DON'T** skip the local binary test

### DO:
1. **DO** verify all versions match before building
2. **DO** test at least one binary locally
3. **DO** create comprehensive release notes
4. **DO** use semantic versioning
5. **DO** update this checklist if process changes

---

## 🔧 Troubleshooting

### Build Fails
- Check Go is installed: `go version`
- Check Bun is installed: `bun --version`
- Check you're in correct directory
- Clean and retry: `rm -rf dist && ./build-all.sh`

### GitHub Release Fails
- Check you have gh CLI installed: `gh --version`
- Check you're authenticated: `gh auth status`
- Check all zip files exist in dist/

### Install Script Fails
- Verify the version exists on GitHub releases
- Check the install.sh has correct default version
- Ensure all platform zips were uploaded

---

## 📂 File Structure Reference

```
ken8n-coder/
├── install.sh                    # Main install script (update version here)
├── build-all.sh                  # Build script for all platforms
├── packages/
│   └── ken8n-coder/
│       ├── package.json          # NPM package (update version here)
│       ├── build-darwin.sh       # Darwin build script (update version here)
│       ├── dist/                 # Build output (NOT committed to git)
│       │   ├── ken8n-coder-*/    # Platform binaries
│       │   └── *.zip             # Release packages
│       └── src/
│           └── session/
│               └── prompt/
│                   └── workflow.txt  # Agent prompts (may need updates)
└── RELEASE_NOTES_X.X.X.md       # Release notes for version

```

---

## 🎯 Quick Release Command Sequence

For experienced users who know what they're doing:

```bash
# 1. Update versions (edit all 4 files)
# 2. Build
./build-all.sh
# 3. Package
cd packages/ken8n-coder/dist && \
for dir in ken8n-coder-*; do zip -qr "${dir}.zip" "$dir"; done
# 4. Commit
cd ../../../ && git add -A && git commit -m "Release vX.X.X: Description"
# 5. Push
git push origin main
# 6. Release
gh release create vX.X.X --title "vX.X.X - Title" \
  --notes-file RELEASE_NOTES_X.X.X.md packages/ken8n-coder/dist/*.zip
```

---

**Last Updated**: 2025-08-20
**Last Release**: v2.3.7