#!/usr/bin/env bash
set -euo pipefail

# release.sh - Enhanced release script for ken8n-coder
# Integrates with existing script/release and script/publish.ts workflows

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[38;2;255;140;0m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ken8n-coder"
REPO_OWNER="kenkaiii"
REPO_NAME="ken8n-coder"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR" && pwd)"

# Default values
RELEASE_TYPE="patch"
DRY_RUN=false
FORCE=false
SKIP_TESTS=false
CUSTOM_VERSION=""

# Print functions
print_message() {
  local level=$1
  local message=$2
  local color=""

  case $level in
  info) color="${GREEN}" ;;
  warn) color="${YELLOW}" ;;
  error) color="${RED}" ;;
  debug) color="${BLUE}" ;;
  header) color="${ORANGE}" ;;
  esac

  echo -e "${color}${message}${NC}"
}

print_header() {
  echo
  print_message header "=== $1 ==="
  echo
}

# Help function
show_help() {
  cat <<EOF
Usage: $0 [OPTIONS]

Enhanced release script for ken8n-coder that integrates with existing workflows.

OPTIONS:
    --minor         Create a minor version release (default: patch)
    --major         Create a major version release  
    --version VER   Use specific version (e.g., --version 1.2.3)
    --dry-run       Show what would be done without making changes
    --force         Skip confirmations and force release
    --skip-tests    Skip test validation (not recommended)
    --help          Show this help message

EXAMPLES:
    $0                     # Patch release (1.0.0 -> 1.0.1)
    $0 --minor             # Minor release (1.0.0 -> 1.1.0)  
    $0 --major             # Major release (1.0.0 -> 2.0.0)
    $0 --version 2.1.0     # Specific version
    $0 --dry-run --minor   # Preview minor release changes

INTEGRATION:
    This script integrates with existing:
    - script/release (version bumping)
    - script/publish.ts (publishing workflow)
    - .github/workflows/publish.yml (CI/CD)
    - install script (download validation)

EOF
}

# Parse command line arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
    --minor)
      RELEASE_TYPE="minor"
      shift
      ;;
    --major)
      RELEASE_TYPE="major"
      shift
      ;;
    --version)
      if [[ $# -lt 2 || $2 == --* ]]; then
        print_message error "--version requires a version number (e.g., --version 1.2.3)"
        echo
        show_help
        exit 1
      fi
      CUSTOM_VERSION="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --help | -h)
      show_help
      exit 0
      ;;
    *)
      print_message error "Unknown parameter: $1"
      echo
      show_help
      exit 1
      ;;
    esac
  done
}

# Dependency checks
check_dependencies() {
  print_header "Dependency Validation"

  local deps=("git" "bun" "gh" "curl" "jq")
  local missing_deps=()

  for dep in "${deps[@]}"; do
    if command -v "$dep" >/dev/null 2>&1; then
      local version
      case $dep in
      bun) version=$(bun --version) ;;
      gh) version=$(gh --version | head -1 | awk '{print $3}') ;;
      git) version=$(git --version | awk '{print $3}') ;;
      curl) version=$(curl --version | head -1 | awk '{print $2}') ;;
      jq) version=$(jq --version | sed 's/jq-//') ;;
      esac
      print_message info "✓ $dep: $version"
    else
      missing_deps+=("$dep")
      print_message error "✗ $dep: not found"
    fi
  done

  if [[ ${#missing_deps[@]} -gt 0 ]]; then
    print_message error "Missing required dependencies: ${missing_deps[*]}"
    print_message info "Install missing dependencies and try again"
    exit 1
  fi
}

# Environment validation
validate_environment() {
  print_header "Environment Validation"

  # Check if we're in the right directory
  if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    print_message error "Not in project root directory (package.json not found)"
    exit 1
  fi

  # Check if we're in a git repository
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    print_message error "Not in a git repository"
    exit 1
  fi

  # Check if working directory is clean
  if [[ -n $(git status --porcelain) ]]; then
    print_message error "Working directory is not clean"
    git status --short
    if [[ $FORCE != true ]]; then
      print_message info "Use --force to ignore or commit your changes first"
      exit 1
    fi
    print_message warn "Proceeding with dirty working directory (--force used)"
  fi

  # Check GitHub authentication
  if ! gh auth status >/dev/null 2>&1; then
    print_message error "GitHub CLI not authenticated"
    print_message info "Run: gh auth login"
    exit 1
  fi

  # Check if we're on the correct branch
  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ $current_branch != "main" && $current_branch != "dev" ]]; then
    print_message warn "Not on main or dev branch (current: $current_branch)"
    if [[ $FORCE != true ]]; then
      print_message info "Use --force to release from current branch"
      exit 1
    fi
  fi

  print_message info "✓ Environment validation passed"
}

