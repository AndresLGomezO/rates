#!/usr/bin/env bash

# ============================================================================
# RATES INFRASTRUCTURE SETUP SCRIPT
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md
#                  docs/TERRAFORM_DESIGN.md
#                  docs/GCP_PROJECT_STRUCTURE.md
#                  docs/IAM_SECURITY_MODEL.md
#                  docs/COST_GUARDRAILS.md
#
# This script provides an interactive, step-by-step setup process for
# deploying the Rates monorepo infrastructure to GCP.
#
# Usage:
#   ./setup.sh              # Interactive mode (recommended)
#   ./setup.sh --phase N    # Start from specific phase (0-6)
#   ./setup.sh --help       # Show help
#
# Phases:
#   0: Pre-flight Validation
#   1: Bootstrap (State Bucket)
#   2: Foundation (Service Accounts, APIs, Artifact Registry)
#   3: Application - Dev (Cloud Run, Secrets + Post-Deployment)
#   4: Application - Prod (Cloud Run, Secrets + Post-Deployment)
#   5: CI/CD Integration (Optional)
#   6: Cost Guardrails & Monitoring
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Default values (from architecture documents)
readonly DEFAULT_PROJECT_ID="rates-production"
readonly DEFAULT_REGION="us-central1"
readonly STATE_BUCKET_NAME="rates-terraform-state"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="${SCRIPT_DIR}/.setup.log"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# State tracking
CURRENT_PHASE=0
PROJECT_ID=""
REGION=""
BILLING_ACCOUNT_ID=""
BUDGET_ALERT_EMAIL=""

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $*" >> "${LOG_FILE}"
}

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${BOLD}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "HEADER: $1"
}

print_section() {
    echo ""
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────────${NC}"
    echo ""
    log "SECTION: $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    log "SUCCESS: $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
    log "ERROR: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    log "WARNING: $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
    log "INFO: $1"
}

print_step() {
    echo -e "${BOLD}→${NC} $1"
    log "STEP: $1"
}

confirm() {
    local prompt="${1:-Continue?}"
    local default="${2:-y}"
    
    if [[ "${default}" == "y" ]]; then
        prompt="${prompt} [Y/n]: "
    else
        prompt="${prompt} [y/N]: "
    fi
    
    while true; do
        read -rp "$(echo -e "${YELLOW}${prompt}${NC}")" response
        response="${response:-$default}"
        # Convert to lowercase portably (works in both bash and zsh)
        response_lower=$(echo "$response" | tr '[:upper:]' '[:lower:]')
        case "$response_lower" in
            y|yes) return 0 ;;
            n|no) return 1 ;;
            *) echo "Please answer yes or no." ;;
        esac
    done
    }

prompt_input() {
    local prompt="$1"
    local default="${2:-}"
    local var_name="$3"
    local value
    
    if [[ -n "${default}" ]]; then
        read -rp "$(echo -e "${CYAN}${prompt}${NC} [${default}]: ")" value
        value="${value:-$default}"
    else
        read -rp "$(echo -e "${CYAN}${prompt}${NC}: ")" value
    fi
    
    eval "${var_name}='${value}'"
}

prompt_secret() {
    local prompt="$1"
    local var_name="$2"
    local value
    
    read -srp "$(echo -e "${CYAN}${prompt}${NC}: ")" value
    echo ""
    
    eval "${var_name}='${value}'"
}

wait_for_enter() {
    echo ""
    read -rp "$(echo -e "${YELLOW}Press Enter to continue...${NC}")"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while ps -p "$pid" > /dev/null 2>&1; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "      \b\b\b\b\b\b"
}

run_command() {
    local description="$1"
    shift
    local command=("$@")
    
    print_step "${description}..."
    log "COMMAND: ${command[*]}"
    
    if "${command[@]}" >> "${LOG_FILE}" 2>&1; then
        print_success "${description}"
        return 0
    else
        print_error "${description} failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
}

handle_terraform_apply() {
    local phase_name="$1"
    local tfplan_file="${2:-tfplan}"
    local max_retries=2
    local retry_count=0
    
    while [ $retry_count -le $max_retries ]; do
        print_step "Running terraform apply (attempt $((retry_count + 1))/$((max_retries + 1)))..."
        
        if terraform apply -input=false "${tfplan_file}" >> "${LOG_FILE}" 2>&1; then
            print_success "${phase_name} infrastructure created!"
            rm -f "${tfplan_file}"
            return 0
        else
            local apply_error
            apply_error=$(tail -100 "${LOG_FILE}" 2>/dev/null)
            
            # Check for common import-required errors
            local needs_import=false
            local import_resource=""
            local import_id=""
            
            # Check for artifact registry "already exists" error (Error 409)
            if echo "${apply_error}" | grep -qE "(Error 409|already exists).*repository|repository.*already exists"; then
                needs_import=true
                # Extract repository name from error - check for dev first
                if echo "${apply_error}" | grep -qE 'module\.artifact_registry\["dev"\]|artifact_registry\["dev"\]'; then
                    import_resource='module.artifact_registry["dev"].google_artifact_registry_repository.this'
                    # Try to get project_id and region from terraform
                    local project_id region
                    project_id=$(terraform output -raw project_id 2>/dev/null || terraform show -json 2>/dev/null | jq -r '.values.outputs.project_id.value // "dev-rates"' 2>/dev/null || echo "dev-rates")
                    region=$(terraform output -raw region 2>/dev/null || terraform show -json 2>/dev/null | jq -r '.values.outputs.region.value // "us-central1"' 2>/dev/null || echo "us-central1")
                    import_id="projects/${project_id}/locations/${region}/repositories/rates-dev-containers"
                # Check for prod
                elif echo "${apply_error}" | grep -qE 'module\.artifact_registry\["prod"\]|artifact_registry\["prod"\]'; then
                    import_resource='module.artifact_registry["prod"].google_artifact_registry_repository.this'
                    local project_id region
                    project_id=$(terraform output -raw project_id 2>/dev/null || terraform show -json 2>/dev/null | jq -r '.values.outputs.project_id.value // "dev-rates"' 2>/dev/null || echo "dev-rates")
                    region=$(terraform output -raw region 2>/dev/null || terraform show -json 2>/dev/null | jq -r '.values.outputs.region.value // "us-central1"' 2>/dev/null || echo "us-central1")
                    import_id="projects/${project_id}/locations/${region}/repositories/rates-prod-containers"
                fi
            fi
            
            if [ "$needs_import" = true ] && [ -n "$import_resource" ] && [ -n "$import_id" ]; then
                print_warning "Resource already exists. Attempting to import..."
                print_info "Importing: ${import_resource} -> ${import_id}"
                
                if terraform import "${import_resource}" "${import_id}" >> "${LOG_FILE}" 2>&1; then
                    print_success "Successfully imported existing resource"
                    # Re-plan and re-apply
                    print_step "Re-planning after import..."
                    if terraform plan -input=false -out="${tfplan_file}" >> "${LOG_FILE}" 2>&1; then
                        retry_count=$((retry_count + 1))
                        continue
                    else
                        print_error "Re-plan failed after import"
                        rm -f "${tfplan_file}"
                        return 1
                    fi
                else
                    print_warning "Import failed, will retry apply"
                    retry_count=$((retry_count + 1))
                    if [ $retry_count -le $max_retries ]; then
                        sleep 2
                        continue
                    fi
                fi
            else
                # Check for specific error types that need special handling
                local needs_replan=false
                local needs_wait=false
                
                # Check for stale plan error
                if echo "${apply_error}" | grep -q "Saved plan is stale\|plan file can no longer be applied"; then
                    needs_replan=true
                    print_warning "Plan is stale (state changed). Re-planning..."
                fi
                
                # Check for API not enabled errors
                if echo "${apply_error}" | grep -qE "API has not been used.*before or it is disabled|has not been used in project.*before"; then
                    needs_wait=true
                    print_warning "API may not be fully enabled yet. Waiting 30 seconds for propagation..."
                    sleep 30
                    needs_replan=true
                fi
                
                # Check for transient "not found" errors (might resolve with retry)
                # Artifact Registry often has propagation delays causing "entity not found" errors
                # NOTE: If this persists after multiple retries, it may be a GCP API quota/backend issue
                if echo "${apply_error}" | grep -qE "Error code 5.*Requested entity was not found|Requested entity was not found|Error waiting.*Repository"; then
                    needs_wait=true
                    # Longer wait for Artifact Registry propagation delays
                    local wait_time=60
                    print_warning "Artifact Registry API issue detected (Error code 5)."
                    print_warning "This may be a GCP backend issue or quota limit."
                    print_warning "Waiting ${wait_time} seconds before retry..."
                    sleep ${wait_time}
                    needs_replan=true
                fi
                
                # Re-plan if needed (state changed or API issues)
                if [ "$needs_replan" = true ]; then
                    print_step "Re-planning after error..."
                    if ! terraform plan -input=false -out="${tfplan_file}" >> "${LOG_FILE}" 2>&1; then
                        print_error "Re-plan failed"
                        rm -f "${tfplan_file}"
                        return 1
                    fi
                fi
                
                # Retry if we haven't exceeded max retries
                if [ $retry_count -lt $max_retries ]; then
                    if [ "$needs_wait" != true ]; then
                        print_warning "Apply failed, retrying in 5 seconds..."
                        sleep 5
                    fi
                    retry_count=$((retry_count + 1))
                    continue
                else
                    print_error "Terraform apply failed after $((max_retries + 1)) attempts"
                    print_info "Check ${LOG_FILE} for details"
                    rm -f "${tfplan_file}"
                    return 1
                fi
            fi
        fi
    done
    
    print_error "Terraform apply failed"
    print_info "Check ${LOG_FILE} for details"
    rm -f "${tfplan_file}"
    return 1
}

check_command() {
    local cmd="$1"
    local name="${2:-$1}"
    
    if command -v "${cmd}" &> /dev/null; then
        print_success "${name} is installed"
        return 0
    else
        print_error "${name} is not installed"
        return 1
    fi
}

# ============================================================================
# PHASE 0: PRE-FLIGHT VALIDATION
# ============================================================================

phase_0_preflight() {
    print_header "PHASE 0: Pre-Flight Validation"
    
    cat << 'EOF'
This phase validates that all prerequisites are met before infrastructure
deployment. We will check:

  • Required CLI tools (gcloud, terraform, firebase)
  • GCP authentication
  • Project access and permissions
  • Billing account configuration

EOF

    if ! confirm "Begin pre-flight validation?"; then
        print_warning "Pre-flight validation skipped"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Check Required Tools
    # -------------------------------------------------------------------------
    print_section "Checking Required Tools"
    
    local tools_ok=true
    
    # Check gcloud
    if check_command "gcloud" "Google Cloud SDK"; then
        local gcloud_version
        gcloud_version=$(gcloud version 2>/dev/null | head -1)
        print_info "  ${gcloud_version}"
    else
        print_info "  Install: https://cloud.google.com/sdk/docs/install"
        tools_ok=false
    fi
    
    # Check terraform
    if check_command "terraform" "Terraform"; then
        local tf_version
        # Try using jq first (more reliable for JSON parsing)
        if command -v jq >/dev/null 2>&1; then
            tf_version=$(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null)
        else
            # Fallback: handle multi-line JSON with grep
            tf_version=$(terraform version -json 2>/dev/null | grep -o '"terraform_version"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"' | tail -1 | tr -d '"')
        fi
        print_info "  Version: ${tf_version}"
        
        # Check minimum version (only if we successfully extracted a version)
        if [[ -n "$tf_version" ]]; then
            local min_version="1.5.0"
            if [[ "$(printf '%s\n' "$min_version" "$tf_version" | sort -V | head -n1)" != "$min_version" ]]; then
                print_error "  Terraform >= ${min_version} required"
                tools_ok=false
            fi
        else
            print_error "  Could not determine Terraform version"
            tools_ok=false
        fi
    else
        print_info "  Install: https://developer.hashicorp.com/terraform/downloads"
        tools_ok=false
    fi
    
    # Check firebase (optional but recommended)
    if check_command "firebase" "Firebase CLI"; then
        local firebase_version
        firebase_version=$(firebase --version 2>/dev/null)
        print_info "  Version: ${firebase_version}"
    else
        print_warning "Firebase CLI not found (optional for Terraform, required for Hosting deployment)"
        print_info "  Install: npm install -g firebase-tools"
    fi
    
    # Check docker (optional)
    if check_command "docker" "Docker"; then
        local docker_version
        docker_version=$(docker --version 2>/dev/null)
        print_info "  ${docker_version}"
    else
        print_warning "Docker not found (optional, needed for local container builds)"
    fi
    
    # Check jq (optional but useful)
    if check_command "jq" "jq"; then
        print_info "  JSON parsing available"
    else
        print_warning "jq not found (optional, useful for parsing outputs)"
    fi
    
    if [[ "${tools_ok}" != "true" ]]; then
        print_error "Required tools are missing. Please install them and try again."
        return 1
    fi

    # -------------------------------------------------------------------------
    # Check GCP Authentication
    # -------------------------------------------------------------------------
    print_section "Checking GCP Authentication"
    
    # Check gcloud auth
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1 | grep -q "@"; then
        local active_account
        active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
        print_success "gcloud authenticated as: ${active_account}"
    else
        print_error "gcloud is not authenticated"
        print_info "Run: gcloud auth login"
        
        if confirm "Run 'gcloud auth login' now?"; then
            gcloud auth login
        else
            return 1
        fi
    fi
    
    # Check application default credentials
    if gcloud auth application-default print-access-token &>/dev/null; then
        print_success "Application default credentials configured"
    else
        print_warning "Application default credentials not configured"
        print_info "Run: gcloud auth application-default login"
        
        if confirm "Run 'gcloud auth application-default login' now?"; then
            gcloud auth application-default login
        else
            print_warning "Terraform may fail without application default credentials"
        fi
    fi

    # -------------------------------------------------------------------------
    # Configure Project
    # -------------------------------------------------------------------------
    print_section "Project Configuration"
    
    # Get current project
    local current_project
    current_project=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [[ -n "${current_project}" ]]; then
        print_info "Current gcloud project: ${current_project}"
    fi
    
    prompt_input "Enter GCP Project ID" "${DEFAULT_PROJECT_ID}" PROJECT_ID
    
    # Verify project exists
    print_step "Verifying project '${PROJECT_ID}'..."
    if gcloud projects describe "${PROJECT_ID}" &>/dev/null; then
        print_success "Project '${PROJECT_ID}' exists and is accessible"
    else
        print_warning "Project '${PROJECT_ID}' does not exist or is not accessible"
        
        if confirm "Create project '${PROJECT_ID}'?" "n"; then
            print_step "Creating project..."
            if gcloud projects create "${PROJECT_ID}" --name="Rates Production"; then
                print_success "Project created"
            else
                print_error "Failed to create project"
                return 1
            fi
        else
            print_error "Project is required. Please create it manually or try a different project ID."
            return 1
        fi
    fi
    
    # Set as default project
    run_command "Setting default project" gcloud config set project "${PROJECT_ID}"

    # -------------------------------------------------------------------------
    # Configure Region
    # -------------------------------------------------------------------------
    print_section "Region Configuration"
    
    cat << EOF
Select a region for deployment. The following regions are free-tier eligible:
  • us-central1 (Iowa) - Recommended
  • us-east1 (South Carolina)
  • us-west1 (Oregon)
  • europe-west1 (Belgium)
  • asia-east1 (Taiwan)

EOF
    
    prompt_input "Enter GCP Region" "${DEFAULT_REGION}" REGION
    
    # Validate region
    case "${REGION}" in
        us-central1|us-east1|us-west1|europe-west1|asia-east1)
            print_success "Region '${REGION}' is free-tier eligible"
            ;;
        *)
            print_warning "Region '${REGION}' may not be fully free-tier eligible"
            if ! confirm "Continue with this region?"; then
                return 1
            fi
            ;;
    esac

    # -------------------------------------------------------------------------
    # Check Billing Account
    # -------------------------------------------------------------------------
    print_section "Billing Configuration"
    
    print_info "Checking billing accounts..."
    
    local billing_accounts
    billing_accounts=$(gcloud billing accounts list --format="value(name,displayName)" 2>/dev/null || echo "")
    
    if [[ -z "${billing_accounts}" ]]; then
        print_warning "No billing accounts found or no permission to list billing accounts"
        print_info "A billing account is required even for free tier usage"
        print_info "Create one at: https://console.cloud.google.com/billing"
        
        prompt_input "Enter Billing Account ID (XXXXXX-XXXXXX-XXXXXX)" "" BILLING_ACCOUNT_ID
    else
        echo ""
        echo "Available billing accounts:"
        echo "${billing_accounts}" | while IFS=$'\t' read -r id name; do
            echo "  • ${id} - ${name}"
        done
        echo ""
        
        # Get first billing account as default
        local default_billing
        default_billing=$(echo "${billing_accounts}" | head -1 | cut -f1)
        
        prompt_input "Enter Billing Account ID" "${default_billing}" BILLING_ACCOUNT_ID
    fi
    
    # Link billing account to project
    if [[ -n "${BILLING_ACCOUNT_ID}" ]]; then
        print_step "Linking billing account to project..."
        
        local current_billing
        current_billing=$(gcloud billing projects describe "${PROJECT_ID}" --format="value(billingAccountName)" 2>/dev/null || echo "")
        
        if [[ "${current_billing}" == "billingAccounts/${BILLING_ACCOUNT_ID}" ]]; then
            print_success "Billing account already linked"
        else
            if gcloud billing projects link "${PROJECT_ID}" --billing-account="${BILLING_ACCOUNT_ID}" 2>/dev/null; then
                print_success "Billing account linked successfully"
            else
                print_warning "Could not link billing account (may require additional permissions)"
            fi
        fi
    else
        print_warning "No billing account configured - some features may not work"
    fi

    # -------------------------------------------------------------------------
    # Check Permissions
    # -------------------------------------------------------------------------
    print_section "Permission Verification"
    
    print_step "Checking IAM permissions..."
    
    local test_permissions=(
        "resourcemanager.projects.get"
        "serviceusage.services.enable"
        "iam.serviceAccounts.create"
        "storage.buckets.create"
    )
    
    local permissions_ok=true
    for perm in "${test_permissions[@]}"; do
        if gcloud projects get-iam-policy "${PROJECT_ID}" --format=json 2>/dev/null | grep -q "${perm}" 2>/dev/null; then
            print_success "  ${perm}"
        else
            # Try testing the permission directly
            if gcloud auth list --format="value(account)" &>/dev/null; then
                print_info "  ${perm} (assuming granted via role)"
            fi
        fi
    done
    
    print_info "Full permission verification will occur during Terraform apply"

    # -------------------------------------------------------------------------
    # Budget Alert Email (Optional)
    # -------------------------------------------------------------------------
    print_section "Budget Alert Configuration (Optional)"
    
    cat << 'EOF'
