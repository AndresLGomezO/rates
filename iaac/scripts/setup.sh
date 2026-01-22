#!/usr/bin/env bash
# setup.sh
# Interactive setup script for Terraform infrastructure provisioning
# Compatible with Bash 5.0+
# 
# This script guides users through configuration with FREE TIER prompts
# and generates terraform.tfvars file

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
TFVARS_FILE="${PROJECT_ROOT}/terraform.tfvars"

# Version requirements
TERRAFORM_MIN_VERSION="1.6.0"
GCLOUD_MIN_VERSION="450.0.0"
GH_MIN_VERSION="2.40.0"

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
# Version Checking
# ============================================================================

check_version() {
  local tool=$1
  local min_version=$2
  local current_version=$3
  
  if ! command -v "${tool}" &> /dev/null; then
    print_error "${tool} is not installed"
    return 1
  fi
  
  # Skip version check if version is empty
  if [ -z "${current_version}" ]; then
    print_warning "${tool} version could not be determined (continuing anyway)"
    return 0
  fi
  
  # Simple version comparison (assumes semantic versioning)
  local current_major=$(echo "${current_version}" | cut -d. -f1 | tr -d '[:alpha:]')
  local current_minor=$(echo "${current_version}" | cut -d. -f2 | tr -d '[:alpha:]')
  local min_major=$(echo "${min_version}" | cut -d. -f1)
  local min_minor=$(echo "${min_version}" | cut -d. -f2)
  
  # Ensure we have numeric values
  if ! [[ "${current_major}" =~ ^[0-9]+$ ]] || ! [[ "${current_minor}" =~ ^[0-9]+$ ]]; then
    print_warning "${tool} version format could not be parsed (continuing anyway)"
    return 0
  fi
  
  if [ "${current_major}" -lt "${min_major}" ] || \
     ([ "${current_major}" -eq "${min_major}" ] && [ "${current_minor}" -lt "${min_minor}" ]); then
    print_warning "${tool} version ${current_version} is below minimum ${min_version}"
    return 1
  fi
  
  return 0
}

check_tool_versions() {
  print_header "Checking Tool Versions"
  
  local all_ok=true
  
  # Check Terraform
  if command -v terraform &> /dev/null; then
    local tf_version=""
    # Try plain text first (more reliable)
    tf_version=$(terraform version 2>/dev/null | head -1 | sed -E 's/.*Terraform v([0-9]+\.[0-9]+\.[0-9]+).*/\1/')
    if [ -z "${tf_version}" ]; then
      # Fallback: try JSON output
      tf_version=$(terraform version -json 2>/dev/null | sed -E 's/.*"terraform_version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' | head -1)
    fi
    if [ -n "${tf_version}" ]; then
      if check_version "terraform" "${TERRAFORM_MIN_VERSION}" "${tf_version}"; then
        print_success "Terraform ${tf_version} (required: >= ${TERRAFORM_MIN_VERSION})"
      else
        all_ok=false
      fi
    else
      print_warning "Could not determine Terraform version (continuing anyway)"
    fi
  else
    print_error "Terraform is not installed"
    all_ok=false
  fi
  
  # Check gcloud
  if command -v gcloud &> /dev/null; then
    local gcloud_version=""
    # Try to get version from gcloud version output (plain text)
    gcloud_version=$(gcloud version 2>/dev/null | grep "Google Cloud SDK" | sed -E 's/.* ([0-9]+\.[0-9]+\.[0-9]+).*/\1/' | head -1)
    if [ -z "${gcloud_version}" ]; then
      # Fallback: try format value
      gcloud_version=$(gcloud version --format="value(Google Cloud SDK)" 2>/dev/null | sed -E 's/.* ([0-9]+\.[0-9]+\.[0-9]+).*/\1/' | head -1)
    fi
    if [ -n "${gcloud_version}" ]; then
      if check_version "gcloud" "${GCLOUD_MIN_VERSION}" "${gcloud_version}"; then
        print_success "gcloud ${gcloud_version} (required: >= ${GCLOUD_MIN_VERSION})"
      else
        all_ok=false
      fi
    else
      print_warning "Could not determine gcloud version (continuing anyway)"
    fi
  else
    print_error "gcloud CLI is not installed"
    all_ok=false
  fi
  
  # Check GitHub CLI (optional but recommended)
  if command -v gh &> /dev/null; then
    local gh_version=""
    gh_version=$(gh version 2>/dev/null | sed -E 's/.*gh version ([0-9]+\.[0-9]+\.[0-9]+).*/\1/' | head -1)
    if [ -z "${gh_version}" ]; then
      gh_version=$(gh --version 2>/dev/null | sed -E 's/.*version ([0-9]+\.[0-9]+\.[0-9]+).*/\1/' | head -1)
    fi
    if [ -n "${gh_version}" ]; then
      if check_version "gh" "${GH_MIN_VERSION}" "${gh_version}"; then
        print_success "GitHub CLI ${gh_version} (required: >= ${GH_MIN_VERSION})"
      else
        print_warning "GitHub CLI version ${gh_version} is below minimum ${GH_MIN_VERSION} (optional)"
      fi
    else
      print_warning "Could not determine GitHub CLI version (optional)"
    fi
  else
    print_warning "GitHub CLI is not installed (optional, for GitHub Actions setup)"
  fi
  
  if [ "${all_ok}" = false ]; then
    print_error "Some required tools are missing or outdated"
    exit 1
  fi
  
  echo ""
}

