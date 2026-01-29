#!/usr/bin/env bash

# ============================================================================
# FIREBASE - Firebase Service Operations
# ============================================================================
# Purpose: Firebase API operations (initialization, Auth, Firestore, web apps)
# Usage: Source this file after logging.sh, prompts.sh, and gcloud.sh
# Dependencies: logging.sh, prompts.sh, gcloud.sh
# ============================================================================

set -euo pipefail

# ============================================================================
# Link Firebase Project to CLI
# ============================================================================

firebase_link_to_cli() {
    local project_id="$1"
    
    if [[ -z "${project_id}" ]]; then
        return 1
    fi
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        return 1
    fi
    
    # Check if already linked
    local firebase_projects
    firebase_projects=$(firebase projects:list --json 2>/dev/null || echo "[]")
    if echo "${firebase_projects}" | grep -q "\"${project_id}\""; then
        # Already linked, set as active project
        firebase use "${project_id}" --non-interactive >> "${LOG_FILE}" 2>&1
        return 0
    fi
    
    # Try to link the project
    if firebase use "${project_id}" --non-interactive >> "${LOG_FILE}" 2>&1; then
        return 0
    fi
    
    return 1
}

# ============================================================================
# Initialize Firebase in GCP Project
# ============================================================================

firebase_initialize() {
    local project_id="$1"
    
    print_section "Initializing Firebase in GCP Project"
    
    # Check if Firebase is already initialized
    print_step "Checking if Firebase is already initialized..."
    
    if gcloud firebase projects list --filter="projectId:${project_id}" --format="value(projectId)" 2>/dev/null | grep -q "^${project_id}$"; then
        print_info "Firebase is already initialized for project ${project_id}"
        return 0
    fi
    
    # Enable Firebase Management API
    print_step "Enabling Firebase Management API..."
    if gcloud services enable firebase.googleapis.com --project="${project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firebase Management API enabled"
        print_step "Waiting for API to propagate..."
        sleep 10
    else
        print_warning "Firebase Management API may already be enabled"
    fi
    
    # Initialize Firebase via REST API
    print_step "Attempting to initialize Firebase via REST API..."
    
    local access_token
    access_token=$(gcloud auth print-access-token 2>/dev/null || echo "")
    
    if [[ -z "${access_token}" ]]; then
        print_error "Could not get access token for REST API call"
        print_info "Firebase initialization will need to be done manually"
        return 1
    fi
    
    local api_url="https://firebase.googleapis.com/v1beta1/projects/${project_id}:addFirebase"
    
    print_step "Calling Firebase Management API..."
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "${api_url}" \
        -H "Authorization: Bearer ${access_token}" \
        -H "Content-Type: application/json" \
        -d '{}' 2>/dev/null || echo "")
    
    local http_code
    http_code=$(echo "${response}" | tail -1)
    local response_body
    response_body=$(echo "${response}" | sed '$d')
    
    if [[ "${http_code}" == "200" ]] || [[ "${http_code}" == "201" ]]; then
        print_success "Firebase initialized successfully in GCP project"
        print_info "Project ${project_id} is now linked to Firebase"
        
        # Link to CLI if available
        if command -v firebase &> /dev/null; then
            print_step "Linking project to Firebase CLI..."
            if firebase_link_to_cli "${project_id}"; then
                print_success "Project ${project_id} linked to Firebase CLI"
            fi
        fi
        return 0
        
    elif [[ "${http_code}" == "409" ]]; then
        print_info "Firebase is already initialized for this project"
        
        if command -v firebase &> /dev/null; then
            firebase_link_to_cli "${project_id}" || true
        fi
        return 0
        
    elif [[ "${http_code}" == "403" ]]; then
        print_warning "Permission denied. You may need additional permissions to initialize Firebase"
        print_info "Required role: Firebase Admin or Owner"
        print_info "You can initialize Firebase manually at: https://console.firebase.google.com/"
        
        # Try to link if Firebase is already initialized manually
        if command -v firebase &> /dev/null; then
            if firebase_link_to_cli "${project_id}"; then
                print_info "Firebase appears to be initialized - continuing..."
                return 0
            fi
        fi
        return 1
        
    else
        print_warning "Firebase initialization failed (HTTP ${http_code})"
        print_info "Response: ${response_body}"
        print_info "You may need to initialize Firebase manually at: https://console.firebase.google.com/"
        return 1
    fi
}

# ============================================================================
# Create Firebase Web App
# ============================================================================

firebase_create_web_app() {
    local project_id="$1"
    
    print_section "Creating Firebase Web App"
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found"
        print_info "Install with: npm install -g firebase-tools"
        return 1
    fi
    
    # Ensure project is linked
    if ! firebase_link_to_cli "${project_id}"; then
        print_warning "Could not link project to Firebase CLI"
        return 1
    fi
    
    # Check if web app already exists
    print_step "Checking for existing web apps..."
    local web_apps_json
    web_apps_json=$(firebase apps:list --project="${project_id}" --json 2>/dev/null || echo "")
    
    if [[ -n "${web_apps_json}" ]] && echo "${web_apps_json}" | grep -q '"platform":"WEB"'; then
        print_info "Web app already exists"
        return 0
    fi
    
    # Create via REST API
    print_step "Creating Firebase web app via REST API..."
    
    local access_token
    access_token=$(gcloud auth print-access-token 2>/dev/null || echo "")
    
    if [[ -z "${access_token}" ]]; then
        print_error "Could not get access token"
        return 1
    fi
    
    local api_url="https://firebase.googleapis.com/v1beta1/projects/${project_id}/webApps"
    local app_name="${project_id}-web"
    local request_body="{ \"displayName\": \"${app_name}\" }"
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST "${api_url}" \
        -H "Authorization: Bearer ${access_token}" \
        -H "Content-Type: application/json" \
        -d "${request_body}" 2>/dev/null || echo "")
    
    local http_code
    http_code=$(echo "${response}" | tail -1)
    
    if [[ "${http_code}" == "200" ]] || [[ "${http_code}" == "201" ]]; then
        print_success "Firebase web app created successfully"
        return 0
    elif [[ "${http_code}" == "409" ]]; then
        print_info "Web app already exists"
        return 0
    else
        print_warning "Failed to create web app via REST API (HTTP ${http_code})"
        return 1
    fi
}

