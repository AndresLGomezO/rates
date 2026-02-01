#!/usr/bin/env bash

# ============================================================================
# API IMAGE BUILD
# ============================================================================
# Purpose: Build API Docker image with secrets and configuration
# Usage: Source this file after logging.sh
# Dependencies: logging.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Build API Docker Image
# ============================================================================

build_api_image() {
    local project_root="$1"
    local image_name="$2"
    local env="$3"
    local firebase_config="$4"      # JSON string
    local nonce_secret="$5"
    local allowed_redirects="$6"
    local log_file="$7"
    local force_rebuild="${8:-0}"
    
    print_step "Building API image (auth-app)..."
    
    # Check Dockerfile exists
    if [[ ! -f "${project_root}/Dockerfile" ]]; then
        print_error "Dockerfile not found at: ${project_root}/Dockerfile"
        return 1
    fi
    
    # Base build args
    local docker_build_args="--build-arg NODE_ENV=$([ "${env}" == "prod" ] && echo "production" || echo "development")"
    
    # Parse Firebase config and add as build args
    if [[ -n "${firebase_config}" ]]; then
        local firebase_api_key=""
        local firebase_project_id=""
        local firebase_auth_domain=""
        local firebase_storage_bucket=""
        local firebase_messaging_sender_id=""
        local firebase_app_id=""
        local firebase_measurement_id=""
        
        if command -v jq &> /dev/null; then
            firebase_api_key=$(echo "${firebase_config}" | jq -r '.apiKey // ""' 2>/dev/null || echo "")
            firebase_project_id=$(echo "${firebase_config}" | jq -r '.projectId // ""' 2>/dev/null || echo "")
            firebase_auth_domain=$(echo "${firebase_config}" | jq -r '.authDomain // ""' 2>/dev/null || echo "")
            firebase_storage_bucket=$(echo "${firebase_config}" | jq -r '.storageBucket // ""' 2>/dev/null || echo "")
            firebase_messaging_sender_id=$(echo "${firebase_config}" | jq -r '.messagingSenderId // ""' 2>/dev/null || echo "")
            firebase_app_id=$(echo "${firebase_config}" | jq -r '.appId // ""' 2>/dev/null || echo "")
            firebase_measurement_id=$(echo "${firebase_config}" | jq -r '.measurementId // ""' 2>/dev/null || echo "")
        else
            firebase_api_key=$(echo "${firebase_config}" | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_project_id=$(echo "${firebase_config}" | grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_auth_domain=$(echo "${firebase_config}" | grep -o '"authDomain"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"authDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_storage_bucket=$(echo "${firebase_config}" | grep -o '"storageBucket"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"storageBucket"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_messaging_sender_id=$(echo "${firebase_config}" | grep -o '"messagingSenderId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"messagingSenderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_app_id=$(echo "${firebase_config}" | grep -o '"appId"[[:space:]]*:[^"]*"' | sed 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_measurement_id=$(echo "${firebase_config}" | grep -o '"measurementId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"measurementId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
        fi
        
        # Add Firebase config as build args if valid
        if [[ -n "${firebase_api_key}" ]] && [[ -n "${firebase_app_id}" ]]; then
            docker_build_args+=" --build-arg VITE_FIREBASE_API_KEY=${firebase_api_key}"
            docker_build_args+=" --build-arg VITE_FIREBASE_PROJECT_ID=${firebase_project_id}"
            docker_build_args+=" --build-arg VITE_FIREBASE_AUTH_DOMAIN=${firebase_auth_domain}"
            docker_build_args+=" --build-arg VITE_FIREBASE_STORAGE_BUCKET=${firebase_storage_bucket}"
            docker_build_args+=" --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=${firebase_messaging_sender_id}"
            docker_build_args+=" --build-arg VITE_FIREBASE_APP_ID=${firebase_app_id}"
            if [[ -n "${firebase_measurement_id}" ]]; then
                docker_build_args+=" --build-arg VITE_FIREBASE_MEASUREMENT_ID=${firebase_measurement_id}"
            fi
            docker_build_args+=" --build-arg VITE_FIREBASE_MODE=live"
            docker_build_args+=" --build-arg VITE_USE_FIREBASE_EMULATOR=false"
        else
            print_warning "Firebase config missing required values, building without it"
        fi
    fi
    
    # Add nonce secret
    if [[ -n "${nonce_secret}" ]]; then
        docker_build_args+=" --build-arg VITE_NONCE_SECRET=${nonce_secret}"
    fi
    
    # Add allowed redirects
    if [[ -n "${allowed_redirects}" ]]; then
        docker_build_args+=" --build-arg VITE_ALLOWED_REDIRECTS=${allowed_redirects}"
    fi
    
    # Build image
    if [[ "${force_rebuild}" == "1" ]]; then
        docker_build_args+=" --no-cache"
    fi
    
    if docker build --platform linux/amd64 ${docker_build_args} -t "${image_name}" \
        -f "${project_root}/Dockerfile" \
        "${project_root}" >> "${log_file}" 2>&1; then
        print_success "API image built successfully"
        return 0
    else
        print_error "API image build failed"
        print_info "Check ${log_file} for details"
        return 1
    fi
}
