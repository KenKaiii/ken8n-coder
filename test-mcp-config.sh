#!/usr/bin/env bash
# Test MCP configuration with actual n8n instance

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "============================================"
echo "  Testing MCP Configuration with n8n"
echo "============================================"
echo ""

# Check if MCP is installed locally
if [ -d "$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp" ]; then
    echo -e "${GREEN}✓${NC} MCP server is installed locally"
    MCP_PATH="$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp/dist/index.js"
    echo "  Location: $MCP_PATH"
else
    echo -e "${YELLOW}!${NC} MCP server not installed locally"
    echo "  Run: bash install-mcp.sh"
    exit 1
fi

# Check if we can run the MCP server
echo ""
echo "Testing MCP server startup..."
if timeout 1 node "$MCP_PATH" 2>&1 | grep -q "MCP n8n Server running"; then
    echo -e "${GREEN}✓${NC} MCP server can start"
else
    echo -e "${YELLOW}!${NC} MCP server needs environment variables to run"
    echo "  This is expected - it needs N8N_BASE_URL and N8N_API_KEY"
fi

# Create a test configuration
echo ""
echo "Creating test configuration..."
TEST_DIR="/tmp/ken8n-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

cat > ken8n-coder.json << EOF
{
  "mcp": {
    "n8n": {
      "type": "local",
      "command": ["node", "$MCP_PATH"],
      "environment": {
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "test-key"
      },
      "enabled": true
    }
  }
}
EOF

echo -e "${GREEN}✓${NC} Test configuration created at $TEST_DIR/ken8n-coder.json"

# Verify the configuration is valid JSON
if python3 -m json.tool ken8n-coder.json > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Configuration has valid JSON"
else
    echo -e "${RED}✗${NC} Configuration has invalid JSON"
fi

# Check what the setup command would use
echo ""
echo "Checking command detection logic..."

if [ -f "$MCP_PATH" ]; then
    echo -e "${GREEN}✓${NC} Would use local installation: node $MCP_PATH"
else
    if command -v node >/dev/null 2>&1; then
        echo -e "${YELLOW}!${NC} Would use npx fallback: npx -y @kenkaiii/ken8n-mcp"
    else
        echo -e "${RED}✗${NC} Node.js not found - MCP cannot run"
    fi
fi

echo ""
echo "============================================"
echo -e "${GREEN}Testing Complete!${NC}"
echo ""
echo "To test with your actual n8n instance:"
echo "1. Make sure n8n is running (usually at http://localhost:5678)"
echo "2. Get your API key from n8n Settings → API"
echo "3. Run: ken8n-coder mcp setup"
echo "4. Enter your API key and URL when prompted"
echo ""
echo "The setup will:"
echo "- Test the connection to your n8n instance"
echo "- Validate your API key"
echo "- Save the configuration"
echo "- Use the local MCP installation at: ~/.ken8n-coder/mcp/"
echo ""

# Cleanup
rm -rf "$TEST_DIR"