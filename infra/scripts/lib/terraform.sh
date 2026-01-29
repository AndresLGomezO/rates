#!/usr/bin/env bash

# ============================================================================
# TERRAFORM - Terraform Orchestration Functions
# ============================================================================
# Purpose: Centralized Terraform workflow operations (init, plan, apply)
# Usage: Source this file after logging.sh and prompts.sh
# Dependencies: logging.sh, prompts.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Terraform Init
# ============================================================================

tf_init() {
    local dir="$1"
    local reconfigure="${2:-true}"
    
    print_section "Initializing Terraform"
    
    cd "${dir}"
    
    print_step "Running terraform init..."
    local init_args="-input=false"
    if [[ "${reconfigure}" == "true" ]]; then
        init_args="${init_args} -reconfigure"
    fi
    
    if terraform init ${init_args} >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform initialized"
        return 0
    else
        print_error "Terraform init failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
}

# ============================================================================
# Terraform Plan
# ============================================================================

tf_plan() {
    local dir="$1"
    local plan_file="${2:-tfplan}"
    local extra_args="${3:-}"
    
    print_section "Planning Infrastructure"
    
    cd "${dir}"
    
    print_step "Running terraform plan..."
    if terraform plan -input=false -out="${plan_file}" ${extra_args} >> "${LOG_FILE}" 2>&1; then
        print_success "Terraform plan complete"
        
        # Show plan summary
        echo ""
        terraform show -no-color "${plan_file}" | grep -E "^(Plan:|  #|  \+|  -|  ~)" | head -30 || true
        echo ""
        return 0
    else
        print_error "Terraform plan failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
}

# ============================================================================
# Terraform Apply (Simple)
# ============================================================================

tf_apply() {
    local dir="$1"
    local plan_file="${2:-tfplan}"
    local phase_name="${3:-Infrastructure}"
    
    print_section "Applying Infrastructure"
    
    cd "${dir}"
    
    if ! confirm "Apply this plan?"; then
        print_warning "Apply cancelled"
        rm -f "${plan_file}"
        return 1
    fi
    
    print_step "Running terraform apply..."
    if terraform apply -input=false "${plan_file}" >> "${LOG_FILE}" 2>&1; then
        print_success "${phase_name} infrastructure created!"
        rm -f "${plan_file}"
        return 0
    else
        print_error "Terraform apply failed"
        print_info "Check ${LOG_FILE} for details"
        rm -f "${plan_file}"
        return 1
    fi
}

# ============================================================================
# Terraform Apply with Retry and Error Handling
# ============================================================================

tf_apply_with_retry() {
    local dir="$1"
    local plan_file="${2:-tfplan}"
    local phase_name="${3:-Infrastructure}"
    local max_retries=2
    local retry_count=0
    
    cd "${dir}"
    
    while [ $retry_count -le $max_retries ]; do
        print_step "Running terraform apply (attempt $((retry_count + 1))/$((max_retries + 1)))..."
        
        if terraform apply -input=false "${plan_file}" >> "${LOG_FILE}" 2>&1; then
            print_success "${phase_name} infrastructure created!"
            rm -f "${plan_file}"
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
                    if terraform plan -input=false -out="${plan_file}" >> "${LOG_FILE}" 2>&1; then
                        retry_count=$((retry_count + 1))
                        continue
                    else
                        print_error "Re-plan failed after import"
                        rm -f "${plan_file}"
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
                
                # Check for transient "not found" errors
                if echo "${apply_error}" | grep -qE "Error code 5.*Requested entity was not found|Requested entity was not found|Error waiting.*Repository"; then
                    needs_wait=true
                    local wait_time=60
                    print_warning "Artifact Registry API issue detected (Error code 5)."
                    print_warning "This may be a GCP backend issue or quota limit."
                    print_warning "Waiting ${wait_time} seconds before retry..."
                    sleep ${wait_time}
                    needs_replan=true
                fi
                
                # Re-plan if needed
                if [ "$needs_replan" = true ]; then
                    print_step "Re-planning after error..."
                    if ! terraform plan -input=false -out="${plan_file}" >> "${LOG_FILE}" 2>&1; then
                        print_error "Re-plan failed"
                        rm -f "${plan_file}"
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
                    rm -f "${plan_file}"
                    return 1
                fi
            fi
        fi
    done
    
    print_error "Terraform apply failed"
    print_info "Check ${LOG_FILE} for details"
    rm -f "${plan_file}"
    return 1
}

# ============================================================================
# Terraform Output
# ============================================================================

tf_output() {
    local dir="$1"
    local output_name="${2:-}"
    
    cd "${dir}"
    
    if [[ -z "${output_name}" ]]; then
        terraform output -no-color
    else
        terraform output -raw "${output_name}" 2>/dev/null || echo ""
    fi
}

# ============================================================================
# Show Terraform Outputs
# ============================================================================

tf_show_outputs() {
    local dir="$1"
    
    print_section "Terraform Outputs"
    cd "${dir}"
    terraform output -no-color
}

# ============================================================================
# Clean Terraform Backend
# ============================================================================

tf_clean_backend() {
    local dir="$1"
    
    cd "${dir}"
    
    if [ -d ".terraform" ]; then
        print_step "Cleaning up old Terraform backend configuration..."
        rm -rf .terraform
        print_success "Old backend configuration cleaned"
        return 0
    fi
    return 0
}
