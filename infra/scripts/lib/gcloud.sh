#!/usr/bin/env bash

# ============================================================================
# GCLOUD - Google Cloud SDK Helper Functions
# ============================================================================
# Purpose: Centralized gcloud operations and project configuration
# Usage: Source this file after logging.sh and prompts.sh
# Dependencies: logging.sh, prompts.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Authentication Check
# ============================================================================

gcloud_ensure_auth() {
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
    if gcloud auth application-default print-access-token &> /dev/null; then
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
    
    return 0
}

# ============================================================================
# Project Configuration
# ============================================================================

gcloud_set_project() {
    local project_id="$1"
    
    print_step "Setting gcloud project to ${project_id}..."
    if gcloud config set project "${project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "gcloud project set to ${project_id}"
    else
        print_error "Failed to set gcloud project"
        return 1
    fi
    
    # Set Application Default Credentials quota project
    print_step "Setting Application Default Credentials quota project..."
    if gcloud auth application-default set-quota-project "${project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "ADC quota project set"
    else
        print_warning "Failed to set ADC quota project (may already be set)"
    fi
    
    return 0
}

# ============================================================================
# Verify GCS Bucket Exists
# ============================================================================

gcloud_verify_bucket() {
    local bucket_name="$1"
    
    print_step "Verifying GCS state bucket exists..."
    if gsutil ls -b "gs://${bucket_name}" >> "${LOG_FILE}" 2>&1; then
        print_success "State bucket verified: ${bucket_name}"
        return 0
    else
        print_error "GCS state bucket does not exist: ${bucket_name}"
        print_info "Please complete Phase 1 (Bootstrap) first to create the bucket"
        return 1
    fi
}

# ============================================================================
# Enable API
# ============================================================================

gcloud_enable_api() {
    local api_name="$1"
    local project_id="$2"
    local wait_seconds="${3:-5}"
    
    print_step "Enabling ${api_name}..."
    if gcloud services enable "${api_name}" --project="${project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "${api_name} enabled"
        
        if [[ "${wait_seconds}" -gt 0 ]]; then
            print_step "Waiting for API to propagate..."
            sleep "${wait_seconds}"
        fi
        return 0
    else
        print_warning "Failed to enable ${api_name} (may already be enabled)"
        return 1
    fi
}

# ============================================================================
# Verify Project Exists
# ============================================================================

gcloud_verify_project() {
    local project_id="$1"
    
    print_step "Verifying project '${project_id}'..."
    if gcloud projects describe "${project_id}" &> /dev/null; then
        print_success "Project '${project_id}' exists and is accessible"
        return 0
    else
        print_warning "Project '${project_id}' does not exist or is not accessible"
        return 1
    fi
}

# ============================================================================
# Create Project
# ============================================================================

gcloud_create_project() {
    local project_id="$1"
    local project_name="${2:-$project_id}"
    
    print_step "Creating project '${project_id}'..."
    if gcloud projects create "${project_id}" --name="${project_name}"; then
        print_success "Project created"
        return 0
    else
        print_error "Failed to create project"
        return 1
    fi
}

# ============================================================================
# Link Billing Account
# ============================================================================

gcloud_link_billing() {
    local project_id="$1"
    local billing_account_id="$2"
    
    if [[ -z "${billing_account_id}" ]]; then
        print_warning "No billing account provided"
        return 1
    fi
    
    print_step "Linking billing account to project..."
    
    local current_billing
    current_billing=$(gcloud billing projects describe "${project_id}" --format="value(billingAccountName)" 2>/dev/null || echo "")
    
    if [[ "${current_billing}" == "billingAccounts/${billing_account_id}" ]]; then
        print_success "Billing account already linked"
        return 0
    else
        if gcloud billing projects link "${project_id}" --billing-account="${billing_account_id}" 2>/dev/null; then
            print_success "Billing account linked successfully"
            return 0
        else
            print_warning "Could not link billing account (may require additional permissions)"
            return 1
        fi
    fi
}
