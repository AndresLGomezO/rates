#!/usr/bin/env bash

# ============================================================================
# SECRETS - Secret Manager Operations
# ============================================================================
# Purpose: Create and manage Google Cloud Secret Manager secrets
# Usage: Source this file after logging.sh, prompts.sh, gcloud.sh, firebase.sh
# Dependencies: logging.sh, prompts.sh, gcloud.sh, firebase.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Create Secrets for Environment
# ============================================================================

secrets_create_for_env() {
    local env="$1"
    local project_id="$2"
    local firebase_project_id="${3:-${project_id}}"  # Firebase SA project (usually rates-production)
    local secret_prefix="rates-${env}"
    
    print_section "Creating Secret Values for ${env} Environment"
    
    # -------------------------------------------------------------------------
    # Create Firebase Service Account
    # -------------------------------------------------------------------------
    print_step "Setting up Firebase service account..."
    
    local service_account_email="firebase-admin@${firebase_project_id}.iam.gserviceaccount.com"
    
    # Check if service account exists
    if gcloud iam service-accounts describe "${service_account_email}" \
        --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firebase Admin service account exists in project: ${firebase_project_id}"
    else
        # Create service account
        print_step "Creating Firebase Admin service account in ${firebase_project_id}..."
        if ! gcloud iam service-accounts create firebase-admin \
            --display-name="Firebase Admin Service Account" \
            --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
            print_error "Failed to create Firebase Admin service account"
            return 1
        fi
        print_success "Firebase Admin service account created"
        
        # Grant Firebase Admin role
        print_step "Granting Firebase Admin role..."
        if gcloud projects add-iam-policy-binding "${firebase_project_id}" \
            --member="serviceAccount:${service_account_email}" \
            --role="roles/firebase.admin" \
            --project="${firebase_project_id}" >> "${LOG_FILE}" 2>&1; then
            print_success "Firebase Admin role granted"
        else
            print_warning "Could not grant Firebase Admin role (may require manual setup)"
        fi
    fi
    
    # -------------------------------------------------------------------------
    # Create Service Account Key
    # -------------------------------------------------------------------------
    local key_file="${HOME}/firebase-service-account-${env}.json"
    
    if [[ ! -f "${key_file}" ]]; then
        print_step "Creating service account key..."
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
    fi
    
    # -------------------------------------------------------------------------
    # Add Firebase Service Account Secret
    # -------------------------------------------------------------------------
    print_step "Adding Firebase service account secret..."
    if gcloud secrets versions add "${secret_prefix}-firebase-sa" \
        --data-file="${key_file}" \
        --project="${project_id}" >> "${LOG_FILE}" 2>&1; then
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
        --project="${project_id}" >> "${LOG_FILE}" 2>&1; then
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
    
    print_success "All secrets created for ${env} environment"
    return 0
}

# ============================================================================
# Update Cloud Run Services with Secrets
# ============================================================================

secrets_update_cloud_run() {
    local env="$1"
    local image_tag="${2:-latest}"
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local app_dir="${script_dir}/environments/application/${env}"
    
    print_section "Updating Cloud Run Services (${env})"
    
    if [[ ! -d "${app_dir}" ]]; then
        print_error "Application directory not found: ${app_dir}"
        return 1
    fi
    
    cd "${app_dir}"
    
    # Update terraform.tfvars
    print_step "Updating terraform.tfvars..."
    
    # Update use_fallback_image to false
    if sed -i.bak "s/use_fallback_image[[:space:]]*=[[:space:]]*true/use_fallback_image = false/" terraform.tfvars 2>/dev/null; then
        print_success "Updated use_fallback_image = false"
        rm -f terraform.tfvars.bak
    fi
    
    # Update include_secrets to true
    if sed -i.bak "s/include_secrets[[:space:]]*=[[:space:]]*false/include_secrets = true/" terraform.tfvars 2>/dev/null; then
        print_success "Updated include_secrets = true"
        rm -f terraform.tfvars.bak
    fi
    
    # Update container_image_tag if provided
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
        terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -30 || true
        echo ""
    else
        print_error "Terraform plan failed"
        print_info "Check ${LOG_FILE} for details"
        cd "${script_dir}"
        return 1
    fi
    
    # Confirm and apply
    if [[ "${env}" == "prod" ]]; then
        print_warning "⚠️  PRODUCTION UPDATE"
        if ! confirm "Apply these changes to PRODUCTION?" "n"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${script_dir}"
            return 1
        fi
        
        if ! confirm "Are you sure you want to update PRODUCTION?" "n"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${script_dir}"
            return 1
        fi
    else
        if ! confirm "Apply these changes?"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${script_dir}"
            return 1
        fi
    fi
    
    print_step "Running terraform apply..."
    if terraform apply -input=false tfplan >> "${LOG_FILE}" 2>&1; then
        print_success "Cloud Run services updated successfully!"
        rm -f tfplan
    else
        print_error "Terraform apply failed"
        print_info "Check ${LOG_FILE} for details"
        rm -f tfplan
        cd "${script_dir}"
        return 1
    fi
    
    cd "${script_dir}"
    return 0
}
