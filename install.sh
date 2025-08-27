#!/usr/bin/env bash
set -euo pipefail
APP=ken8n-coder

# Color scheme that works on both light and dark terminals
RED='\033[0;31m'                # Errors - visible on both
PINK='\033[38;2;255;179;209m'   # Brand color - light pink
PURPLE='\033[38;2;218;112;214m' # Highlights - orchid purple
BLUE='\033[38;2;100;149;237m'   # Info/success - cornflower blue
GRAY='\033[38;2;128;128;128m'   # Secondary text - medium gray
NC='\033[0m'                    # No Color

requested_version=${VERSION:-2.4.5}

os=$(uname -s | tr '[:upper:]' '[:lower:]')
if [[ $os == "darwin" ]]; then
  os="darwin"
fi
arch=$(uname -m)

if [[ $arch == "aarch64" ]]; then
  arch="arm64"
elif [[ $arch == "x86_64" ]]; then
  arch="x64"
fi

filename="$APP-$os-$arch.zip"

case "$filename" in
*"-linux-"*)
  [[ $arch == "x64" || $arch == "arm64" ]] || exit 1
  ;;
*"-darwin-"*)
  [[ $arch == "x64" || $arch == "arm64" ]] || exit 1
  ;;
*"-windows-"*)
  [[ $arch == "x64" ]] || exit 1
  ;;
*)
  echo "${RED}Unsupported OS/Arch: $os/$arch${NC}"
  exit 1
  ;;
esac

INSTALL_DIR=$HOME/.ken8n-coder/bin
mkdir -p "$INSTALL_DIR"

url="https://github.com/kenkaiii/ken8n-coder/releases/download/v${requested_version}/$filename"
specific_version=$requested_version

print_message() {
  local level=$1
  local message=$2
  local color=""

  case $level in
  info) color="${BLUE}" ;;
  warning) color="${PURPLE}" ;;
  error) color="${RED}" ;;
  esac

  echo -e "${color}${message}${NC}"
}

extract_archive() {
  local archive_file="$1"

  # Try multiple extraction methods in order of preference
  if command -v unzip >/dev/null 2>&1; then
    print_message info "Extracting with unzip..."
    if unzip -qo "$archive_file" </dev/null 2>/dev/null; then
      return 0
    else
      print_message warning "unzip failed, trying Python fallback..."
    fi
  fi

  if command -v python3 >/dev/null 2>&1; then
    print_message info "Extracting with Python..."
    python3 -c "
import zipfile
import sys
try:
    with zipfile.ZipFile('$archive_file', 'r') as zip_ref:
        zip_ref.extractall('.')
    print('✅ Extraction successful')
except Exception as e:
    print(f'❌ Python extraction failed: {e}')
    sys.exit(1)
"
  elif command -v python >/dev/null 2>&1; then
    print_message info "Extracting with Python..."
    python -c "
import zipfile
import sys
try:
    with zipfile.ZipFile('$archive_file', 'r') as zip_ref:
        zip_ref.extractall('.')
    print('✅ Extraction successful')
except Exception as e:
    print(f'❌ Python extraction failed: {e}')
    sys.exit(1)
"
  else
    print_message error "No extraction tool found. Please install one of the following:"
    print_message info "  Ubuntu/Debian/WSL: ${PURPLE}sudo apt-get install unzip${NC}"
    print_message info "  CentOS/RHEL: ${PURPLE}sudo yum install unzip${NC}"
    print_message info "  Fedora: ${PURPLE}sudo dnf install unzip${NC}"
    print_message info "  Arch: ${PURPLE}sudo pacman -S unzip${NC}"
    print_message info "  Alpine: ${PURPLE}sudo apk add unzip${NC}"
    print_message info "  macOS: ${PURPLE}brew install unzip${NC} ${GRAY}(unzip should be pre-installed)${NC}"
    print_message info ""
    print_message info "Alternatively, if you have Python installed, make sure python3 or python is in your PATH."
    exit 1
  fi
}

