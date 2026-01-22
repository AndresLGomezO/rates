#!/bin/bash
# setup-terraform.sh
# Complete Terraform setup and deployment script
# Runs: setup → init → validate → plan → apply

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
IAAC_DIR="${PROJECT_ROOT}/iaac"
SETUP_SCRIPT="${IAAC_DIR}/scripts/setup.sh"
TFVARS_FILE="${IAAC_DIR}/terraform.tfvars"

# Flags
SKIP_SETUP=false
SKIP_PLAN=false
AUTO_APPROVE=false

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

print_step() {
  echo -e "\n${MAGENTA}▶${NC} ${MAGENTA}$1${NC}\n"
}

# ============================================================================
# Parse Arguments
# ============================================================================

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --skip-setup)
        SKIP_SETUP=true
        shift
        ;;
      --skip-plan)
        SKIP_PLAN=true
        shift
        ;;
      --auto-approve)
        AUTO_APPROVE=true
        shift
        ;;
      -h|--help)
        show_help
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
}

show_help() {
  cat <<EOF
Usage: $0 [OPTIONS]

Complete Terraform setup and deployment workflow:
  1. Setup (runs setup.sh if terraform.tfvars doesn't exist)
  2. Init (terraform init)
  3. Validate (terraform validate)
  4. Plan (terraform plan)
  5. Apply (terraform apply)

Options:
  --skip-setup      Skip the setup step (assumes terraform.tfvars exists)
  --skip-plan       Skip the plan step (goes straight to apply)
  --auto-approve    Auto-approve plan and apply (no prompts)
  -h, --help        Show this help message

Examples:
  $0                 # Full interactive setup
  $0 --skip-setup   # Skip setup, use existing terraform.tfvars
  $0 --auto-approve # Non-interactive (use with caution!)
EOF
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

check_prerequisites() {
  print_header "Pre-flight Checks"

  # Check if we're in the right directory
  if [ ! -d "${IAAC_DIR}" ]; then
    print_error "Terraform directory not found: ${IAAC_DIR}"
    exit 1
  fi

  # Check if terraform is installed
  if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed"
    print_info "Install from: https://www.terraform.io/downloads"
    exit 1
  fi

  local tf_version=$(terraform version -json 2>/dev/null | grep -o '"terraform_version":"[^"]*' | cut -d'"' -f4 || echo "")
  if [ -n "${tf_version}" ]; then
    print_success "Terraform ${tf_version} found"
  else
    print_warning "Could not determine Terraform version"
  fi

  # Check if gcloud is installed (for authentication)
  if ! command -v gcloud &> /dev/null; then
    print_warning "gcloud CLI not found (may be needed for authentication)"
  else
    print_success "gcloud CLI found"
  fi

  echo ""
}

# ============================================================================
# Step 1: Setup (Generate terraform.tfvars)
# ============================================================================

run_setup() {
  if [ "${SKIP_SETUP}" = true ]; then
    print_info "Skipping setup step (--skip-setup flag)"
    return 0
  fi

  print_header "Step 1: Configuration Setup"

  if [ -f "${TFVARS_FILE}" ]; then
    print_info "terraform.tfvars already exists: ${TFVARS_FILE}"
    read -p "Do you want to regenerate it? [y/N]: " regenerate
    regenerate=${regenerate:-N}
    
    if [[ ! "${regenerate}" =~ ^[Yy]$ ]]; then
      print_success "Using existing terraform.tfvars"
      return 0
    fi
  fi

  if [ ! -f "${SETUP_SCRIPT}" ]; then
    print_error "Setup script not found: ${SETUP_SCRIPT}"
    exit 1
  fi

  print_info "Running setup script to generate terraform.tfvars..."
  print_info "This will prompt you for configuration values."
  echo ""

  # Run setup script (but skip the "next steps" since we'll do them here)
  cd "${IAAC_DIR}"
  bash "${SETUP_SCRIPT}" || {
    print_error "Setup script failed"
    exit 1
  }

  if [ ! -f "${TFVARS_FILE}" ]; then
    print_error "terraform.tfvars was not generated"
    exit 1
  fi

  print_success "Configuration file generated: ${TFVARS_FILE}"
  echo ""
}

# ============================================================================
# Step 2: Initialize Terraform
# ============================================================================

run_init() {
  print_header "Step 2: Terraform Initialize"

  cd "${IAAC_DIR}"

  print_info "Initializing Terraform..."
  print_info "This downloads providers and modules."
  echo ""

  if terraform init; then
    print_success "Terraform initialized successfully"
  else
    print_error "Terraform initialization failed"
    exit 1
  fi

  echo ""
}

# ============================================================================
# Step 3: Validate Configuration
# ============================================================================

run_validate() {
  print_header "Step 3: Validate Configuration"

  cd "${IAAC_DIR}"

  print_info "Validating Terraform configuration..."
  echo ""

  if terraform validate; then
    print_success "Configuration is valid"
  else
    print_error "Configuration validation failed"
    exit 1
  fi

  echo ""
}

# ============================================================================
# Step 3.5: Import Existing Resources (if any)
# ============================================================================

run_import_existing() {
  print_header "Step 3.5: Import Existing Resources"

  cd "${IAAC_DIR}"

  local import_script="${IAAC_DIR}/scripts/import-existing.sh"
  
  if [ ! -f "${import_script}" ]; then
    print_warning "Import script not found, skipping import step"
    return 0
  fi

  print_info "Checking for existing resources to import..."
  print_info "This prevents 'already exists' errors during apply."
  echo ""

  if [ "${AUTO_APPROVE}" = false ]; then
    read -p "Do you want to import existing resources? [Y/n]: " import_resources
    import_resources=${import_resources:-Y}
    
    if [[ ! "${import_resources}" =~ ^[Yy]$ ]]; then
      print_info "Skipping import step"
      return 0
    fi
  fi

  echo ""
  print_step "Running import script..."

  if bash "${import_script}"; then
    print_success "Import process completed"
  else
    print_warning "Some resources could not be imported (this is OK if they don't exist)"
  fi

  echo ""
}

# ============================================================================
# Step 4: Plan Changes
# ============================================================================

run_plan() {
  if [ "${SKIP_PLAN}" = true ]; then
    print_info "Skipping plan step (--skip-plan flag)"
    return 0
  fi

  print_header "Step 4: Plan Infrastructure Changes"

  cd "${IAAC_DIR}"

  print_info "Creating execution plan..."
  print_warning "This will show what resources will be created, modified, or destroyed."
  echo ""

  if [ "${AUTO_APPROVE}" = false ]; then
    read -p "Continue with plan? [Y/n]: " continue_plan
    continue_plan=${continue_plan:-Y}
    
    if [[ ! "${continue_plan}" =~ ^[Yy]$ ]]; then
      print_info "Plan cancelled by user"
      exit 0
    fi
  fi

  echo ""
  print_step "Running terraform plan..."

  if terraform plan -out=tfplan; then
    print_success "Plan created successfully"
    print_info "Plan saved to: tfplan"
  else
    print_error "Plan failed"
    exit 1
  fi

  echo ""
}

# ============================================================================
# Step 5: Apply Changes
# ============================================================================

run_apply() {
  print_header "Step 5: Apply Infrastructure Changes"

  cd "${IAAC_DIR}"

  print_warning "This will CREATE or MODIFY infrastructure resources in GCP."
  print_warning "This may incur costs depending on your configuration."
  echo ""

  if [ "${AUTO_APPROVE}" = false ]; then
    read -p "Do you want to apply these changes? [y/N]: " confirm_apply
    confirm_apply=${confirm_apply:-N}
    
    if [[ ! "${confirm_apply}" =~ ^[Yy]$ ]]; then
      print_info "Apply cancelled by user"
      print_info "You can run 'terraform apply' manually later"
      exit 0
    fi
  fi

  echo ""
  print_step "Applying infrastructure changes..."

  # Use the plan file if it exists, otherwise run plan + apply
  if [ -f "tfplan" ] && [ "${SKIP_PLAN}" = false ]; then
    print_info "Applying saved plan from tfplan..."
    if terraform apply tfplan; then
      print_success "Infrastructure applied successfully"
      # Clean up plan file
      rm -f tfplan
    else
      print_error "Apply failed"
      exit 1
    fi
  else
    print_info "Running terraform apply (will create plan automatically)..."
    if terraform apply; then
      print_success "Infrastructure applied successfully"
    else
      print_error "Apply failed"
      exit 1
    fi
  fi

  echo ""
}

# ============================================================================
# Show Summary
# ============================================================================

show_summary() {
  print_header "🎉 Setup Complete!"

  cd "${IAAC_DIR}"

  print_success "Terraform infrastructure has been deployed successfully"
  echo ""

  print_info "Next steps:"
  echo "  1. View outputs:"
  echo "     ${CYAN}cd ${IAAC_DIR}${NC}"
  echo "     ${CYAN}terraform output${NC}"
  echo ""
  echo "  2. View specific outputs:"
  echo "     ${CYAN}terraform output project_id${NC}"
  echo "     ${CYAN}terraform output github_actions_config${NC}"
  echo ""
  echo "  3. Create GitHub deployment secret (if needed):"
  echo "     ${CYAN}cd ${IAAC_DIR}${NC}"
  echo "     ${CYAN}./scripts/setup.sh create-secret dev${NC}"
  echo ""
  echo "  4. To destroy infrastructure (when needed):"
  echo "     ${CYAN}cd ${IAAC_DIR}${NC}"
  echo "     ${CYAN}terraform destroy${NC}"
  echo ""

  # Try to show some key outputs
  if terraform output project_id &>/dev/null; then
    local project_id=$(terraform output -raw project_id 2>/dev/null || echo "")
    if [ -n "${project_id}" ]; then
      print_info "Deployed to project: ${GREEN}${project_id}${NC}"
    fi
  fi

  echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  parse_args "$@"

  print_header "🚀 Terraform Infrastructure Setup & Deployment"
  
  echo "This script will guide you through the complete Terraform workflow:"
  echo "  1. Setup (generate terraform.tfvars)"
  echo "  2. Initialize (terraform init)"
  echo "  3. Validate (terraform validate)"
  echo "  4. Plan (terraform plan)"
  echo "  5. Apply (terraform apply)"
  echo ""

  check_prerequisites
  run_setup
  run_init
  run_validate
  run_import_existing
  run_plan
  run_apply
  show_summary
}

# Run main function
main "$@"
