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
#   3: Application - Dev (Cloud Run, Secrets)
#   4: Application - Prod (Cloud Run, Secrets)
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
    # Clean up old Terraform state if backend changed
    # -------------------------------------------------------------------------
    # If backend.tf was changed from GCS to local, we need to clean .terraform
    # to avoid "unsetting backend" errors
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
    # Use -reconfigure to handle backend changes (e.g., from GCS to local)
    # This is safe for bootstrap since we're creating the state bucket
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
        print_error "Terraform apply failed"
        print_info "Check ${LOG_FILE} for details"
        rm -f tfplan
        return 1
    fi

    # -------------------------------------------------------------------------
    # Show Outputs
    # -------------------------------------------------------------------------
    print_section "Bootstrap Outputs"
    
    terraform output -no-color
    
    # -------------------------------------------------------------------------
    # Migrate State to GCS (Optional)
    # -------------------------------------------------------------------------
    print_section "State Migration"
    
    cat << EOF
The bootstrap state is currently stored locally. For production use,
you should migrate it to GCS for durability and team access.

This requires updating backend.tf to use the GCS backend.

EOF
    
    if confirm "Migrate bootstrap state to GCS?"; then
        # Update backend.tf
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
        if terraform init -migrate-state -force-copy >> "${LOG_FILE}" 2>&1; then
            print_success "State migrated to GCS"
            rm -f terraform.tfstate terraform.tfstate.backup
        else
            print_error "State migration failed"
            print_warning "Local state file preserved"
        fi
    else
        print_info "State remains local. Migrate manually later if needed."
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
    # Terraform Init
    # -------------------------------------------------------------------------
    print_section "Initializing Terraform"
    
    print_step "Running terraform init..."
    if terraform init -input=false >> "${LOG_FILE}" 2>&1; then
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

⚠️  IMPORTANT: After this phase, you must manually:
    1. Create secret values (Firebase SA JSON, Nonce secret)
    2. Build and push the container image

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
    # Terraform Init
    # -------------------------------------------------------------------------
    print_section "Initializing Terraform"
    
    print_step "Running terraform init..."
    if terraform init -input=false >> "${LOG_FILE}" 2>&1; then
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

    # -------------------------------------------------------------------------
    # Post-Deployment Instructions
    # -------------------------------------------------------------------------
    print_section "Post-Deployment Steps Required"
    
    local firebase_secret
    local nonce_secret
    firebase_secret=$(terraform output -raw firebase_sa_secret_name 2>/dev/null || echo "rates-dev-firebase-sa")
    nonce_secret=$(terraform output -raw nonce_secret_name 2>/dev/null || echo "rates-dev-nonce-secret")
    
    cat << EOF
The following manual steps are required to complete the dev deployment:

1. CREATE SECRET VALUES:

   # Firebase service account JSON:
   gcloud secrets versions add ${firebase_secret} \\
     --data-file=path/to/firebase-service-account.json

   # Nonce secret:
   echo -n "your-nonce-secret-value" | \\
     gcloud secrets versions add ${nonce_secret} --data-file=-

2. BUILD AND PUSH CONTAINER IMAGES:

   # Configure Docker for Artifact Registry
   gcloud auth configure-docker ${REGION}-docker.pkg.dev

   # Build and push auth-app API image
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/api:latest \\
     ./apps/auth-app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/api:latest

   # Build and push app image
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/app:latest \\
     ./apps/app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/app:latest

3. TRIGGER CLOUD RUN REDEPLOYMENT:

   # Update auth-app API service
   gcloud run services update rates-dev-api-${REGION} \\
     --region=${REGION} \\
     --project=${PROJECT_ID}

   # Update app service
   gcloud run services update rates-dev-app-${REGION} \\
     --region=${REGION} \\
     --project=${PROJECT_ID}