# ============================================================================
# GCP Authentication Check
# ============================================================================

check_gcp_auth() {
  print_header "Checking GCP Authentication"
  
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "No active GCP authentication found"
    print_info "Run: gcloud auth login"
    print_info "Then: gcloud auth application-default login"
    exit 1
  fi
  
  local active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
  print_success "Authenticated as: ${active_account}"
  
  # Check application default credentials
  if ! gcloud auth application-default print-access-token &> /dev/null; then
    print_warning "Application default credentials not set"
    print_info "Run: gcloud auth application-default login"
  else
    print_success "Application default credentials configured"
  fi
  
  echo ""
}

# ============================================================================
# Set Quota Project for ADC
# ============================================================================

set_quota_project() {
  local project_id=$1
  
  if [ -z "${project_id}" ]; then
    return 0  # Skip if project ID not yet determined
  fi
  
  print_info "Setting quota project for Application Default Credentials..."
  
  # Set quota project for ADC (required for Identity Platform API and others)
  if gcloud auth application-default set-quota-project "${project_id}" &> /dev/null; then
    print_success "Quota project set to: ${project_id}"
  else
    print_warning "Could not set quota project automatically"
    print_info "Run manually: gcloud auth application-default set-quota-project ${project_id}"
  fi
  
  echo ""
}

# ============================================================================
# User Input Collection
# ============================================================================

