#!/bin/bash

# Script to rename all opencode references to ken8n-coder
# This will update folder names and all references throughout the codebase

set -e # Exit on any error

echo "🔄 Starting opencode → ken8n-coder migration..."

# Step 1: Rename the main package folder
echo "📁 Renaming packages/ken8n-coder to packages/ken8n-coder..."
if [ -d "packages/ken8n-coder" ]; then
  mv packages/ken8n-coder packages/ken8n-coder
  echo "✅ Folder renamed"
else
  echo "⚠️  packages/ken8n-coder folder not found, skipping rename"
fi

# Step 2: Update all import statements
echo "🔧 Updating import statements..."

# Find all TypeScript/JavaScript files and update imports
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" |
  grep -v node_modules |
  xargs sed -i 's|packages/ken8n-coder|packages/ken8n-coder|g'

find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" |
  grep -v node_modules |
  xargs sed -i 's|from.*opencode|from ken8n-coder|g'

find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" |
  grep -v node_modules |
  xargs sed -i 's|import.*opencode|import ken8n-coder|g'

# Step 3: Update Go import paths
echo "🐹 Updating Go import paths..."
find . -name "*.go" |
  grep -v node_modules |
  xargs sed -i 's|github.com/kenkaiii/ken8n-coder-sdk-go|github.com/kenkaiii/ken8n-coder-sdk-go|g'

# Step 4: Update package.json files
echo "📦 Updating package.json files..."
find . -name "package.json" |
  grep -v node_modules |
  xargs sed -i 's|packages/ken8n-coder|packages/ken8n-coder|g'

# Step 5: Update configuration files
echo "⚙️  Updating configuration files..."

# Update any config files that reference the path
find . -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.toml" |
  grep -v node_modules |
  xargs sed -i 's|packages/ken8n-coder|packages/ken8n-coder|g'

# Step 6: Update markdown files
echo "📝 Updating documentation..."
find . -name "*.md" -o -name "*.mdx" |
  grep -v node_modules |
  xargs sed -i 's|packages/ken8n-coder|packages/ken8n-coder|g'

# Step 7: Update any shell scripts or other files
echo "🔧 Updating shell scripts and other files..."
find . -name "*.sh" -o -name "*.mjs" |
  grep -v node_modules |
  xargs sed -i 's|packages/ken8n-coder|packages/ken8n-coder|g'

# Step 8: Update binary/executable references if any
echo "🔧 Checking for binary references..."
if [ -f "ken8n-coder" ]; then
  sed -i 's|packages/ken8n-coder|packages/ken8n-coder|g' ken8n-coder
fi

if [ -f "ken8n-coder-run" ]; then
  sed -i 's|packages/ken8n-coder|packages/ken8n-coder|g' ken8n-coder-run
fi

# Step 9: Update any remaining opencode references (case-insensitive search for safety)
echo "🔍 Final cleanup of any remaining references..."
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.go" -o -name "*.json" -o -name "*.md" \) |
  grep -v node_modules |
  grep -v .git |
  xargs grep -l "opencode" |
  while read file; do
    echo "⚠️  Found remaining 'opencode' in: $file"
    echo "   You may need to manually review this file"
  done

echo ""
echo "✅ Migration complete!"
echo ""
echo "🔍 Next steps:"
echo "1. Review any files listed above that still contain 'opencode' references"
echo "2. Test the build: bun install && bun run build"
echo "3. Test the TUI: ./ken8n-coder"
echo "4. Commit the changes if everything works"
echo ""
echo "⚠️  Important: This script made many changes. Please test thoroughly before committing!"
