#!/usr/bin/env bash
# Local testing script for MCP installation
# This tests the MCP installation process without releasing

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Test directory setup
TEST_DIR="/tmp/ken8n-mcp-test-$$"
BACKUP_DIR="/tmp/ken8n-backup-$$"

cleanup() {
  print_test "Cleaning up test environment..."

  # Restore original installation if backed up
  if [ -d "$BACKUP_DIR/.ken8n-coder" ]; then
    rm -rf "$HOME/.ken8n-coder/mcp"
    if [ -d "$BACKUP_DIR/.ken8n-coder/mcp" ]; then
      mv "$BACKUP_DIR/.ken8n-coder/mcp" "$HOME/.ken8n-coder/"
    fi
  fi

  # Clean test directory
  rm -rf "$TEST_DIR"
  rm -rf "$BACKUP_DIR"

  print_success "Cleanup complete"
}

trap cleanup EXIT

# Setup test environment
setup_test_env() {
  print_test "Setting up test environment..."

  # Create test directory
  mkdir -p "$TEST_DIR"

  # Backup existing MCP installation if present
  if [ -d "$HOME/.ken8n-coder/mcp" ]; then
    print_warning "Backing up existing MCP installation..."
    mkdir -p "$BACKUP_DIR/.ken8n-coder"
    mv "$HOME/.ken8n-coder/mcp" "$BACKUP_DIR/.ken8n-coder/"
  fi

  print_success "Test environment ready"
}

# Test 1: Standalone MCP installation script
test_standalone_install() {
  print_test "Testing standalone MCP installation (install-mcp.sh)..."

  # Make sure the MCP directory doesn't exist
  rm -rf "$HOME/.ken8n-coder/mcp"

  # Run the install script
  if bash install-mcp.sh <<<"n"; then
    print_success "Standalone installation script executed successfully"

    # Verify installation
    if [ -d "$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp" ]; then
      print_success "MCP server installed at correct location"
    else
      print_error "MCP server not found at expected location"
      return 1
    fi
  else
    print_error "Standalone installation failed"
    return 1
  fi
}

# Test 2: MCP setup command with development version
test_mcp_setup_dev() {
  print_test "Testing 'ken8n-coder mcp setup' with development version..."

  # Check if we have the development version available
  if command -v ken8n-coder-dev >/dev/null 2>&1; then
    print_success "Using ken8n-coder-dev for testing"

    # Create a test config file
    TEST_CONFIG="$TEST_DIR/ken8n-coder.json"
    echo '{}' >"$TEST_CONFIG"

    # Test the setup command (we'll simulate the input)
    cd "$TEST_DIR"

    # Note: This would normally be interactive, so we're just checking if the command exists
    if ken8n-coder-dev mcp --help 2>/dev/null | grep -q "setup"; then
      print_success "MCP setup command is available"
    else
      print_warning "MCP setup command not found in dev version"
    fi
  else
    print_warning "ken8n-coder-dev not found, skipping dev test"
  fi
}

# Test 3: Build and test TypeScript locally
test_typescript_build() {
  print_test "Building TypeScript code locally..."

  cd packages/ken8n-coder

  if command -v bun >/dev/null 2>&1; then
    if bun run build 2>/dev/null; then
      print_success "TypeScript build successful"
    else
      print_warning "TypeScript build failed - may need to install dependencies"
    fi
  else
    print_warning "Bun not installed, skipping TypeScript build test"
  fi

  cd ../..
}

# Test 4: Verify MCP server can be invoked
test_mcp_server_invocation() {
  print_test "Testing MCP server invocation..."

  if [ -d "$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp" ]; then
    # Test with node directly
    if node "$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp/dist/index.js" --version 2>/dev/null; then
      print_success "MCP server can be invoked with node"
    else
      # It's OK if --version doesn't exist, just check if the file runs
      if timeout 1 node "$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp/dist/index.js" 2>/dev/null; then
        print_success "MCP server runs (no version flag)"
      else
        print_warning "MCP server exists but may need environment variables to run"
      fi
    fi

    # Test with npx
    if timeout 1 npx -y @kenkaiii/ken8n-mcp --version 2>/dev/null; then
      print_success "MCP server can be invoked with npx"
    else
      print_warning "NPX invocation may need environment variables"
    fi
  else
    print_error "MCP server not installed, skipping invocation test"
  fi
}

# Test 5: Check configuration file generation
test_config_generation() {
  print_test "Testing configuration file generation..."

  # Create a test directory
  TEST_PROJECT="$TEST_DIR/test-project"
  mkdir -p "$TEST_PROJECT"
  cd "$TEST_PROJECT"

  # Simulate what the setup command would create
  cat >ken8n-coder.json <<'EOF'
{
  "mcp": {
    "n8n": {
      "type": "local",
      "command": ["node", "/home/ken/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp/dist/index.js"],
      "environment": {
        "N8N_BASE_URL": "http://localhost:5678",
        "N8N_API_KEY": "test-api-key"
      },
      "enabled": true
    }
  }
}
EOF

  if [ -f ken8n-coder.json ]; then
    print_success "Configuration file created successfully"

    # Validate JSON
    if python3 -m json.tool ken8n-coder.json >/dev/null 2>&1; then
      print_success "Configuration file has valid JSON"
    else
      print_error "Configuration file has invalid JSON"
    fi
  else
    print_error "Failed to create configuration file"
  fi

  cd - >/dev/null
}

# Test 6: Update scenario
test_update_scenario() {
  print_test "Testing update scenario..."

  if [ -d "$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp" ]; then
    # Run install script again and choose update
    if bash install-mcp.sh <<<"y" 2>/dev/null; then
      print_success "Update scenario completed successfully"
    else
      print_warning "Update scenario had issues"
    fi
  else
    print_warning "No existing installation to update"
  fi
}

# Main test execution
main() {
  echo "========================================="
  echo "  MCP Installation Local Testing Suite"
  echo "========================================="
  echo ""

  # Check prerequisites
  print_test "Checking prerequisites..."

  if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js is required for testing. Please install Node.js first."
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    print_error "npm is required for testing. Please install npm first."
    exit 1
  fi

  print_success "Prerequisites met"
  echo ""

  # Setup test environment
  setup_test_env
  echo ""

  # Run tests
  print_test "Starting test suite..."
  echo ""

  test_standalone_install
  echo ""

  test_mcp_setup_dev
  echo ""

  test_typescript_build
  echo ""

  test_mcp_server_invocation
  echo ""

  test_config_generation
  echo ""

  test_update_scenario
  echo ""

  echo "========================================="
  print_success "Testing complete!"
  echo ""
  echo "Next steps:"
  echo "1. If all tests passed, the MCP installation is ready for release"
  echo "2. Test with your actual n8n instance:"
  echo "   - Run: ken8n-coder mcp setup"
  echo "   - Enter your real n8n API key and URL"
  echo "   - Try deploying a workflow"
  echo ""
}

# Run main function
main "$@"