# ============================================================================
# Enable Firestore Database
# ============================================================================

firebase_enable_firestore() {
    local project_id="$1"
    local region="${2:-us-central1}"
    
    print_section "Enabling Firestore Database"
    
    # Check if already enabled
    print_step "Checking if Firestore is already enabled..."
    if gcloud firestore databases describe --project="${project_id}" --database="(default)" >> "${LOG_FILE}" 2>&1; then
        print_info "Firestore database already enabled"
        return 0
    fi
    
    # Enable Firestore API
    if ! gcloud services list --enabled --project="${project_id}" --filter="name:firestore.googleapis.com" --format="value(name)" | grep -q "firestore.googleapis.com"; then
        print_step "Enabling Firestore API..."
        if gcloud services enable firestore.googleapis.com --project="${project_id}" >> "${LOG_FILE}" 2>&1; then
            print_success "Firestore API enabled"
            sleep 5
        fi
    fi
    
    # Create Firestore database
    print_step "Creating Firestore database..."
    if gcloud firestore databases create \
        --location="${region}" \
        --type=firestore-native \
        --project="${project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firestore database created"
        return 0
    else
        # Check if already exists
        if gcloud firestore databases describe --project="${project_id}" --database="(default)" >> "${LOG_FILE}" 2>&1; then
            print_info "Firestore database already exists"
            return 0
        fi
        print_warning "Failed to create Firestore database"
        return 1
    fi
}

# ============================================================================
# Enable Firebase Auth
# ============================================================================

firebase_enable_auth() {
    local project_id="$1"
    
    print_section "Enabling Firebase Authentication"
    
    # Check if already enabled
    print_step "Checking if Firebase Auth is enabled..."
    if gcloud services list --enabled --project="${project_id}" --filter="name:identitytoolkit.googleapis.com" --format="value(name)" | grep -q "identitytoolkit.googleapis.com"; then
        print_info "Firebase Auth API already enabled"
        return 0
    fi
    
    # Enable Identity Toolkit API
    print_step "Enabling Firebase Auth API..."
    if gcloud services enable identitytoolkit.googleapis.com --project="${project_id}" >> "${LOG_FILE}" 2>&1; then
        print_success "Firebase Auth API enabled"
        return 0
    else
        print_warning "Failed to enable Firebase Auth API"
        return 1
    fi
}

# ============================================================================
# Deploy Firestore Rules
# ============================================================================

firebase_deploy_rules() {
    local project_id="$1"
    
    print_section "Deploying Firestore Rules"
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI not found"
        print_info "Install with: npm install -g firebase-tools"
        return 1
    fi
    
    # Determine firebase directory
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    local project_root="${script_dir}/.."
    local firebase_dir="${project_root}/firebase"
    
    # Check for required files
    if [[ ! -f "${firebase_dir}/firebase.json" ]]; then
        print_warning "firebase.json not found at ${firebase_dir}"
        return 1
    fi
    
    if [[ ! -f "${firebase_dir}/firestore.rules" ]]; then
        print_warning "firestore.rules not found at ${firebase_dir}"
        return 1
    fi
    
    # Ensure project is linked
    if ! firebase_link_to_cli "${project_id}"; then
        print_warning "Could not link project to Firebase CLI"
        return 1
    fi
    
    # Deploy rules
    print_step "Deploying Firestore rules..."
    if cd "${firebase_dir}" && firebase deploy --only firestore:rules --project="${project_id}" --non-interactive >> "${LOG_FILE}" 2>&1; then
        print_success "Firestore rules deployed successfully"
        return 0
    else
        print_warning "Failed to deploy Firestore rules"
        return 1
    fi
}

# ============================================================================
# Setup All Firebase Services
# ============================================================================

firebase_setup_all() {
    local project_id="$1"
    local region="${2:-us-central1}"
    
    print_section "Setting up Firebase Services"
    
    # Initialize Firebase project
    if ! firebase_initialize "${project_id}"; then
        print_warning "Firebase project initialization failed or was skipped"
        return 1
    fi
    
    # Wait for propagation
    print_step "Waiting for Firebase initialization to propagate..."
    sleep 5
    
    # Enable Auth
    firebase_enable_auth "${project_id}" || print_warning "Auth setup had issues"
    
    # Enable Firestore
    firebase_enable_firestore "${project_id}" "${region}" || print_warning "Firestore setup had issues"
    
    # Wait for services
    print_step "Waiting for Firebase services to be ready..."
    sleep 5
    
    # Create web app
    firebase_create_web_app "${project_id}" || print_warning "Web app creation had issues"
    
    # Deploy rules
    firebase_deploy_rules "${project_id}" || print_warning "Rules deployment had issues"
    
    print_success "Firebase services setup complete!"
    return 0
}
