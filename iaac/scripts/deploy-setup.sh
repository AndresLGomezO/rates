#!/usr/bin/env bash
# deploy-setup.sh
# Automated setup script for GitHub Actions deployment pipeline
# Compatible with Bash 5.0+
#
# This script:
# 1. Performs pre-flight checks (gh CLI, jq, terraform)
# 2. Verifies GitHub authentication
# 3. Applies Terraform configuration
# 4. Commits and pushes generated workflow file
# 5. Provides success summary with next steps

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PROJECT_ROOT}/.." && pwd)"

# Version requirements
TERRAFORM_MIN_VERSION="1.6.0"
GH_MIN_VERSION="2.40.0"
JQ_MIN_VERSION="1.6"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

check_required_tools() {
  print_header "Pre-flight Checks"

  local all_ok=true

  # Check Terraform
  if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed"
    print_info "Install: https://developer.hashicorp.com/terraform/downloads"
    all_ok=false
  else
    local tf_version=$(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null || echo "")
    if [ -n "${tf_version}" ]; then
      print_success "Terraform ${tf_version} installed"
    else
      print_success "Terraform installed (version check skipped)"
    fi
  fi

  # Check GitHub CLI
  if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed"
    print_info "Install: https://cli.github.com/manual/installation"
    all_ok=false
  else
    local gh_version=$(gh --version 2>/dev/null | head -n1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || echo "")
    if [ -n "${gh_version}" ]; then
      print_success "GitHub CLI ${gh_version} installed"
    else
      print_success "GitHub CLI installed (version check skipped)"
    fi
  fi

  # Check jq
  if ! command -v jq &> /dev/null; then
    print_error "jq is not installed"
    print_info "Install: https://stedolan.github.io/jq/download/"
    all_ok=false
  else
    local jq_version=$(jq --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' || echo "")
    if [ -n "${jq_version}" ]; then
      print_success "jq ${jq_version} installed"
    else
      print_success "jq installed (version check skipped)"
    fi
  fi

  # Check Git
  if ! command -v git &> /dev/null; then
    print_error "Git is not installed"
    all_ok=false
  else
    print_success "Git installed"
  fi

  if [ "${all_ok}" = false ]; then
    print_error "Please install missing tools before continuing"
    exit 1
  fi

  echo ""
}

check_github_auth() {
  print_header "GitHub Authentication"

  # Check if GitHub CLI is authenticated
  if ! gh auth status &> /dev/null; then
    print_error "GitHub CLI is not authenticated"
    print_info "Run: gh auth login"
    exit 1
  fi

  # Get authenticated user
  local gh_user=$(gh api user --jq '.login' 2>/dev/null || echo "")
  if [ -n "${gh_user}" ]; then
    print_success "Authenticated as: ${gh_user}"
  else
    print_warning "Could not verify GitHub user (continuing anyway)"
  fi

  # Check GITHUB_TOKEN environment variable
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    print_info "Setting GITHUB_TOKEN from gh auth token"
    export GITHUB_TOKEN=$(gh auth token)
    if [ -z "${GITHUB_TOKEN}" ]; then
      print_error "Failed to get GitHub token"
      exit 1
    fi
    print_success "GITHUB_TOKEN set"
  else
    print_success "GITHUB_TOKEN already set"
  fi

  echo ""
}

check_terraform_state() {
  print_header "Terraform State Check"

  cd "${PROJECT_ROOT}"

  # Check if terraform is initialized
  if [ ! -d ".terraform" ]; then
    print_warning "Terraform not initialized"
    print_info "Running: terraform init"
    terraform init
    print_success "Terraform initialized"
  else
    print_success "Terraform initialized"
  fi

  # Validate configuration
  print_info "Validating Terraform configuration..."
  if terraform validate &> /dev/null; then
    print_success "Terraform configuration is valid"
  else
    print_error "Terraform configuration validation failed"
    terraform validate
    exit 1
  fi

  echo ""
}

# ============================================================================
# Terraform Apply
# ============================================================================

apply_terraform() {
  print_header "Applying Terraform Configuration"

  cd "${PROJECT_ROOT}"

  # Show plan
  print_info "Generating Terraform plan..."
  terraform plan -out=tfplan

  # Ask for confirmation
  echo ""
  read -p "Apply this plan? (yes/no): " -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_warning "Terraform apply cancelled"
    exit 0
  fi

  # Apply
  print_info "Applying Terraform configuration..."
  terraform apply tfplan

  # Clean up plan file
  rm -f tfplan

  print_success "Terraform apply completed"
  echo ""
}

# ============================================================================
# Workflow File Management
# ============================================================================

commit_workflow_file() {
  print_header "Workflow File Management"

  # Check if workflow file was generated
  local workflow_file="${REPO_ROOT}/.github/workflows/deploy-*.yml"
  if ! ls ${workflow_file} 1> /dev/null 2>&1; then
    print_warning "No workflow file found (may not be generated if configure_github_actions = false)"
    return 0
  fi

  # Get the actual workflow file path
  local workflow_path=$(ls ${workflow_file} | head -n1)
  local workflow_name=$(basename "${workflow_path}")

  print_info "Found workflow file: ${workflow_name}"

  # Check git status
  cd "${REPO_ROOT}"
  if ! git status &> /dev/null; then
    print_warning "Not a git repository (skipping commit)"
    return 0
  fi

  # Check if file is already committed
  if git diff --quiet "${workflow_path}" 2>/dev/null && \
     git ls-files --error-unmatch "${workflow_path}" &> /dev/null; then
    print_success "Workflow file already committed"
    return 0
  fi

  # Stage workflow file
  print_info "Staging workflow file..."
  git add "${workflow_path}"

  # Check if there are changes to commit
  if git diff --cached --quiet; then
    print_success "No changes to commit"
    return 0
  fi

  # Commit
  print_info "Committing workflow file..."
  git commit -m "feat: Add automated deployment pipeline (${workflow_name})" || {
    print_warning "Commit failed (may need to commit manually)"
    return 0
  }

  print_success "Workflow file committed"

  # Ask about pushing
  echo ""
  read -p "Push to remote repository? (yes/no): " -r
  echo ""
  if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_info "Pushing to remote..."
    git push || {
      print_warning "Push failed (may need to push manually)"
      return 0
    }
    print_success "Workflow file pushed to remote"
  else
    print_info "Skipping push (commit locally only)"
  fi

  echo ""
}

# ============================================================================
# Success Summary
# ============================================================================

show_success_summary() {
  print_header "Setup Complete! 🎉"

  print_success "GitHub Actions deployment pipeline configured"

  echo ""
  print_info "Next Steps:"
  echo ""
  echo "  1. Verify GitHub secrets are set:"
  echo "     ${BLUE}gh secret list --repo $(gh repo view --json owner,name -q '.owner.login + "/" + .name')${NC}"
  echo ""
  echo "  2. Verify GitHub variables are set:"
  echo "     ${BLUE}gh variable list --repo $(gh repo view --json owner,name -q '.owner.login + "/" + .name')${NC}"
  echo ""
  echo "  3. Check the generated workflow file:"
  echo "     ${BLUE}cat .github/workflows/deploy-*.yml${NC}"
  echo ""
  echo "  4. Test the deployment by pushing to main branch:"
  echo "     ${BLUE}git push origin main${NC}"
  echo ""
  echo "  5. Monitor GitHub Actions:"
  echo "     ${BLUE}gh run watch${NC}"
  echo ""

  # Get Terraform outputs if available
  cd "${PROJECT_ROOT}"
  if terraform output -json github_integration &> /dev/null; then
    echo ""
    print_info "Terraform Outputs:"
    terraform output github_integration | head -20
    echo ""
  fi

  print_success "Setup complete! Your deployment pipeline is ready."
  echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
  print_header "GitHub Actions Deployment Setup"

  # Pre-flight checks
  check_required_tools
  check_github_auth
  check_terraform_state

  # Apply Terraform
  apply_terraform

  # Commit workflow file
  commit_workflow_file

  # Success summary
  show_success_summary
}

# Run main function
main "$@"