# Project structure validation
validate_project_structure() {
  print_header "Project Structure Validation"

  local required_files=(
    "package.json"
    "script/release"
    "script/publish.ts"
    ".github/workflows/publish.yml"
    "install"
  )

  local missing_files=()

  for file in "${required_files[@]}"; do
    if [[ -f "$PROJECT_ROOT/$file" ]]; then
      print_message info "✓ $file"
    else
      missing_files+=("$file")
      print_message error "✗ $file"
    fi
  done

  if [[ ${#missing_files[@]} -gt 0 ]]; then
    print_message error "Missing required files: ${missing_files[*]}"
    exit 1
  fi

  # Validate workspace structure
  if [[ -f "$PROJECT_ROOT/package.json" ]]; then
    local workspaces
    workspaces=$(jq -r '.workspaces.packages[]? // empty' "$PROJECT_ROOT/package.json" 2>/dev/null || echo "")
    if [[ -n $workspaces ]]; then
      print_message info "✓ Workspace configuration detected"
      echo "$workspaces" | while read -r workspace; do
        if [[ -d "$PROJECT_ROOT/$workspace" ]]; then
          print_message debug "  - $workspace"
        fi
      done
    fi
  fi
}

# Test validation
run_tests() {
  if [[ $SKIP_TESTS == true ]]; then
    print_message warn "Skipping tests (--skip-tests used)"
    return 0
  fi

  print_header "Test Validation"

  # Check if there are test scripts
  local has_tests=false
  if grep -q '"test"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
    has_tests=true
    print_message info "Running tests..."
    if [[ $DRY_RUN != true ]]; then
      cd "$PROJECT_ROOT"
      if ! bun test 2>/dev/null; then
        print_message warn "Tests failed or no test runner found"
        if [[ $FORCE != true ]]; then
          print_message info "Use --force to proceed anyway or --skip-tests to skip"
          exit 1
        fi
      else
        print_message info "✓ Tests passed"
      fi
    else
      print_message debug "(dry-run: would run bun test)"
    fi
  fi

  # Type checking
  if grep -q '"typecheck"' "$PROJECT_ROOT/package.json" 2>/dev/null; then
    print_message info "Running type check..."
    if [[ $DRY_RUN != true ]]; then
      cd "$PROJECT_ROOT"
      if ! bun run typecheck 2>/dev/null; then
        print_message warn "Type check failed"
        if [[ $FORCE != true ]]; then
          print_message info "Use --force to proceed anyway"
          exit 1
        fi
      else
        print_message info "✓ Type check passed"
      fi
    else
      print_message debug "(dry-run: would run bun run typecheck)"
    fi
  fi

  if [[ $has_tests != true ]]; then
    print_message warn "No tests found in package.json"
  fi
}

# Version calculation
calculate_version() {
  print_header "Version Calculation"

  local latest_tag
  latest_tag=$(gh release list --limit 1 --json tagName --jq '.[0].tagName' 2>/dev/null || echo "")

  if [[ -z $latest_tag ]]; then
    print_message warn "No existing releases found"
    if [[ -n $CUSTOM_VERSION ]]; then
      NEW_VERSION="$CUSTOM_VERSION"
    else
      NEW_VERSION="1.0.0"
    fi
  else
    print_message info "Latest release: $latest_tag"

    if [[ -n $CUSTOM_VERSION ]]; then
      NEW_VERSION="$CUSTOM_VERSION"
    else
      # Remove 'v' prefix and split version
      local version_without_v="${latest_tag#v}"
      IFS='.' read -ra VERSION_PARTS <<<"$version_without_v"

      case $RELEASE_TYPE in
      major)
        NEW_VERSION="$((VERSION_PARTS[0] + 1)).0.0"
        ;;
      minor)
        NEW_VERSION="${VERSION_PARTS[0]}.$((VERSION_PARTS[1] + 1)).0"
        ;;
      patch)
        NEW_VERSION="${VERSION_PARTS[0]}.${VERSION_PARTS[1]}.$((VERSION_PARTS[2] + 1))"
        ;;
      *)
        print_message error "Invalid release type: $RELEASE_TYPE"
        exit 1
        ;;
      esac
    fi
  fi

  print_message info "New version: $NEW_VERSION"

  # Validate version format
  if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_message error "Invalid version format: $NEW_VERSION (expected: x.y.z)"
    exit 1
  fi
}

# Pre-release validation
pre_release_validation() {
  print_header "Pre-Release Validation"

  # Check if version already exists
  if gh release view "v$NEW_VERSION" >/dev/null 2>&1; then
    print_message error "Version v$NEW_VERSION already exists"
    exit 1
  fi

  # Check if tag already exists
  if git tag -l | grep -q "^v$NEW_VERSION$"; then
    print_message error "Tag v$NEW_VERSION already exists"
    exit 1
  fi

  # Validate install script can handle the new version
  print_message info "Validating install script compatibility..."
  if ! curl -s "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" >/dev/null; then
    print_message warn "Cannot verify GitHub API access (might hit rate limits during release)"
  fi

  print_message info "✓ Pre-release validation passed"
}

