#!/usr/bin/env bash

# ============================================================================
# APP ASSETS BUILD
# ============================================================================
# Purpose: Build frontend static assets with pnpm
# Usage: Source this file after logging.sh
# Dependencies: logging.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Build App Static Assets
# ============================================================================

build_app_assets() {
    local project_root="$1"
    local env="$2"
    local firebase_config="$3"      # JSON string
    local nonce_secret="$4"
    local auth_app_url="$5"
    local ai_service_url="$6"
    local log_file="$7"
    
    print_step "Building app static files..."
    
    # Parse Firebase config
    local vite_firebase_api_key=""
    local vite_firebase_project_id=""
    local vite_firebase_auth_domain=""
    local vite_firebase_storage_bucket=""
    local vite_firebase_messaging_sender_id=""
    local vite_firebase_app_id=""
    local vite_firebase_measurement_id=""
    
    if [[ -n "${firebase_config}" ]]; then
        if command -v jq &> /dev/null; then
            vite_firebase_api_key=$(echo "${firebase_config}" | jq -r '.apiKey // ""' 2>/dev/null || echo "")
            vite_firebase_project_id=$(echo "${firebase_config}" | jq -r '.projectId // ""' 2>/dev/null || echo "")
            vite_firebase_auth_domain=$(echo "${firebase_config}" | jq -r '.authDomain // ""' 2>/dev/null || echo "")
            vite_firebase_storage_bucket=$(echo "${firebase_config}" | jq -r '.storageBucket // ""' 2>/dev/null || echo "")
            vite_firebase_messaging_sender_id=$(echo "${firebase_config}" | jq -r '.messagingSenderId // ""' 2>/dev/null || echo "")
            vite_firebase_app_id=$(echo "${firebase_config}" | jq -r '.appId // ""' 2>/dev/null || echo "")
            vite_firebase_measurement_id=$(echo "${firebase_config}" | jq -r '.measurementId // ""' 2>/dev/null || echo "")
        else
            vite_firebase_api_key=$(echo "${firebase_config}" | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_project_id=$(echo "${firebase_config}" | grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_auth_domain=$(echo "${firebase_config}" | grep -o '"authDomain"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"authDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_storage_bucket=$(echo "${firebase_config}" | grep -o '"storageBucket"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"storageBucket"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_messaging_sender_id=$(echo "${firebase_config}" | grep -o '"messagingSenderId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"messagingSenderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_app_id=$(echo "${firebase_config}" | grep -o '"appId"[[:space:]]*:[^"]*"' | sed 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_measurement_id=$(echo "${firebase_config}" | grep -o '"measurementId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"measurementId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
        fi
    fi
    
    # Validate Firebase config
    if [[ -z "${vite_firebase_api_key}" ]] || [[ -z "${vite_firebase_app_id}" ]]; then
        print_error "Cannot build app: Firebase config is missing"
        return 1
    fi

    # Validate AI Service URL
    if [[ -z "${ai_service_url}" ]]; then
        print_error "Cannot build app: AI Service URL is missing"
        return 1
    fi
    
    # Remove existing dist to force fresh build
    if [[ -d "${project_root}/apps/app/dist" ]]; then
        print_info "Removing existing dist directory..."
        rm -rf "${project_root}/apps/app/dist"
    fi
    
    # Build static files with environment variables
    print_info "Building with Firebase config..."
    if (cd "${project_root}" && env \
        VITE_FIREBASE_API_KEY="${vite_firebase_api_key}" \
        VITE_FIREBASE_PROJECT_ID="${vite_firebase_project_id}" \
        VITE_FIREBASE_AUTH_DOMAIN="${vite_firebase_auth_domain}" \
        VITE_FIREBASE_STORAGE_BUCKET="${vite_firebase_storage_bucket}" \
        VITE_FIREBASE_MESSAGING_SENDER_ID="${vite_firebase_messaging_sender_id}" \
        VITE_FIREBASE_APP_ID="${vite_firebase_app_id}" \
        VITE_FIREBASE_MEASUREMENT_ID="${vite_firebase_measurement_id}" \
        VITE_FIREBASE_MODE="live" \
        VITE_USE_FIREBASE_EMULATOR="false" \
        VITE_NONCE_SECRET="${nonce_secret}" \
        VITE_AUTH_APP_URL="${auth_app_url}" \
        VITE_AI_SERVICE_URL="${ai_service_url}" \
        NODE_ENV="production" \
        VITE_ENVIRONMENT="${env}" \
        pnpm --filter=app build >> "${log_file}" 2>&1); then
        print_success "App static files built successfully"
    else
        print_error "App build failed"
        print_info "Check ${log_file} for details"
        return 1
    fi
    
    # Verify dist exists
    if [[ ! -d "${project_root}/apps/app/dist" ]]; then
        print_error "apps/app/dist directory does not exist"
        return 1
    fi
    
    return 0
}
