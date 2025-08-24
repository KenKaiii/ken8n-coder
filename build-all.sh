#!/bin/bash
set -e

VERSION="2.4.3"
echo "Building ken8n-coder v${VERSION} for all platforms..."

cd /home/ken/Projects/ken8n-coder/ken8n-coder/packages/ken8n-coder

# Clean previous builds
rm -rf dist

# Platform configurations
declare -a platforms=(
  "windows:x64:amd64"
  "linux:arm64:arm64"
  "linux:x64:amd64"
  "linux:x64-baseline:amd64"
  "darwin:x64:amd64"
  "darwin:x64-baseline:amd64"
  "darwin:arm64:arm64"
)

# Build each platform
for platform in "${platforms[@]}"; do
  IFS=':' read -r os arch goarch <<<"$platform"

  echo "Building ${os}-${arch}..."

  # Create directory structure
  mkdir -p "dist/ken8n-coder-${os}-${arch}/bin"

  # Build TUI component
  cd ../tui
  CGO_ENABLED=0 GOOS="${os}" GOARCH="${goarch}" go build \
    -ldflags="-s -w -X main.Version=${VERSION}" \
    -o "../ken8n-coder/dist/ken8n-coder-${os}-${arch}/bin/tui" \
    ./cmd/ken8n-coder/main.go
  cd ../ken8n-coder

  # Build main binary
  if [[ $os == "windows" ]]; then
    bun build \
      --define KEN8N_CODER_TUI_PATH="'../../../dist/ken8n-coder-${os}-${arch}/bin/tui'" \
      --define KEN8N_CODER_VERSION="'${VERSION}'" \
      --compile \
      --target="bun-${os}-${arch}" \
      --outfile="dist/ken8n-coder-${os}-${arch}/bin/ken8n-coder.exe" \
      ./src/index.ts
  else
    bun build \
      --define KEN8N_CODER_TUI_PATH="'../../../dist/ken8n-coder-${os}-${arch}/bin/tui'" \
      --define KEN8N_CODER_VERSION="'${VERSION}'" \
      --compile \
      --target="bun-${os}-${arch}" \
      --outfile="dist/ken8n-coder-${os}-${arch}/bin/ken8n-coder" \
      ./src/index.ts
  fi

  # Remove TUI binary (it's embedded in the main binary)
  rm -rf "./dist/ken8n-coder-${os}-${arch}/bin/tui"

  # Copy validation scripts
  mkdir -p "./dist/ken8n-coder-${os}-${arch}/validation-scripts"
  cp validation-scripts/validate-supercode-static.js "./dist/ken8n-coder-${os}-${arch}/validation-scripts/" 2>/dev/null || true

  # Copy deploy-script folder
  mkdir -p "./dist/ken8n-coder-${os}-${arch}/deploy-script"
  cp ../../deploy-script/deploy-workflow.js "./dist/ken8n-coder-${os}-${arch}/deploy-script/" 2>/dev/null || true

  # Create package.json for the platform
  cat >"dist/ken8n-coder-${os}-${arch}/package.json" <<EOF
{
  "name": "ken8n-coder-${os}-${arch}",
  "version": "${VERSION}",
  "os": ["${os}"],
  "cpu": ["${arch}"]
}
EOF

  echo "✅ Built ${os}-${arch}"
done

echo ""
echo "🎉 All builds complete for v${VERSION}!"
echo ""
echo "Next steps:"
echo "1. Test the binaries (at least one per OS)"
echo "2. Create zip files for GitHub release:"
# shellcheck disable=SC2016
echo '   cd dist && for dir in ken8n-coder-*; do zip -r "${dir}.zip" "$dir"; done'
echo "3. Create GitHub release v${VERSION}"
echo "4. Upload the zip files to the release"