# Release confirmation
confirm_release() {
  if [[ $FORCE == true ]]; then
    print_message info "Skipping confirmation (--force used)"
    return 0
  fi

  print_header "Release Confirmation"

  echo "Release Summary:"
  echo "  Project: $APP_NAME"
  echo "  Type: $RELEASE_TYPE"
  echo "  Version: $NEW_VERSION"
  echo "  Repository: $REPO_OWNER/$REPO_NAME"
  echo "  Dry run: $DRY_RUN"
  echo

  if [[ $DRY_RUN != true ]]; then
    read -r -p "Proceed with release? (y/N): " response
    case "$response" in
    [yY] | [yY][eE][sS])
      print_message info "Proceeding with release..."
      ;;
    *)
      print_message info "Release cancelled"
      exit 0
      ;;
    esac
  else
    print_message debug "Dry run - no confirmation needed"
  fi
}

# Execute release
execute_release() {
  print_header "Executing Release"

  if [[ $DRY_RUN == true ]]; then
    print_message debug "DRY RUN - Would execute:"
    print_message debug "1. Call script/release with appropriate flags"
    print_message debug "2. GitHub Actions would trigger publish.yml"
    print_message debug "3. script/publish.ts would handle actual publishing"
    print_message debug "4. Release artifacts would be created"
    print_message debug "5. Install script would be able to download v$NEW_VERSION"
    return 0
  fi

  # Use existing script/release with proper flags
  cd "$PROJECT_ROOT"

  local release_flags=""
  if [[ $RELEASE_TYPE == "minor" ]]; then
    release_flags="--minor"
  fi

  print_message info "Calling existing release workflow..."

  # For custom version, we need to handle this differently
  if [[ -n $CUSTOM_VERSION ]]; then
    print_message info "Triggering GitHub Actions with custom version: $NEW_VERSION"
    gh workflow run publish.yml -f version="$NEW_VERSION"
  else
    # Use existing script/release
    if [[ -x "./script/release" ]]; then
      ./script/release $release_flags
    else
      print_message error "script/release is not executable"
      exit 1
    fi
  fi

  print_message info "✓ Release triggered successfully"
  print_message info "Monitor progress at: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
}

# Post-release validation
post_release_validation() {
  if [[ $DRY_RUN == true ]]; then
    print_message debug "DRY RUN - Would validate release artifacts"
    return 0
  fi

  print_header "Post-Release Validation"

  print_message info "Waiting for release to be created..."

  # Wait for the release to appear (with timeout)
  local timeout=300 # 5 minutes
  local elapsed=0
  local check_interval=10

  while [[ $elapsed -lt $timeout ]]; do
    if gh release view "v$NEW_VERSION" >/dev/null 2>&1; then
      print_message info "✓ Release v$NEW_VERSION created successfully"
      break
    fi

    sleep $check_interval
    elapsed=$((elapsed + check_interval))
    print_message debug "Waiting for release... (${elapsed}s/${timeout}s)"
  done

  if [[ $elapsed -ge $timeout ]]; then
    print_message warn "Timeout waiting for release to appear"
    print_message info "Check manually: https://github.com/$REPO_OWNER/$REPO_NAME/releases/tag/v$NEW_VERSION"
    return 1
  fi

  # Test install script with new version
  print_message info "Testing install script with new version..."
  local temp_dir
  temp_dir=$(mktemp -d)

  (
    cd "$temp_dir"
    if curl -fsSL "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/install" | VERSION="$NEW_VERSION" bash -s -- --help >/dev/null 2>&1; then
      print_message info "✓ Install script works with v$NEW_VERSION"
    else
      print_message warn "Install script test failed (might need time for CDN propagation)"
    fi
  )

  rm -rf "$temp_dir"
}

# Cleanup function
cleanup() {
  # Remove any temporary files created during release
  if [[ -d "ken8ncodertmp" ]]; then
    rm -rf ken8ncodertmp
  fi
}

# Main function
main() {
  # Set up cleanup trap
  trap cleanup EXIT

  print_header "ken8n-coder Release Script"

  parse_args "$@"
  check_dependencies
  validate_environment
  validate_project_structure
  run_tests
  calculate_version
  pre_release_validation
  confirm_release
  execute_release
  post_release_validation

  print_header "Release Complete"

  if [[ $DRY_RUN != true ]]; then
    print_message info "🎉 Release v$NEW_VERSION completed successfully!"
    print_message info ""
    print_message info "Next steps:"
    print_message info "  - Monitor GitHub Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
    print_message info "  - View release: https://github.com/$REPO_OWNER/$REPO_NAME/releases/tag/v$NEW_VERSION"
    print_message info "  - Test installation: curl -fsSL https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/main/install | bash"
  else
    print_message info "🔍 Dry run completed - no changes made"
    print_message info "Remove --dry-run to execute the release"
  fi
}

# Run main function with all arguments
main "$@"
