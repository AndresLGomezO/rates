#!/usr/bin/env bash

# ============================================================================
# RATES INFRASTRUCTURE SETUP SCRIPT (REFACTORED)
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md
#                  docs/TERRAFORM_DESIGN.md
#                  docs/GCP_PROJECT_STRUCTURE.md
#                  docs/IAM_SECURITY_MODEL.md
#                  docs/COST_GUARDRAILS.md
#
# This is a REFACTORED version of the original monolithic setup.sh.
# The original 4052-line script has been split into modular libraries.
#
# Architecture:
#   - Core libraries: colors, logging, prompts, config, utils
#   - Service libraries: gcloud, terraform, firebase, docker, secrets
#   - Phase modules: scripts/steps/phase_*.sh (to be created)
#
# Original script backed up to: setup.sh.monolithic
#
# Usage:
#   ./setup.sh              # Interactive mode (recommended)
#   ./setup.sh --phase N    # Start from specific phase (0-6)
#   ./setup.sh --status     # Show current setup status
#   ./setup.sh --help       # Show help
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DEFAULT_PROJECT_ID="rates-production"
readonly DEFAULT_REGION="us-central1"
readonly STATE_BUCKET_NAME="rates-terraform-state"

# ============================================================================
# SOURCE LIBRARIES
# ============================================================================

# Core libraries
source "${SCRIPT_DIR}/scripts/lib/colors.sh"
source "${SCRIPT_DIR}/scripts/lib/logging.sh"
source "${SCRIPT_DIR}/scripts/lib/prompts.sh"
source "${SCRIPT_DIR}/scripts/lib/config.sh"
source "${SCRIPT_DIR}/scripts/lib/utils.sh"

# Service libraries
source "${SCRIPT_DIR}/scripts/lib/gcloud.sh"
source "${SCRIPT_DIR}/scripts/lib/terraform.sh"
source "${SCRIPT_DIR}/scripts/lib/firebase.sh"
source "${SCRIPT_DIR}/scripts/lib/docker.sh"
source "${SCRIPT_DIR}/scripts/lib/secrets.sh"

# Phase modules
source "${SCRIPT_DIR}/scripts/steps/phase_1_bootstrap.sh"
source "${SCRIPT_DIR}/scripts/steps/phase_2_foundation.sh"
source "${SCRIPT_DIR}/scripts/steps/phase_3_application.sh"
source "${SCRIPT_DIR}/scripts/steps/phase_4_application_prod.sh"
source "${SCRIPT_DIR}/scripts/steps/phase_5_cicd.sh"
source "${SCRIPT_DIR}/scripts/steps/phase_6_cost_guardrails.sh"

# ============================================================================
# TEMPORARY PHASE IMPLEMENTATIONS
# ============================================================================
# TODO: Move these to separate files in scripts/steps/