download_and_install() {
  print_message info "Downloading ${PINK}ken8n-coder ${BLUE}version: ${PURPLE}$specific_version ${BLUE}..."
  mkdir -p ken8ncodertmp && cd ken8ncodertmp
  curl -# -L -o "$filename" "$url"
  extract_archive "$filename"

  # Store the Go TUI binary as the main executable
  # Check if binary is in platform-specific directory (v1.1.5+), bin/ subdirectory (v1.1.3+) or root (older versions)
  if [ -f "ken8n-coder-$os-$arch/bin/ken8n-coder" ]; then
    mv "ken8n-coder-$os-$arch/bin/ken8n-coder" "$INSTALL_DIR/ken8n-coder"
    # Copy validation scripts from platform directory
    if [ -d "ken8n-coder-$os-$arch/validation-scripts" ]; then
      cp -r "ken8n-coder-$os-$arch/validation-scripts" "$HOME/.ken8n-coder/"
    fi
    # Copy deploy-script from platform directory (v2.4.2+)
    if [ -d "ken8n-coder-$os-$arch/deploy-script" ]; then
      cp -r "ken8n-coder-$os-$arch/deploy-script" "$HOME/.ken8n-coder/"
    fi
  elif [ -f "ken8n-coder-$os-$arch/bin/ken8n-coder.exe" ]; then
    mv "ken8n-coder-$os-$arch/bin/ken8n-coder.exe" "$INSTALL_DIR/ken8n-coder.exe"
    # Copy validation scripts from platform directory
    if [ -d "ken8n-coder-$os-$arch/validation-scripts" ]; then
      cp -r "ken8n-coder-$os-$arch/validation-scripts" "$HOME/.ken8n-coder/"
    fi
    # Copy deploy-script from platform directory (v2.4.2+)
    if [ -d "ken8n-coder-$os-$arch/deploy-script" ]; then
      cp -r "ken8n-coder-$os-$arch/deploy-script" "$HOME/.ken8n-coder/"
    fi
  elif [ -f "bin/ken8n-coder" ]; then
    mv bin/ken8n-coder "$INSTALL_DIR/ken8n-coder"
    # Copy validation scripts if present (v1.1.3+)
    if [ -d "validation-scripts" ]; then
      cp -r validation-scripts "$HOME/.ken8n-coder/"
    fi
    # Copy deploy-script if present (v2.4.2+)
    if [ -d "deploy-script" ]; then
      cp -r deploy-script "$HOME/.ken8n-coder/"
    fi
  elif [ -f "ken8n-coder" ]; then
    mv ken8n-coder "$INSTALL_DIR/ken8n-coder"
  else
    echo "❌ Error: ken8n-coder binary not found in archive"
    exit 1
  fi

  chmod +x "$INSTALL_DIR/ken8n-coder"
  cd .. && rm -rf ken8ncodertmp
}

download_and_install

add_to_path() {
  local config_file=$1
  local command=$2

  if grep -Fxq "$command" "$config_file"; then
    print_message info "Command already exists in $config_file, skipping write."
  elif [[ -w $config_file ]]; then
    echo -e "\n# ken8n-coder" >>"$config_file"
    echo "$command" >>"$config_file"
    print_message info "Successfully added ${PINK}ken8n-coder ${BLUE}to \$PATH in $config_file"
  else
    print_message warning "Manually add the directory to $config_file (or similar):"
    print_message info "  $command"
  fi
}

XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-$HOME/.config}

current_shell=$(basename "$SHELL")
case $current_shell in
fish)
  config_files="$HOME/.config/fish/config.fish"
  ;;
zsh)
  config_files="$HOME/.zshrc $HOME/.zshenv $XDG_CONFIG_HOME/zsh/.zshrc $XDG_CONFIG_HOME/zsh/.zshenv"
  ;;
bash)
  config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile $XDG_CONFIG_HOME/bash/.bashrc $XDG_CONFIG_HOME/bash/.bash_profile"
  ;;
ash)
  config_files="$HOME/.ashrc $HOME/.profile /etc/profile"
  ;;
sh)
  config_files="$HOME/.ashrc $HOME/.profile /etc/profile"
  ;;
*)
  # Default case if none of the above matches
  config_files="$HOME/.bashrc $HOME/.bash_profile $XDG_CONFIG_HOME/bash/.bashrc $XDG_CONFIG_HOME/bash/.bash_profile"
  ;;
esac

config_file=""
for file in $config_files; do
  if [[ -f $file ]]; then
    config_file=$file
    break
  fi
done

if [[ -z $config_file ]]; then
  print_message error "No config file found for $current_shell. Checked files: $config_files"
  exit 1
fi

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  case $current_shell in
  fish)
    add_to_path "$config_file" "fish_add_path $INSTALL_DIR"
    ;;
  zsh)
    add_to_path "$config_file" "export PATH=$INSTALL_DIR:\$PATH"
    ;;
  bash)
    add_to_path "$config_file" "export PATH=$INSTALL_DIR:\$PATH"
    ;;
  ash)
    add_to_path "$config_file" "export PATH=$INSTALL_DIR:\$PATH"
    ;;
  sh)
    add_to_path "$config_file" "export PATH=$INSTALL_DIR:\$PATH"
    ;;
  *)
    export PATH=$INSTALL_DIR:$PATH
    print_message warning "Manually add the directory to $config_file (or similar):"
    print_message info "  export PATH=$INSTALL_DIR:\$PATH"
    ;;
  esac
fi

if [ -n "${GITHUB_ACTIONS-}" ] && [ "${GITHUB_ACTIONS}" == "true" ]; then
  echo "$INSTALL_DIR" >>"$GITHUB_PATH"
  print_message info "Added $INSTALL_DIR to \$GITHUB_PATH"
fi

print_message info "🎉 ${PINK}ken8n-coder v${specific_version}${BLUE} installed successfully!"

