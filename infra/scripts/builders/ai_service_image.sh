#!/usr/bin/env bash

# ============================================================================
# AI SERVICE IMAGE BUILD
# ============================================================================
# Purpose: Build AI Service Docker image
# Usage: Source this file after logging.sh
# Dependencies: logging.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Build AI Service Docker Image
# ============================================================================

build_ai_service_image() {
    local project_root="$1"
    local image_name="$2"
    local env="$3"
    local log_file="$4"
    local force_rebuild="${5:-0}"
    
    print_step "Building AI Service image..."
    
    local app_dir="${project_root}/apps/ai-service"
    
    # Check directory exists
    if [[ ! -d "${app_dir}" ]]; then
        print_info "AI Service directory not found at: ${app_dir}"
        print_info "Skipping AI Service build."
        return 0
    fi
    
    # Check Dockerfile exists
    if [[ ! -f "${app_dir}/Dockerfile" ]]; then
        print_error "Dockerfile not found at: ${app_dir}/Dockerfile"
        return 1
    fi
    
    # Base build args
    local docker_build_args="--build-arg NODE_ENV=$([ "${env}" == "prod" ] && echo "production" || echo "development")"
    
    # Build image
    if [[ "${force_rebuild}" == "1" ]]; then
        docker_build_args+=" --no-cache"
    fi
    
    # Build context is project root to allow access to workspace files
    if docker build --platform linux/amd64 ${docker_build_args} -t "${image_name}" \
        -f "${app_dir}/Dockerfile" \
        "${project_root}" >> "${log_file}" 2>&1; then
        print_success "AI Service image built successfully"
        return 0
    else
        print_error "AI Service image build failed"
        print_info "Check ${log_file} for details"
        return 1
    fi
}