EOF

    cd "${SCRIPT_DIR}"
    
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
    # Terraform Init
    # -------------------------------------------------------------------------
    print_section "Initializing Terraform"
    
    print_step "Running terraform init..."
    if terraform init -input=false >> "${LOG_FILE}" 2>&1; then
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

    # -------------------------------------------------------------------------
    # Post-Deployment Instructions
    # -------------------------------------------------------------------------
    print_section "Post-Deployment Steps Required"
    
    local firebase_secret
    local nonce_secret
    firebase_secret=$(terraform output -raw firebase_sa_secret_name 2>/dev/null || echo "rates-prod-firebase-sa")
    nonce_secret=$(terraform output -raw nonce_secret_name 2>/dev/null || echo "rates-prod-nonce-secret")
    
    cat << EOF
The following manual steps are required to complete the prod deployment:

⚠️  USE DIFFERENT SECRET VALUES THAN DEV ENVIRONMENT!

1. CREATE SECRET VALUES (PRODUCTION):

   # Firebase service account JSON (PRODUCTION):
   gcloud secrets versions add ${firebase_secret} \\
     --data-file=path/to/firebase-service-account-PROD.json

   # Nonce secret (PRODUCTION - different from dev!):
   echo -n "your-PRODUCTION-nonce-secret-value" | \\
     gcloud secrets versions add ${nonce_secret} --data-file=-

2. BUILD AND PUSH CONTAINER IMAGES (PRODUCTION):

   # Configure Docker for Artifact Registry
   gcloud auth configure-docker ${REGION}-docker.pkg.dev

   # Build and push auth-app API image (use semantic versioning!)
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/api:v1.0.0 \\
     --build-arg NODE_ENV=production \\
     ./apps/auth-app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/api:v1.0.0

   # Build and push app image (use semantic versioning!)
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/app:v1.0.0 \\
     --build-arg NODE_ENV=production \\
     ./apps/app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/app:v1.0.0

3. TRIGGER CLOUD RUN REDEPLOYMENT:

   # Update auth-app API service
   gcloud run services update rates-prod-api-${REGION} \\
     --region=${REGION} \\
     --project=${PROJECT_ID}

   # Update app service
   gcloud run services update rates-prod-app-${REGION} \\
     --region=${REGION} \\
     --project=${PROJECT_ID}

4. VERIFY END-TO-END:

   # Test auth-app API health endpoint
   curl \$(gcloud run services describe rates-prod-api-${REGION} \\
     --region=${REGION} --format='value(status.url)')/health

   # Test app service health endpoint
   curl \$(gcloud run services describe rates-prod-app-${REGION} \\
     --region=${REGION} --format='value(status.url)')/health

EOF

    cd "${SCRIPT_DIR}"
    
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

REMAINING MANUAL STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CREATE SECRET VALUES:

   # Dev environment
   gcloud secrets versions add rates-dev-firebase-sa --data-file=firebase-sa-dev.json
   echo -n "dev-nonce-value" | gcloud secrets versions add rates-dev-nonce-secret --data-file=-

   # Prod environment (use DIFFERENT values!)
   gcloud secrets versions add rates-prod-firebase-sa --data-file=firebase-sa-prod.json
   echo -n "prod-nonce-value" | gcloud secrets versions add rates-prod-nonce-secret --data-file=-

2. BUILD AND PUSH CONTAINER IMAGES:

   # Configure Docker for Artifact Registry
   gcloud auth configure-docker ${REGION}-docker.pkg.dev

   # Dev - auth-app API
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/api:latest ./apps/auth-app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/api:latest

   # Dev - app
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/app:latest ./apps/app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-dev-containers/app:latest

   # Prod - auth-app API (use semantic versioning!)
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/api:v1.0.0 ./apps/auth-app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/api:v1.0.0

   # Prod - app (use semantic versioning!)
   docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/app:v1.0.0 ./apps/app
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/rates-prod-containers/app:v1.0.0

3. UPDATE CLOUD RUN SERVICES:

   # Dev services
   gcloud run services update rates-dev-api-${REGION} --region=${REGION}
   gcloud run services update rates-dev-app-${REGION} --region=${REGION}

   # Prod services
   gcloud run services update rates-prod-api-${REGION} --region=${REGION}
   gcloud run services update rates-prod-app-${REGION} --region=${REGION}

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
  3    Application - Dev (Cloud Run, secrets)
  4    Application - Prod (Cloud Run, secrets)
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