Budget alerts help you monitor spending and stay within free tier limits.
You can configure an email address to receive alerts when spending
reaches 50%, 80%, 100%, and 120% of your budget ($10/month default).

EOF
    
    prompt_input "Enter email for budget alerts (or press Enter to skip)" "" BUDGET_ALERT_EMAIL

    # -------------------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------------------
    print_section "Pre-Flight Summary"
    
    cat << EOF
Configuration Summary:
──────────────────────────────────────────────────────────────────────────

  Project ID:           ${PROJECT_ID}
  Region:               ${REGION}
  Billing Account:      ${BILLING_ACCOUNT_ID:-Not configured}
  Budget Alert Email:   ${BUDGET_ALERT_EMAIL:-Not configured}
  State Bucket:         ${STATE_BUCKET_NAME}

──────────────────────────────────────────────────────────────────────────
EOF
    
    # Save configuration
    save_configuration
    
    print_success "Pre-flight validation complete!"
    
    if confirm "Proceed to Phase 1 (Bootstrap)?"; then
        return 0
    else
        print_info "You can resume later with: ./setup.sh --phase 1"
        return 1
    fi
}

# ============================================================================
# CONFIGURATION PERSISTENCE
# ============================================================================

save_configuration() {
    local config_file="${SCRIPT_DIR}/.setup.config"
    
    cat > "${config_file}" << EOF
# Rates Infrastructure Setup Configuration
# Generated: $(date)

PROJECT_ID="${PROJECT_ID}"
REGION="${REGION}"
BILLING_ACCOUNT_ID="${BILLING_ACCOUNT_ID}"
BUDGET_ALERT_EMAIL="${BUDGET_ALERT_EMAIL}"
CURRENT_PHASE="${CURRENT_PHASE}"
EOF
    
    print_info "Configuration saved to ${config_file}"
    log "Configuration saved"
}

load_configuration() {
    local config_file="${SCRIPT_DIR}/.setup.config"
    
    if [[ -f "${config_file}" ]]; then
        # shellcheck source=/dev/null
        source "${config_file}"
        print_info "Loaded configuration from ${config_file}"
        log "Configuration loaded"
        return 0
    else
        return 1
    fi
}

# ============================================================================
# PHASE 1: BOOTSTRAP
# ============================================================================

phase_1_bootstrap() {
    print_header "PHASE 1: Bootstrap Layer"
    
    cat << EOF
This phase creates the foundational infrastructure for Terraform state
management:

  • GCS bucket for Terraform state (${STATE_BUCKET_NAME})
  • Bucket versioning and lifecycle policies
  • Required APIs (Storage, Service Usage)

State Location: gs://${STATE_BUCKET_NAME}/bootstrap/

EOF

    if ! confirm "Begin bootstrap deployment?"; then
        print_warning "Bootstrap skipped"
        return 1
    fi

    local bootstrap_dir="${SCRIPT_DIR}/environments/bootstrap"
    
    # Check if bootstrap directory exists
    if [[ ! -d "${bootstrap_dir}" ]]; then
        print_error "Bootstrap directory not found: ${bootstrap_dir}"
        print_info "Please ensure Terraform files are in place"
        return 1
    fi
    
    cd "${bootstrap_dir}"

    # -------------------------------------------------------------------------
    # Create terraform.tfvars
    # -------------------------------------------------------------------------
    print_section "Generating Configuration"
    
    cat > terraform.tfvars << EOF
# Generated by setup.sh on $(date)
# Source: docs/IMPLEMENTATION_PLAN.md (Phase 1)

project_id         = "${PROJECT_ID}"
region             = "${REGION}"
state_bucket_name  = "${STATE_BUCKET_NAME}"
state_retention_days = 90
EOF
    
    print_success "Created terraform.tfvars"

    # -------------------------------------------------------------------------
    # Configure backend for bootstrap
    # -------------------------------------------------------------------------
    # Bootstrap ALWAYS uses local backend (per README.md)
    # This avoids chicken-and-egg: can't use GCS backend before bucket exists
    print_section "Configuring Terraform Backend"
    
    print_step "Configuring local backend for bootstrap..."
    
    # Backup existing backend.tf if it exists and is different
    if [[ -f "backend.tf" ]] && ! grep -q "backend \"local\"" backend.tf 2>/dev/null; then
        cp backend.tf backend.tf.gcs.backup
        print_info "Backed up existing backend.tf"
    fi
    
    # Always use local backend for bootstrap (as per bootstrap/README.md)
    cat > backend.tf << EOF
# ============================================================================
# BOOTSTRAP LAYER - BACKEND CONFIGURATION (LOCAL)
# ============================================================================
# Bootstrap always uses local backend (per README.md)
# State will be migrated to GCS after bucket is created
# Configured by setup.sh on $(date)

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
EOF
    print_success "Configured local backend for bootstrap"
    
    # Clean up old Terraform state directory
    if [ -d ".terraform" ]; then
        print_step "Cleaning up old Terraform backend configuration..."
        rm -rf .terraform
        print_success "Old backend configuration cleaned"
    fi

    # -------------------------------------------------------------------------
    # Terraform Init
    # -------------------------------------------------------------------------
    print_section "Initializing Terraform"
    
    print_step "Running terraform init..."
    # Use -reconfigure to handle backend changes
    if terraform init -input=false -reconfigure >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform initialized"
    else
        print_error "Terraform init failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Terraform Plan
    # -------------------------------------------------------------------------
    print_section "Planning Infrastructure"
    
    print_step "Running terraform plan..."
    if terraform plan -input=false -out=tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform plan complete"
        
        # Show plan summary
        echo ""
        terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -20
        echo ""
    else
        print_error "Terraform plan failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Terraform Apply
    # -------------------------------------------------------------------------
    print_section "Applying Infrastructure"
    
    if ! confirm "Apply this plan?"; then
        print_warning "Apply cancelled"
        rm -f tfplan
        return 1
    fi
    
    print_step "Running terraform apply..."
    if terraform apply -input=false tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Bootstrap infrastructure created!"
        rm -f tfplan
    else
        # Check for "bucket already exists" error and import it
        local apply_error
        apply_error=$(tail -50 "${LOG_FILE}" 2>/dev/null)
        
        if echo "${apply_error}" | grep -qE "Error 409.*bucket.*already.*own|bucket.*already exists|Your previous request to create the named bucket succeeded"; then
            print_warning "Bucket already exists. Attempting to import..."
            
            # Import the existing bucket
            # Format: terraform import google_storage_bucket.terraform_state bucket-name
            local bucket_resource="google_storage_bucket.terraform_state"
            local bucket_id="${STATE_BUCKET_NAME}"
            
            print_step "Importing existing bucket into Terraform state..."
            print_info "Importing: ${bucket_resource} -> ${bucket_id}"
            if terraform import "${bucket_resource}" "${bucket_id}" >> "${LOG_FILE}" 2>&1; then
                print_success "Bucket imported successfully"
                
                # Re-plan to see what else needs to be created
                print_step "Re-planning after import..."
                rm -f tfplan
                if terraform plan -input=false -out=tfplan >> "${LOG_FILE}" 2>&1; then
                    print_success "Re-plan complete"
                    
                    # Show what will be created
                    echo ""
                    terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -20
                    echo ""
                    
                    if confirm "Apply the updated plan?"; then
                        if terraform apply -input=false tfplan >> "${LOG_FILE}" 2>&1; then
                            print_success "Bootstrap infrastructure created!"
                            rm -f tfplan
                        else
                            print_error "Terraform apply failed after import"
                            print_info "Check ${LOG_FILE} for details"
                            rm -f tfplan
                            return 1
                        fi
                    else
                        print_warning "Apply cancelled"
                        rm -f tfplan
                        return 1
                    fi
                else
                    print_error "Re-plan failed after import"
                    print_info "Check ${LOG_FILE} for details"
                    rm -f tfplan
                    return 1
                fi
            else
                print_error "Failed to import bucket"
                print_info "The bucket exists but couldn't be imported into Terraform state"
                print_info "You may need to import it manually:"
                print_info "  terraform import google_storage_bucket.terraform_state ${STATE_BUCKET_NAME}"
                rm -f tfplan
                return 1
            fi
        else
            print_error "Terraform apply failed"
            print_info "Check ${LOG_FILE} for details"
            rm -f tfplan
            return 1
        fi
    fi

    # -------------------------------------------------------------------------
    # Show Outputs
    # -------------------------------------------------------------------------
    print_section "Bootstrap Outputs"
    
    terraform output -no-color
    
    # -------------------------------------------------------------------------
    # Migrate State to GCS
    # -------------------------------------------------------------------------
    # Bootstrap always uses local backend, so always migrate to GCS after bucket is created
    print_section "Migrating State to GCS"
    
    cat << EOF
The state bucket has been created. Now migrating Terraform state from
local storage to GCS for durability and team access.

EOF
    
    print_step "Updating backend configuration to GCS..."
    cat > backend.tf << EOF
# ============================================================================
# BOOTSTRAP LAYER - BACKEND CONFIGURATION (GCS)
# ============================================================================
# Migrated to GCS by setup.sh on $(date)

terraform {
  backend "gcs" {
    bucket = "${STATE_BUCKET_NAME}"
    prefix = "bootstrap/"
  }
}
EOF
    
    print_step "Migrating state to GCS..."
    if terraform init -migrate-state >> "${LOG_FILE}" 2>&1; then
        print_success "State migrated to GCS"
        rm -f terraform.tfstate terraform.tfstate.backup
        
        # Clean up backup file if it exists
        if [[ -f "backend.tf.gcs.backup" ]]; then
            rm -f backend.tf.gcs.backup
        fi
    else
        print_warning "State migration failed (this is OK if bucket was just created)"
        print_info "Local state file preserved"
        print_info "State will be in GCS on next terraform init"
    fi

    cd "${SCRIPT_DIR}"
    
    CURRENT_PHASE=1
    save_configuration
    
    print_success "Phase 1 (Bootstrap) complete!"
    
    if confirm "Proceed to Phase 2 (Foundation)?"; then
        return 0
    else
        print_info "You can resume later with: ./setup.sh --phase 2"
        return 1
    fi
}

# ============================================================================
# HELPER: LINK FIREBASE PROJECT TO CLI
# ============================================================================

link_firebase_project_to_cli() {
    local project_id="$1"
    
    if [[ -z "${project_id}" ]]; then
        return 1
    fi
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        return 1
    fi
    
    # Check if already linked
    local firebase_projects
    firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
    if echo "${firebase_projects}" | grep -q "\"${project_id}\""; then
        # Already linked, set as active project
        firebase use "${project_id}" --non-interactive >> "${LOG_FILE}" 2>&1
        return 0
    fi
    
    # Try to link the project
    # Note: firebase use will add the project if it's accessible
    if firebase use "${project_id}" --non-interactive >> "${LOG_FILE}" 2>&1; then
        return 0
    fi
    
    return 1
}

# ============================================================================
# HELPER: INITIALIZE FIREBASE IN GCP PROJECT
# ============================================================================

initialize_firebase_project() {
    print_section "Initializing Firebase in GCP Project"
    
    # Check if Firebase is already initialized
    print_step "Checking if Firebase is already initialized..."
    
    # Try to check if Firebase is initialized by listing Firebase projects
    # Note: gcloud firebase projects describe doesn't exist, use list instead
    if gcloud firebase projects list --filter="projectId:${PROJECT_ID}" --format="value(projectId)" 2>/dev/null | grep -q "^${PROJECT_ID}$"; then
        print_info "Firebase is already initialized for project ${PROJECT_ID}"
        return 0
    fi
    
    # Enable Firebase Management API (required for initialization)
    print_step "Enabling Firebase Management API..."
    if gcloud services enable firebase.googleapis.com \
        --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firebase Management API enabled"
        
        # Wait for API to propagate
        print_step "Waiting for API to propagate..."
        sleep 10
    else
        print_warning "Firebase Management API may already be enabled"
    fi
    
    # Initialize Firebase in the GCP project
    # This links the GCP project to Firebase and enables Firebase services
    print_step "Initializing Firebase in GCP project..."
    print_info "This will link your GCP project to Firebase and enable Firebase services"
    
    # Use Firebase Management API to add Firebase to the project
    # Note: This requires the Firebase Management API to be enabled
    # The API endpoint is: https://firebase.googleapis.com/v1beta1/projects/{projectId}:addFirebase
    
    # Check if we can use gcloud to initialize Firebase
    # Unfortunately, gcloud doesn't have a direct command for this
    # We need to use the REST API or firebase CLI
    
    # Option 1: Use Firebase CLI if available
    if command -v firebase &> /dev/null; then
        print_step "Using Firebase CLI to initialize project..."
        
        # Check if project is already linked
        local firebase_projects
        firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
        
        if echo "${firebase_projects}" | grep -q "\"${PROJECT_ID}\""; then
            print_info "Project ${PROJECT_ID} is already linked to Firebase"
            return 0
        fi
        
        # Initialize Firebase (this is interactive, so we'll use a workaround)
        print_warning "Firebase CLI initialization may require interactive input"
        print_info "Attempting to initialize Firebase project..."
        
        # Try to use firebase CLI with non-interactive flags if available
        # Note: firebase init is interactive, but we can try to use the management API directly
        print_info "Skipping Firebase CLI init (requires interactive input)"
        print_info "You may need to initialize Firebase manually or use the REST API"
    else
        print_warning "Firebase CLI not found"
        print_info "Install with: npm install -g firebase-tools"
    fi
    
    # Option 2: Use REST API to initialize Firebase
    print_step "Attempting to initialize Firebase via REST API..."
    
    # Get access token
    local access_token
    access_token=$(gcloud auth print-access-token 2>/dev/null || echo "")
    
    if [[ -z "${access_token}" ]]; then
        print_error "Could not get access token for REST API call"
        print_info "Firebase initialization will need to be done manually"
        return 1
    fi
    
    # Call Firebase Management API to add Firebase to the project
    # POST https://firebase.googleapis.com/v1beta1/projects/{projectId}:addFirebase
    local api_url="https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}:addFirebase"
    
    print_step "Calling Firebase Management API..."
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "${api_url}" \
        -H "Authorization: Bearer ${access_token}" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo "")
    
    # Extract HTTP code (last line) and response body (all but last line)
    # Use sed instead of head -n -1 for macOS compatibility
    local http_code
    http_code=$(echo "${response}" | tail -1)
    local response_body
    response_body=$(echo "${response}" | sed '$d')
    
    if [[ "${http_code}" == "200" ]] || [[ "${http_code}" == "201" ]]; then
        print_success "Firebase initialized successfully in GCP project"
        print_info "Project ${PROJECT_ID} is now linked to Firebase"
        
        # Link project to Firebase CLI if available
        if command -v firebase &> /dev/null; then
            print_step "Linking project to Firebase CLI..."
            if link_firebase_project_to_cli "${PROJECT_ID}"; then
                print_success "Project ${PROJECT_ID} linked to Firebase CLI"
            else
                # Project is not accessible - may need Firebase initialization first
                print_warning "Project ${PROJECT_ID} is not accessible via Firebase CLI"
                print_info "This may mean Firebase needs to be initialized in the console first"
                print_info "Once initialized, the script will automatically link it on the next run"
            fi
        fi
        
        return 0
    elif [[ "${http_code}" == "409" ]]; then
        print_info "Firebase is already initialized for this project"
        
        # Ensure project is linked to Firebase CLI
        if command -v firebase &> /dev/null; then
            print_step "Ensuring project is linked to Firebase CLI..."
            if link_firebase_project_to_cli "${PROJECT_ID}"; then
                print_success "Project ${PROJECT_ID} linked to Firebase CLI"
            else
                print_warning "Project ${PROJECT_ID} is not accessible via Firebase CLI"
                print_info "This may mean Firebase needs to be initialized in the console first"
            fi
        fi
        
        return 0
    elif [[ "${http_code}" == "403" ]]; then
        print_warning "Permission denied. You may need additional permissions to initialize Firebase"
        print_info "Required role: Firebase Admin or Owner"
        print_info "You can initialize Firebase manually at: https://console.firebase.google.com/"
        
        # Even if REST API fails, try to link project to Firebase CLI if available
        # This allows the script to work if Firebase is already initialized manually
        if command -v firebase &> /dev/null; then
            print_step "Attempting to link project to Firebase CLI (Firebase may already be initialized)..."
            local firebase_projects
            firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
            
            if ! echo "${firebase_projects}" | grep -q "\"${PROJECT_ID}\""; then
                # Try to link the project automatically
                if link_firebase_project_to_cli "${PROJECT_ID}"; then
                    print_success "Project ${PROJECT_ID} linked to Firebase CLI"
                    print_info "Firebase appears to be initialized - continuing..."
                    return 0
                else
                    print_warning "Project ${PROJECT_ID} is not accessible via Firebase CLI"
                    print_info "Firebase may already be initialized, but CLI linking requires project to be accessible"
                    print_info "Continuing anyway - Firebase web config retrieval may fail"
                fi
            else
                print_info "Project already linked to Firebase CLI"
                print_info "Firebase appears to be initialized - continuing..."
                return 0
            fi
        fi
        
        return 1
    else
        print_warning "Firebase initialization failed (HTTP ${http_code})"
        print_info "Response: ${response_body}"
        print_info "You may need to initialize Firebase manually at: https://console.firebase.google.com/"
        print_info "Or ensure you have the required permissions (Firebase Admin role)"
        
        # Even if REST API fails, try to link project to Firebase CLI if available
        if command -v firebase &> /dev/null; then
            print_step "Attempting to link project to Firebase CLI (Firebase may already be initialized)..."
            local firebase_projects
            firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
            
            if ! echo "${firebase_projects}" | grep -q "\"${PROJECT_ID}\""; then
                # Try to link the project automatically
                if link_firebase_project_to_cli "${PROJECT_ID}"; then
                    print_success "Project ${PROJECT_ID} linked to Firebase CLI"
                    print_info "Firebase appears to be initialized - continuing..."
                    return 0
                else
                    print_warning "Project ${PROJECT_ID} is not accessible via Firebase CLI"
                    print_info "Firebase may already be initialized, but CLI linking requires project to be accessible"
                    print_info "Continuing anyway - Firebase web config retrieval may fail"
                fi
            else
                print_info "Project already linked to Firebase CLI"
                print_info "Firebase appears to be initialized - continuing..."
                return 0
            fi
        fi
        
        return 1
    fi
}