collect_user_input() {
  print_header "Configuration Input"
  
  # Project selection
  echo -e "${CYAN}Project Configuration${NC}"
  read -p "Do you have an existing GCP project? [y/N]: " has_existing_project
  has_existing_project=${has_existing_project:-N}
  
  if [[ "${has_existing_project}" =~ ^[Yy]$ ]]; then
    read -p "Enter existing GCP Project ID: " PROJECT_ID
    BILLING_ACCOUNT_ID=""
  else
    PROJECT_ID=""
    read -p "Enter billing account ID (format: XXXXXX-XXXXXX-XXXXXX): " BILLING_ACCOUNT_ID
    
    if [ -z "${BILLING_ACCOUNT_ID}" ]; then
      print_error "Billing account ID is required for new projects"
      exit 1
    fi
    
    # Validate billing account format
    if ! [[ "${BILLING_ACCOUNT_ID}" =~ ^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$ ]]; then
      print_error "Invalid billing account ID format. Expected: XXXXXX-XXXXXX-XXXXXX"
      exit 1
    fi
  fi
  
  # Admin email
  read -p "Enter admin email: " ADMIN_EMAIL
  
  if [ -z "${ADMIN_EMAIL}" ]; then
    print_error "Admin email is required"
    exit 1
  fi
  
  # GitHub repository
  read -p "Enter GitHub repository (owner/repo-name): " GITHUB_REPO
  
  if [ -z "${GITHUB_REPO}" ]; then
    print_error "GitHub repository is required for Workload Identity Federation"
    exit 1
  fi
  
  # Validate GitHub repo format
  if ! [[ "${GITHUB_REPO}" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]]; then
    print_error "Invalid GitHub repository format. Expected: owner/repo-name"
    exit 1
  fi
  
  # Application name
  read -p "Enter application name [rates]: " APP_NAME
  APP_NAME=${APP_NAME:-rates}
  
  # Environment
  read -p "Enter environment (dev/staging/prod) [dev]: " ENVIRONMENT
  ENVIRONMENT=${ENVIRONMENT:-dev}
  
  if ! [[ "${ENVIRONMENT}" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Environment must be one of: dev, staging, prod"
    exit 1
  fi
  
  # Region
  read -p "Enter GCP region [us-central1]: " REGION
  REGION=${REGION:-us-central1}
  
  # Firestore location
  read -p "Enter Firestore location [nam5]: " FIRESTORE_LOCATION
  FIRESTORE_LOCATION=${FIRESTORE_LOCATION:-nam5}
  
  echo ""
}

# ============================================================================
# FREE TIER Configuration
# ============================================================================

configure_free_tier() {
  print_header "💰 FREE TIER Configuration"
  
  echo -e "${GREEN}🆓 FREE TIER MODE${NC}"
  echo ""
  echo "By default, all resources are configured for GCP/Firebase free tier:"
  echo "  • Cloud Run: Scale to zero (0 min instances) - FREE"
  echo "  • Firestore: No PITR, no backups - FREE"
  echo "  • Auth: No SMS MFA - FREE up to 50K users"
  echo "  • Artifact Registry: 0.5GB storage - FREE"
  echo ""
  
  read -p "Enable FREE TIER ONLY mode? [Y/n]: " enable_free_tier
  enable_free_tier=${enable_free_tier:-Y}
  
  if [[ "${enable_free_tier}" =~ ^[Yy]$ ]]; then
    ENABLE_FREE_TIER_ONLY="true"
    print_success "FREE TIER mode enabled"
    echo ""
    echo "All paid features will be disabled:"
    echo "  • Firestore PITR: DISABLED"
    echo "  • Firestore Backups: DISABLED"
    echo "  • Cloud Run Always-On: DISABLED (scale to zero)"
    echo "  • SMS MFA: DISABLED"
    echo ""
    print_info "Estimated monthly cost: ${GREEN}\$0${NC} (within free tier)"
  else
    ENABLE_FREE_TIER_ONLY="false"
    print_warning "Paid features can be enabled"
    echo ""
    echo "You can enable paid features by setting:"
    echo "  • enable_firestore_pitr = true (~\$0.10/GB/month)"
    echo "  • enable_firestore_backups = true (varies)"
    echo "  • cloudrun_min_instances > 0 (always-on, varies)"
    echo "  • enable_mfa = true (SMS costs after 10/day)"
    echo ""
    print_info "Review terraform.tfvars after generation to configure paid features"
  fi
  
  echo ""
}

# ============================================================================
# Generate terraform.tfvars
# ============================================================================

generate_tfvars() {
  print_header "Generating terraform.tfvars"
  
  cat > "${TFVARS_FILE}" <<EOF
# terraform.tfvars
# Generated by setup.sh on $(date)
# 
# This file contains your infrastructure configuration.
# Review and modify as needed before running terraform apply.

# Project Configuration
${PROJECT_ID:+project_id = "${PROJECT_ID}"}
${BILLING_ACCOUNT_ID:+billing_account_id = "${BILLING_ACCOUNT_ID}"}
admin_email = "${ADMIN_EMAIL}"

# Application Configuration
app_name = "${APP_NAME}"
environment = "${ENVIRONMENT}"
region = "${REGION}"
firestore_location = "${FIRESTORE_LOCATION}"

# GitHub Actions / CI/CD
github_repo = "${GITHUB_REPO}"
github_environments = ["dev", "staging", "prod"]

# FREE TIER Configuration
enable_free_tier_only = ${ENABLE_FREE_TIER_ONLY}

# Cloud Run Configuration (FREE TIER DEFAULTS)
cloudrun_min_instances = 0  # Scale to zero (FREE)
cloudrun_max_instances = 2
cloudrun_memory = "512Mi"  # Gen2 requires minimum 512Mi (still within free tier)
cloudrun_cpu = "1"

# Firestore Configuration (FREE TIER DEFAULTS)
enable_firestore_pitr = false      # PITR costs ~\$0.10/GB/month
enable_firestore_backups = false   # Backups cost money
enable_deletion_protection = false # Easy dev cleanup

# Identity Platform Configuration (FREE TIER DEFAULTS)
enable_mfa = false  # SMS costs after 10/day
enable_google_signin = false  # Requires OAuth credentials

# Firebase App Check
enable_app_check = false  # Requires reCAPTCHA setup

# Artifact Registry Configuration (FREE TIER DEFAULTS)
enable_immutable_tags = false  # Can increase storage usage

# Optional: OAuth Credentials (if enabling Google Sign-In)
# google_oauth_client_id = "YOUR_CLIENT_ID"
# google_oauth_client_secret = "YOUR_CLIENT_SECRET"  # Store in Secret Manager

# Optional: reCAPTCHA (if enabling App Check)
# recaptcha_site_secret = "YOUR_SITE_SECRET"  # Store in Secret Manager
EOF

  print_success "Generated ${TFVARS_FILE}"
  echo ""
}

# ============================================================================
# Validation
# ============================================================================

validate_config() {
  print_header "Validating Configuration"
  
  # Check if terraform.tfvars exists
  if [ ! -f "${TFVARS_FILE}" ]; then
    print_error "terraform.tfvars file not found"
    exit 1
  fi
  
  print_success "Configuration file exists"
  
  # Validate GCP permissions (if project exists)
  if [ -n "${PROJECT_ID}" ]; then
    print_info "Validating GCP permissions for project: ${PROJECT_ID}"
    
    if gcloud projects describe "${PROJECT_ID}" &> /dev/null; then
      print_success "Project access verified"
    else
      print_error "Cannot access project ${PROJECT_ID}. Check permissions."
      exit 1
    fi
  fi
  
  echo ""
}

# ============================================================================
# Cost Estimate
# ============================================================================

show_cost_estimate() {
  print_header "💰 Cost Estimate"
  
  if [ "${ENABLE_FREE_TIER_ONLY}" = "true" ]; then
    echo -e "${GREEN}Estimated Monthly Cost: \$0 (within free tier)${NC}"
    echo ""
    echo "Free tier includes:"
    echo "  • Cloud Run: 2M requests/month, 360K GB-seconds, 180K vCPU-seconds"
    echo "  • Firestore: 1GB storage, 50K reads/day, 20K writes/day"
    echo "  • Identity Platform: 50K MAU"
    echo "  • Artifact Registry: 0.5GB storage"
    echo "  • Secret Manager: 6 versions, 10K accesses/month"
  else
    echo -e "${YELLOW}Estimated Monthly Cost: Variable (depends on paid features enabled)${NC}"
    echo ""
    echo "Review terraform.tfvars and enable paid features as needed."
    echo "Use GCP pricing calculator: https://cloud.google.com/products/calculator"
  fi
  
  echo ""
}

# ============================================================================
# Next Steps
# ============================================================================

show_next_steps() {
  print_header "Next Steps"
  
  echo "1. Review generated configuration:"
  echo "   ${CYAN}cat ${TFVARS_FILE}${NC}"
  echo ""
  echo "2. Initialize Terraform:"
  echo "   ${CYAN}cd ${PROJECT_ROOT}${NC}"
  echo "   ${CYAN}terraform init${NC}"
  echo ""
  echo "3. Review infrastructure plan:"
  echo "   ${CYAN}terraform plan${NC}"
  echo ""
  echo "4. Apply infrastructure:"
  echo "   ${CYAN}terraform apply${NC}"
  echo ""
  echo "5. Configure GitHub Actions (after apply):"
  echo "   ${CYAN}./scripts/github-secrets.sh${NC}"
  echo ""
  echo "6. View outputs:"
  echo "   ${CYAN}terraform output${NC}"
  echo "   ${CYAN}terraform output cost_summary${NC}"
  echo ""
  
  print_success "Setup complete! Ready to run terraform init && terraform apply"
  echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  print_header "🚀 Terraform Infrastructure Setup"
  
  echo "This script will guide you through configuring your GCP + Firebase infrastructure."
  echo "All defaults favor FREE TIER to minimize costs."
  echo ""
  
  check_tool_versions
  check_gcp_auth
  collect_user_input
  
  # Set quota project if project ID is known (for existing projects)
  if [ -n "${PROJECT_ID:-}" ]; then
    set_quota_project "${PROJECT_ID}"
  fi
  
  configure_free_tier
  generate_tfvars
  
  # Set quota project after generating tfvars (for new projects, will be set after terraform apply)
  if [ -n "${PROJECT_ID:-}" ]; then
    set_quota_project "${PROJECT_ID}"
  fi
  
  validate_config
  show_cost_estimate
  show_next_steps
}

# Run main function
main "$@"
