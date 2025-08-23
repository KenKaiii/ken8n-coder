# Ken8n-Coder Release Process

This document explains how to build, test, and deploy new versions of
ken8n-coder that users can install via curl.

## Latest Release: v2.4.0

### What's New in v2.4.0

#### 🚀 Major Performance Improvement: Copy-Paste Deployment

- **NEW**: Introduced `deploy-script/deploy-workflow.js` for efficient
  workflow deployment
- **FIXED**: BUILD agent no longer manually recreates entire JSON
  structures when deploying
- **IMPROVED**: Workflow deployment now uses copy-paste method
  (read file → parse → deploy)
- **RESULT**: Deployment of large workflows (10,000+ characters)
  reduced from minutes to seconds

#### Technical Changes

- Added `./deploy-script/deploy-workflow.js` utility script
- Updated `workflow.txt` instructions to use copy-paste deployment method
- Removed inefficient manual JSON recreation in BUILD agent workflow
- Script properly handles ES modules in Node.js environment

#### Impact

- **Before**: Agent would manually write 11,000+ characters into
  deployment tool
- **After**: Agent reads JSON file and deploys entire object in
  3 lines of code
- Eliminates transcription errors and token waste
- Makes large workflow deployments instant and reliable

## Overview

Ken8n-coder uses a multi-step release process:

1. **Update version** in TUI binary
2. **Build and publish** platform binaries to NPM
3. **Create GitHub release** with downloadable ZIP files
4. **Update install script** fallback version
5. **Test curl installation** works correctly

## File Locations

- **TUI Version**: `/packages/tui/cmd/ken8n-coder/main.go`
  (line 24: `var Version = "x.x.x"`)
- **Install Script**: `/install.sh` (default version on line 13)
- **Build Script**: `/script/publish.ts` (main release automation)
- **Package Build**: `/packages/ken8n-coder/script/publish.ts`
  (platform-specific builds)

## Step-by-Step Release Process

### 1. Update TUI Version

```bash
# Edit the version in the TUI main.go
vim packages/tui/cmd/ken8n-coder/main.go
# Change line 24: var Version = "NEW_VERSION"
```

### 2. Update Install Script Fallback

```bash
# Edit the install script fallback version
vim install
# Update line ~53: specific_version="NEW_VERSION"
```

### 3. Build and Publish

```bash
# Set the new version and run the full build/publish process
KEN8N_CODER_VERSION=NEW_VERSION bun script/publish.ts
```

This will:

- Update all package.json files
- Build binaries for all platforms (Windows, Linux, macOS with
  different architectures)
- Publish to NPM registry
- Create ZIP files for GitHub release
- Generate platform-specific SHA hashes
- Update Homebrew formula

### 4. Create GitHub Release

```bash
# Commit changes and create git tag
git add .
git commit -m "release: vNEW_VERSION"
git tag vNEW_VERSION
git push origin vNEW_VERSION --no-verify

# Create GitHub release with binaries
gh release create vNEW_VERSION --title "vNEW_VERSION" \
  --notes "Release notes here" ./packages/ken8n-coder/dist/*.zip
```

### 5. Test Installation

```bash
# Test the curl installation picks up the new version
curl -s https://api.github.com/repos/kenkaiii/ken8n-coder/releases/latest \
  | grep tag_name

# Test actual installation
curl -fsSL \
  https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install.sh \
  | bash
```

## Testing Process

### For Bug Fixes or Changes

1. **Create Test Version**:

```bash
KEN8N_CODER_VERSION=X.X.X-test bun script/publish.ts
git tag vX.X.X-test
git push origin vX.X.X-test
gh release create vX.X.X-test --prerelease \
  --notes "Test version" ./packages/ken8n-coder/dist/*.zip
```

2. **Test Installation**:

```bash
VERSION=X.X.X-test bash <(curl -fsSL \
  https://raw.githubusercontent.com/kenkaiii/ken8n-coder/main/install.sh)
```

3. **Test on Multiple Platforms**:
   - Linux x64/arm64
   - macOS Intel/Apple Silicon
   - Windows x64

## Architecture Details

### Build Process

- **NPM Packages**: Platform-specific binaries published to NPM
  registry
- **GitHub Releases**: ZIP files containing binaries for direct
  download
- **Homebrew**: Auto-generated formula for macOS package manager

### Installation Flow

1. User runs curl command
2. Install script detects platform and architecture
3. Downloads latest release from GitHub API
4. Falls back to hardcoded version if API fails
5. Downloads and extracts platform-specific ZIP
6. Installs binary to `~/.ken8n-coder/bin/`
7. Adds to PATH in shell config

### Platform Support

- **Linux**: x64, arm64, x64-baseline
- **macOS**: x64, arm64, x64-baseline
- **Windows**: x64

## Common Issues

### Cursor Positioning (TUI)

If cursor appears misaligned in the TUI:

- Check `/packages/tui/internal/tui/tui.go` View() function
- Ensure home() and chat() return `editorX + 5, editorY + 2`
- Match original opencode implementation exactly

### Build Failures

- **Missing GITHUB_TOKEN**: Homebrew formula update may fail (non-critical)
- **NPM Publish**: Check authentication and package permissions
- **Platform Builds**: Ensure Go and Bun are properly configured

### Version Detection

- **API Rate Limits**: Install script has fallback version
- **Cache Issues**: GitHub API may take time to reflect new releases

## Verification Checklist

Before releasing:

- [ ] TUI version matches intended release
- [ ] Install script fallback updated
- [ ] All platform binaries build successfully
- [ ] Smoke tests pass (binary runs and shows correct version)
- [ ] GitHub release created with all ZIP files
- [ ] Curl installation works and downloads correct version
- [ ] TUI launches with proper cursor positioning

## Emergency Rollback

If a release has critical issues:

1. **Revert install script**:

```bash
# Update fallback version to previous working version
vim install
git commit -am "rollback: revert to vPREVIOUS_VERSION"
git push
```

2. **Mark GitHub release as pre-release**:

```bash
gh release edit vBROKEN_VERSION --prerelease
```

3. **Promote previous release**:

```bash
gh release edit vPREVIOUS_VERSION --latest
```

## Notes

- Always test on multiple platforms before releasing
- GitHub API rate limits can affect version detection
- NPM and GitHub releases should be kept in sync
- Homebrew formula updates require GITHUB_TOKEN
- Pre-release versions for testing use `-test` suffix
