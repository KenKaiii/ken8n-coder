#!/usr/bin/env bash
# MCP Server Installation Script for ken8n-coder
# This script installs the n8n MCP server locally for use with ken8n-coder

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_message() {
  local level=$1
  local message=$2
  local color=""

  case $level in
  info) color="${GREEN}" ;;
  warning) color="${YELLOW}" ;;
  error) color="${RED}" ;;
  esac

  echo -e "${color}${message}${NC}"
}

# Check if Node.js is installed
check_node() {
  if ! command -v node >/dev/null 2>&1; then
    print_message error "Node.js is required to run the MCP server"
    print_message info "Please install Node.js from https://nodejs.org/"
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    print_message error "npm is required to install the MCP server"
    print_message info "Please install npm (usually comes with Node.js)"
    exit 1
  fi

  NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    print_message warning "Node.js version 18 or higher is recommended"
  fi
}

# Install MCP server locally
install_mcp() {
  local MCP_DIR="$HOME/.ken8n-coder/mcp"

  print_message info "Installing ken8n MCP server..."

  # Create directory structure
  mkdir -p "$MCP_DIR"
  cd "$MCP_DIR"

  # Create a minimal package.json if it doesn't exist
  if [ ! -f package.json ]; then
    cat >package.json <<'EOF'
{
  "name": "ken8n-coder-mcp-local",
  "version": "1.0.0",
  "private": true,
  "description": "Local MCP server installation for ken8n-coder"
}
EOF
  fi

  # Install the MCP server
  if npm install --production @kenkaiii/ken8n-mcp >/dev/null 2>&1; then
    print_message info "✅ MCP server installed successfully"

    # Check if ken8n-coder is installed
    if command -v ken8n-coder >/dev/null 2>&1; then
      print_message info ""
      print_message info "Next steps:"
      print_message info "1. Run: ken8n-coder mcp setup"
      print_message info "2. Enter your n8n API key and URL when prompted"
      print_message info "3. Restart ken8n-coder to use the MCP tools"
    else
      print_message warning "ken8n-coder not found in PATH"
      print_message info "Install ken8n-coder first: curl -fsSL https://raw.githubusercontent.com/KenKaiii/ken8n-coder/main/install.sh | bash"
    fi
  else
    print_message error "Failed to install MCP server"
    print_message info "Try running manually: npm install -g @kenkaiii/ken8n-mcp"
    exit 1
  fi
}

# Update existing MCP installation
update_mcp() {
  local MCP_DIR="$HOME/.ken8n-coder/mcp"

  if [ -d "$MCP_DIR/node_modules/@kenkaiii/ken8n-mcp" ]; then
    print_message info "Updating existing MCP server installation..."
    cd "$MCP_DIR"

    if npm update @kenkaiii/ken8n-mcp >/dev/null 2>&1; then
      print_message info "✅ MCP server updated successfully"
    else
      print_message warning "Failed to update, trying fresh install..."
      rm -rf node_modules package-lock.json
      install_mcp
    fi
  else
    install_mcp
  fi
}

# Main execution
main() {
  print_message info "🚀 Ken8n-Coder MCP Server Installer"
  print_message info ""

  # Check prerequisites
  check_node

  # Check if this is an update or fresh install
  if [ -d "$HOME/.ken8n-coder/mcp/node_modules/@kenkaiii/ken8n-mcp" ]; then
    print_message info "Found existing MCP installation"
    read -p "Update existing installation? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      update_mcp
    else
      print_message info "Installation cancelled"
    fi
  else
    install_mcp
  fi

  print_message info ""
  print_message info "✨ Done!"
}

# Run main function
main "$@"
