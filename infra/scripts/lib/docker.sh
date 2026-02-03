#!/usr/bin/env bash

# ============================================================================
# DOCKER - Docker Build and Push Operations
# ============================================================================
# Purpose: Docker authentication and container image operations
# Usage: Source this file after logging.sh and gcloud.sh
# Dependencies: logging.sh, gcloud.sh
# ============================================================================

# Source builder scripts
source "${SCRIPT_DIR}/scripts/builders/api_image.sh"
source "${SCRIPT_DIR}/scripts/builders/app_assets.sh"
source "${SCRIPT_DIR}/scripts/builders/app_image.sh"
source "${SCRIPT_DIR}/scripts/builders/ai_processor_image.sh"
source "${SCRIPT_DIR}/scripts/builders/ai_service_image.sh"

set -euo pipefail

# ============================================================================
# Configure Docker Authentication for Artifact Registry
# ============================================================================

docker_configure_auth() {
    local region="$1"
    local project_id="$2"
    
    print_section "Configuring Docker Authentication"
    
    print_step "Configuring Docker for Artifact Registry..."
    if gcloud auth configure-docker "${region}-docker.pkg.dev" --quiet >> "${LOG_FILE}" 2>&1; then
        print_success "Docker configured for ${region}-docker.pkg.dev"
        return 0
    else
        print_error "Failed to configure Docker authentication"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
}

# ============================================================================
# Build and Push Docker Images for Environment
# ============================================================================

docker_build_and_push() {
    local env="$1"
    local project_id="$2"
    local region="$3"
    local tag="${4:-latest}"
    
    print_section "Building and Pushing Docker Images (${env})"
    
    # Determine paths
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local project_root="${script_dir}/.."
    
    # Configure Docker authentication
    if ! docker_configure_auth "${region}" "${project_id}"; then
        return 1
    fi
    
    # Define image names
    local registry="${region}-docker.pkg.dev"
    local repository="${project_id}/rates-${env}-containers"
    local image_name_api="${registry}/${repository}/api:${tag}"
    local image_name_app="${registry}/${repository}/app:${tag}"
    local image_name_ai_service="${registry}/${repository}/ai-service:${tag}"
    local image_name_ai_processor="${registry}/${repository}/ai-processor:${tag}"
    
    print_info "Building images:"
    print_info "  API: ${image_name_api}"
    print_info "  App: ${image_name_app}"
    print_info "  AI Service: ${image_name_ai_service}"
    print_info "  AI Processor: ${image_name_ai_processor}"
    
    # -------------------------------------------------------------------------
    # Retrieve Secrets (Required for App Build)
    # -------------------------------------------------------------------------
    print_step "Retrieving build-time secrets..."
    
    # Firebase Config
    local firebase_config_secret="rates-${env}-firebase-web-config"
    local firebase_config_json=""
    
    if firebase_config_json=$(gcloud secrets versions access latest --secret="${firebase_config_secret}" --project="${project_id}" 2>/dev/null); then
        print_success "Retrieved Firebase config"
    else
        print_warning "Could not retrieve Firebase config: ${firebase_config_secret}"
        print_info "Build will proceed without Firebase config (UI may fail at runtime)"
    fi
    
    # Nonce Secret
    local nonce_secret_name="rates-${env}-nonce-secret"
    local nonce_secret=""
    
    if nonce_secret=$(gcloud secrets versions access latest --secret="${nonce_secret_name}" --project="${project_id}" 2>/dev/null); then
        print_success "Retrieved nonce secret"
    else
        print_warning "Could not retrieve nonce secret: ${nonce_secret_name}"
    fi
    
    # Main App URL (for VITE_ALLOWED_REDIRECTS)
    local project_number=""
    local main_app_url=""
    if project_number=$(gcloud projects describe "${project_id}" --format="value(projectNumber)" 2>/dev/null); then
        main_app_url="https://rates-${env}-app-${region}-${project_number}.${region}.run.app"
        print_success "Retrieved main app URL: ${main_app_url}"
    else
        print_warning "Could not retrieve project number for main app URL"
    fi

    # Auth App URL (for React App API calls)
    local cloud_run_api_service_name="rates-${env}-api-${region}"
    local auth_app_url=""
    if auth_app_url=$(gcloud run services describe "${cloud_run_api_service_name}" \
        --region="${region}" \
        --project="${project_id}" \
        --format="value(status.url)" 2>/dev/null); then
        print_success "Retrieved auth app URL: ${auth_app_url}"
    else
        print_warning "Could not retrieve auth app URL (API service might not be deployed yet)"
    fi

    # AI Service URL (for AI features)
    local cloud_run_ai_service_name="rates-${env}-ai-service-${region}"
    local ai_service_url=""
    if ai_service_url=$(gcloud run services describe "${cloud_run_ai_service_name}" \
        --region="${region}" \
        --project="${project_id}" \
        --format="value(status.url)" 2>/dev/null); then
        print_success "Retrieved AI service URL: ${ai_service_url}"
    else
        print_warning "Could not retrieve AI service URL (Service might not be deployed yet)"
    fi
    
    # -------------------------------------------------------------------------
    # Build Images
    # -------------------------------------------------------------------------
    
    # Build API image
    if ! build_api_image "${project_root}" "${image_name_api}" "${env}" \
        "${firebase_config_json}" "${nonce_secret}" "${main_app_url}" \
        "${LOG_FILE}" "0"; then
        return 1
    fi

    # Build AI Service image
    if ! build_ai_service_image "${project_root}" "${image_name_ai_service}" "${env}" \
        "${LOG_FILE}" "0"; then
        return 1
    fi

    # Build AI Processor image
    if ! build_ai_processor_image "${project_root}" "${image_name_ai_processor}" "${env}" \
        "${LOG_FILE}" "0"; then
        return 1
    fi
    
    # Build App Assets (Static files)
    if ! build_app_assets "${project_root}" "${env}" "${firebase_config_json}" \
        "${nonce_secret}" "${auth_app_url}" "${ai_service_url}" "${LOG_FILE}"; then  
        return 1
    fi
    
    # Build App image (Nginx wrapper)
    if ! build_app_image "${project_root}" "${image_name_app}" "${LOG_FILE}" "0"; then
        return 1
    fi
    
    # -------------------------------------------------------------------------
    # Push Images
    # -------------------------------------------------------------------------
    print_step "Pushing images to Artifact Registry..."
    
    local push_failures=0
    
    # Helper to push
    push_image() {
        local name="$1"
        local label="$2"
        if docker push "${name}" >> "${LOG_FILE}" 2>&1; then
            print_success "${label} image pushed successfully"
        else
            print_error "${label} image push failed"
            push_failures=$((push_failures + 1))
        fi
    }
    
    push_image "${image_name_api}" "API"
    push_image "${image_name_app}" "App"
    push_image "${image_name_ai_service}" "AI Service"
    push_image "${image_name_ai_processor}" "AI Processor"
    
    if [[ ${push_failures} -gt 0 ]]; then
        print_error "Some images failed to push. Check ${LOG_FILE}"
        return 1
    fi
    
    return 0
}

# ============================================================================
# Ensure Artifact Registry Repositories Exist
# ============================================================================

docker_ensure_repositories() {
    local project_id="$1"
    local region="$2"
    
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
            
            # Wait for repository to be available
            print_step "Waiting for repository to be available..."
            sleep 5
        else
            local create_error
            create_error=$(tail -20 "${LOG_FILE}" 2>/dev/null)
            
            # Check if it's an "already exists" error (race condition)
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