# ============================================================================
# HELPER: CREATE FIREBASE WEB APP
# ============================================================================

create_firebase_web_app() {
    print_section "Creating Firebase Web App"
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found"
        print_info "Install with: npm install -g firebase-tools"
        return 1
    fi
    
    # Ensure project is linked to Firebase CLI
    local firebase_projects
    firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
    
    if ! echo "${firebase_projects}" | grep -q "\"${PROJECT_ID}\""; then
        print_step "Linking project to Firebase CLI..."
        if ! link_firebase_project_to_cli "${PROJECT_ID}"; then
            print_warning "Could not link project to Firebase CLI"
            print_info "Project may need to be initialized in Firebase Console first"
            return 1
        fi
    fi
    
    # Check if web app already exists
    print_step "Checking for existing web apps..."
    local web_apps_json
    web_apps_json=$(firebase apps:list --project="${PROJECT_ID}" --json 2>/dev/null || echo "")
    
    if [[ -n "${web_apps_json}" ]] && echo "${web_apps_json}" | grep -q '"platform":"WEB"'; then
        local existing_app_id
        existing_app_id=$(echo "${web_apps_json}" | grep -o '"appId":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
        if [[ -n "${existing_app_id}" ]]; then
            print_info "Web app already exists: ${existing_app_id}"
            return 0
        fi
    fi
    
    # Try to parse from table format as fallback
    local web_apps_table
    web_apps_table=$(firebase apps:list --project="${PROJECT_ID}" 2>/dev/null || echo "")
    if echo "${web_apps_table}" | grep -q "WEB"; then
        print_info "Web app already exists (found in table format)"
        return 0
    fi
    
    # Create web app using Firebase Management API
    print_step "Creating Firebase web app via REST API..."
    
    local access_token
    access_token=$(gcloud auth print-access-token 2>/dev/null || echo "")
    
    if [[ -z "${access_token}" ]]; then
        print_error "Could not get access token for REST API call"
        print_info "Trying Firebase CLI instead..."
        
        # Fallback: Use Firebase CLI (may require interactive input)
        print_warning "Firebase CLI app creation may require interactive input"
        print_info "Attempting to create web app..."
        
        # Try to create app non-interactively
        local app_name="${PROJECT_ID}-web"
        if firebase apps:create WEB "${app_name}" --project="${PROJECT_ID}" --non-interactive 2>/dev/null; then
            print_success "Web app created: ${app_name}"
            return 0
        else
            print_warning "Could not create web app automatically"
            print_info "You may need to create it manually in Firebase Console"
            return 1
        fi
    fi
    
    # Use REST API to create web app
    # POST https://firebase.googleapis.com/v1beta1/projects/{projectId}/webApps
    local api_url="https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps"
    local app_name="${PROJECT_ID}-web"
    local request_body="{ \"displayName\": \"${app_name}\" }"
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "${api_url}" \
        -H "Authorization: Bearer ${access_token}" \
        -H "Content-Type: application/json" \
        -d "${request_body}" 2>/dev/null || echo "")
    
    local http_code
    http_code=$(echo "${response}" | tail -1)
    local response_body
    response_body=$(echo "${response}" | sed '$d')
    
    if [[ "${http_code}" == "200" ]] || [[ "${http_code}" == "201" ]]; then
        print_success "Firebase web app created successfully"
        local app_id
        app_id=$(echo "${response_body}" | grep -o '"appId":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
        if [[ -n "${app_id}" ]]; then
            print_info "App ID: ${app_id}"
        fi
        return 0
    elif [[ "${http_code}" == "409" ]]; then
        print_info "Web app already exists"
        return 0
    else
        print_warning "Failed to create web app via REST API (HTTP ${http_code})"
        print_info "Response: ${response_body}"
        print_info "You may need to create it manually in Firebase Console"
        return 1
    fi
}

# ============================================================================
# HELPER: ENABLE FIRESTORE DATABASE
# ============================================================================

enable_firestore_database() {
    print_section "Enabling Firestore Database"
    
    # Check if Firestore is already enabled
    print_step "Checking if Firestore is already enabled..."
    
    # Try to check via gcloud
    if gcloud firestore databases describe --project="${PROJECT_ID}" --database="(default)" >> "${LOG_FILE}" 2>&1; then
        print_info "Firestore database already enabled"
        return 0
    fi
    
    # Enable Firestore via gcloud
    print_step "Enabling Firestore database..."
    
    # Check if Firestore API is enabled
    if ! gcloud services list --enabled --project="${PROJECT_ID}" --filter="name:firestore.googleapis.com" --format="value(name)" | grep -q "firestore.googleapis.com"; then
        print_step "Enabling Firestore API..."
        if gcloud services enable firestore.googleapis.com \
            --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
            print_success "Firestore API enabled"
            sleep 5  # Wait for API to propagate
        else
            print_warning "Failed to enable Firestore API"
        fi
    fi
    
    # Create Firestore database in native mode
    print_step "Creating Firestore database..."
    if gcloud firestore databases create \
        --location="${REGION:-us-central1}" \
        --type=firestore-native \
        --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firestore database created"
        return 0
    else
        local exit_code=$?
        if [[ ${exit_code} -eq 1 ]]; then
            # Check if database already exists (error might be that it's already created)
            if gcloud firestore databases describe --project="${PROJECT_ID}" --database="(default)" >> "${LOG_FILE}" 2>&1; then
                print_info "Firestore database already exists"
                return 0
            fi
        fi
        print_warning "Failed to create Firestore database"
        print_info "You may need to enable it manually in Firebase Console"
        return 1
    fi
}

# ============================================================================
# HELPER: ENABLE FIREBASE AUTH
# ============================================================================

enable_firebase_auth() {
    print_section "Enabling Firebase Authentication"
    
    # Check if Auth is already enabled
    print_step "Checking if Firebase Auth is enabled..."
    
    # Auth is typically enabled automatically when Firebase is initialized
    # But we can verify by checking if the API is enabled
    if gcloud services list --enabled --project="${PROJECT_ID}" --filter="name:identitytoolkit.googleapis.com" --format="value(name)" | grep -q "identitytoolkit.googleapis.com"; then
        print_info "Firebase Auth API already enabled"
        return 0
    fi
    
    # Enable Identity Toolkit API (Firebase Auth)
    print_step "Enabling Firebase Auth API..."
    if gcloud services enable identitytoolkit.googleapis.com \
        --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firebase Auth API enabled"
        return 0
    else
        print_warning "Failed to enable Firebase Auth API"
        print_info "Auth may already be enabled or may require manual setup"
        return 1
    fi
}

# ============================================================================
# HELPER: DEPLOY FIRESTORE RULES
# ============================================================================

deploy_firestore_rules() {
    print_section "Deploying Firestore Rules"
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found"
        print_info "Install with: npm install -g firebase-tools"
        print_info "You can deploy rules manually later with:"
        print_info "  cd firebase && firebase deploy --only firestore:rules --project ${PROJECT_ID}"
        return 1
    fi
    
    # Check if firebase.json exists
    # SCRIPT_DIR is infra/, so project root is one level up
    local project_root
    project_root=$(cd "${SCRIPT_DIR}/.." && pwd)
    local firebase_dir="${project_root}/firebase"
    
    if [[ ! -f "${firebase_dir}/firebase.json" ]]; then
        print_warning "firebase.json not found at ${firebase_dir}"
        print_info "Skipping Firestore rules deployment"
        return 1
    fi
    
    if [[ ! -f "${firebase_dir}/firestore.rules" ]]; then
        print_warning "firestore.rules not found at ${firebase_dir}"
        print_info "Skipping Firestore rules deployment"
        return 1
    fi
    
    # Ensure project is linked to Firebase CLI
    local firebase_projects
    firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
    
    if ! echo "${firebase_projects}" | grep -q "\"${PROJECT_ID}\""; then
        print_step "Linking project to Firebase CLI..."
        if ! link_firebase_project_to_cli "${PROJECT_ID}"; then
            print_warning "Could not link project to Firebase CLI"
            print_info "You can deploy rules manually later with:"
            print_info "  cd firebase && firebase deploy --only firestore:rules --project ${PROJECT_ID}"
            return 1
        fi
    fi
    
    # Deploy Firestore rules
    print_step "Deploying Firestore rules..."
    if cd "${firebase_dir}" && firebase deploy --only firestore:rules --project="${PROJECT_ID}" --non-interactive >> "${LOG_FILE}" 2>&1; then
        print_success "Firestore rules deployed successfully"
        return 0
    else
        print_warning "Failed to deploy Firestore rules"
        print_info "You can deploy them manually later with:"
        print_info "  cd firebase && firebase deploy --only firestore:rules --project ${PROJECT_ID}"
        return 1
    fi
}

# ============================================================================
# HELPER: SETUP FIREBASE SERVICES (COMPLETE AUTOMATION)
# ============================================================================

setup_firebase_services() {
    print_section "Setting up Firebase Services"
    
    # Step 1: Initialize Firebase project (link GCP project to Firebase)
    if ! initialize_firebase_project; then
        print_warning "Firebase project initialization failed or was skipped"
        print_info "Some Firebase services may not be available"
        return 1
    fi
    
    # Wait a bit for Firebase initialization to propagate
    print_step "Waiting for Firebase initialization to propagate..."
    sleep 5
    
    # Step 2: Enable Auth
    enable_firebase_auth || print_warning "Auth setup had issues (may already be enabled)"
    
    # Step 3: Enable Firestore
    enable_firestore_database || print_warning "Firestore setup had issues (may already be enabled)"
    
    # Wait a bit for services to be ready
    print_step "Waiting for Firebase services to be ready..."
    sleep 5
    
    # Step 4: Create web app
    create_firebase_web_app || print_warning "Web app creation had issues (may already exist)"
    
    # Step 5: Deploy Firestore rules
    deploy_firestore_rules || print_warning "Firestore rules deployment had issues"
    
    print_success "Firebase services setup complete!"
    return 0
}

# ============================================================================
# HELPER: CREATE SECRET VALUES
# ============================================================================

create_secrets_for_env() {
    local env="$1"
    local secret_prefix="rates-${env}"
    
    print_section "Creating Secret Values for ${env} Environment"
    
    # -------------------------------------------------------------------------
    # Create Firebase Service Account (if needed)
    # -------------------------------------------------------------------------
    print_step "Setting up Firebase service account..."
    
    # CRITICAL: Firebase tokens are issued from the Firebase project (rates-production),
    # so the service account MUST be in rates-production, not in the environment project
    # This is required for token validation to work correctly
    local firebase_project_id="${DEFAULT_PROJECT_ID}"  # Always use rates-production for Firebase
    local service_account_email="firebase-admin@${firebase_project_id}.iam.gserviceaccount.com"
    
    # Check if service account exists in the correct project (rates-production)
    if gcloud iam service-accounts describe "${service_account_email}" \
        --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firebase Admin service account exists in correct project: ${firebase_project_id}"
    else
        # Check if service account exists in wrong project (e.g., dev-rates)
        print_warning "Service account not found in ${firebase_project_id}"
        
        # Check if it exists in the current PROJECT_ID (which might be wrong)
        if [[ "${PROJECT_ID}" != "${firebase_project_id}" ]]; then
            local wrong_sa_email="firebase-admin@${PROJECT_ID}.iam.gserviceaccount.com"
            if gcloud iam service-accounts describe "${wrong_sa_email}" \
                --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
                print_error "Project mismatch detected!"
                print_error "  Service account: ${wrong_sa_email} (project: ${PROJECT_ID})"
                print_error "  Admin SDK project: ${firebase_project_id}"
                print_error "  Token project: ${firebase_project_id}"
                print_error ""
                print_error "The service account is from ${PROJECT_ID}, but tokens are from ${firebase_project_id}, causing 'account not found'."
                print_error ""
                print_warning "To fix this, you need to:"
                print_info "1. Delete the service account from the wrong project:"
                print_info "   gcloud iam service-accounts delete ${wrong_sa_email} --project=${PROJECT_ID}"
                print_info "2. Run this script again to create it in the correct project (${firebase_project_id})"
                echo ""
                
                if confirm "Delete the service account from ${PROJECT_ID} now?" "n"; then
                    print_step "Deleting service account from ${PROJECT_ID}..."
                    if gcloud iam service-accounts delete "${wrong_sa_email}" \
                        --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
                        print_success "Service account deleted from ${PROJECT_ID}"
                        print_info "Continuing to create service account in correct project..."
                    else
                        print_error "Failed to delete service account from ${PROJECT_ID}"
                        print_info "Please delete it manually and run this script again"
                        return 1
                    fi
                else
                    print_error "Cannot proceed without fixing the project mismatch"
                    print_info "Please delete the service account from ${PROJECT_ID} and run this script again"
                    return 1
                fi
            fi
        fi
        
        # Now create the service account in the correct project
        print_step "Creating Firebase Admin service account in ${firebase_project_id}..."
        if gcloud iam service-accounts create firebase-admin \
            --display-name="Firebase Admin Service Account" \
            --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
            print_success "Firebase Admin service account created in ${firebase_project_id}"
        else
            print_error "Failed to create Firebase Admin service account in ${firebase_project_id}"
            return 1
        fi
        
        print_step "Granting Firebase Admin role in ${firebase_project_id}..."
        if gcloud projects add-iam-policy-binding "${firebase_project_id}" \
            --member="serviceAccount:${service_account_email}" \
            --role="roles/firebase.admin" \
            --condition=None \
            --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
            print_success "Firebase Admin role granted"
        else
            # Try without condition if that fails
            if gcloud projects add-iam-policy-binding "${firebase_project_id}" \
                --member="serviceAccount:${service_account_email}" \
                --role="roles/firebase.admin" \
                --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
                print_success "Firebase Admin role granted"
            else
                print_warning "Could not grant Firebase Admin role (may require manual setup)"
            fi
        fi
    fi
    
    # -------------------------------------------------------------------------
    # Create Service Account Key
    # -------------------------------------------------------------------------
    # Use the Firebase project ID (rates-production) for the service account
    local key_file="${HOME}/firebase-service-account-${env}.json"
    
    if [[ ! -f "${key_file}" ]]; then
        print_step "Creating service account key from ${firebase_project_id}..."
        if gcloud iam service-accounts keys create "${key_file}" \
            --iam-account="${service_account_email}" \
            --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
            print_success "Service account key created: ${key_file}"
        else
            print_error "Failed to create service account key"
            return 1
        fi
    else
        print_info "Service account key already exists: ${key_file}"
        # Verify the key file is for the correct project
        if command -v jq &> /dev/null && [[ -f "${key_file}" ]]; then
            local key_project_id
            if key_project_id=$(jq -r '.project_id // ""' "${key_file}" 2>/dev/null); then
                if [[ "${key_project_id}" != "${firebase_project_id}" ]]; then
                    print_warning "Key file is for wrong project: ${key_project_id}"
                    print_warning "Expected: ${firebase_project_id}"
                    print_info "Deleting old key file to create new one..."
                    rm -f "${key_file}"
                    print_step "Creating service account key from ${firebase_project_id}..."
                    if gcloud iam service-accounts keys create "${key_file}" \
                        --iam-account="${service_account_email}" \
                        --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
                        print_success "Service account key created: ${key_file}"
                    else
                        print_error "Failed to create service account key"
                        return 1
                    fi
                fi
            fi
        fi
    fi
    
    # -------------------------------------------------------------------------
    # Add Firebase Service Account Secret
    # -------------------------------------------------------------------------
    print_step "Adding Firebase service account secret..."
    if gcloud secrets versions list "${secret_prefix}-firebase-sa" \
        --project="${PROJECT_ID}" \
        --format="value(name)" 2>/dev/null | grep -q "versions"; then
        print_info "Secret already has a version. Adding new version..."
    fi
    
    if gcloud secrets versions add "${secret_prefix}-firebase-sa" \
        --data-file="${key_file}" \
        --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firebase service account secret added"
    else
        print_error "Failed to add Firebase service account secret"
        return 1
    fi
    
    # -------------------------------------------------------------------------
    # Generate and Add Nonce Secret
    # -------------------------------------------------------------------------
    print_step "Generating and adding nonce secret..."
    local nonce_secret
    nonce_secret=$(openssl rand -hex 32 2>/dev/null || echo "")
    
    if [[ -z "${nonce_secret}" ]]; then
        print_error "Failed to generate nonce secret (openssl not available?)"
        return 1
    fi
    
    if echo -n "${nonce_secret}" | gcloud secrets versions add "${secret_prefix}-nonce-secret" \
        --data-file=- \
        --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "Nonce secret added"
    else
        print_error "Failed to add nonce secret"
        return 1
    fi
    
    # Save nonce secret to file for reference
    local nonce_file="${HOME}/.rates-nonce-${env}.txt"
    echo "${nonce_secret}" > "${nonce_file}"
    chmod 600 "${nonce_file}"
    print_info "Nonce secret saved to: ${nonce_file}"
    
    # -------------------------------------------------------------------------
    # Retrieve and Add Firebase Web App Configuration
    # -------------------------------------------------------------------------
    print_step "Retrieving Firebase web app configuration..."
    
    local firebase_web_config=""
    local firebase_api_key=""
    local firebase_app_id=""
    local firebase_auth_domain=""
    local firebase_storage_bucket=""
    local firebase_messaging_sender_id=""
    local firebase_measurement_id=""
    
    # Try to get Firebase web app config using Firebase CLI
    if command -v firebase &> /dev/null; then
        print_step "Using Firebase CLI to get web app configuration..."
        
        # Ensure project is linked to Firebase CLI
        local firebase_projects
        firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
        
        if ! echo "${firebase_projects}" | grep -q "\"${PROJECT_ID}\""; then
            print_step "Linking project to Firebase CLI..."
            if link_firebase_project_to_cli "${PROJECT_ID}"; then
                print_success "Project linked to Firebase CLI"
            else
                print_warning "Could not link project to Firebase CLI"
                print_info "Project may need to be initialized in Firebase Console first"
            fi
        fi
        
        # Check if Firebase CLI is authenticated and project is linked
        firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
        if echo "${firebase_projects}" | grep -q "\"${PROJECT_ID}\""; then
            # Get list of web apps - try JSON first, fallback to table format
            local web_apps_json
            local web_app_id=""
            
            # Try JSON format first
            web_apps_json=$(firebase apps:list --project="${PROJECT_ID}" --json 2>/dev/null || echo "")
            
            if [[ -n "${web_apps_json}" ]] && echo "${web_apps_json}" | grep -q '"platform":"WEB"'; then
                # Parse from JSON
                web_app_id=$(echo "${web_apps_json}" | grep -o '"appId":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
            else
                # Fallback: parse from table format
                local web_apps_table
                web_apps_table=$(firebase apps:list --project="${PROJECT_ID}" 2>/dev/null || echo "")
                
                if echo "${web_apps_table}" | grep -q "WEB"; then
                    # Extract app ID from table format (format: | name | app-id | WEB |)
                    # First try: Look for the pattern: 1:numbers:web:hexstring (most reliable)
                    web_app_id=$(echo "${web_apps_table}" | grep -oE "1:[0-9]+:web:[a-f0-9]+" | head -1 || echo "")
                    
                    # If that doesn't work, try parsing the table columns
                    if [[ -z "${web_app_id}" ]]; then
                        # The app ID is in the second column (index 3 with │ separator)
                        web_app_id=$(echo "${web_apps_table}" | grep "WEB" | head -1 | awk -F'│' '{print $3}' | xargs || echo "")
                    fi
                fi
            fi
            
            # Strip ANSI color codes and whitespace from app ID
            if [[ -n "${web_app_id}" ]]; then
                # Remove ANSI escape sequences (multiple methods to catch all variations)
                # Method 1: Remove \x1b[XXm sequences
                web_app_id=$(echo "${web_app_id}" | sed 's/\x1b\[[0-9;]*m//g')
                # Method 2: Remove standalone [XXm sequences (like [39m, [90m)
                web_app_id=$(echo "${web_app_id}" | sed 's/\[[0-9;]*m//g')
                # Method 3: Remove any remaining control characters and trim whitespace
                web_app_id=$(echo "${web_app_id}" | tr -d '\000-\037' | xargs)
                
                # Validate app ID format (should be like: 1:numbers:web:hexstring)
                if ! echo "${web_app_id}" | grep -qE "^1:[0-9]+:web:[a-f0-9]+$"; then
                    print_warning "Extracted app ID doesn't match expected format: '${web_app_id}'"
                    print_info "Debug: Raw app ID before cleaning would be logged here"
                    web_app_id=""
                fi
            fi
            
            if [[ -n "${web_app_id}" ]]; then
                print_info "Found web app: ${web_app_id}"
                
                # Get SDK config for this app
                # Run from project root where .firebaserc is located (Firebase CLI may need this)
                local project_root
                project_root=$(cd "${SCRIPT_DIR}/.." && pwd)
                
                print_info "DEBUG: Running from project root: ${project_root}"
                print_info "DEBUG: Command: firebase apps:sdkconfig WEB \"${web_app_id}\" --project=\"${PROJECT_ID}\""
                
                # Capture both stdout and stderr (JSON might be in either)
                local sdk_config_raw
                sdk_config_raw=$(cd "${project_root}" && firebase apps:sdkconfig WEB "${web_app_id}" --project="${PROJECT_ID}" 2>&1)
                local cmd_exit_code=$?
                
                print_info "DEBUG: Command exit code: ${cmd_exit_code}"
                print_info "DEBUG: Raw output length: ${#sdk_config_raw} characters"
                print_info "DEBUG: Raw output (first 500 chars): ${sdk_config_raw:0:500}"
                if [[ ${#sdk_config_raw} -gt 500 ]]; then
                    print_info "DEBUG: Raw output (last 200 chars): ${sdk_config_raw: -200}"
                fi
                
                # Strip ANSI codes, progress messages, and extract JSON
                local sdk_config
                # Remove ANSI codes
                sdk_config=$(echo "${sdk_config_raw}" | sed 's/\x1b\[[0-9;]*m//g' | sed 's/\[[0-9;]*m//g')
                print_info "DEBUG: After ANSI strip, length: ${#sdk_config} characters"
                
                # Remove progress/status messages
                sdk_config=$(echo "${sdk_config}" | grep -v "Preparing\|Downloading\|✔\|✖\|Error:" || echo "${sdk_config}")
                print_info "DEBUG: After removing progress messages, length: ${#sdk_config} characters"
                
                # Check if we have a JSON object
                if echo "${sdk_config}" | grep -q '{'; then
                    print_info "DEBUG: Found '{' in output, attempting JSON extraction"
                    
                    # Method 1: Extract everything between first { and last }
                    local sdk_config_method1
                    sdk_config_method1=$(echo "${sdk_config}" | sed -n '/{/,/}/p' | tr -d '\n' | sed 's/.*\({.*}\).*/\1/' || echo "")
                    print_info "DEBUG: Method 1 result length: ${#sdk_config_method1}"
                    if [[ -n "${sdk_config_method1}" ]] && echo "${sdk_config_method1}" | grep -q '"apiKey"'; then
                        print_info "DEBUG: Method 1 succeeded!"
                        sdk_config="${sdk_config_method1}"
                    else
                        print_info "DEBUG: Method 1 failed, trying Method 2"
                        # Method 2: If that didn't work, use grep -o
                        local sdk_config_method2
                        sdk_config_method2=$(echo "${sdk_config_raw}" | grep -o '{[^{}]*"apiKey"[^{}]*}' | head -1 || echo "")
                        print_info "DEBUG: Method 2 result length: ${#sdk_config_method2}"
                        if [[ -n "${sdk_config_method2}" ]] && echo "${sdk_config_method2}" | grep -q '"apiKey"'; then
                            print_info "DEBUG: Method 2 succeeded!"
                            sdk_config="${sdk_config_method2}"
                        else
                            print_info "DEBUG: Method 2 failed, trying Method 3"
                            # Method 3: Extract multi-line JSON
                            local sdk_config_method3
                            sdk_config_method3=$(echo "${sdk_config_raw}" | awk '/{/{flag=1;buf=""} flag{buf=buf $0} /}/{if(flag){print buf; flag=0}}' | head -1 | tr -d '\n' || echo "")
                            print_info "DEBUG: Method 3 result length: ${#sdk_config_method3}"
                            if [[ -n "${sdk_config_method3}" ]] && echo "${sdk_config_method3}" | grep -q '"apiKey"'; then
                                print_info "DEBUG: Method 3 succeeded!"
                                sdk_config="${sdk_config_method3}"
                            else
                                print_info "DEBUG: All extraction methods failed"
                                print_info "DEBUG: Method 3 result (first 200 chars): ${sdk_config_method3:0:200}"
                            fi
                        fi
                    fi
                else
                    print_info "DEBUG: No '{' found in output after cleaning"
                    print_info "DEBUG: Cleaned output (first 300 chars): ${sdk_config:0:300}"
                fi
                
                print_info "DEBUG: Final sdk_config length: ${#sdk_config}"
                print_info "DEBUG: Final sdk_config (first 300 chars): ${sdk_config:0:300}"
                
                if [[ -n "${sdk_config}" ]] && echo "${sdk_config}" | grep -q '"apiKey"'; then
                    print_info "DEBUG: Successfully extracted JSON with apiKey!"
                    
                    # Parse SDK config - use jq if available, otherwise use grep
                    if command -v jq &> /dev/null; then
                        print_info "DEBUG: Using jq to parse JSON"
                        firebase_api_key=$(echo "${sdk_config}" | jq -r '.apiKey // ""' 2>/dev/null || echo "")
                        firebase_app_id=$(echo "${sdk_config}" | jq -r '.appId // ""' 2>/dev/null || echo "")
                        firebase_auth_domain=$(echo "${sdk_config}" | jq -r '.authDomain // ""' 2>/dev/null || echo "${PROJECT_ID}.firebaseapp.com")
                        firebase_storage_bucket=$(echo "${sdk_config}" | jq -r '.storageBucket // ""' 2>/dev/null || echo "${PROJECT_ID}.appspot.com")
                        firebase_messaging_sender_id=$(echo "${sdk_config}" | jq -r '.messagingSenderId // ""' 2>/dev/null || echo "")
                        firebase_measurement_id=$(echo "${sdk_config}" | jq -r '.measurementId // ""' 2>/dev/null || echo "")
                    else
                        print_info "DEBUG: Using grep to parse JSON (jq not available)"
                        # Fix the grep pattern to include the closing quote, then extract value using sed
                        firebase_api_key=$(echo "${sdk_config}" | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
                        firebase_app_id=$(echo "${sdk_config}" | grep -o '"appId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
                        firebase_auth_domain=$(echo "${sdk_config}" | grep -o '"authDomain"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"authDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}.firebaseapp.com")
                        firebase_storage_bucket=$(echo "${sdk_config}" | grep -o '"storageBucket"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"storageBucket"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}.appspot.com")
                        firebase_messaging_sender_id=$(echo "${sdk_config}" | grep -o '"messagingSenderId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"messagingSenderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
                        firebase_measurement_id=$(echo "${sdk_config}" | grep -o '"measurementId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"measurementId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
                    fi
                    
                    print_info "DEBUG: Parsed values:"
                    print_info "DEBUG:   apiKey length: ${#firebase_api_key}, first 20 chars: ${firebase_api_key:0:20}"
                    print_info "DEBUG:   appId: ${firebase_app_id}"
                    print_info "DEBUG:   authDomain: ${firebase_auth_domain}"
                    
                    if [[ -n "${firebase_api_key}" ]] && [[ -n "${firebase_app_id}" ]]; then
                        print_success "Firebase web app config retrieved from Firebase CLI"
                    else
                        print_warning "DEBUG: Parsing failed - apiKey: '${firebase_api_key}', appId: '${firebase_app_id}'"
                        print_warning "Could not retrieve SDK config for web app ${web_app_id}"
                    fi
                else
                    print_warning "Could not retrieve SDK config for web app ${web_app_id}"
                    print_info "DEBUG: sdk_config is empty or doesn't contain apiKey"
                fi
            else
                print_warning "No web app found in Firebase project"
                print_info "You may need to register a web app in Firebase Console first"
            fi
        else
            print_warning "Firebase CLI not authenticated or project not linked"
            print_info "Run: firebase login"
        fi
    else
        print_warning "Firebase CLI not found"
        print_info "Install with: npm install -g firebase-tools"
    fi
    
    # If we have the required values, create the config JSON
    if [[ -n "${firebase_api_key}" ]] && [[ -n "${firebase_app_id}" ]]; then
        # Construct Firebase web config JSON
        firebase_web_config="{"
        firebase_web_config+="\"apiKey\":\"${firebase_api_key}\","
        firebase_web_config+="\"authDomain\":\"${firebase_auth_domain:-${PROJECT_ID}.firebaseapp.com}\","
        firebase_web_config+="\"projectId\":\"${PROJECT_ID}\","
        firebase_web_config+="\"storageBucket\":\"${firebase_storage_bucket:-${PROJECT_ID}.appspot.com}\","
        firebase_web_config+="\"messagingSenderId\":\"${firebase_messaging_sender_id}\","
        firebase_web_config+="\"appId\":\"${firebase_app_id}\""
        
        if [[ -n "${firebase_measurement_id}" ]]; then
            firebase_web_config+=",\"measurementId\":\"${firebase_measurement_id}\""
        fi
        
        firebase_web_config+="}"
        
        # Create or update the secret
        local web_config_secret_name="${secret_prefix}-firebase-web-config"
        print_step "Creating Firebase web app config secret: ${web_config_secret_name}..."
        
        # Check if secret exists
        if ! gcloud secrets describe "${web_config_secret_name}" \
            --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
            # Create the secret
            if echo "${firebase_web_config}" | gcloud secrets create "${web_config_secret_name}" \
                --data-file=- \
                --replication-policy="automatic" \
                --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
                print_success "Firebase web app config secret created"
            else
                print_warning "Failed to create Firebase web app config secret"
                print_info "You can create it manually later with:"
                print_info "  echo '${firebase_web_config}' | gcloud secrets create ${web_config_secret_name} --data-file=-"
            fi
        else
            # Secret exists, add a new version
            if echo "${firebase_web_config}" | gcloud secrets versions add "${web_config_secret_name}" \
                --data-file=- \
                --project="${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
                print_success "Firebase web app config secret updated"
            else
                print_warning "Failed to update Firebase web app config secret"
            fi
        fi
        
        # Log the API key (first 20 chars) for verification
        print_info "Firebase API Key: ${firebase_api_key:0:20}... (length: ${#firebase_api_key})"
        print_info "Firebase App ID: ${firebase_app_id}"
    else
        print_warning "Could not retrieve Firebase web app configuration"
        print_info "This secret is required for frontend builds in Cloud Build"
        print_info "You can create it manually:"
        print_info "  1. Go to Firebase Console > Project Settings > Your apps > Web app"
        print_info "  2. Copy the config values"
        print_info "  3. Create secret:"
        print_info "     echo '{\"apiKey\":\"...\",\"authDomain\":\"...\",...}' | \\"
        print_info "       gcloud secrets create ${secret_prefix}-firebase-web-config --data-file=-"
    fi
    
    return 0
}

# ============================================================================
# HELPER: BUILD AND PUSH DOCKER IMAGE
# ============================================================================

build_and_push_image() {
    local env="$1"
    local image_tag="${2:-latest}"
    local project_root="${SCRIPT_DIR}/.."
    
    print_section "Building and Pushing Container Image (${env})"
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        print_info "Skipping image build. You can build manually later."
        return 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &>/dev/null; then
        print_error "Docker daemon is not running"
        print_info "Skipping image build. You can build manually later."
        return 1
    fi
    
    # Configure Docker for Artifact Registry
    print_step "Configuring Docker for Artifact Registry..."
    if gcloud auth configure-docker "${REGION}-docker.pkg.dev" \
        --quiet >> "${LOG_FILE}" 2>&1; then
        print_success "Docker configured for Artifact Registry"
    else
        print_warning "Docker configuration may have failed, continuing anyway..."
    fi
    
    # Determine image names (both api and app services need images)
    local image_name_api="${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-${env}-containers/api:${image_tag}"
    local image_name_app="${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-${env}-containers/app:${image_tag}"
    
    # Check if Dockerfile exists
    local dockerfile_path="${project_root}/Dockerfile"
    if [[ ! -f "${dockerfile_path}" ]]; then
        print_error "Dockerfile not found at: ${dockerfile_path}"
        print_info "Skipping image build. You can build manually later."
        return 1
    fi
    
    # Build images
    print_step "Building Docker images..."
    print_info "API Image: ${image_name_api}"
    print_info "App Image: ${image_name_app}"
    print_info "Build context: ${project_root}"
    
    local build_args=""
    if [[ "${env}" == "prod" ]]; then
        build_args="--build-arg NODE_ENV=production"
    else
        build_args="--build-arg NODE_ENV=development"
    fi
    
    # Build API image for linux/amd64 platform (required for Cloud Run)
    # This ensures compatibility even when building on ARM64 (Apple Silicon)
    # apps/auth-app uses Dockerfile (builds API server)
    print_step "Building API image (apps/auth-app with Dockerfile)..."
    
    # Retrieve Firebase config for auth-app build (Dockerfile accepts build args)
    local firebase_config_secret_api="rates-${env}-firebase-web-config"
    local firebase_config_json_api=""
    local docker_build_args_api="${build_args}"
    
    if firebase_config_json_api=$(gcloud secrets versions access latest --secret="${firebase_config_secret_api}" --project="${PROJECT_ID}" 2>/dev/null); then
        print_info "Retrieved Firebase config for auth-app API build..."
        
        # Parse JSON and add as Docker build args
        local firebase_api_key=""
        local firebase_project_id=""
        local firebase_auth_domain=""
        local firebase_storage_bucket=""
        local firebase_messaging_sender_id=""
        local firebase_app_id=""
        local firebase_measurement_id=""
        
        if command -v jq &> /dev/null; then
            firebase_api_key=$(echo "${firebase_config_json_api}" | jq -r '.apiKey // ""' 2>/dev/null || echo "")
            firebase_project_id=$(echo "${firebase_config_json_api}" | jq -r '.projectId // ""' 2>/dev/null || echo "${PROJECT_ID}")
            firebase_auth_domain=$(echo "${firebase_config_json_api}" | jq -r '.authDomain // ""' 2>/dev/null || echo "${PROJECT_ID}.firebaseapp.com")
            firebase_storage_bucket=$(echo "${firebase_config_json_api}" | jq -r '.storageBucket // ""' 2>/dev/null || echo "${PROJECT_ID}.appspot.com")
            firebase_messaging_sender_id=$(echo "${firebase_config_json_api}" | jq -r '.messagingSenderId // ""' 2>/dev/null || echo "")
            firebase_app_id=$(echo "${firebase_config_json_api}" | jq -r '.appId // ""' 2>/dev/null || echo "")
            firebase_measurement_id=$(echo "${firebase_config_json_api}" | jq -r '.measurementId // ""' 2>/dev/null || echo "")
        else
            firebase_api_key=$(echo "${firebase_config_json_api}" | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_project_id=$(echo "${firebase_config_json_api}" | grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}")
            firebase_auth_domain=$(echo "${firebase_config_json_api}" | grep -o '"authDomain"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"authDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}.firebaseapp.com")
            firebase_storage_bucket=$(echo "${firebase_config_json_api}" | grep -o '"storageBucket"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"storageBucket"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}.appspot.com")
            firebase_messaging_sender_id=$(echo "${firebase_config_json_api}" | grep -o '"messagingSenderId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"messagingSenderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_app_id=$(echo "${firebase_config_json_api}" | grep -o '"appId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_measurement_id=$(echo "${firebase_config_json_api}" | grep -o '"measurementId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"measurementId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
        fi
        
        # Add Firebase config as Docker build args (Dockerfile expects VITE_* prefixed)
        if [[ -n "${firebase_api_key}" ]] && [[ -n "${firebase_app_id}" ]]; then
            docker_build_args_api+=" --build-arg VITE_FIREBASE_API_KEY=${firebase_api_key}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_PROJECT_ID=${firebase_project_id}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_AUTH_DOMAIN=${firebase_auth_domain}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_STORAGE_BUCKET=${firebase_storage_bucket}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=${firebase_messaging_sender_id}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_APP_ID=${firebase_app_id}"
            if [[ -n "${firebase_measurement_id}" ]]; then
                docker_build_args_api+=" --build-arg VITE_FIREBASE_MEASUREMENT_ID=${firebase_measurement_id}"
            fi
            docker_build_args_api+=" --build-arg VITE_FIREBASE_MODE=live"
            docker_build_args_api+=" --build-arg VITE_USE_FIREBASE_EMULATOR=false"
            print_info "Added Firebase config as Docker build args"
        else
            print_warning "Firebase config retrieved but missing required values, building without it"
        fi
    else
        print_warning "Could not retrieve Firebase config for auth-app API build"
        print_info "Dockerfile build will proceed without Firebase config (may fail if required)"
    fi
    
    # Retrieve and add nonce secret for auth-app (must match main app)
    local nonce_secret_name_api="rates-${env}-nonce-secret"
    local nonce_secret_api=""
    
    if nonce_secret_api=$(gcloud secrets versions access latest --secret="${nonce_secret_name_api}" --project="${PROJECT_ID}" 2>/dev/null); then
        print_success "Retrieved nonce secret for auth-app API build (same as main app)"
        print_info "  Nonce secret length: ${#nonce_secret_api} characters"
        docker_build_args_api+=" --build-arg VITE_NONCE_SECRET=${nonce_secret_api}"
        print_info "Added nonce secret as Docker build arg (ensures both apps use same value)"
    else
        print_warning "Could not retrieve nonce secret for auth-app API build: ${nonce_secret_name_api}"
        print_info "Build will proceed without nonce secret (may fail if required)"
        print_info "Ensure the secret exists: gcloud secrets describe ${nonce_secret_name_api} --project=${PROJECT_ID}"
    fi
    
    # Retrieve main app Cloud Run URL for VITE_ALLOWED_REDIRECTS
    # Use the main URL format: https://rates-{env}-app-{region}-{project-number}.{region}.run.app
    print_step "Retrieving main app Cloud Run URL for VITE_ALLOWED_REDIRECTS..."
    # Get region from Terraform outputs or use default (same logic as for auth-app URL)
    local app_service_region="${REGION:-${DEFAULT_REGION}}"
    local app_env_dir="${SCRIPT_DIR}/environments/application/${env}"
    if [[ -d "${app_env_dir}" ]] && [[ -f "${app_env_dir}/terraform.tfstate" ]] || [[ -f "${app_env_dir}/.terraform/terraform.tfstate" ]]; then
        # Try to get region from Terraform outputs
        local tf_region
        if tf_region=$(cd "${app_env_dir}" && terraform output -raw region 2>/dev/null); then
            app_service_region="${tf_region}"
        fi
    fi
    
    # Get project number to construct the main URL format
    local project_number=""
    if project_number=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)" 2>/dev/null); then
        # Construct the main URL format: https://rates-{env}-app-{region}-{project-number}.{region}.run.app
        local main_app_url="https://rates-${env}-app-${app_service_region}-${project_number}.${app_service_region}.run.app"
        local vite_allowed_redirects="${main_app_url}"
        
        print_success "Constructed main app Cloud Run URL (main format)"
        print_info "  Main App URL: ${main_app_url}"
        docker_build_args_api+=" --build-arg VITE_ALLOWED_REDIRECTS=${vite_allowed_redirects}"
        print_info "Added VITE_ALLOWED_REDIRECTS as Docker build arg: ${vite_allowed_redirects}"
    else
        print_warning "Could not retrieve project number for ${PROJECT_ID}"
        print_info "Build will proceed without VITE_ALLOWED_REDIRECTS (may fail if required)"
        print_info "Trying fallback: retrieve URL from gcloud run services describe..."
        
        # Fallback: try to get URL from gcloud (may return alternative format)
        local cloud_run_app_service_name="rates-${env}-app-${app_service_region}"
        local main_app_url=""
        if main_app_url=$(gcloud run services describe "${cloud_run_app_service_name}" \
            --region="${app_service_region}" \
            --project="${PROJECT_ID}" \
            --format="value(status.url)" 2>/dev/null); then
            # Check if it's the main format (contains project number pattern)
            if [[ "${main_app_url}" =~ https://.*-[0-9]+\.[a-z-]+\.run\.app$ ]]; then
                print_success "Retrieved main app Cloud Run URL (fallback)"
                print_info "  Main App URL: ${main_app_url}"
                docker_build_args_api+=" --build-arg VITE_ALLOWED_REDIRECTS=${main_app_url}"
                print_info "Added VITE_ALLOWED_REDIRECTS as Docker build arg: ${main_app_url}"
            else
                print_warning "Retrieved URL is not in main format: ${main_app_url}"
                print_info "Expected format: https://rates-{env}-app-{region}-{project-number}.{region}.run.app"
                print_info "Build will proceed without VITE_ALLOWED_REDIRECTS"
            fi
        else
            print_warning "Could not retrieve main app Cloud Run URL: ${cloud_run_app_service_name}"
            print_info "Build will proceed without VITE_ALLOWED_REDIRECTS (may fail if required)"
        fi
    fi
    
    # Build the Docker image with all build args
    print_info "Running: docker build --platform linux/amd64 -t ${image_name_api} -f ${dockerfile_path} [build args] ${project_root}"
    if docker build --platform linux/amd64 -t "${image_name_api}" \
        -f "${dockerfile_path}" \
        ${docker_build_args_api} \
        "${project_root}" >> "${LOG_FILE}" 2>&1; then
        print_success "API Docker image built successfully (linux/amd64)"
    else
        print_error "API Docker build failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    # Build App image for linux/amd64 platform (required for Cloud Run)
    # apps/app executes directly - build static files and serve with nginx
    print_step "Building App image (apps/app - static files with nginx)..."
    
    # Retrieve Firebase config from Secret Manager for build-time injection
    print_step "Retrieving Firebase config from Secret Manager for build..."
    local firebase_config_secret="rates-${env}-firebase-web-config"
    local firebase_config_json=""
    local vite_firebase_api_key=""
    local vite_firebase_project_id=""
    local vite_firebase_auth_domain=""
    local vite_firebase_storage_bucket=""
    local vite_firebase_messaging_sender_id=""
    local vite_firebase_app_id=""
    local vite_firebase_measurement_id=""
    
    if firebase_config_json=$(gcloud secrets versions access latest --secret="${firebase_config_secret}" --project="${PROJECT_ID}" 2>/dev/null); then
        print_success "Retrieved Firebase config from Secret Manager"
        
        # Parse JSON config (use jq if available, otherwise use sed)
        if command -v jq &> /dev/null; then
            vite_firebase_api_key=$(echo "${firebase_config_json}" | jq -r '.apiKey // ""' 2>/dev/null || echo "")
            vite_firebase_project_id=$(echo "${firebase_config_json}" | jq -r '.projectId // ""' 2>/dev/null || echo "${PROJECT_ID}")
            vite_firebase_auth_domain=$(echo "${firebase_config_json}" | jq -r '.authDomain // ""' 2>/dev/null || echo "${PROJECT_ID}.firebaseapp.com")
            vite_firebase_storage_bucket=$(echo "${firebase_config_json}" | jq -r '.storageBucket // ""' 2>/dev/null || echo "${PROJECT_ID}.appspot.com")
            vite_firebase_messaging_sender_id=$(echo "${firebase_config_json}" | jq -r '.messagingSenderId // ""' 2>/dev/null || echo "")
            vite_firebase_app_id=$(echo "${firebase_config_json}" | jq -r '.appId // ""' 2>/dev/null || echo "")
            vite_firebase_measurement_id=$(echo "${firebase_config_json}" | jq -r '.measurementId // ""' 2>/dev/null || echo "")
        else
            # Fallback: use sed to extract values (handles spaces in JSON)
            vite_firebase_api_key=$(echo "${firebase_config_json}" | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_project_id=$(echo "${firebase_config_json}" | grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}")
            vite_firebase_auth_domain=$(echo "${firebase_config_json}" | grep -o '"authDomain"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"authDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}.firebaseapp.com")
            vite_firebase_storage_bucket=$(echo "${firebase_config_json}" | grep -o '"storageBucket"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"storageBucket"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${PROJECT_ID}.appspot.com")
            vite_firebase_messaging_sender_id=$(echo "${firebase_config_json}" | grep -o '"messagingSenderId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"messagingSenderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_app_id=$(echo "${firebase_config_json}" | grep -o '"appId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_measurement_id=$(echo "${firebase_config_json}" | grep -o '"measurementId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"measurementId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
        fi
        
        # Validate required values
        if [[ -z "${vite_firebase_api_key}" ]] || [[ -z "${vite_firebase_app_id}" ]]; then
            print_warning "Firebase config retrieved but missing required values (apiKey or appId)"
            print_info "API Key present: $([ -n "${vite_firebase_api_key}" ] && echo "yes" || echo "no")"
            print_info "App ID present: $([ -n "${vite_firebase_app_id}" ] && echo "yes" || echo "no")"
        else
            print_success "Firebase config parsed successfully"
            print_info "  API Key: ${vite_firebase_api_key:0:20}... (length: ${#vite_firebase_api_key})"
            print_info "  App ID: ${vite_firebase_app_id}"
            print_info "  Project ID: ${vite_firebase_project_id}"
        fi
    else
        print_warning "Could not retrieve Firebase config from Secret Manager: ${firebase_config_secret}"
        print_info "Build will proceed without Firebase config (may fail if required)"
        print_info "Ensure the secret exists: gcloud secrets describe ${firebase_config_secret} --project=${PROJECT_ID}"
    fi
    
    # Retrieve Nonce Secret from Secret Manager
    print_step "Retrieving nonce secret from Secret Manager for build..."
    local nonce_secret_name="rates-${env}-nonce-secret"
    local vite_nonce_secret=""
    
    if vite_nonce_secret=$(gcloud secrets versions access latest --secret="${nonce_secret_name}" --project="${PROJECT_ID}" 2>/dev/null); then
        print_success "Retrieved nonce secret from Secret Manager"
        print_info "  Nonce secret length: ${#vite_nonce_secret} characters"
    else
        print_warning "Could not retrieve nonce secret from Secret Manager: ${nonce_secret_name}"
        print_info "Build will proceed without nonce secret (may fail if required)"
        print_info "Ensure the secret exists: gcloud secrets describe ${nonce_secret_name} --project=${PROJECT_ID}"
    fi
    
    # Retrieve Cloud Run API service URL (auth-app API)
    print_step "Retrieving Cloud Run API service URL for auth-app..."
    # Get region from Terraform outputs or use default
    local service_region="${REGION:-${DEFAULT_REGION}}"
    local app_env_dir="${SCRIPT_DIR}/environments/application/${env}"
    if [[ -d "${app_env_dir}" ]] && [[ -f "${app_env_dir}/terraform.tfstate" ]] || [[ -f "${app_env_dir}/.terraform/terraform.tfstate" ]]; then
        # Try to get region from Terraform outputs
        local tf_region
        if tf_region=$(cd "${app_env_dir}" && terraform output -raw region 2>/dev/null); then
            service_region="${tf_region}"
        fi
    fi
    
    local cloud_run_api_service_name="rates-${env}-api-${service_region}"
    local vite_auth_app_url=""
    
    # Get the main Cloud Run service URL (not alternative format)
    # Format: https://rates-{env}-api-{region}-{project-number}.{region}.run.app
    if vite_auth_app_url=$(gcloud run services describe "${cloud_run_api_service_name}" \
        --region="${service_region}" \
        --project="${PROJECT_ID}" \
        --format="value(status.url)" 2>/dev/null); then
        # Verify it's the main URL format (contains project number)
        if [[ "${vite_auth_app_url}" =~ https://.*\.run\.app$ ]]; then
            print_success "Retrieved Cloud Run API service URL (main format)"
            print_info "  Auth App URL: ${vite_auth_app_url}"
        else
            print_warning "Cloud Run URL format unexpected: ${vite_auth_app_url}"
            print_info "Expected format: https://rates-{env}-api-{region}-{project-number}.{region}.run.app"
        fi
    else
        print_warning "Could not retrieve Cloud Run API service URL: ${cloud_run_api_service_name}"
        print_info "Build will proceed without auth app URL (may fail if required)"
        print_info "Ensure the service exists: gcloud run services describe ${cloud_run_api_service_name} --region=${service_region} --project=${PROJECT_ID}"
    fi
    
    # First, build the static files with Firebase config as environment variables
    print_step "Building apps/app static files with Firebase config and app settings..."
    
    # Always rebuild to ensure Firebase config is embedded (Vite embeds env vars at build time)
    # Remove existing dist to force a fresh build with current Firebase config
    if [[ -d "${project_root}/apps/app/dist" ]]; then
        print_info "Removing existing dist directory to ensure fresh build with Firebase config..."
        rm -rf "${project_root}/apps/app/dist"
    fi
    
    # Validate Firebase config before building
    if [[ -z "${vite_firebase_api_key}" ]] || [[ -z "${vite_firebase_app_id}" ]]; then
        print_error "Cannot build apps/app: Firebase config is missing or incomplete"
        print_info "Required: apiKey and appId"
        print_info "API Key present: $([ -n "${vite_firebase_api_key}" ] && echo "yes (${#vite_firebase_api_key} chars)" || echo "no")"
        print_info "App ID present: $([ -n "${vite_firebase_app_id}" ] && echo "yes (${vite_firebase_app_id})" || echo "no")"
        print_info "Ensure the secret exists and has valid JSON:"
        print_info "  gcloud secrets describe ${firebase_config_secret} --project=${PROJECT_ID}"
        return 1
    fi
    
    print_info "Building apps/app with configuration from Secret Manager and Cloud Run..."
    print_info "Firebase Config:"
    print_info "  API Key: ${vite_firebase_api_key:0:20}... (length: ${#vite_firebase_api_key})"
    print_info "  App ID: ${vite_firebase_app_id}"
    print_info "  Project ID: ${vite_firebase_project_id}"
    print_info "  Auth Domain: ${vite_firebase_auth_domain}"
    print_info "  Storage Bucket: ${vite_firebase_storage_bucket}"
    print_info "  Messaging Sender ID: ${vite_firebase_messaging_sender_id}"
    print_info "App Settings:"
    print_info "  Nonce Secret: $([ -n "${vite_nonce_secret}" ] && echo "SET (${#vite_nonce_secret} chars)" || echo "NOT SET")"
    print_info "  Auth App URL: ${vite_auth_app_url:-NOT SET}"
    
    # Build with Firebase environment variables and app settings (Vite requires VITE_ prefix)
    # Use env command to explicitly pass variables to the build process
    # This ensures Vite can access them via process.env during build
    print_info "Starting build with all environment variables..."
    if (cd "${project_root}" && env \
        VITE_FIREBASE_API_KEY="${vite_firebase_api_key}" \
        VITE_FIREBASE_PROJECT_ID="${vite_firebase_project_id}" \
        VITE_FIREBASE_AUTH_DOMAIN="${vite_firebase_auth_domain}" \
        VITE_FIREBASE_STORAGE_BUCKET="${vite_firebase_storage_bucket}" \
        VITE_FIREBASE_MESSAGING_SENDER_ID="${vite_firebase_messaging_sender_id}" \
        VITE_FIREBASE_APP_ID="${vite_firebase_app_id}" \
        VITE_FIREBASE_MEASUREMENT_ID="${vite_firebase_measurement_id}" \
        VITE_FIREBASE_MODE="live" \
        VITE_USE_FIREBASE_EMULATOR="false" \
        VITE_NONCE_SECRET="${vite_nonce_secret}" \
        VITE_AUTH_APP_URL="${vite_auth_app_url}" \
        NODE_ENV="production" \
        VITE_ENVIRONMENT="${env}" \
        pnpm --filter=app build >> "${LOG_FILE}" 2>&1); then
        print_success "Static files built successfully with Firebase config"
    else
        print_warning "Build command returned error, checking if dist was created anyway..."
        # Sometimes the build fails but still creates dist (e.g., warnings)
        if [[ ! -d "${project_root}/apps/app/dist" ]]; then
            print_error "Failed to build static files for apps/app"
            print_info "Check ${LOG_FILE} for build errors"
            print_info "Common issues:"
            print_info "  - Missing dependencies: cd ${project_root} && pnpm install"
            print_info "  - Build errors in app code"
            print_info "  - Invalid Firebase config values"
            return 1
        else
            print_warning "Build had errors but dist directory was created, continuing..."
        fi
    fi
    
    # Verify dist directory exists and has content before Docker build
    print_step "Verifying apps/app/dist directory..."
    if [[ ! -d "${project_root}/apps/app/dist" ]]; then
        print_error "apps/app/dist directory does not exist"
        print_info "Cannot build Docker image without static files"
        print_info "Try building manually: cd ${project_root} && pnpm --filter=app build"
        return 1
    fi
    
    local dist_file_count
    dist_file_count=$(find "${project_root}/apps/app/dist" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [[ ${dist_file_count} -eq 0 ]]; then
        print_error "apps/app/dist directory is empty (no files found)"
        print_info "Cannot build Docker image without static files"
        print_info "Try building manually: cd ${project_root} && pnpm --filter=app build"
        return 1
    fi
    
    print_success "Verified: apps/app/dist exists with ${dist_file_count} file(s)"
    print_info "Dist directory path: ${project_root}/apps/app/dist"
    
    # Create a temporary Dockerfile for apps/app (simple nginx static server)
    local app_dockerfile="${project_root}/.Dockerfile.app"
    cat > "${app_dockerfile}" <<EOF
FROM nginx:alpine
# Copy built static files
COPY apps/app/dist /usr/share/nginx/html
# Add nginx config for SPA routing (all routes serve index.html)
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["sh", "-c", "sed -i 's/listen.*80/listen 8080/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
EOF
    
    # Build the app image using the temporary Dockerfile
    if docker build --platform linux/amd64 -t "${image_name_app}" \
        -f "${app_dockerfile}" \
        "${project_root}" >> "${LOG_FILE}" 2>&1; then
        print_success "App Docker image built successfully (linux/amd64)"
        # Clean up temporary Dockerfile
        rm -f "${app_dockerfile}"
    else
        print_error "App Docker build failed"
        print_info "Check ${LOG_FILE} for details"
        rm -f "${app_dockerfile}"
        return 1
    fi
    
    # Push both images
    print_step "Pushing Docker images to Artifact Registry..."
    if docker push "${image_name_api}" >> "${LOG_FILE}" 2>&1; then
        print_success "API Docker image pushed successfully"
    else
        print_error "API Docker push failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    if docker push "${image_name_app}" >> "${LOG_FILE}" 2>&1; then
        print_success "App Docker image pushed successfully"
        return 0
    else
        print_error "App Docker push failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
}

# ============================================================================
# HELPER: UPDATE CLOUD RUN WITH SECRETS AND IMAGE
# ============================================================================

update_cloud_run_with_secrets() {
    local env="$1"
    local image_tag="${2:-latest}"
    local app_dir="${SCRIPT_DIR}/environments/application/${env}"
    
    print_section "Updating Cloud Run Services (${env})"
    
    if [[ ! -d "${app_dir}" ]]; then
        print_error "Application directory not found: ${app_dir}"
        return 1
    fi
    
    cd "${app_dir}"
    
    # Update terraform.tfvars
    print_step "Updating terraform.tfvars..."
    
    # Update use_fallback_image
    if sed -i.bak "s/use_fallback_image[[:space:]]*=[[:space:]]*true/use_fallback_image = false/" terraform.tfvars 2>/dev/null; then
        print_success "Updated use_fallback_image = false"
        rm -f terraform.tfvars.bak
    else
        print_warning "Could not update use_fallback_image (may already be false)"
    fi
    
    # Update include_secrets
    if sed -i.bak "s/include_secrets[[:space:]]*=[[:space:]]*false/include_secrets = true/" terraform.tfvars 2>/dev/null; then
        print_success "Updated include_secrets = true"
        rm -f terraform.tfvars.bak
    else
        print_warning "Could not update include_secrets (may already be true)"
    fi
    
    # Update container_image_tag if provided and different
    if [[ -n "${image_tag}" ]] && [[ "${image_tag}" != "latest" ]]; then
        if sed -i.bak "s/container_image_tag[[:space:]]*=[[:space:]]*\"[^\"]*\"/container_image_tag = \"${image_tag}\"/" terraform.tfvars 2>/dev/null; then
            print_success "Updated container_image_tag = ${image_tag}"
            rm -f terraform.tfvars.bak
        fi
    fi
    
    # Run terraform plan
    print_step "Running terraform plan..."
    if terraform plan -input=false -out=tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform plan complete"
        
        echo ""
        terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -30
        echo ""
    else
        print_error "Terraform plan failed"
        print_info "Check ${LOG_FILE} for details"
        cd "${SCRIPT_DIR}"
        return 1
    fi
    
    # Apply changes
    if [[ "${env}" == "prod" ]]; then
        print_warning "⚠️  PRODUCTION UPDATE"
        if ! confirm "Apply these changes to PRODUCTION?" "n"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${SCRIPT_DIR}"
            return 1
        fi
        
        # Double confirmation for production
        if ! confirm "Are you sure you want to update PRODUCTION?" "n"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${SCRIPT_DIR}"
            return 1
        fi
        
        print_step "Running terraform apply (production)..."
        if terraform apply -input=false -var="deployment_approved=true" tfplan >> "${LOG_FILE}" 2>&1; then
            print_success "Cloud Run services updated successfully!"
            rm -f tfplan
        else
            print_error "Terraform apply failed"
            print_info "Check ${LOG_FILE} for details"
            rm -f tfplan
            cd "${SCRIPT_DIR}"
            return 1
        fi
    else
        if ! confirm "Apply these changes?"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${SCRIPT_DIR}"
            return 1
        fi
        
        print_step "Running terraform apply..."
        if terraform apply -input=false tfplan >> "${LOG_FILE}" 2>&1; then
            print_success "Cloud Run services updated successfully!"
            rm -f tfplan
        else
            print_error "Terraform apply failed"
            print_info "Check ${LOG_FILE} for details"
            rm -f tfplan
            cd "${SCRIPT_DIR}"
            return 1
        fi
    fi
    
    cd "${SCRIPT_DIR}"
    return 0
}

# ============================================================================
# HELPER: CREATE ARTIFACT REGISTRY REPOSITORIES
# ============================================================================

ensure_artifact_registry_repositories() {
    local project_id="${1:-${PROJECT_ID}}"
    local region="${2:-${REGION}}"
    
    print_section "Ensuring Artifact Registry Repositories"
    
    local repositories=("rates-dev-containers" "rates-prod-containers")
    local created_count=0
    local skipped_count=0
    
    for repo in "${repositories[@]}"; do
        print_step "Checking repository: ${repo}..."
        
        # Check if repository exists
        if gcloud artifacts repositories describe "${repo}" \
            --location="${region}" \
            --project="${project_id}" \
            >> "${LOG_FILE}" 2>&1; then
            print_info "Repository '${repo}' already exists, skipping"
            skipped_count=$((skipped_count + 1))
            continue
        fi
        
        # Repository doesn't exist, create it
        print_step "Creating repository: ${repo}..."
        
        local env_type="dev"
        if [[ "${repo}" == *"prod"* ]]; then
            env_type="prod"
        fi
        
        if gcloud artifacts repositories create "${repo}" \
            --repository-format=docker \
            --location="${region}" \
            --description="Docker container images for ${env_type} environment" \
            --project="${project_id}" \
            >> "${LOG_FILE}" 2>&1; then
            print_success "Created repository: ${repo}"
            created_count=$((created_count + 1))
            
            # Wait a moment for the repository to be fully available
            print_step "Waiting for repository to be available..."
            sleep 5
        else
            local create_error
            create_error=$(tail -20 "${LOG_FILE}" 2>/dev/null)
            
            # Check if it's a "already exists" error (race condition)
            if echo "${create_error}" | grep -qE "(already exists|Error 409)"; then
                print_info "Repository '${repo}' was created by another process, skipping"
                skipped_count=$((skipped_count + 1))
            else
                print_error "Failed to create repository: ${repo}"
                print_info "Error: ${create_error}"
                return 1
            fi
        fi
    done
    
    if [ $created_count -gt 0 ]; then
        print_success "Created ${created_count} repository(ies)"
    fi
    
    if [ $skipped_count -gt 0 ]; then
        print_info "Skipped ${skipped_count} existing repository(ies)"
    fi
    
    return 0
}

# ============================================================================
# PHASE 2: FOUNDATION
# ============================================================================

phase_2_foundation() {
    print_header "PHASE 2: Foundation Layer"
    
    cat << EOF
This phase creates shared foundational infrastructure:

  • Required APIs (9 total)
  • Service Accounts (4 total)
    - rates-dev-cloud-run-sa
    - rates-dev-cloud-build-sa
    - rates-prod-cloud-run-sa
    - rates-prod-cloud-build-sa
  • Artifact Registry Repositories
    - rates-dev-containers
    - rates-prod-containers
  • IAM Role Bindings with environment-specific conditions

State Location: gs://${STATE_BUCKET_NAME}/foundation/

EOF

    if ! confirm "Begin foundation deployment?"; then
        print_warning "Foundation skipped"
        return 1
    fi

    local foundation_dir="${SCRIPT_DIR}/environments/foundation"
    
    if [[ ! -d "${foundation_dir}" ]]; then
        print_error "Foundation directory not found: ${foundation_dir}"
        return 1
    fi
    
    cd "${foundation_dir}"

    # -------------------------------------------------------------------------
    # Create terraform.tfvars
    # -------------------------------------------------------------------------
    print_section "Generating Configuration"
    
    cat > terraform.tfvars << EOF
# Generated by setup.sh on $(date)
# Source: docs/IMPLEMENTATION_PLAN.md (Phase 2)

project_id   = "${PROJECT_ID}"
region       = "${REGION}"
environments = ["dev", "prod"]

# Cost Guardrails Configuration
enable_budget_alerts = false
disable_unused_apis  = true
budget_amount        = 10

EOF

    # Add optional billing configuration
    if [[ -n "${BILLING_ACCOUNT_ID}" ]]; then
        cat >> terraform.tfvars << EOF
billing_account_id = "${BILLING_ACCOUNT_ID}"
EOF
    else
        cat >> terraform.tfvars << EOF
billing_account_id = null
EOF
    fi

    if [[ -n "${BUDGET_ALERT_EMAIL}" ]]; then
        cat >> terraform.tfvars << EOF
budget_alert_email = "${BUDGET_ALERT_EMAIL}"
EOF
    else
        cat >> terraform.tfvars << EOF
budget_alert_email = null
EOF
    fi

    print_success "Created terraform.tfvars"

    # -------------------------------------------------------------------------
    # Ensure gcloud project is set (required for Terraform GCS backend)
    # -------------------------------------------------------------------------
    print_step "Ensuring gcloud project is set..."
    run_command "Setting gcloud project" gcloud config set project "${PROJECT_ID}"

    # -------------------------------------------------------------------------
    # Set Application Default Credentials quota project (required for Terraform GCS backend)
    # -------------------------------------------------------------------------
    print_step "Setting Application Default Credentials quota project..."
    if gcloud auth application-default set-quota-project "${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "ADC quota project set"
    else
        print_warning "Failed to set ADC quota project (may already be set)"
    fi

    # -------------------------------------------------------------------------
    # Verify GCS bucket exists (required for backend)
    # -------------------------------------------------------------------------
    print_step "Verifying GCS state bucket exists..."
    if ! gsutil ls -b "gs://${STATE_BUCKET_NAME}" >> "${LOG_FILE}" 2>&1; then
        print_error "GCS state bucket does not exist: ${STATE_BUCKET_NAME}"
        print_info "Please complete Phase 1 (Bootstrap) first to create the bucket"
        return 1
    fi
    print_success "State bucket verified: ${STATE_BUCKET_NAME}"

    # -------------------------------------------------------------------------
    # Clean Terraform backend configuration
    # -------------------------------------------------------------------------
    if [ -d ".terraform" ]; then
        print_step "Cleaning up old Terraform backend configuration..."
        rm -rf .terraform
        print_success "Old backend configuration cleaned"
    fi

    # -------------------------------------------------------------------------
    # Terraform Init
    # -------------------------------------------------------------------------
    print_section "Initializing Terraform"
    
    print_step "Running terraform init..."
    if terraform init -input=false -reconfigure >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform initialized"
    else
        print_error "Terraform init failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Enable Required APIs (for data sources that run during plan)
    # -------------------------------------------------------------------------
    # Some data sources (e.g., google_project) require APIs to be enabled
    # before they can be read during terraform plan. Enable them here.
    print_section "Enabling Required APIs"
    
    print_step "Enabling Cloud Resource Manager API (required for data sources)..."
    if gcloud services enable cloudresourcemanager.googleapis.com \
        --project="${PROJECT_ID}" \
        >> "${LOG_FILE}" 2>&1; then
        print_success "Cloud Resource Manager API enabled"
        
        # Wait a few seconds for API to propagate
        print_step "Waiting for API to propagate..."
        sleep 10
    else
        print_warning "Failed to enable Cloud Resource Manager API (may already be enabled)"
        print_info "Continuing anyway..."
    fi

    # -------------------------------------------------------------------------
    # Terraform Plan
    # -------------------------------------------------------------------------
    print_section "Planning Infrastructure"
    
    print_step "Running terraform plan..."
    if terraform plan -input=false -out=tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform plan complete"
        
        echo ""
        terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -30
        echo ""
    else
        print_error "Terraform plan failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Terraform Apply
    # -------------------------------------------------------------------------
    print_section "Applying Infrastructure"
    
    print_warning "This will create service accounts and enable APIs"
    
    if ! confirm "Apply this plan?"; then
        print_warning "Apply cancelled"
        rm -f tfplan
        return 1
    fi
    
    if ! handle_terraform_apply "Foundation" "tfplan"; then
        return 1
    fi

    # -------------------------------------------------------------------------
    # Ensure Artifact Registry Repositories Exist
    # -------------------------------------------------------------------------
    # Note: These may be commented out in Terraform due to GCP API issues.
    # We create them manually to ensure they exist for image pushes.
    print_section "Ensuring Artifact Registry Repositories"
    
    if ! ensure_artifact_registry_repositories "${PROJECT_ID}" "${REGION}"; then
        print_warning "Failed to create some Artifact Registry repositories"
        print_info "You may need to create them manually or check ${LOG_FILE} for details"
        print_info "Continuing anyway - repositories can be created later"
    fi

    # -------------------------------------------------------------------------
    # Initialize Firebase in GCP Project
    # -------------------------------------------------------------------------
    print_section "Firebase Initialization"
    
    cat << EOF
Firebase needs to be initialized in your GCP project to enable Firebase
services (Auth, Firestore, Storage, etc.). This links your GCP project to
Firebase and makes it available in the Firebase Console.

EOF
    
    if confirm "Initialize Firebase in GCP project and set up services (Auth, Firestore, Web App, Rules)?"; then
        if setup_firebase_services; then
            print_success "Firebase setup complete!"
            print_info "All Firebase services have been configured:"
            print_info "  ✓ Firebase project linked"
            print_info "  ✓ Authentication enabled"
            print_info "  ✓ Firestore database enabled"
            print_info "  ✓ Web app created"
            print_info "  ✓ Firestore rules deployed"
        else
            print_warning "Firebase setup had some issues"
            print_info "Some steps may have been skipped or failed"
            print_info "You can check Firebase Console at:"
            print_info "  https://console.firebase.google.com/"
            print_info "Continuing anyway - Firebase can be configured later"
        fi
    else
        print_info "Firebase setup skipped"
        print_info "You can set up Firebase manually later at:"
        print_info "  https://console.firebase.google.com/"
    fi

    # -------------------------------------------------------------------------
    # Show Outputs
    # -------------------------------------------------------------------------
    print_section "Foundation Outputs"
    
    terraform output -no-color

    cd "${SCRIPT_DIR}"
    
    CURRENT_PHASE=2
    save_configuration
    
    print_success "Phase 2 (Foundation) complete!"
    
    if confirm "Proceed to Phase 3 (Application - Dev)?"; then
        return 0
    else
        print_info "You can resume later with: ./setup.sh --phase 3"
        return 1
    fi
}

# ============================================================================
# PHASE 3: APPLICATION (DEV)
# ============================================================================

phase_3_application_dev() {
    print_header "PHASE 3: Application Layer (Dev)"
    
    cat << EOF
This phase deploys the dev environment application resources:

  • Secret Manager Secrets
    - rates-dev-firebase-sa
    - rates-dev-nonce-secret
  • Cloud Run Service
    - rates-dev-api-${REGION}

State Location: gs://${STATE_BUCKET_NAME}/application/dev/

This phase will also offer to run post-deployment steps:
  • Create secret values (Firebase SA JSON, Nonce secret)
  • Build and push the container image
  • Update Cloud Run services to use secrets and new image

EOF

    if ! confirm "Begin dev application deployment?"; then
        print_warning "Dev application skipped"
        return 1
    fi

    local app_dev_dir="${SCRIPT_DIR}/environments/application/dev"
    
    if [[ ! -d "${app_dev_dir}" ]]; then
        print_error "Application dev directory not found: ${app_dev_dir}"
        return 1
    fi
    
    cd "${app_dev_dir}"

    # -------------------------------------------------------------------------
    # Create terraform.tfvars
    # -------------------------------------------------------------------------
    print_section "Generating Configuration"
    
    cat > terraform.tfvars << EOF
# Generated by setup.sh on $(date)
# Source: docs/IMPLEMENTATION_PLAN.md (Phase 3)

project_id          = "${PROJECT_ID}"
region              = "${REGION}"
environment         = "dev"
container_image_tag = "latest"
node_env            = "development"
use_fallback_image  = true  # Set to false after building/pushing the actual image to Artifact Registry
include_secrets     = false # Set to true after creating secret values (see manual_steps_required output)

# CI/CD Configuration (disabled by default)
enable_cicd = false
github_owner = null
github_repo  = "rates"
EOF
    
    print_success "Created terraform.tfvars"

    # -------------------------------------------------------------------------
    # Ensure gcloud project is set (required for Terraform GCS backend)
    # -------------------------------------------------------------------------
    print_step "Ensuring gcloud project is set..."
    run_command "Setting gcloud project" gcloud config set project "${PROJECT_ID}"

    # -------------------------------------------------------------------------
    # Set Application Default Credentials quota project (required for Terraform GCS backend)
    # -------------------------------------------------------------------------
    print_step "Setting Application Default Credentials quota project..."
    if gcloud auth application-default set-quota-project "${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "ADC quota project set"
    else
        print_warning "Failed to set ADC quota project (may already be set)"
    fi

    # -------------------------------------------------------------------------
    # Verify GCS bucket exists (required for backend)
    # -------------------------------------------------------------------------
    print_step "Verifying GCS state bucket exists..."
    if ! gsutil ls -b "gs://${STATE_BUCKET_NAME}" >> "${LOG_FILE}" 2>&1; then
        print_error "GCS state bucket does not exist: ${STATE_BUCKET_NAME}"
        print_info "Please complete Phase 1 (Bootstrap) first to create the bucket"
        return 1
    fi
    print_success "State bucket verified: ${STATE_BUCKET_NAME}"

    # -------------------------------------------------------------------------
    # Clean Terraform backend configuration
    # -------------------------------------------------------------------------
    if [ -d ".terraform" ]; then
        print_step "Cleaning up old Terraform backend configuration..."
        rm -rf .terraform
        print_success "Old backend configuration cleaned"
    fi

    # -------------------------------------------------------------------------
    # Terraform Init
    # -------------------------------------------------------------------------
    print_section "Initializing Terraform"
    
    print_step "Running terraform init..."
    if terraform init -input=false -reconfigure >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform initialized"
    else
        print_error "Terraform init failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Terraform Plan
    # -------------------------------------------------------------------------
    print_section "Planning Infrastructure"
    
    print_step "Running terraform plan..."
    if terraform plan -input=false -out=tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform plan complete"
        
        echo ""
        terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -30
        echo ""
    else
        print_error "Terraform plan failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Terraform Apply
    # -------------------------------------------------------------------------
    print_section "Applying Infrastructure"
    
    if ! confirm "Apply this plan?"; then
        print_warning "Apply cancelled"
        rm -f tfplan
        return 1
    fi
    
    print_step "Running terraform apply..."
    if terraform apply -input=false tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Dev application infrastructure created!"
        rm -f tfplan
    else
        print_error "Terraform apply failed"
        print_info "Check ${LOG_FILE} for details"
        rm -f tfplan
        return 1
    fi

    # -------------------------------------------------------------------------
    # Show Outputs
    # -------------------------------------------------------------------------
    print_section "Dev Application Outputs"
    
    terraform output -no-color

    cd "${SCRIPT_DIR}"
    
    # -------------------------------------------------------------------------
    # Post-Deployment Steps (Integrated)
    # -------------------------------------------------------------------------
    print_section "Post-Deployment Steps"
    
    cat << EOF
The dev application infrastructure has been created. To complete the deployment,
you need to:

1. Create secret values (Firebase SA JSON, Nonce secret)
2. Build and push the container image
3. Update Cloud Run services to use secrets and the new image

EOF
    
    if confirm "Run post-deployment steps now?"; then
        # Step 1: Create secrets
        if create_secrets_for_env "dev"; then
            print_success "Secrets created for dev environment"
        else
            print_warning "Secret creation failed or was skipped"
            if ! confirm "Continue with remaining post-deployment steps?"; then
                CURRENT_PHASE=3
                save_configuration
                print_info "Post-deployment paused. You can resume later."
                return 0
            fi
        fi
        
        # Step 2: Build and push image
        if confirm "Build and push Docker image for dev?"; then
            if build_and_push_image "dev" "latest"; then
                print_success "Docker image built and pushed"
            else
                print_warning "Image build/push failed or was skipped"
                if ! confirm "Continue with Cloud Run update (will use fallback image)?"; then
                    CURRENT_PHASE=3
                    save_configuration
                    print_info "Post-deployment paused. You can resume later."
                    return 0
                fi
            fi
        else
            print_info "Skipping image build. You can build manually later."
        fi
        
        # Step 3: Update Cloud Run
        if confirm "Update Cloud Run services to use secrets and new image?"; then
            local image_tag="latest"
            if update_cloud_run_with_secrets "dev" "${image_tag}"; then
                print_success "Cloud Run services updated successfully!"
            else
                print_warning "Cloud Run update failed or was skipped"
            fi
        else
            print_info "Skipping Cloud Run update. You can update manually later."
        fi
    else
        print_info "Post-deployment steps skipped. You can run them manually later."
        print_info "See DEPLOYMENT_GUIDE.md for manual steps."
    fi
    
    CURRENT_PHASE=3
    save_configuration
    
    print_success "Phase 3 (Application - Dev) complete!"
    
    if confirm "Proceed to Phase 4 (Application - Prod)?"; then
        return 0
    else
        print_info "You can resume later with: ./setup.sh --phase 4"
        return 1
    fi
}

# ============================================================================
# PHASE 4: APPLICATION (PROD)
# ============================================================================

phase_4_application_prod() {
    print_header "PHASE 4: Application Layer (Prod)"
    
    cat << EOF
⚠️  PRODUCTION ENVIRONMENT

This phase deploys the prod environment application resources:

  • Secret Manager Secrets
    - rates-prod-firebase-sa
    - rates-prod-nonce-secret
  • Cloud Run Service
    - rates-prod-api-${REGION}

State Location: gs://${STATE_BUCKET_NAME}/application/prod/

This phase will also offer to run post-deployment steps:
  • Create secret values (Firebase SA JSON, Nonce secret) - PRODUCTION
  • Build and push the container image (use semantic versioning!)
  • Update Cloud Run services to use secrets and new image

IMPORTANT:
  • Use DIFFERENT secret values than dev environment
  • Ensure dev environment is fully tested first
  • Review all changes carefully before applying

EOF

    print_warning "This is a PRODUCTION deployment. Proceed with caution."
    
    if ! confirm "Begin prod application deployment?" "n"; then
        print_warning "Prod application skipped"
        return 1
    fi

    local app_prod_dir="${SCRIPT_DIR}/environments/application/prod"
    
    if [[ ! -d "${app_prod_dir}" ]]; then
        print_error "Application prod directory not found: ${app_prod_dir}"
        return 1
    fi
    
    cd "${app_prod_dir}"

    # -------------------------------------------------------------------------
    # Create terraform.tfvars
    # -------------------------------------------------------------------------
    print_section "Generating Configuration"
    
    cat > terraform.tfvars << EOF
# Generated by setup.sh on $(date)
# Source: docs/IMPLEMENTATION_PLAN.md (Phase 4)
# ⚠️  PRODUCTION ENVIRONMENT

project_id          = "${PROJECT_ID}"
region              = "${REGION}"
environment         = "prod"
container_image_tag = "latest"
node_env            = "production"
use_fallback_image  = true  # Set to false after building/pushing the actual image to Artifact Registry
include_secrets     = false # Set to true after creating secret values (see manual_steps_required output)

# IMPORTANT: Set to true only after reviewing terraform plan
deployment_approved = false

# CI/CD Configuration (disabled by default)
enable_cicd           = false
github_owner          = null
github_repo           = "rates"
cicd_require_approval = true
EOF
    
    print_success "Created terraform.tfvars"

    # -------------------------------------------------------------------------
    # Ensure gcloud project is set (required for Terraform GCS backend)
    # -------------------------------------------------------------------------
    print_step "Ensuring gcloud project is set..."
    run_command "Setting gcloud project" gcloud config set project "${PROJECT_ID}"

    # -------------------------------------------------------------------------
    # Set Application Default Credentials quota project (required for Terraform GCS backend)
    # -------------------------------------------------------------------------
    print_step "Setting Application Default Credentials quota project..."
    if gcloud auth application-default set-quota-project "${PROJECT_ID}" >> "${LOG_FILE}" 2>&1; then
        print_success "ADC quota project set"
    else
        print_warning "Failed to set ADC quota project (may already be set)"
    fi

    # -------------------------------------------------------------------------
    # Verify GCS bucket exists (required for backend)
    # -------------------------------------------------------------------------
    print_step "Verifying GCS state bucket exists..."
    if ! gsutil ls -b "gs://${STATE_BUCKET_NAME}" >> "${LOG_FILE}" 2>&1; then
        print_error "GCS state bucket does not exist: ${STATE_BUCKET_NAME}"
        print_info "Please complete Phase 1 (Bootstrap) first to create the bucket"
        return 1
    fi
    print_success "State bucket verified: ${STATE_BUCKET_NAME}"

    # -------------------------------------------------------------------------
    # Clean Terraform backend configuration
    # -------------------------------------------------------------------------
    if [ -d ".terraform" ]; then
        print_step "Cleaning up old Terraform backend configuration..."
        rm -rf .terraform
        print_success "Old backend configuration cleaned"
    fi

    # -------------------------------------------------------------------------
    # Terraform Init
    # -------------------------------------------------------------------------
    print_section "Initializing Terraform"
    
    print_step "Running terraform init..."
    if terraform init -input=false -reconfigure >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform initialized"
    else
        print_error "Terraform init failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Terraform Plan
    # -------------------------------------------------------------------------
    print_section "Planning Infrastructure"
    
    print_step "Running terraform plan (with deployment_approved=true)..."
    if terraform plan -input=false -var="deployment_approved=true" -out=tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform plan complete"
        
        echo ""
        terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -30
        echo ""
    else
        print_error "Terraform plan failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi

    # -------------------------------------------------------------------------
    # Terraform Apply
    # -------------------------------------------------------------------------
    print_section "Applying Infrastructure"
    
    print_warning "⚠️  PRODUCTION DEPLOYMENT"
    print_warning "Please review the plan above carefully."
    echo ""
    
    if ! confirm "Apply this plan to PRODUCTION?" "n"; then
        print_warning "Apply cancelled"
        rm -f tfplan
        return 1
    fi
    
    # Double confirmation for production
    echo ""
    print_warning "Final confirmation required."
    if ! confirm "Are you sure you want to deploy to PRODUCTION?" "n"; then
        print_warning "Apply cancelled"
        rm -f tfplan
        return 1
    fi
    
    print_step "Running terraform apply..."
    if terraform apply -input=false tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Prod application infrastructure created!"
        rm -f tfplan
    else
        print_error "Terraform apply failed"
        print_info "Check ${LOG_FILE} for details"
        rm -f tfplan
        return 1
    fi

    # -------------------------------------------------------------------------
    # Show Outputs
    # -------------------------------------------------------------------------
    print_section "Prod Application Outputs"
    
    terraform output -no-color

    cd "${SCRIPT_DIR}"
    
    # -------------------------------------------------------------------------
    # Post-Deployment Steps (Integrated)
    # -------------------------------------------------------------------------
    print_section "Post-Deployment Steps"
    
    cat << EOF
The prod application infrastructure has been created. To complete the deployment,
you need to:

⚠️  IMPORTANT: Use DIFFERENT secret values than dev environment!

1. Create secret values (Firebase SA JSON, Nonce secret) - PRODUCTION
2. Build and push the container image (use semantic versioning!)
3. Update Cloud Run services to use secrets and the new image

EOF
    
    print_warning "⚠️  PRODUCTION ENVIRONMENT - Proceed with caution"
    
    if confirm "Run post-deployment steps for PRODUCTION?" "n"; then
        # Step 1: Create secrets
        print_warning "Creating PRODUCTION secrets (must be different from dev!)"
        if create_secrets_for_env "prod"; then
            print_success "Secrets created for prod environment"
        else
            print_warning "Secret creation failed or was skipped"
            if ! confirm "Continue with remaining post-deployment steps?" "n"; then
                CURRENT_PHASE=4
                save_configuration
                print_info "Post-deployment paused. You can resume later."
                return 0
            fi
        fi
        
        # Step 2: Build and push image
        print_info "For production, use semantic versioning (e.g., v1.0.0)"
        local prod_image_tag="v1.0.0"
        
        if confirm "Enter custom image tag? (default: ${prod_image_tag})" "n"; then
            prompt_input "Enter image tag (e.g., v1.0.0)" "${prod_image_tag}" prod_image_tag
        fi
        
        if confirm "Build and push Docker image for PRODUCTION?" "n"; then
            if build_and_push_image "prod" "${prod_image_tag}"; then
                print_success "Docker image built and pushed"
            else
                print_warning "Image build/push failed or was skipped"
                if ! confirm "Continue with Cloud Run update (will use fallback image)?" "n"; then
                    CURRENT_PHASE=4
                    save_configuration
                    print_info "Post-deployment paused. You can resume later."
                    return 0
                fi
            fi
        else
            print_info "Skipping image build. You can build manually later."
        fi
        
        # Step 3: Update Cloud Run
        print_warning "⚠️  This will update PRODUCTION Cloud Run services"
        if confirm "Update PRODUCTION Cloud Run services to use secrets and new image?" "n"; then
            if update_cloud_run_with_secrets "prod" "${prod_image_tag}"; then
                print_success "Cloud Run services updated successfully!"
                
                # Show verification info
                print_section "Verification"
                cat << EOF
To verify the deployment, test the endpoints:

  # Get service URL
  gcloud run services describe rates-prod-api-${REGION} \\
    --region=${REGION} \\
    --project=${PROJECT_ID} \\
    --format='value(status.url)'

  # Test health endpoint
  curl \$(gcloud run services describe rates-prod-api-${REGION} \\
    --region=${REGION} \\
    --project=${PROJECT_ID} \\
    --format='value(status.url)')/health

EOF
            else
                print_warning "Cloud Run update failed or was skipped"
            fi
        else
            print_info "Skipping Cloud Run update. You can update manually later."
        fi
    else
        print_info "Post-deployment steps skipped. You can run them manually later."
        print_info "See DEPLOYMENT_GUIDE.md for manual steps."
    fi
    
    CURRENT_PHASE=4
    save_configuration
    
    print_success "Phase 4 (Application - Prod) complete!"
    
    if confirm "Proceed to Phase 5 (CI/CD Integration - Optional)?"; then
        return 0
    else
        print_info "You can skip to Phase 6 with: ./setup.sh --phase 6"
        print_info "Or setup CI/CD later with: ./setup.sh --phase 5"
        return 1
    fi
}

# ============================================================================
# PHASE 5: CI/CD INTEGRATION
# ============================================================================

phase_5_cicd() {
    print_header "PHASE 5: CI/CD Integration (Optional)"
    
    cat << EOF
This phase configures Cloud Build triggers for automated deployments:

  • Dev Trigger: rates-dev-deploy
    - Branch: develop
    - Approval: Not required

  • Prod Trigger: rates-prod-deploy
    - Branch: main
    - Approval: Required

Prerequisites:
  • GitHub repository connected to Cloud Build
  • cloudbuild-dev.yaml and cloudbuild-prod.yaml in repository

EOF

    print_warning "This phase requires a GitHub repository connected to Cloud Build"
    
    if ! confirm "Setup CI/CD integration?"; then
        print_warning "CI/CD integration skipped"
        print_info "You can set this up later with: ./setup.sh --phase 5"
        return 0
    fi

    # -------------------------------------------------------------------------
    # GitHub Configuration
    # -------------------------------------------------------------------------
    print_section "GitHub Configuration"
    
    cat << EOF
To enable CI/CD, you need to:

1. Connect your GitHub repository to Cloud Build:
   https://console.cloud.google.com/cloud-build/triggers/connect?project=${PROJECT_ID}

2. Provide your GitHub organization/username and repository name.

EOF

    local github_owner=""
    local github_repo=""
    
    prompt_input "Enter GitHub organization or username" "" github_owner
    
    if [[ -z "${github_owner}" ]]; then
        print_warning "GitHub owner not provided - skipping CI/CD setup"
        return 0
    fi
    
    prompt_input "Enter GitHub repository name" "rates" github_repo

    # -------------------------------------------------------------------------
    # Ensure gcloud project is set (required for Terraform GCS backend)
    # -------------------------------------------------------------------------
    print_step "Ensuring gcloud project is set..."
    run_command "Setting gcloud project" gcloud config set project "${PROJECT_ID}"

    # -------------------------------------------------------------------------
    # Update Dev Application with CI/CD
    # -------------------------------------------------------------------------
    print_section "Configuring Dev CI/CD"
    
    cd "${SCRIPT_DIR}/environments/application/dev"
    
    print_step "Updating dev configuration..."
    
    # Update terraform.tfvars
    sed -i.bak "s/enable_cicd = false/enable_cicd = true/" terraform.tfvars
    sed -i.bak "s/github_owner = null/github_owner = \"${github_owner}\"/" terraform.tfvars
    sed -i.bak "s/github_repo  = \"rates\"/github_repo  = \"${github_repo}\"/" terraform.tfvars
    rm -f terraform.tfvars.bak
    
    print_step "Running terraform apply for dev CI/CD..."
    if terraform apply -auto-approve >> "${LOG_FILE}" 2>&1; then
        print_success "Dev CI/CD trigger created"
    else
        print_warning "Dev CI/CD setup failed - check ${LOG_FILE}"
    fi

    # -------------------------------------------------------------------------
    # Update Prod Application with CI/CD
    # -------------------------------------------------------------------------
    print_section "Configuring Prod CI/CD"
    
    cd "${SCRIPT_DIR}/environments/application/prod"
    
    print_step "Updating prod configuration..."
    
    # Update terraform.tfvars
    sed -i.bak "s/enable_cicd = false/enable_cicd = true/" terraform.tfvars
    sed -i.bak "s/github_owner = null/github_owner = \"${github_owner}\"/" terraform.tfvars
    sed -i.bak "s/github_repo  = \"rates\"/github_repo  = \"${github_repo}\"/" terraform.tfvars
    rm -f terraform.tfvars.bak
    
    print_step "Running terraform apply for prod CI/CD..."
    if terraform apply -auto-approve -var="deployment_approved=true" >> "${LOG_FILE}" 2>&1; then
        print_success "Prod CI/CD trigger created"
    else
        print_warning "Prod CI/CD setup failed - check ${LOG_FILE}"
    fi

    cd "${SCRIPT_DIR}"

    # -------------------------------------------------------------------------
    # CI/CD Summary
    # -------------------------------------------------------------------------
    print_section "CI/CD Configuration Summary"
    
    cat << EOF
Cloud Build triggers have been created:

┌─────────────────────┬──────────┬─────────────┬──────────────┐
│ Trigger             │ Branch   │ Environment │ Approval     │
├─────────────────────┼──────────┼─────────────┼──────────────┤
│ rates-dev-deploy    │ develop  │ dev         │ Not required │
│ rates-prod-deploy   │ main     │ prod        │ Required     │
└─────────────────────┴──────────┴─────────────┴──────────────┘

To test:
  1. Push to 'develop' branch → automatic dev deployment
  2. Push to 'main' branch → prod deployment (requires approval)

View triggers:
  https://console.cloud.google.com/cloud-build/triggers?project=${PROJECT_ID}

EOF

    CURRENT_PHASE=5
    save_configuration
    
    print_success "Phase 5 (CI/CD Integration) complete!"
    
    if confirm "Proceed to Phase 6 (Cost Guardrails)?"; then
        return 0
    else
        print_info "You can complete setup with: ./setup.sh --phase 6"
        return 1
    fi
}

# ============================================================================
# PHASE 6: COST GUARDRAILS
# ============================================================================

phase_6_cost_guardrails() {
    print_header "PHASE 6: Cost Guardrails & Monitoring"
    
    cat << 'EOF'
This phase verifies and displays the cost guardrails configuration:

  • Budget alerts ($10/month with thresholds at 50%, 80%, 100%, 120%)
  • Disabled unused APIs
  • Resource limits enforced via Terraform

Cost guardrails were applied during Phase 2 (Foundation). This phase
verifies the configuration and provides monitoring information.

EOF

    if ! confirm "Review cost guardrails configuration?"; then
        print_warning "Cost guardrails review skipped"
        return 0
    fi

    # -------------------------------------------------------------------------
    # Verify Budget Configuration
    # -------------------------------------------------------------------------
    print_section "Budget Configuration"
    
    if [[ -n "${BILLING_ACCOUNT_ID}" ]]; then
        print_step "Checking budget configuration..."
        
        local budgets
        budgets=$(gcloud billing budgets list --billing-account="${BILLING_ACCOUNT_ID}" --format="value(displayName)" 2>/dev/null || echo "")
        
        if echo "${budgets}" | grep -q "Rates"; then
            print_success "Budget alert configured"
        else
            print_warning "Budget alert may not be configured"
            print_info "Check: https://console.cloud.google.com/billing/budgets?project=${PROJECT_ID}"
        fi
    else
        print_warning "No billing account configured - budget alerts not available"
    fi

    # -------------------------------------------------------------------------
    # Verify API Status
    # -------------------------------------------------------------------------
    print_section "API Status"
    
    print_step "Checking enabled APIs..."
    
    local enabled_apis
    enabled_apis=$(gcloud services list --enabled --project="${PROJECT_ID}" --format="value(name)" 2>/dev/null)
    
    local required_apis=(
        "run.googleapis.com"
        "firebase.googleapis.com"
        "firestore.googleapis.com"
        "secretmanager.googleapis.com"
        "artifactregistry.googleapis.com"
        "cloudbuild.googleapis.com"
    )
    
    echo ""
    echo "Required APIs:"
    for api in "${required_apis[@]}"; do
        if echo "${enabled_apis}" | grep -q "${api}"; then
            print_success "  ${api}"
        else
            print_error "  ${api} (not enabled)"
        fi
    done
    
    local disabled_apis=(
        "monitoring.googleapis.com"
        "cloudtrace.googleapis.com"
        "compute.googleapis.com"
        "container.googleapis.com"
    )
    
    echo ""
    echo "APIs that should be disabled (cost savings):"
    for api in "${disabled_apis[@]}"; do
        if echo "${enabled_apis}" | grep -q "${api}"; then
            print_warning "  ${api} (enabled - consider disabling)"
        else
            print_success "  ${api} (disabled)"
        fi
    done

    # -------------------------------------------------------------------------
    # Cost Guardrails Summary
    # -------------------------------------------------------------------------
    print_section "Cost Guardrails Summary"
    
    cat << EOF
Hard Limits (Enforced via Terraform):
┌─────────────────────────┬─────────────┬────────────────────────────────┐
│ Parameter               │ Limit       │ Justification                  │
├─────────────────────────┼─────────────┼────────────────────────────────┤
│ Cloud Run max_instances │ 2           │ Prevents unbounded scaling     │
│ Cloud Run min_instances │ 0           │ Enables scale-to-zero          │
│ Cloud Run CPU           │ 1 vCPU      │ Free tier optimization         │
│ Cloud Run Memory        │ 512Mi       │ Minimum for Node.js            │
│ Cloud Run Timeout       │ 30s         │ Prevents long-running requests │
│ Artifact Lifecycle      │ 30 days     │ Prevents storage bloat         │
│ Build Timeout           │ 10 min      │ Prevents stuck builds          │
└─────────────────────────┴─────────────┴────────────────────────────────┘

Budget Alerts (Soft Limits):
┌─────────────┬─────────────┬──────────────────────────────────────────┐
│ Threshold   │ Amount      │ Action                                   │
├─────────────┼─────────────┼──────────────────────────────────────────┤
│ 50%         │ \$5.00       │ Informational                            │
│ 80%         │ \$8.00       │ Warning - review usage                   │
│ 100%        │ \$10.00      │ Critical - investigate immediately       │
│ 120%        │ \$12.00      │ Exceeded - take immediate action         │
└─────────────┴─────────────┴──────────────────────────────────────────┘

Free Tier Limits:
┌─────────────────────┬─────────────────────┬───────────────────────────┐
│ Service             │ Free Tier           │ Monthly Limit             │
├─────────────────────┼─────────────────────┼───────────────────────────┤
│ Cloud Run           │ 2M requests         │ 2,000,000 requests/month  │
│ Cloud Run           │ 360K GiB-sec        │ 360,000 GiB-seconds/month │
│ Cloud Run           │ 180K vCPU-sec       │ 180,000 vCPU-seconds/month│
│ Firestore           │ 50K reads/day       │ ~1,500,000 reads/month    │
│ Firestore           │ 20K writes/day      │ ~600,000 writes/month     │
│ Secret Manager      │ 6 secrets           │ 6 active secrets          │
│ Secret Manager      │ 10K accesses        │ 10,000 accesses/month     │
│ Artifact Registry   │ 0.5 GB storage      │ 500 MB storage            │
│ Cloud Build         │ 120 min/day         │ ~3,600 minutes/month      │
└─────────────────────┴─────────────────────┴───────────────────────────┘

EOF

    # -------------------------------------------------------------------------
    # Monitoring Links
    # -------------------------------------------------------------------------
    print_section "Monitoring Links"
    
    cat << EOF
Bookmark these URLs for monitoring:

  • Cloud Run:        https://console.cloud.google.com/run?project=${PROJECT_ID}
  • Firestore:        https://console.cloud.google.com/firestore?project=${PROJECT_ID}
  • Cloud Build:      https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}
  • Billing:          https://console.cloud.google.com/billing?project=${PROJECT_ID}
  • Budgets:          https://console.cloud.google.com/billing/budgets?project=${PROJECT_ID}
  • APIs:             https://console.cloud.google.com/apis/dashboard?project=${PROJECT_ID}
  • Secret Manager:   https://console.cloud.google.com/security/secret-manager?project=${PROJECT_ID}
  • Artifact Registry: https://console.cloud.google.com/artifacts?project=${PROJECT_ID}

EOF

    CURRENT_PHASE=6
    save_configuration
    
    print_success "Phase 6 (Cost Guardrails) complete!"
    
    return 0
}

# ============================================================================
# COMPLETION SUMMARY
# ============================================================================

show_completion_summary() {
    print_header "🎉 Setup Complete!"
    
    cat << EOF
Congratulations! The Rates infrastructure has been deployed successfully.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INFRASTRUCTURE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Project:              ${PROJECT_ID}
  Region:               ${REGION}
  State Bucket:         gs://${STATE_BUCKET_NAME}/

  Service Accounts:
    • rates-dev-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com
    • rates-dev-cloud-build-sa@${PROJECT_ID}.iam.gserviceaccount.com
    • rates-prod-cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com
    • rates-prod-cloud-build-sa@${PROJECT_ID}.iam.gserviceaccount.com

  Artifact Registry:
    • ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers
    • ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers

  Cloud Run Services:
    • rates-dev-api-${REGION} (auth-app)
    • rates-dev-app-${REGION} (app)
    • rates-prod-api-${REGION} (auth-app)
    • rates-prod-app-${REGION} (app)

  Secrets:
    • rates-dev-firebase-sa
    • rates-dev-nonce-secret
    • rates-prod-firebase-sa
    • rates-prod-nonce-secret

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST-DEPLOYMENT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you completed the integrated post-deployment steps during Phases 3 and 4,
your infrastructure should be fully deployed and ready to use.

If you skipped the post-deployment steps, you can run them manually:

1. CREATE SECRET VALUES:

   # Use the integrated script
   ./create-secrets.sh dev   # For dev environment
   ./create-secrets.sh prod  # For prod environment

   # Or manually:
   gcloud secrets versions add rates-dev-firebase-sa --data-file=firebase-sa-dev.json
   echo -n "dev-nonce-value" | gcloud secrets versions add rates-dev-nonce-secret --data-file=-

2. BUILD AND PUSH CONTAINER IMAGES:

   # Configure Docker for Artifact Registry
   gcloud auth configure-docker ${REGION}-docker.pkg.dev

   # Dev - auth-app API
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/api:latest -f Dockerfile .
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/api:latest

   # Prod - auth-app API (use semantic versioning!)
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/api:v1.0.0 -f Dockerfile --build-arg NODE_ENV=production .
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/api:v1.0.0

3. UPDATE CLOUD RUN SERVICES:

   # Dev
   cd environments/application/dev
   terraform apply

   # Prod
   cd environments/application/prod
   terraform apply -var="deployment_approved=true"

4. DEPLOY FIREBASE HOSTING (requires Firebase CLI):

   firebase deploy --only hosting --project=${PROJECT_ID}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USEFUL COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # View Cloud Run service URLs
  gcloud run services list --project=${PROJECT_ID}

  # View Cloud Build history
  gcloud builds list --project=${PROJECT_ID} --limit=10

  # View logs
  gcloud logging read "resource.type=cloud_run_revision" --project=${PROJECT_ID} --limit=50

  # Re-run setup from specific phase
  ./setup.sh --phase N

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

    print_info "Setup log saved to: ${LOG_FILE}"
    print_info "Configuration saved to: ${SCRIPT_DIR}/.setup.config"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

show_help() {
    cat << EOF
Rates Infrastructure Setup Script

Usage:
  ./setup.sh              Interactive setup (recommended)
  ./setup.sh --phase N    Start from specific phase (0-6)
  ./setup.sh --status     Show current setup status
  ./setup.sh --help       Show this help message

Phases:
  0    Pre-flight Validation (tools, auth, project, billing)
  1    Bootstrap (Terraform state bucket)
  2    Foundation (APIs, service accounts, Artifact Registry)
  3    Application - Dev (Cloud Run, secrets + integrated post-deployment)
  4    Application - Prod (Cloud Run, secrets + integrated post-deployment)
  5    CI/CD Integration (Cloud Build triggers) - Optional
  6    Cost Guardrails & Monitoring (verification)

Examples:
  ./setup.sh                    # Full interactive setup
  ./setup.sh --phase 0          # Run pre-flight validation only
  ./setup.sh --phase 3          # Resume from Phase 3 (dev application)

Configuration:
  Configuration is saved to .setup.config and can be resumed.
  Logs are written to .setup.log

Documentation:
  • docs/IMPLEMENTATION_PLAN.md
  • docs/TERRAFORM_DESIGN.md
  • docs/GCP_PROJECT_STRUCTURE.md
  • docs/IAM_SECURITY_MODEL.md
  • docs/COST_GUARDRAILS.md

EOF
}

show_status() {
    print_header "Setup Status"
    
    if load_configuration; then
        cat << EOF
Current Configuration:
──────────────────────────────────────────────────────────────────────────

  Project ID:           ${PROJECT_ID:-Not set}
  Region:               ${REGION:-Not set}
  Billing Account:      ${BILLING_ACCOUNT_ID:-Not set}
  Budget Alert Email:   ${BUDGET_ALERT_EMAIL:-Not set}
  Last Completed Phase: ${CURRENT_PHASE:-0}

──────────────────────────────────────────────────────────────────────────

Phase Status:
EOF
        
        local phases=(
            "0:Pre-flight Validation"
            "1:Bootstrap"
            "2:Foundation"
            "3:Application (Dev)"
            "4:Application (Prod)"
            "5:CI/CD Integration"
            "6:Cost Guardrails"
        )
        
        for phase_info in "${phases[@]}"; do
            local phase_num="${phase_info%%:*}"
            local phase_name="${phase_info#*:}"
            
            if [[ "${phase_num}" -le "${CURRENT_PHASE:-0}" ]]; then
                print_success "Phase ${phase_num}: ${phase_name}"
            else
                echo -e "  ${YELLOW}○${NC} Phase ${phase_num}: ${phase_name}"
            fi
        done
        
        echo ""
        print_info "Resume with: ./setup.sh --phase $((CURRENT_PHASE + 1))"
    else
        print_warning "No configuration found. Run ./setup.sh to begin setup."
    fi
}

main() {
    # Initialize log file
    echo "=== Setup started at $(date) ===" >> "${LOG_FILE}"
    
    # Parse arguments
    local start_phase=-1
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --help|-h)
                show_help
                exit 0
                ;;
            --status)
                show_status
                exit 0
                ;;
            --phase)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-6]$ ]]; then
                    start_phase="$2"
                    shift
                else
                    print_error "Invalid phase number. Must be 0-6."
                    exit 1
                fi
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
        shift
    done
    
    # Display banner
    cat << 'EOF'

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                                                                       ║
  ║   ██████╗  █████╗ ████████╗███████╗███████╗                          ║
  ║   ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔════╝                          ║
  ║   ██████╔╝███████║   ██║   █████╗  ███████╗                          ║
  ║   ██╔══██╗██╔══██║   ██║   ██╔══╝  ╚════██║                          ║
  ║   ██║  ██║██║  ██║   ██║   ███████╗███████║                          ║
  ║   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝                          ║
  ║                                                                       ║
  ║   Infrastructure Setup Script                                         ║
  ║   ─────────────────────────────                                       ║
  ║   Interactive deployment of GCP infrastructure via Terraform          ║
  ║                                                                       ║
  ╚═══════════════════════════════════════════════════════════════════════╝

EOF
    
    # Load existing configuration if available
    if load_configuration 2>/dev/null; then
        print_info "Loaded existing configuration"
        
        if [[ "${start_phase}" -eq -1 ]]; then
            print_info "Last completed phase: ${CURRENT_PHASE}"
            
            if [[ "${CURRENT_PHASE}" -ge 6 ]]; then
                print_success "Setup was previously completed!"
                if confirm "Run setup again from the beginning?" "n"; then
                    start_phase=0
                    CURRENT_PHASE=0
                else
                    show_completion_summary
                    exit 0
                fi
            elif confirm "Resume from Phase $((CURRENT_PHASE + 1))?"; then
                start_phase=$((CURRENT_PHASE + 1))
            else
                start_phase=0
            fi
        fi
    else
        if [[ "${start_phase}" -eq -1 ]]; then
            start_phase=0
        fi
    fi
    
    # Run phases
    local phases_to_run=()
    
    for i in $(seq "${start_phase}" 6); do
        phases_to_run+=("$i")
    done
    
    for phase in "${phases_to_run[@]}"; do
        case "${phase}" in
            0)
                if ! phase_0_preflight; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 0"
                    exit 0
                fi
                ;;
            1)
                if ! phase_1_bootstrap; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 1"
                    exit 0
                fi
                ;;
            2)
                if ! phase_2_foundation; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 2"
                    exit 0
                fi
                ;;
            3)
                if ! phase_3_application_dev; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 3"
                    exit 0
                fi
                ;;
            4)
                if ! phase_4_application_prod; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 4"
                    exit 0
                fi
                ;;
            5)
                if ! phase_5_cicd; then
                    # CI/CD is optional, continue even if skipped
                    :
                fi
                ;;
            6)
                phase_6_cost_guardrails
                ;;
        esac
    done
    
    # Show completion summary
    show_completion_summary
    
    echo "=== Setup completed at $(date) ===" >> "${LOG_FILE}"
}

# Run main function
main "$@"