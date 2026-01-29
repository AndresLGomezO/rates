#!/usr/bin/env bash

# ============================================================================
# CLOUD RUN DEPLOYMENT
# ============================================================================
# Purpose: Deploy to Cloud Run via Terraform
# Usage: Source this file after logging.sh, prompts.sh
# Dependencies: logging.sh, prompts.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Deploy to Cloud Run
# ============================================================================

deploy_to_cloud_run() {
    local env="$1"
    local image_tag="$2"
    local script_dir="$3"
    local log_file="$4"
    
    local app_dir="${script_dir}/environments/application/${env}"
    
    print_section "Updating Cloud Run Services (${env})"
    
    if [[ ! -d "${app_dir}" ]]; then
        print_error "Application directory not found: ${app_dir}"
        return 1
    fi
    
    # Check if Terraform is available
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed or not in PATH"
        print_info "Install Terraform: https://www.terraform.io/downloads"
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
    
    # Update container_image_tag so Terraform deploys the images we just pushed
    if [[ -n "${image_tag}" ]]; then
        if sed -i.bak "s/container_image_tag[[:space:]]*=[[:space:]]*\\\"[^\\\"]*\\\"/container_image_tag = \\\"${image_tag}\\\"/" terraform.tfvars 2>/dev/null; then
            print_success "Updated container_image_tag = ${image_tag}"
            rm -f terraform.tfvars.bak
        else
            print_warning "Could not update container_image_tag in terraform.tfvars"
        fi
    fi
    
    # Initialize Terraform if needed
    if [[ ! -d ".terraform" ]]; then
        print_step "Initializing Terraform..."
        if ! terraform init -input=false >> "${log_file}" 2>&1; then
            print_error "Terraform init failed"
            print_info "Check ${log_file} for details"
            cd "${script_dir}"
            return 1
        fi
    fi
    
    # Run terraform plan
    print_step "Running terraform plan..."
    if terraform plan -input=false -out=tfplan >> "${log_file}" 2>&1; then
        print_success "Terraform plan complete"
        
        echo ""
        terraform show -no-color tfplan | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -30
        echo ""
    else
        print_error "Terraform plan failed"
        print_info "Check ${log_file} for details"
        cd "${script_dir}"
        return 1
    fi
    
    # Apply changes
    if [[ "${env}" == "prod" ]]; then
        print_warning "⚠️  PRODUCTION UPDATE"
        if ! confirm "Apply these changes to PRODUCTION?" "n"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${script_dir}"
            return 1
        fi
        
        # Double confirmation for production
        if ! confirm "Are you sure you want to update PRODUCTION?" "n"; then
            print_warning "Update cancelled"
            rm -f tfplan
            cd "${script_dir}"
            return 1
        fi
        
        print_step "Running terraform apply (production)..."
        if terraform apply -input=false -var="deployment_approved=true" tfplan >> "${log_file}" 2>&1; then
            print_success "Cloud Run services updated successfully!"
            rm -f tfplan
        else
            print_error "Terraform apply failed"
            print_info "Check ${log_file} for details"
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
        
        print_step "Running terraform apply..."
        if terraform apply -input=false tfplan >> "${log_file}" 2>&1; then
            print_success "Cloud Run services updated successfully!"
            rm -f tfplan
        else
            print_error "Terraform apply failed"
            print_info "Check ${log_file} for details"
            rm -f tfplan
            cd "${script_dir}"
            return 1
        fi
    fi
    
    cd "${script_dir}"
    return 0
}
