#!/usr/bin/env bash

# ============================================================================
# DOCKER - Docker Build and Push Operations
# ============================================================================
# Purpose: Docker authentication and container image operations
# Usage: Source this file after logging.sh and gcloud.sh
# Dependencies: logging.sh, gcloud.sh
# ============================================================================

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
    local api_dir="${project_root}/apps/api"
    local app_dir="${project_root}/apps/app"
    
    # Verify directories exist
    if [[ ! -d "${api_dir}" ]]; then
        print_error "API directory not found: ${api_dir}"
        return 1
    fi
    
    if [[ ! -d "${app_dir}" ]]; then
        print_error "App directory not found: ${app_dir}"
        return 1
    fi
    
    # Configure Docker authentication
    if ! docker_configure_auth "${region}" "${project_id}"; then
        return 1
    fi
    
    # Define image names
    local registry="${region}-docker.pkg.dev"
    local repository="${project_id}/rates-${env}-containers"
    local image_name_api="${registry}/${repository}/rates-api:${tag}"
    local image_name_app="${registry}/${repository}/rates-app:${tag}"
    
    print_info "Building images:"
    print_info "  API: ${image_name_api}"
    print_info "  App: ${image_name_app}"
    
    # Build API image
    print_step "Building API Docker image..."
    if docker build -t "${image_name_api}" "${api_dir}" >> "${LOG_FILE}" 2>&1; then
        print_success "API Docker image built successfully"
    else
        print_error "API Docker build failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    # Build App image
    print_step "Building App Docker image..."
    if docker build -t "${image_name_app}" "${app_dir}" >> "${LOG_FILE}" 2>&1; then
        print_success "App Docker image built successfully"
    else
        print_error "App Docker build failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    # Push API image
    print_step "Pushing API Docker image to Artifact Registry..."
    if docker push "${image_name_api}" >> "${LOG_FILE}" 2>&1; then
        print_success "API Docker image pushed successfully"
    else
        print_error "API Docker push failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    # Push App image
    print_step "Pushing App Docker image to Artifact Registry..."
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
