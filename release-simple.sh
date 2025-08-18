#!/usr/bin/env bash
set -euo pipefail

# Simple release script for ken8n-coder
# Leverages existing solid infrastructure: script/publish.ts does all the heavy lifting

RELEASE_TYPE="patch"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --minor) RELEASE_TYPE="minor"; shift ;;
    --major) RELEASE_TYPE="major"; shift ;;
    --help) 
      echo "Usage: $0 [--minor|--major]"
      echo "  patch (default): 1.0.0 -> 1.0.1"
      echo "  --minor:         1.0.0 -> 1.1.0" 
      echo "  --major:         1.0.0 -> 2.0.0"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Get latest version from GitHub releases
echo "Fetching latest version..."
latest_tag=$(gh release list --limit 1 --json tagName --jq '.[0].tagName' 2>/dev/null || echo "")

if [[ -z $latest_tag ]]; then
  NEW_VERSION="1.0.0"
  echo "No existing releases found, starting with v1.0.0"
else
  echo "Latest release: $latest_tag"
  
  # Calculate next version
  version_without_v=${latest_tag#v}
  IFS='.' read -ra VERSION <<< "$version_without_v"
  
  case $RELEASE_TYPE in
    major) NEW_VERSION="$((VERSION[0] + 1)).0.0" ;;
    minor) NEW_VERSION="${VERSION[0]}.$((VERSION[1] + 1)).0" ;;
    patch) NEW_VERSION="${VERSION[0]}.${VERSION[1]}.$((VERSION[2] + 1))" ;;
  esac
fi

echo "New version: v$NEW_VERSION"

# Build and release using existing publish.ts infrastructure
echo "Building and releasing..."
KEN8N_CODER_VERSION="$NEW_VERSION" bun script/publish.ts

echo "✅ Release v$NEW_VERSION completed successfully!"
echo "View at: https://github.com/kenkaiii/ken8n-coder/releases/tag/v$NEW_VERSION"