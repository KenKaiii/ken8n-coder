#!/bin/bash
set -e

VERSION="2.2.0"
cd /home/ken/Projects/ken8n-coder/ken8n-coder/packages/ken8n-coder

# Build darwin-x64
echo "Building darwin-x64..."
mkdir -p dist/ken8n-coder-darwin-x64/bin
cd ../tui
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w -X main.Version=$VERSION" -o ../ken8n-coder/dist/ken8n-coder-darwin-x64/bin/tui ./cmd/ken8n-coder/main.go
cd ../ken8n-coder
bun build --define KEN8N_CODER_TUI_PATH="'../../../dist/ken8n-coder-darwin-x64/bin/tui'" --define KEN8N_CODER_VERSION="'$VERSION'" --compile --target=bun-darwin-x64 --outfile=dist/ken8n-coder-darwin-x64/bin/ken8n-coder ./src/index.ts
rm -rf ./dist/ken8n-coder-darwin-x64/bin/tui
mkdir -p ./dist/ken8n-coder-darwin-x64/validation-scripts
cp validation-scripts/validate-supercode-static.js ./dist/ken8n-coder-darwin-x64/validation-scripts/ 2>/dev/null || true

cat > dist/ken8n-coder-darwin-x64/package.json << EOF
{
  "name": "ken8n-coder-darwin-x64",
  "version": "$VERSION",
  "os": ["darwin"],
  "cpu": ["x64"]
}
EOF

# Build darwin-x64-baseline
echo "Building darwin-x64-baseline..."
mkdir -p dist/ken8n-coder-darwin-x64-baseline/bin
cd ../tui
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w -X main.Version=$VERSION" -o ../ken8n-coder/dist/ken8n-coder-darwin-x64-baseline/bin/tui ./cmd/ken8n-coder/main.go
cd ../ken8n-coder
bun build --define KEN8N_CODER_TUI_PATH="'../../../dist/ken8n-coder-darwin-x64-baseline/bin/tui'" --define KEN8N_CODER_VERSION="'$VERSION'" --compile --target=bun-darwin-x64-baseline --outfile=dist/ken8n-coder-darwin-x64-baseline/bin/ken8n-coder ./src/index.ts
rm -rf ./dist/ken8n-coder-darwin-x64-baseline/bin/tui
mkdir -p ./dist/ken8n-coder-darwin-x64-baseline/validation-scripts
cp validation-scripts/validate-supercode-static.js ./dist/ken8n-coder-darwin-x64-baseline/validation-scripts/ 2>/dev/null || true

cat > dist/ken8n-coder-darwin-x64-baseline/package.json << EOF
{
  "name": "ken8n-coder-darwin-x64-baseline",
  "version": "$VERSION",
  "os": ["darwin"],
  "cpu": ["x64-baseline"]
}
EOF

# Build darwin-arm64
echo "Building darwin-arm64..."
mkdir -p dist/ken8n-coder-darwin-arm64/bin
cd ../tui
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w -X main.Version=$VERSION" -o ../ken8n-coder/dist/ken8n-coder-darwin-arm64/bin/tui ./cmd/ken8n-coder/main.go
cd ../ken8n-coder
bun build --define KEN8N_CODER_TUI_PATH="'../../../dist/ken8n-coder-darwin-arm64/bin/tui'" --define KEN8N_CODER_VERSION="'$VERSION'" --compile --target=bun-darwin-arm64 --outfile=dist/ken8n-coder-darwin-arm64/bin/ken8n-coder ./src/index.ts
rm -rf ./dist/ken8n-coder-darwin-arm64/bin/tui
mkdir -p ./dist/ken8n-coder-darwin-arm64/validation-scripts
cp validation-scripts/validate-supercode-static.js ./dist/ken8n-coder-darwin-arm64/validation-scripts/ 2>/dev/null || true

cat > dist/ken8n-coder-darwin-arm64/package.json << EOF
{
  "name": "ken8n-coder-darwin-arm64",
  "version": "$VERSION",
  "os": ["darwin"],
  "cpu": ["arm64"]
}
EOF

# Publish darwin packages
echo "Publishing darwin-x64..."
cd dist/ken8n-coder-darwin-x64 && chmod 777 -R . && bun publish --access public --tag latest
cd ../..

echo "Publishing darwin-x64-baseline..."
cd dist/ken8n-coder-darwin-x64-baseline && chmod 777 -R . && bun publish --access public --tag latest
cd ../..

echo "Publishing darwin-arm64..."
cd dist/ken8n-coder-darwin-arm64 && chmod 777 -R . && bun publish --access public --tag latest
cd ../..

echo "Darwin builds complete!"