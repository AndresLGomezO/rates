#!/usr/bin/env bash

# ============================================================================
# AI PROCESSOR IMAGE BUILD
# ============================================================================
# Purpose: Build AI Processor Docker image
# Usage: Source this file after logging.sh
# Dependencies: logging.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Build AI Processor Docker Image
# ============================================================================

build_ai_processor_image() {
    local project_root="$1"
    local image_name="$2"
    local env="$3"
    local log_file="$4"
    local force_rebuild="${5:-0}"
    
    print_step "Building AI Processor image..."
    
    local app_dir="${project_root}/apps/ai-processor"
    
    # Check directory exists
    if [[ ! -d "${app_dir}" ]]; then
        print_info "AI Processor directory not found at: ${app_dir}"
        print_info "Skipping AI Processor build."
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
    
    # Build context is project root to allow access to workspace files if needed
    # But Dockerfile in apps/ai-processor expects . to be project root?
    # Let's check Dockerfile again. 
    # Dockerfile: COPY . /app
    # It seems to expect the root of the monorepo as context.
    
    if docker build --platform linux/amd64 ${docker_build_args} -t "${image_name}" \
        -f "${app_dir}/Dockerfile" \
        "${project_root}" >> "${log_file}" 2>&1; then
        print_success "AI Processor image built successfully"
        return 0
    else
        print_error "AI Processor image build failed"
        print_info "Check ${log_file} for details"
        return 1
    fi
}