phase_0_preflight() {
    print_header "PHASE 0: Pre-Flight Validation"
    
    cat <<'EOF'
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

    # Check Required Tools
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
        if command -v jq > /dev/null 2>&1; then
            tf_version=$(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null)
        else
            tf_version=$(terraform version -json 2>/dev/null | grep -o '"terraform_version"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"' | tail -1 | tr -d '"')
        fi
        print_info "  Version: ${tf_version}"
        
        # Check minimum version
        if [[ -n "$tf_version" ]]; then
            local min_version="1.5.0"
            if [[ "$(printf '%s\n' "$min_version" "$tf_version" | sort -V | head -n1)" != "$min_version" ]]; then
                print_error "  Terraform >= ${min_version} required"
                tools_ok=false
            fi
        fi
    else
        print_info "  Install: https://developer.hashicorp.com/terraform/downloads"
        tools_ok=false
    fi
    
    # Check firebase (optional)
    if check_command "firebase" "Firebase CLI"; then
        local firebase_version
        firebase_version=$(firebase --version 2>/dev/null)
        print_info "  Version: ${firebase_version}"
    else
        print_warning "Firebase CLI not found (optional)"
        print_info "  Install: npm install -g firebase-tools"
    fi
    
    if [[ "${tools_ok}" != "true" ]]; then
        print_error "Required tools are missing. Please install them and try again."
        return 1
    fi

    # Check GCP Authentication
    gcloud_ensure_auth

    # Configure Project
    print_section "Project Configuration"
    
    local current_project
    current_project=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [[ -n "${current_project}" ]]; then
        print_info "Current gcloud project: ${current_project}"
    fi
    
    prompt_input "Enter GCP Project ID" "${DEFAULT_PROJECT_ID}" PROJECT_ID
    
    # Verify project exists
    if gcloud_verify_project "${PROJECT_ID}"; then
        gcloud_set_project "${PROJECT_ID}"
    else
        if confirm "Create project '${PROJECT_ID}'?" "n"; then
            gcloud_create_project "${PROJECT_ID}" "Rates Production"
            gcloud_set_project "${PROJECT_ID}"
        else
            print_error "Project is required."
            return 1
        fi
    fi

    # Configure Region
    print_section "Region Configuration"
    
    cat <<EOF
Select a region for deployment. The following regions are free-tier eligible:
  • us-central1 (Iowa) - Recommended
  • us-east1 (South Carolina)
  • us-west1 (Oregon)

EOF
    
    prompt_input "Enter GCP Region" "${DEFAULT_REGION}" REGION
    
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

    # Check Billing
    print_section "Billing Configuration"
    
    print_info "Checking billing accounts..."
    
    local billing_accounts
    billing_accounts=$(gcloud billing accounts list --format="value(name,displayName)" 2>/dev/null || echo "")
    
    if [[ -z "${billing_accounts}" ]]; then
        print_warning "No billing accounts found"
        prompt_input "Enter Billing Account ID (XXXXXX-XXXXXX-XXXXXX)" "" BILLING_ACCOUNT_ID
    else
        echo ""
        echo "Available billing accounts:"
        echo "${billing_accounts}" | while IFS=$'\t' read -r id name; do
            echo "  • ${id} - ${name}"
        done
        echo ""
        
        local default_billing
        default_billing=$(echo "${billing_accounts}" | head -1 | cut -f1)
        
        prompt_input "Enter Billing Account ID" "${default_billing}" BILLING_ACCOUNT_ID
    fi
    
    if [[ -n "${BILLING_ACCOUNT_ID}" ]]; then
        gcloud_link_billing "${PROJECT_ID}" "${BILLING_ACCOUNT_ID}"
    fi

    # Budget Alert Email
    print_section "Budget Alert Configuration (Optional)"
    
    cat <<'EOF'
Budget alerts help you monitor spending and stay within free tier limits.
You can configure an email address to receive alerts.

EOF
    
    prompt_input "Enter email for budget alerts (or press Enter to skip)" "" BUDGET_ALERT_EMAIL

    # Summary
    print_section "Pre-Flight Summary"
    
    cat <<EOF
Configuration Summary:
──────────────────────────────────────────────────────────────────────────

  Project ID:           ${PROJECT_ID}
  Region:               ${REGION}
  Billing Account:      ${BILLING_ACCOUNT_ID:-Not configured}
  Budget Alert Email:   ${BUDGET_ALERT_EMAIL:-Not configured}
  State Bucket:         ${STATE_BUCKET_NAME}

──────────────────────────────────────────────────────────────────────────
EOF
    
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
# HELP & STATUS
# ============================================================================

show_help() {
    cat <<EOF
Rates Infrastructure Setup Script (Refactored)

Usage:
  ./setup.sh              Interactive setup (recommended)
  ./setup.sh --phase N    Start from specific phase (0-6)
  ./setup.sh --status     Show current setup status
  ./setup.sh --help       Show this help message

Phases:
  0    Pre-flight Validation (tools, auth, project, billing)
  1    Bootstrap (Terraform state bucket)
  2    Foundation (APIs, service accounts, Artifact Registry)
  3    Application - Dev (Cloud Run, secrets + post-deployment)
  4    Application - Prod (Cloud Run, secrets + post-deployment)
  5    CI/CD Integration (Cloud Build triggers) - Optional
  6    Cost Guardrails & Monitoring (verification)

Examples:
  ./setup.sh                    # Full interactive setup
  ./setup.sh --phase 0          # Run pre-flight validation only
  ./setup.sh --phase 3          # Resume from Phase 3 (dev application)

Architecture:
  This is a refactored version with modular libraries.
  Original monolithic script: setup.sh.monolithic

Documentation:
  • docs/IMPLEMENTATION_PLAN.md
  • docs/TERRAFORM_DESIGN.md

EOF
}

show_status() {
    print_header "Setup Status"
    
    if load_configuration; then
        cat <<EOF
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

# ============================================================================
# MAIN
# ============================================================================

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
    cat <<'EOF'

  ╔═══════════════════════════════════════════════════════════════════════╗
  ║                                                                       ║
  ║   ██████╗  █████╗ ████████╗███████╗███████╗                          ║
  ║   ██╔══██╗██╔══██╗╚══██╔══╝██╔════╝██╔════╝                          ║
  ║   ██████╔╝███████║   ██║   █████╗  ███████╗                          ║
  ║   ██╔══██╗██╔══██║   ██║   ██╔══╝  ╚════██║                          ║
  ║   ██║  ██║██║  ██║   ██║   ███████╗███████║                          ║
  ║   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝                          ║
  ║                                                                       ║
  ║   Infrastructure Setup Script (Refactored)                           ║
  ║   ───────────────────────────────────────                            ║
  ║   Modular architecture with clean separation                         ║
  ║                                                                       ║
  ╚═══════════════════════════════════════════════════════════════════════╝

EOF
    
    print_info "Original monolithic script: setup.sh.monolithic"
    print_info "Refactored modular architecture active"
    echo ""
    
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
    for phase in $(seq "${start_phase}" 6); do
        case "${phase}" in
            0)
                if ! phase_0_preflight; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 0"
                    exit 0
                fi
                CURRENT_PHASE=0
                save_configuration
                ;;
            1)
                if ! phase_1_bootstrap; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 1"
                    exit 0
                fi
                CURRENT_PHASE=1
                save_configuration
                ;;
            2)
                if ! phase_2_foundation; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 2"
                    exit 0
                fi
                CURRENT_PHASE=2
                save_configuration
                ;;
            3)
                # Phase 3 is environment-specific, call with dev parameters
                if ! phase_3_application "dev" "Development"; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 3"
                    exit 0
                fi
                CURRENT_PHASE=3
                save_configuration
                ;;
            4)
                if ! phase_4_application_prod; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 4"
                    exit 0
                fi
                # CURRENT_PHASE set in phase_4_application_prod
                ;;
            5)
                if ! phase_5_cicd; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 5"
                    exit 0
                fi
                # CURRENT_PHASE set in phase_5_cicd
                ;;
            6)
                if ! phase_6_cost_guardrails; then
                    print_info "Setup paused. Resume with: ./setup.sh --phase 6"
                    exit 0
                fi
                # CURRENT_PHASE set in phase_6_cost_guardrails
                ;;
            *)
                print_warning "Phase ${phase} not yet implemented"
                exit 0
                ;;
        esac
    done
    
    echo "=== Setup completed at $(date) ===" >> "${LOG_FILE}"
}

# Run main function
main "$@"