# Update or install MCP servers
update_mcp_servers() {
  local MCP_DIR="$HOME/.ken8n-coder/mcp"

  # Install/update n8n MCP server
  if [ -d "$MCP_DIR/node_modules/@kenkaiii/ken8n-mcp" ]; then
    print_message info ""
    print_message info "Updating n8n MCP server to latest version..."
    cd "$MCP_DIR"
    if npm install --production @kenkaiii/ken8n-mcp@latest >/dev/null 2>&1; then
      local MCP_VERSION
      MCP_VERSION=$(grep '"version"' node_modules/@kenkaiii/ken8n-mcp/package.json | sed 's/.*"version": "\(.*\)".*/\1/')
      print_message info "✅ n8n MCP server updated to v${MCP_VERSION}"
    fi
    cd - >/dev/null
  elif command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    print_message info ""
    print_message info "Installing MCP servers..."
    mkdir -p "$MCP_DIR"
    cd "$MCP_DIR"
    cat >package.json <<'EOF'
{
  "name": "ken8n-coder-mcp-local",
  "version": "1.0.0",
  "private": true,
  "description": "Local MCP server installation for ken8n-coder"
}
EOF
    if npm install --production @kenkaiii/ken8n-mcp@latest >/dev/null 2>&1; then
      local MCP_VERSION
      MCP_VERSION=$(grep '"version"' node_modules/@kenkaiii/ken8n-mcp/package.json | sed 's/.*"version": "\(.*\)".*/\1/')
      print_message info "✅ n8n MCP server installed v${MCP_VERSION}"
    fi
    cd - >/dev/null
  fi

  # Install ken-you-remember MCP (memory tool)
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    print_message info "Installing memory MCP server (ken-you-remember)..."
    cd "$MCP_DIR"
    if npm install --production ken-you-remember@latest >/dev/null 2>&1; then
      local MEMORY_VERSION
      MEMORY_VERSION=$(grep '"version"' node_modules/ken-you-remember/package.json 2>/dev/null | sed 's/.*"version": "\(.*\)".*/\1/' || echo "latest")
      print_message info "✅ Memory MCP server installed${MEMORY_VERSION:+ v$MEMORY_VERSION}"
    else
      print_message warning "Could not install ken-you-remember MCP. Memory features may not be available."
    fi
    cd - >/dev/null
  fi
}

# Setup default MCP configuration
setup_mcp_config() {
  local CONFIG_DIR="$HOME/.config/ken8n-coder"
  local CONFIG_FILE="$CONFIG_DIR/ken8n-coder.json"

  # Only create config if it doesn't exist
  if [ ! -f "$CONFIG_FILE" ]; then
    print_message info "Setting up default MCP configuration..."
    mkdir -p "$CONFIG_DIR"
    cat >"$CONFIG_FILE" <<'EOF'
{
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/sse"
    },
    "memory": {
      "type": "local",
      "command": ["npx", "-y", "ken-you-remember"],
      "enabled": true
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
EOF
    print_message info "✅ MCP configuration created at $CONFIG_FILE"
  else
    print_message info "MCP configuration already exists at $CONFIG_FILE"
  fi
}

# Always update MCP servers and setup config
update_mcp_servers
setup_mcp_config

# Define color for the logo (matching TUI)
PINK='\033[38;2;255;179;209m'

print_message info ""
print_message info "${PINK}Welcome to...${NC}"
print_message info ""
echo -e "${PINK}░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓███████▓▒░ ░▒▓██████▓▒░░▒▓███████▓▒░${NC}"
echo -e "${PINK}░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░${NC}"
echo -e "${PINK}░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░${NC}"
echo -e "${PINK}░▒▓███████▓▒░░▒▓██████▓▒░ ░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░${NC}"
echo -e "${PINK}░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░${NC}"
echo -e "${PINK}░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░${NC}"
echo -e "${PINK}░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░${NC}"
print_message info ""
print_message info "${PURPLE}═══════════════════════════════════════════════════════════════════════════════════════════${NC}"
print_message info ""
print_message info "${PURPLE}🚀 Getting Started:${NC}"
print_message info ""
print_message info "  ${PURPLE}1. Activate ken8n-coder in your current terminal:${NC}"
case "$SHELL" in
*bash*)
  print_message info "     ${PINK}source ~/.bashrc${NC}"
  ;;
*zsh*)
  print_message info "     ${PINK}source ~/.zshrc${NC}"
  ;;
*fish*)
  print_message info "     ${PINK}source ~/.config/fish/config.fish${NC}"
  ;;
*)
  print_message info "     ${PINK}source <your-shell-config>${NC} ${GRAY}or open a new terminal${NC}"
  ;;
esac
print_message info ""
print_message info "  ${PURPLE}2. Set up authentication ${GRAY}(first time only):${NC}"
print_message info "     ${PINK}ken8n-coder auth login${NC}"
print_message info ""
print_message info "  ${PURPLE}3. Configure your n8n server connection:${NC}"
print_message info "     ${PINK}ken8n-coder mcp setup${NC}"
print_message info ""
print_message info "  ${PURPLE}4. Start creating workflows:${NC}"
print_message info "     ${PINK}ken8n-coder${NC}"
