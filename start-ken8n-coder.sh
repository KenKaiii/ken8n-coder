#!/bin/bash
# ken8n-coder startup script
# This script sets up the required environment variables and runs the ken8n-coder TUI

# Check if ken8n-coder binary is available
if ! command -v ken8n-coder &> /dev/null; then
    echo "ken8n-coder binary not found. Please run 'go install ./cmd/ken8n-coder' from packages/tui directory"
    exit 1
fi

# Set default environment variables
export OPENCODE_SERVER="${OPENCODE_SERVER:-http://localhost:8080}"
export OPENCODE_APP_INFO="${OPENCODE_APP_INFO:-{\"id\":\"development\",\"name\":\"ken8n-coder\",\"version\":\"dev\"}}"

echo "Starting ken8n-coder TUI..."
echo "Server: $OPENCODE_SERVER"
echo "Note: Make sure you have a ken8n-coder server running at the specified URL"
echo ""

# Run ken8n-coder with all arguments passed to this script
exec ken8n-coder "$@"