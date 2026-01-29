#!/bin/bash
# ============================================================================
# Manual Deployment Script - Dev Environment
# ============================================================================
# Purpose: Manually deploy apps to Cloud Run when Cloud Build trigger is not working
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="dev"
REGION="us-central1"
SERVICE_API="rates-dev-api-us-central1"
SERVICE_APP="rates-dev-app-us-central1"
REPO_NAME="rates-dev-containers"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# Check Prerequisites
# ============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed"
        exit 1
    fi
    print_success "gcloud CLI found"
    
    # Check docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found"
    
    # Check if docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    print_success "Docker daemon is running"
    
    # Get project ID
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -z "$PROJECT_ID" ]; then
        print_error "No default GCP project set"
        echo ""
        echo "Set it with: gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
    print_success "GCP Project: ${PROJECT_ID}"
    
    # Verify authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_error "No active gcloud authentication"
        echo ""
        echo "Authenticate with: gcloud auth login"
        exit 1
    fi
    print_success "gcloud authenticated"
    
    # Set artifact registry URL
    ARTIFACT_REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
    
    echo ""
    print_info "Configuration:"
    echo "  Project ID: ${PROJECT_ID}"
    echo "  Region: ${REGION}"
    echo "  Environment: ${ENVIRONMENT}"
    echo "  Artifact Registry: ${ARTIFACT_REGISTRY}"
    echo "  Cloud Run Services:"
    echo "    - API: ${SERVICE_API}"
    echo "    - App: ${SERVICE_APP}"
    echo ""
}

# ============================================================================
# Get Firebase Configuration from GCP/Firebase
# ============================================================================

get_cloud_run_url() {
    # Get the Cloud Run service URL for a given service name
    # Returns the actual service URL (not masked/custom domain)
    # Format: https://SERVICE-NAME-PROJECT_NUMBER.REGION.run.app
    local service_name="$1"
    local url
    local project_number
    
    print_info "Getting Cloud Run URL for ${service_name}..." >&2
    
    # Get project number first (needed to construct actual URL)
    project_number=$(gcloud projects describe "${PROJECT_ID}" \
        --format="value(projectNumber)" 2>/dev/null || echo "")
    
    if [ -z "${project_number}" ]; then
        print_warning "Could not get project number for ${PROJECT_ID}" >&2
        # Try to get URL from gcloud as fallback
        url=$(gcloud run services describe "${service_name}" \
            --region="${REGION}" \
            --project="${PROJECT_ID}" \
            --format="value(status.url)" 2>/dev/null || echo "")
    else
        # Construct the actual service URL using project number
        # This ensures we get the real URL, not a custom/masked domain
        url="https://${service_name}-${project_number}.${REGION}.run.app"
        print_info "Constructed service URL: ${url}" >&2
        
        # Verify the service exists by checking if we can describe it
        if ! gcloud run services describe "${service_name}" \
            --region="${REGION}" \
            --project="${PROJECT_ID}" \
            --format="value(metadata.name)" &>/dev/null; then
            print_warning "Service ${service_name} may not exist yet" >&2
        fi
    fi
    
    if [ -z "${url}" ]; then
        print_error "Could not determine Cloud Run URL for ${service_name}" >&2
        print_info "Please ensure the service is deployed or provide the URL manually" >&2
    fi
    
    echo "${url}"
}

get_nonce_secret() {
    # Get the nonce secret from Secret Manager
    local secret_name="rates-${ENVIRONMENT}-nonce-secret"
    local secret_value
    
    print_info "Getting nonce secret from Secret Manager..." >&2
    
    # Try to get the secret value (suppress errors, return empty string if fails)
    # Trim whitespace and newlines from the secret
    secret_value=$(gcloud secrets versions access latest \
        --secret="${secret_name}" \
        --project="${PROJECT_ID}" 2>/dev/null | tr -d '\n\r\t ' || echo "")
    
    if [ -z "${secret_value}" ]; then
        print_warning "Could not retrieve nonce secret from Secret Manager" >&2
        print_info "Secret name: ${secret_name}" >&2
        print_info "You may need to create it with:" >&2
        print_info "  echo -n 'your-secret-value' | gcloud secrets versions add ${secret_name} --data-file=-" >&2
        echo ""
        return 0
    fi
    
    # Validate secret length (must be at least 16 characters)
    if [ ${#secret_value} -lt 16 ]; then
        print_warning "Nonce secret is too short (${#secret_value} chars, minimum 16 required)" >&2
        print_info "Secret name: ${secret_name}" >&2
        echo ""
        return 0
    fi
    
    print_info "Nonce secret retrieved successfully (length: ${#secret_value} chars)" >&2
    echo "${secret_value}"
}

get_firebase_config() {
    # Get Firebase web app configuration from GCP/Firebase
    # Both apps (app and auth-app client) use the same Firebase project and App ID
    # This ensures they share the same Firebase Authentication, Firestore, and Storage
    print_step "Fetching Firebase configuration (shared by both apps)..." >&2
    
    # Get project ID (already set in check_prerequisites)
    FIREBASE_PROJECT_ID="${PROJECT_ID}"
    
    # Try to get Firebase web app config using firebase CLI
    if command -v firebase &> /dev/null; then
        print_info "Using Firebase CLI to get web app config..." >&2
        
        # Check if Firebase CLI is authenticated
        if ! firebase projects:list &>/dev/null; then
            print_warning "Firebase CLI not authenticated. Run: firebase login" >&2
        else
            # Try to get web app config
            FIREBASE_CONFIG_JSON=$(firebase apps:list WEB --project="${FIREBASE_PROJECT_ID}" --json 2>&1)
            FIREBASE_ERROR=$(echo "${FIREBASE_CONFIG_JSON}" | grep -i "error\|not found\|permission" || echo "")
            
            if [ -n "${FIREBASE_ERROR}" ]; then
                print_warning "Firebase CLI error: ${FIREBASE_ERROR}" >&2
                print_info "This might mean:" >&2
                print_info "  - Project ${FIREBASE_PROJECT_ID} is not linked to Firebase" >&2
                print_info "  - Firebase CLI needs authentication: firebase login" >&2
                print_info "  - Project doesn't have a web app registered" >&2
            elif [ -n "${FIREBASE_CONFIG_JSON}" ] && [ "${FIREBASE_CONFIG_JSON}" != "[]" ] && [ "${FIREBASE_CONFIG_JSON}" != "null" ]; then
                # Get the first web app ID
                WEB_APP_ID=$(echo "${FIREBASE_CONFIG_JSON}" | grep -o '"appId":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
                
                if [ -n "${WEB_APP_ID}" ]; then
                    print_info "Found web app: ${WEB_APP_ID}" >&2
                    # Get SDK config
                    SDK_CONFIG=$(firebase apps:sdkconfig WEB "${WEB_APP_ID}" --project="${FIREBASE_PROJECT_ID}" 2>&1)
                    SDK_ERROR=$(echo "${SDK_CONFIG}" | grep -i "error\|not found" || echo "")
                    
                    if [ -n "${SDK_ERROR}" ]; then
                        print_warning "Could not get SDK config: ${SDK_ERROR}" >&2
                    fi
                
                    if [ -n "${SDK_CONFIG}" ] && [ -z "${SDK_ERROR}" ]; then
                        # Parse the config - Firebase CLI returns JavaScript object format
                        # Try to extract values using multiple patterns (quotes, single quotes, or JSON)
                        export VITE_FIREBASE_API_KEY=$(echo "${SDK_CONFIG}" | grep -oE '(apiKey|"apiKey"):\s*["'"'"']([^"'"'"']+)["'"'"']' | head -1 | sed -E 's/.*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' || echo "")
                        export VITE_FIREBASE_AUTH_DOMAIN=$(echo "${SDK_CONFIG}" | grep -oE '(authDomain|"authDomain"):\s*["'"'"']([^"'"'"']+)["'"'"']' | head -1 | sed -E 's/.*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' || echo "")
                        export VITE_FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}"
                        export VITE_FIREBASE_STORAGE_BUCKET=$(echo "${SDK_CONFIG}" | grep -oE '(storageBucket|"storageBucket"):\s*["'"'"']([^"'"'"']+)["'"'"']' | head -1 | sed -E 's/.*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' || echo "")
                        export VITE_FIREBASE_MESSAGING_SENDER_ID=$(echo "${SDK_CONFIG}" | grep -oE '(messagingSenderId|"messagingSenderId"):\s*["'"'"']([^"'"'"']+)["'"'"']' | head -1 | sed -E 's/.*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' || echo "")
                        export VITE_FIREBASE_APP_ID=$(echo "${SDK_CONFIG}" | grep -oE '(appId|"appId"):\s*["'"'"']([^"'"'"']+)["'"'"']' | head -1 | sed -E 's/.*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' || echo "")
                        export VITE_FIREBASE_MEASUREMENT_ID=$(echo "${SDK_CONFIG}" | grep -oE '(measurementId|"measurementId"):\s*["'"'"']([^"'"'"']+)["'"'"']' | head -1 | sed -E 's/.*["'"'"']([^"'"'"']+)["'"'"'].*/\1/' || echo "")
                        
                        # If parsing failed, try JSON format
                        if [ -z "${VITE_FIREBASE_API_KEY}" ]; then
                            export VITE_FIREBASE_API_KEY=$(echo "${SDK_CONFIG}" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4 || echo "")
                            export VITE_FIREBASE_AUTH_DOMAIN=$(echo "${SDK_CONFIG}" | grep -o '"authDomain":"[^"]*"' | cut -d'"' -f4 || echo "")
                            export VITE_FIREBASE_STORAGE_BUCKET=$(echo "${SDK_CONFIG}" | grep -o '"storageBucket":"[^"]*"' | cut -d'"' -f4 || echo "")
                            export VITE_FIREBASE_MESSAGING_SENDER_ID=$(echo "${SDK_CONFIG}" | grep -o '"messagingSenderId":"[^"]*"' | cut -d'"' -f4 || echo "")
                            export VITE_FIREBASE_APP_ID=$(echo "${SDK_CONFIG}" | grep -o '"appId":"[^"]*"' | cut -d'"' -f4 || echo "")
                            export VITE_FIREBASE_MEASUREMENT_ID=$(echo "${SDK_CONFIG}" | grep -o '"measurementId":"[^"]*"' | cut -d'"' -f4 || echo "")
                        fi
                        
                        if [ -n "${VITE_FIREBASE_API_KEY}" ]; then
                            print_success "Firebase config retrieved from Firebase CLI" >&2
                            return 0
                        else
                            print_warning "Firebase CLI returned config but couldn't parse API key" >&2
                            print_info "SDK Config preview: $(echo "${SDK_CONFIG}" | head -c 200)..." >&2
                        fi
                    fi
                else
                    print_warning "No web app found in Firebase project ${FIREBASE_PROJECT_ID}" >&2
                    print_info "You may need to register a web app in Firebase Console first" >&2
                fi
            else
                print_warning "Firebase CLI returned empty or null result" >&2
            fi
        fi
    else
        print_info "Firebase CLI not found. Install with: npm install -g firebase-tools" >&2
    fi
    
    # Alternative: Try to get Firebase project info using gcloud
    if command -v gcloud &> /dev/null; then
        print_info "Trying to get Firebase project info from gcloud..." >&2
        # Check if Firebase is enabled
        if gcloud services list --enabled --filter="name:firebase.googleapis.com" --project="${FIREBASE_PROJECT_ID}" --format="value(name)" 2>/dev/null | grep -q firebase; then
            print_info "Firebase API is enabled for project ${FIREBASE_PROJECT_ID}" >&2
        else
            print_warning "Firebase API may not be enabled for project ${FIREBASE_PROJECT_ID}" >&2
            print_info "Enable it with: gcloud services enable firebase.googleapis.com --project=${FIREBASE_PROJECT_ID}" >&2
        fi
    fi
    
    # Fallback: Get project ID and construct what we can
    print_info "Getting project ID from Terraform/gcloud..." >&2
    
    # Try Terraform first
    TERRAFORM_DIR="infra/environments/application/dev"
    if [ -d "${TERRAFORM_DIR}" ] && command -v terraform &> /dev/null; then
        cd "${TERRAFORM_DIR}" 2>/dev/null
        if terraform output -json project_id &>/dev/null; then
            TERRAFORM_PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || echo "")
            if [ -n "${TERRAFORM_PROJECT_ID}" ]; then
                FIREBASE_PROJECT_ID="${TERRAFORM_PROJECT_ID}"
                print_info "Got project ID from Terraform: ${TERRAFORM_PROJECT_ID}" >&2
            fi
        fi
        cd - > /dev/null 2>&1
    fi
    
    # Construct values from project ID
    if [ -n "${FIREBASE_PROJECT_ID}" ]; then
        export VITE_FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}"
        export VITE_FIREBASE_AUTH_DOMAIN="${FIREBASE_PROJECT_ID}.firebaseapp.com"
        export VITE_FIREBASE_STORAGE_BUCKET="${FIREBASE_PROJECT_ID}.appspot.com"
        print_info "Constructed config from project ID: ${FIREBASE_PROJECT_ID}" >&2
    fi
    
    # Check if we have minimum required values
    if [ -z "${VITE_FIREBASE_API_KEY:-}" ] || [ -z "${VITE_FIREBASE_APP_ID:-}" ]; then
        print_warning "Could not retrieve full Firebase config automatically" >&2
        print_info "Missing: API Key and/or App ID" >&2
        print_info "" >&2
        print_info "To get these values:" >&2
        print_info "  1. Go to: https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/settings/general" >&2
        print_info "  2. Scroll to 'Your apps' → Web app (</>)" >&2
        print_info "  3. Copy the config values" >&2
        print_info "" >&2
        print_info "Or set environment variables:" >&2
        print_info "  export VITE_FIREBASE_API_KEY=your-api-key" >&2
        print_info "  export VITE_FIREBASE_APP_ID=your-app-id" >&2
        print_info "  export VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id" >&2
        print_info "" >&2
        
        # Check if they're already set in environment
        if [ -n "${VITE_FIREBASE_API_KEY:-}" ] && [ -n "${VITE_FIREBASE_APP_ID:-}" ]; then
            print_success "Using Firebase config from environment variables" >&2
        else
            # Interactive input - don't redirect to stderr so user can actually type
            echo "" >&2
            print_info "Would you like to enter Firebase config values now? [y/N]" >&2
            read -p "Enter choice: " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo ""
                print_info "Please enter Firebase configuration values:" >&2
                echo ""
                
                read -p "Firebase API Key: " VITE_FIREBASE_API_KEY
                export VITE_FIREBASE_API_KEY
                
                read -p "Firebase App ID: " VITE_FIREBASE_APP_ID
                export VITE_FIREBASE_APP_ID
                
                read -p "Firebase Messaging Sender ID (optional): " VITE_FIREBASE_MESSAGING_SENDER_ID
                export VITE_FIREBASE_MESSAGING_SENDER_ID
                
                read -p "Firebase Measurement ID (optional): " VITE_FIREBASE_MEASUREMENT_ID
                export VITE_FIREBASE_MEASUREMENT_ID
                
                if [ -z "${VITE_FIREBASE_API_KEY}" ] || [ -z "${VITE_FIREBASE_APP_ID}" ]; then
                    print_error "API Key and App ID are required" >&2
                    exit 1
                fi
                
                print_success "Firebase config entered manually" >&2
            else
                print_warning "Continuing with partial config (project ID only)" >&2
                print_warning "The app will not work without full Firebase configuration" >&2
            fi
        fi
    fi
    
    # Set environment mode for production build
    export VITE_ENVIRONMENT="${ENVIRONMENT}"
    export NODE_ENV=development
    export VITE_FIREBASE_MODE="live"
    export VITE_USE_FIREBASE_EMULATOR="false"
}

# ============================================================================
# Build Docker Image - Auth App API
# ============================================================================

build_image_api() {
    IMAGE_TAG="${1:-latest}"
    IMAGE_NAME="${ARTIFACT_REGISTRY}/api:${IMAGE_TAG}"
    
    # Print to stderr so it doesn't interfere with capturing the image name
    print_header "Building Docker Image" >&2
    
    # Check for Dockerfile location
    DOCKERFILE="Dockerfile"
    if [ -f "apps/auth-app/Dockerfile" ]; then
        DOCKERFILE="apps/auth-app/Dockerfile"
        print_info "Using Dockerfile at: ${DOCKERFILE}" >&2
    elif [ -f "Dockerfile" ]; then
        DOCKERFILE="Dockerfile"
        print_info "Using Dockerfile at: ${DOCKERFILE}" >&2
    else
        print_error "Dockerfile not found in root or apps/auth-app/" >&2
        exit 1
    fi
    
    print_step "Building auth-app API image: ${IMAGE_NAME}" >&2
    print_info "This may take a few minutes..." >&2
    
    # Get Firebase config and Cloud Run URLs for the build
    get_firebase_config >&2
    get_cloud_run_url "${SERVICE_API}" > /dev/null 2>&1 || true
    AUTH_APP_URL=$(get_cloud_run_url "${SERVICE_API}")
    MAIN_APP_URL=$(get_cloud_run_url "${SERVICE_APP}")
    
    # Build allowed redirects
    ALLOWED_REDIRECTS=""
    if [ -n "${MAIN_APP_URL}" ]; then
        MAIN_APP_ORIGIN=$(echo "${MAIN_APP_URL}" | sed -E 's|^(https?://[^/]+).*|\1|')
        ALLOWED_REDIRECTS="${MAIN_APP_ORIGIN}"
    fi
    if [ -n "${AUTH_APP_URL}" ]; then
        AUTH_APP_ORIGIN=$(echo "${AUTH_APP_URL}" | sed -E 's|^(https?://[^/]+).*|\1|')
        if [ -n "${ALLOWED_REDIRECTS}" ]; then
            ALLOWED_REDIRECTS="${ALLOWED_REDIRECTS},${AUTH_APP_ORIGIN}"
        else
            ALLOWED_REDIRECTS="${AUTH_APP_ORIGIN}"
        fi
    fi
    
    # Get default return URL
    DEFAULT_RETURN_URL=""
    if [ -n "${MAIN_APP_URL}" ]; then
        DEFAULT_RETURN_URL=$(echo "${MAIN_APP_URL}" | sed -E 's|^(https?://[^/]+).*|\1|')
    fi
    
    # Get nonce secret
    NONCE_SECRET=$(get_nonce_secret)
    
    print_info "Building with:" >&2
    print_info "  NODE_ENV=production" >&2
    print_info "  VITE_FIREBASE_MODE=live" >&2
    print_info "  VITE_USE_FIREBASE_EMULATOR=false" >&2
    print_info "  VITE_ALLOWED_REDIRECTS=${ALLOWED_REDIRECTS:-NOT SET}" >&2
    print_info "  VITE_DEFAULT_RETURN_URL=${DEFAULT_RETURN_URL:-NOT SET}" >&2
    
    if docker build \
        --platform linux/amd64 \
        -t "${IMAGE_NAME}" \
        -f "${DOCKERFILE}" \
        --build-arg NODE_ENV=production \
        --build-arg VITE_FIREBASE_MODE=live \
        --build-arg VITE_USE_FIREBASE_EMULATOR=false \
        --build-arg VITE_ALLOWED_REDIRECTS="${ALLOWED_REDIRECTS}" \
        --build-arg VITE_DEFAULT_RETURN_URL="${DEFAULT_RETURN_URL}" \
        --build-arg VITE_NONCE_SECRET="${NONCE_SECRET}" \
        --build-arg VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-}" \
        --build-arg VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN:-}" \
        --build-arg VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID:-}" \
        --build-arg VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET:-}" \
        --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID:-}" \
        --build-arg VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID:-}" \
        --build-arg VITE_FIREBASE_MEASUREMENT_ID="${VITE_FIREBASE_MEASUREMENT_ID:-}" \
        .; then
        print_success "Auth-app API image built successfully" >&2
        # Only echo the image name to stdout (for capture)
        echo "${IMAGE_NAME}"
    else
        print_error "Image build failed" >&2
        exit 1
    fi
}

# ============================================================================
# Build Docker Image - Main App (Static SPA)
# ============================================================================

build_image_app() {
    IMAGE_TAG="${1:-latest}"
    IMAGE_NAME="${ARTIFACT_REGISTRY}/app:${IMAGE_TAG}"
    
    print_header "Building Main App Docker Image" >&2
    
    # Get Firebase configuration
    get_firebase_config
    
    # Get Cloud Run URL for auth-app API
    AUTH_APP_URL=$(get_cloud_run_url "${SERVICE_API}")
    if [ -z "${AUTH_APP_URL}" ]; then
        print_error "Could not get Cloud Run URL for ${SERVICE_API}" >&2
        print_info "Please deploy the auth-app API first, or set VITE_AUTH_APP_URL manually" >&2
        exit 1
    fi
    export VITE_AUTH_APP_URL="${AUTH_APP_URL}"
    print_info "Auth App URL: ${AUTH_APP_URL}" >&2
    
    # Get nonce secret from Secret Manager
    # IMPORTANT: This must match EXACTLY with auth-app's VITE_NONCE_SECRET
    NONCE_SECRET=$(get_nonce_secret)
    if [ -n "${NONCE_SECRET}" ]; then
        export VITE_NONCE_SECRET="${NONCE_SECRET}"
        print_info "Nonce secret retrieved from Secret Manager" >&2
        print_info "  Length: ${#NONCE_SECRET} chars" >&2
        print_info "  First 8 chars: ${NONCE_SECRET:0:8}..." >&2
        print_info "  Last 8 chars: ...${NONCE_SECRET: -8}" >&2
        print_info "  This EXACT value will be used for nonce generation" >&2
    else
        print_error "Nonce secret is required but not available!" >&2
        print_info "Please create the secret in Secret Manager:" >&2
        print_info "  echo -n 'your-secret-value' | gcloud secrets versions add rates-${ENVIRONMENT}-nonce-secret --data-file=-" >&2
        exit 1
    fi
    
    # First, build the React app
    print_step "Building main app (React SPA)..." >&2
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm not found, installing..." >&2
        npm install -g pnpm@9
    fi
    
    print_info "Installing dependencies..." >&2
    if ! pnpm install --frozen-lockfile >&2; then
        print_error "Failed to install dependencies" >&2
        exit 1
    fi
    
    print_info "Building React app with Firebase config..." >&2
    print_info "  Project ID: ${VITE_FIREBASE_PROJECT_ID:-NOT SET}" >&2
    print_info "  API Key: ${VITE_FIREBASE_API_KEY:+SET}" >&2
    print_info "  App ID: ${VITE_FIREBASE_APP_ID:+SET}" >&2
    print_info "  Auth App URL: ${VITE_AUTH_APP_URL:-NOT SET}" >&2
    print_info "  Nonce Secret: ${VITE_NONCE_SECRET:+SET}" >&2
    
    # Update .env.local file with the nonce secret from Secret Manager
    # This ensures Vite uses the correct value during build
    APP_ENV_FILE="apps/app/.env.local"
    if [ -f "${APP_ENV_FILE}" ]; then
        print_info "Updating ${APP_ENV_FILE} with nonce secret from Secret Manager..." >&2
        # Backup original file
        cp "${APP_ENV_FILE}" "${APP_ENV_FILE}.backup.$$" 2>/dev/null || true
        
        # Function to update or add env var
        update_env_var() {
            local var_name="$1"
            local var_value="$2"
            if grep -q "^${var_name}=" "${APP_ENV_FILE}"; then
                # Update existing value
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" "${APP_ENV_FILE}"
                else
                    sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "${APP_ENV_FILE}"
                fi
            else
                # Add new value
                echo "${var_name}=${var_value}" >> "${APP_ENV_FILE}"
            fi
        }
        
        # Update nonce secret
        update_env_var "VITE_NONCE_SECRET" "${VITE_NONCE_SECRET}"
        
        # Ensure Firebase is set to live mode (not emulator)
        update_env_var "VITE_FIREBASE_MODE" "live"
        update_env_var "VITE_USE_FIREBASE_EMULATOR" "false"
        
        print_info "Updated ${APP_ENV_FILE} with production config" >&2
    else
        print_warning "${APP_ENV_FILE} not found, creating it..." >&2
        mkdir -p "$(dirname "${APP_ENV_FILE}")"
        cat > "${APP_ENV_FILE}" << EOF
VITE_NONCE_SECRET=${VITE_NONCE_SECRET}
VITE_FIREBASE_MODE=live
VITE_USE_FIREBASE_EMULATOR=false
EOF
    fi
    
    # Build with environment variables
    if ! env \
        VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-}" \
        VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN:-}" \
        VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID:-}" \
        VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET:-}" \
        VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID:-}" \
        VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID:-}" \
        VITE_FIREBASE_MEASUREMENT_ID="${VITE_FIREBASE_MEASUREMENT_ID:-}" \
        VITE_AUTH_APP_URL="${VITE_AUTH_APP_URL:-}" \
        VITE_NONCE_SECRET="${VITE_NONCE_SECRET:-}" \
        VITE_ENVIRONMENT="${ENVIRONMENT}" \
        NODE_ENV=production \
        VITE_FIREBASE_MODE="live" \
        VITE_USE_FIREBASE_EMULATOR="false" \
        pnpm --filter=app build --mode production >&2; then
        print_error "Failed to build React app" >&2
        exit 1
    fi
    
    # Verify dist folder exists
    if [ ! -d "apps/app/dist" ]; then
        print_error "Build completed but dist folder not found at apps/app/dist" >&2
        print_info "Checking if build output is in a different location..." >&2
        find apps/app -name "dist" -type d 2>/dev/null | head -5 >&2 || true
        exit 1
    fi
    
    print_success "React app built successfully" >&2
    print_info "Dist folder verified: apps/app/dist" >&2
    
    # Restore original .env.local file if we backed it up
    if [ -f "${APP_ENV_FILE}.backup.$$" ]; then
        print_info "Restoring original ${APP_ENV_FILE}..." >&2
        mv "${APP_ENV_FILE}.backup.$$" "${APP_ENV_FILE}"
    fi
    
    # Verify nonce secret is embedded in the build
    print_info "Verifying nonce secret in app build..." >&2
    if [ -d "apps/app/dist" ]; then
        APP_SECRET=$(grep -roh 'VITE_NONCE_SECRET:"[^"]*"' apps/app/dist/assets/*.js 2>/dev/null | head -1 | grep -o '"[^"]*"' | tr -d '"' || echo "")
        if [ -n "${APP_SECRET}" ]; then
            if [ "${APP_SECRET}" = "${VITE_NONCE_SECRET}" ]; then
                print_success "Nonce secret verified in app build (matches)" >&2
                print_info "  Secret value (first 16 chars): ${APP_SECRET:0:16}..." >&2
            else
                print_error "Nonce secret mismatch in app build!" >&2
                print_error "  Expected: ${VITE_NONCE_SECRET:0:16}..." >&2
                print_error "  Found: ${APP_SECRET:0:16}..." >&2
                exit 1
            fi
        else
            print_warning "Could not find VITE_NONCE_SECRET in app build output" >&2
        fi
    fi
    
    # Create a temporary Dockerfile in the repo root so Docker can see the build context
    TEMP_DOCKERFILE="Dockerfile.app.tmp"
    cat > "${TEMP_DOCKERFILE}" << 'EOF'
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
# Copy the built React app dist folder
COPY apps/app/dist /usr/share/nginx/html
# Copy nginx config for SPA routing
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
EOF
    
    print_step "Building Docker image: ${IMAGE_NAME}" >&2
    print_info "Build context: $(pwd)" >&2
    print_info "Dockerfile: ${TEMP_DOCKERFILE}" >&2
    print_info "Verifying dist folder is accessible..." >&2
    if [ ! -d "apps/app/dist" ] || [ ! -f "apps/app/dist/index.html" ]; then
        print_error "dist folder or index.html not found" >&2
        print_info "Dist folder contents:" >&2
        ls -la apps/app/dist/ >&2 || true
        rm -f "${TEMP_DOCKERFILE}"
        exit 1
    fi
    print_info "This may take a few minutes..." >&2
    
    # Temporarily disable .dockerignore by renaming it
    # (Docker doesn't have a flag to ignore .dockerignore)
    DOCKERIGNORE_BACKUP=""
    if [ -f ".dockerignore" ]; then
        DOCKERIGNORE_BACKUP=".dockerignore.backup.$$"
        mv .dockerignore "${DOCKERIGNORE_BACKUP}"
        print_info "Temporarily disabled .dockerignore for build" >&2
    fi
    
    if docker build \
        --platform linux/amd64 \
        -t "${IMAGE_NAME}" \
        -f "${TEMP_DOCKERFILE}" \
        .; then
        print_success "Main app image built successfully" >&2
        # Restore .dockerignore if it was backed up
        if [ -n "${DOCKERIGNORE_BACKUP}" ] && [ -f "${DOCKERIGNORE_BACKUP}" ]; then
            mv "${DOCKERIGNORE_BACKUP}" .dockerignore
        fi
        rm -f "${TEMP_DOCKERFILE}"
        echo "${IMAGE_NAME}"
    else
        print_error "Image build failed" >&2
        # Restore .dockerignore if it was backed up
        if [ -n "${DOCKERIGNORE_BACKUP}" ] && [ -f "${DOCKERIGNORE_BACKUP}" ]; then
            mv "${DOCKERIGNORE_BACKUP}" .dockerignore
        fi
        print_info "Checking if apps/app/dist exists..." >&2
        ls -la apps/app/dist >&2 || echo "dist folder not found" >&2
        rm -f "${TEMP_DOCKERFILE}"
        exit 1
    fi
}

# ============================================================================
# Push Image to Artifact Registry
# ============================================================================

push_image() {
    print_header "Pushing Image to Artifact Registry"
    
    IMAGE_NAME="$1"
    
    # Validate image name is not empty and contains a tag
    if [ -z "${IMAGE_NAME}" ]; then
        print_error "Image name is empty"
        exit 1
    fi
    
    if [[ ! "${IMAGE_NAME}" =~ : ]]; then
        print_error "Image name must include a tag (e.g., image:tag)"
        print_error "Received: ${IMAGE_NAME}"
        exit 1
    fi
    
    print_step "Configuring Docker for Artifact Registry"
    if gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet; then
        print_success "Docker configured for Artifact Registry"
    else
        print_error "Failed to configure Docker"
        exit 1
    fi
    
    print_step "Pushing image: ${IMAGE_NAME}"
    print_info "This may take a few minutes..."
    
    if docker push "${IMAGE_NAME}"; then
        print_success "Image pushed successfully"
    else
        print_error "Image push failed"
        exit 1
    fi
}

# ============================================================================
# Deploy to Cloud Run
# ============================================================================

deploy_to_cloud_run() {
    print_header "Deploying to Cloud Run"
    
    IMAGE_NAME="$1"
    SERVICE_NAME="$2"
    
    print_step "Deploying ${SERVICE_NAME} with image: ${IMAGE_NAME}"
    print_info "This may take a few minutes..."
    
    if gcloud run deploy "${SERVICE_NAME}" \
        --image="${IMAGE_NAME}" \
        --region="${REGION}" \
        --platform=managed \
        --project="${PROJECT_ID}" \
        --quiet; then
        print_success "Deployment successful"
    else
        print_error "Deployment failed"
        exit 1
    fi
    
    # Get service URL
    SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --format="value(status.url)" 2>/dev/null || echo "")
    
    if [ -n "${SERVICE_URL}" ]; then
        echo ""
        print_success "Service URL: ${SERVICE_URL}"
        if [ "${SERVICE_NAME}" = "${SERVICE_API}" ]; then
            echo ""
            print_info "Test the health endpoint:"
            echo "  curl ${SERVICE_URL}/health"
        fi
    fi
}

# ============================================================================
# Build Frontend Apps (Optional)
# ============================================================================

build_frontend_apps() {
    print_header "Building Frontend Apps"
    
    # Get Firebase configuration (both apps use the same Firebase project/App ID)
    get_firebase_config
    
    # Get Cloud Run URLs
    AUTH_APP_URL=$(get_cloud_run_url "${SERVICE_API}")
    MAIN_APP_URL=$(get_cloud_run_url "${SERVICE_APP}")
    
    if [ -z "${AUTH_APP_URL}" ]; then
        print_warning "Could not get Cloud Run URL for ${SERVICE_API}" >&2
        print_info "You may need to deploy the auth-app API first" >&2
    fi
    
    if [ -z "${MAIN_APP_URL}" ]; then
        print_warning "Could not get Cloud Run URL for ${SERVICE_APP}" >&2
        print_info "You may need to deploy the main app first" >&2
        # Use auth app URL as fallback for allowed redirects
        MAIN_APP_URL="${AUTH_APP_URL}"
    fi
    
    export VITE_AUTH_APP_URL="${AUTH_APP_URL}"
    print_info "Auth App URL: ${AUTH_APP_URL:-NOT SET}" >&2
    print_info "Main App URL: ${MAIN_APP_URL:-NOT SET}" >&2
    
    # Get nonce secret from Secret Manager (same secret for both apps)
    # CRITICAL: Both app and auth-app MUST use the EXACT same secret value
    # Any difference (even whitespace) will cause "Invalid nonce signature" errors
    NONCE_SECRET=$(get_nonce_secret)
    if [ -n "${NONCE_SECRET}" ]; then
        export VITE_NONCE_SECRET="${NONCE_SECRET}"
        print_info "Nonce secret retrieved from Secret Manager" >&2
        print_info "  Length: ${#NONCE_SECRET} chars" >&2
        print_info "  First 8 chars: ${NONCE_SECRET:0:8}..." >&2
        print_info "  Last 8 chars: ...${NONCE_SECRET: -8}" >&2
        print_info "  This EXACT same value will be used for BOTH app and auth-app builds" >&2
    else
        print_error "Nonce secret is required but not available!" >&2
        print_info "Please create the secret in Secret Manager:" >&2
        print_info "  echo -n 'your-secret-value' | gcloud secrets versions add rates-${ENVIRONMENT}-nonce-secret --data-file=-" >&2
        exit 1
    fi
    
    # Build allowed redirects for auth-app (includes both Cloud Run URLs)
    # IMPORTANT: The isAllowed function compares targetUrl.origin with normalizedOrigin
    # So VITE_ALLOWED_REDIRECTS should contain origins (protocol + host + port), not full URLs with paths
    ALLOWED_REDIRECTS=""
    if [ -n "${MAIN_APP_URL}" ]; then
        # Extract origin from main app URL (protocol + host + port, no path)
        # Use sed to extract protocol://host:port (everything before the first /)
        MAIN_APP_ORIGIN=$(echo "${MAIN_APP_URL}" | sed -E 's|^(https?://[^/]+).*|\1|')
        ALLOWED_REDIRECTS="${MAIN_APP_ORIGIN}"
        print_info "Main app origin for allowed redirects: ${MAIN_APP_ORIGIN}" >&2
    fi
    
    if [ -n "${AUTH_APP_URL}" ]; then
        # Extract origin from auth app URL
        AUTH_APP_ORIGIN=$(echo "${AUTH_APP_URL}" | sed -E 's|^(https?://[^/]+).*|\1|')
        if [ -n "${ALLOWED_REDIRECTS}" ]; then
            ALLOWED_REDIRECTS="${ALLOWED_REDIRECTS},${AUTH_APP_ORIGIN}"
        else
            ALLOWED_REDIRECTS="${AUTH_APP_ORIGIN}"
        fi
        print_info "Auth app origin for allowed redirects: ${AUTH_APP_ORIGIN}" >&2
    fi
    
    if [ -z "${ALLOWED_REDIRECTS}" ]; then
        print_warning "No Cloud Run URLs available for allowed redirects" >&2
        print_warning "Redirects will fall back to defaultReturnUrl" >&2
    else
        print_info "Allowed Redirects (origins only): ${ALLOWED_REDIRECTS}" >&2
    fi
    
    export VITE_ALLOWED_REDIRECTS="${ALLOWED_REDIRECTS}"
    
    # Set default return URL to main app URL (fallback when redirectTo is not in allowed list)
    # This ensures users are redirected to the main app, not back to auth-app
    if [ -n "${MAIN_APP_URL}" ]; then
        # Extract origin from main app URL (same logic as above)
        DEFAULT_RETURN_URL=$(echo "${MAIN_APP_URL}" | sed -E 's|^(https?://[^/]+).*|\1|')
        export VITE_DEFAULT_RETURN_URL="${DEFAULT_RETURN_URL}"
        print_info "Default Return URL (fallback): ${VITE_DEFAULT_RETURN_URL}" >&2
    else
        print_warning "Main app URL not available, defaultReturnUrl will use auth-app origin" >&2
        print_warning "This may cause redirect loops!" >&2
        export VITE_DEFAULT_RETURN_URL=""
    fi
    
    print_step "Installing dependencies..."
    if ! command -v pnpm &> /dev/null; then
        print_warning "pnpm not found, installing..."
        npm install -g pnpm@9
    fi
    
    if pnpm install --frozen-lockfile; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
    
    print_step "Building main app (with Firebase config)..."
    print_info "  Project ID: ${VITE_FIREBASE_PROJECT_ID:-NOT SET}" >&2
    print_info "  API Key: ${VITE_FIREBASE_API_KEY:+SET}" >&2
    print_info "  App ID: ${VITE_FIREBASE_APP_ID:+SET}" >&2
    print_info "  Auth App URL: ${VITE_AUTH_APP_URL:-NOT SET}" >&2
    print_info "  Nonce Secret: ${VITE_NONCE_SECRET:+SET}" >&2
    
    # Update .env.local file with the nonce secret and Firebase config from Secret Manager
    APP_ENV_FILE="apps/app/.env.local"
    if [ -f "${APP_ENV_FILE}" ]; then
        print_info "Updating ${APP_ENV_FILE} with production config..." >&2
        # Backup original file
        cp "${APP_ENV_FILE}" "${APP_ENV_FILE}.backup.$$" 2>/dev/null || true
        
        # Function to update or add env var
        update_env_var() {
            local var_name="$1"
            local var_value="$2"
            if grep -q "^${var_name}=" "${APP_ENV_FILE}"; then
                # Update existing value
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" "${APP_ENV_FILE}"
                else
                    sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "${APP_ENV_FILE}"
                fi
            else
                # Add new value
                echo "${var_name}=${var_value}" >> "${APP_ENV_FILE}"
            fi
        }
        
        # Update nonce secret
        update_env_var "VITE_NONCE_SECRET" "${VITE_NONCE_SECRET}"
        
        # Ensure Firebase is set to live mode (not emulator)
        update_env_var "VITE_FIREBASE_MODE" "live"
        update_env_var "VITE_USE_FIREBASE_EMULATOR" "false"
        
        print_info "Updated ${APP_ENV_FILE} with production config" >&2
    else
        print_warning "${APP_ENV_FILE} not found, creating it..." >&2
        mkdir -p "$(dirname "${APP_ENV_FILE}")"
        cat > "${APP_ENV_FILE}" << EOF
VITE_NONCE_SECRET=${VITE_NONCE_SECRET}
VITE_FIREBASE_MODE=live
VITE_USE_FIREBASE_EMULATOR=false
EOF
    fi
    
    # Build main app with Firebase config, auth app URL, and nonce secret
    if env \
        VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-}" \
        VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN:-}" \
        VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID:-}" \
        VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET:-}" \
        VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID:-}" \
        VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID:-}" \
        VITE_FIREBASE_MEASUREMENT_ID="${VITE_FIREBASE_MEASUREMENT_ID:-}" \
        VITE_AUTH_APP_URL="${VITE_AUTH_APP_URL:-}" \
        VITE_NONCE_SECRET="${VITE_NONCE_SECRET:-}" \
        VITE_ENVIRONMENT="${ENVIRONMENT}" \
        NODE_ENV=production \
        VITE_FIREBASE_MODE="live" \
        VITE_USE_FIREBASE_EMULATOR="false" \
        pnpm --filter=app build --mode production; then
        print_success "Main app built successfully"
    else
        print_error "Main app build failed"
        exit 1
    fi
    
    print_step "Building auth app client (with Firebase config)..."
    print_info "  Using same Firebase config as main app" >&2
    print_info "  Project ID: ${VITE_FIREBASE_PROJECT_ID:-NOT SET}" >&2
    print_info "  API Key: ${VITE_FIREBASE_API_KEY:+SET}" >&2
    print_info "  App ID: ${VITE_FIREBASE_APP_ID:+SET}" >&2
    print_info "  Allowed Redirects: ${VITE_ALLOWED_REDIRECTS:-NOT SET}" >&2
    print_info "  Nonce Secret: ${VITE_NONCE_SECRET:+SET}" >&2
    
    # Build auth-app client with Firebase config, allowed redirects, and nonce secret
    # CRITICAL: VITE_NONCE_SECRET must be the EXACT same value as in the main app build
    if [ -z "${VITE_NONCE_SECRET:-}" ]; then
        print_error "VITE_NONCE_SECRET is required for auth-app build but is empty!" >&2
        exit 1
    fi
    
    # Update .env file with the nonce secret, Firebase config, and allowed redirects
    # This ensures Vite uses the correct values during build
    AUTH_APP_ENV_FILE="apps/auth-app/.env"
    if [ -f "${AUTH_APP_ENV_FILE}" ]; then
        print_info "Updating ${AUTH_APP_ENV_FILE} with production config..." >&2
        # Backup original file
        cp "${AUTH_APP_ENV_FILE}" "${AUTH_APP_ENV_FILE}.backup.$$" 2>/dev/null || true
        
        # Function to update or add env var
        update_env_var() {
            local var_name="$1"
            local var_value="$2"
            if grep -q "^${var_name}=" "${AUTH_APP_ENV_FILE}"; then
                # Update existing value (escape special chars in value for sed)
                local escaped_value=$(printf '%s\n' "${var_value}" | sed 's/[[\.*^$()+?{|]/\\&/g')
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" "${AUTH_APP_ENV_FILE}"
                else
                    sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "${AUTH_APP_ENV_FILE}"
                fi
            else
                # Add new value
                echo "${var_name}=${var_value}" >> "${AUTH_APP_ENV_FILE}"
            fi
        }
        
        # Update nonce secret
        update_env_var "VITE_NONCE_SECRET" "${VITE_NONCE_SECRET}"
        
        # Ensure Firebase is set to live mode (not emulator)
        update_env_var "VITE_FIREBASE_MODE" "live"
        update_env_var "VITE_USE_FIREBASE_EMULATOR" "false"
        
        # Update allowed redirects (CRITICAL: must include main app URL origin)
        if [ -n "${VITE_ALLOWED_REDIRECTS:-}" ]; then
            update_env_var "VITE_ALLOWED_REDIRECTS" "${VITE_ALLOWED_REDIRECTS}"
            print_info "Updated VITE_ALLOWED_REDIRECTS in ${AUTH_APP_ENV_FILE}: ${VITE_ALLOWED_REDIRECTS}" >&2
        else
            print_warning "VITE_ALLOWED_REDIRECTS is not set! Redirects may fail." >&2
        fi
        
        # Update default return URL (CRITICAL: must be main app origin, not auth-app)
        if [ -n "${VITE_DEFAULT_RETURN_URL:-}" ]; then
            update_env_var "VITE_DEFAULT_RETURN_URL" "${VITE_DEFAULT_RETURN_URL}"
            print_info "Updated VITE_DEFAULT_RETURN_URL in ${AUTH_APP_ENV_FILE}: ${VITE_DEFAULT_RETURN_URL}" >&2
        else
            print_warning "VITE_DEFAULT_RETURN_URL is not set! Will fall back to auth-app origin (may cause redirect loops)." >&2
        fi
        
        print_info "Updated ${AUTH_APP_ENV_FILE} with production config" >&2
    else
        print_warning "${AUTH_APP_ENV_FILE} not found, creating it..." >&2
        mkdir -p "$(dirname "${AUTH_APP_ENV_FILE}")"
        cat > "${AUTH_APP_ENV_FILE}" << EOF
VITE_NONCE_SECRET=${VITE_NONCE_SECRET}
VITE_FIREBASE_MODE=live
VITE_USE_FIREBASE_EMULATOR=false
VITE_ALLOWED_REDIRECTS=${VITE_ALLOWED_REDIRECTS:-}
VITE_DEFAULT_RETURN_URL=${VITE_DEFAULT_RETURN_URL:-}
EOF
        print_info "Created ${AUTH_APP_ENV_FILE} with production config" >&2
    fi
    
    # CRITICAL: Vite with --mode production also reads .env.production
    # Create/update .env.production to ensure variables are embedded
    AUTH_APP_ENV_PRODUCTION_FILE="apps/auth-app/.env.production"
    print_info "Creating/updating ${AUTH_APP_ENV_PRODUCTION_FILE} for production build..." >&2
    if [ -f "${AUTH_APP_ENV_PRODUCTION_FILE}" ]; then
        cp "${AUTH_APP_ENV_PRODUCTION_FILE}" "${AUTH_APP_ENV_PRODUCTION_FILE}.backup.$$" 2>/dev/null || true
    fi
    cat > "${AUTH_APP_ENV_PRODUCTION_FILE}" << EOF
VITE_NONCE_SECRET=${VITE_NONCE_SECRET}
VITE_FIREBASE_MODE=live
VITE_USE_FIREBASE_EMULATOR=false
VITE_ALLOWED_REDIRECTS=${VITE_ALLOWED_REDIRECTS:-}
VITE_DEFAULT_RETURN_URL=${VITE_DEFAULT_RETURN_URL:-}
EOF
    print_info "Created ${AUTH_APP_ENV_PRODUCTION_FILE} with production config" >&2
    
    # Verify .env file contents before build
    print_info "Verifying ${AUTH_APP_ENV_FILE} contents before build..." >&2
    if [ -f "${AUTH_APP_ENV_FILE}" ]; then
        print_info "Contents of ${AUTH_APP_ENV_FILE}:" >&2
        grep -E "^VITE_" "${AUTH_APP_ENV_FILE}" | sed 's/=.*/=***/' >&2 || true
        print_info "VITE_FIREBASE_MODE=$(grep '^VITE_FIREBASE_MODE=' "${AUTH_APP_ENV_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
        print_info "VITE_USE_FIREBASE_EMULATOR=$(grep '^VITE_USE_FIREBASE_EMULATOR=' "${AUTH_APP_ENV_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
        print_info "VITE_ALLOWED_REDIRECTS=$(grep '^VITE_ALLOWED_REDIRECTS=' "${AUTH_APP_ENV_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
        print_info "VITE_DEFAULT_RETURN_URL=$(grep '^VITE_DEFAULT_RETURN_URL=' "${AUTH_APP_ENV_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
    else
        print_error "${AUTH_APP_ENV_FILE} does not exist!" >&2
        exit 1
    fi
    
    # Also verify .env.production file
    print_info "Verifying ${AUTH_APP_ENV_PRODUCTION_FILE} contents before build..." >&2
    if [ -f "${AUTH_APP_ENV_PRODUCTION_FILE}" ]; then
        print_info "Contents of ${AUTH_APP_ENV_PRODUCTION_FILE}:" >&2
        grep -E "^VITE_" "${AUTH_APP_ENV_PRODUCTION_FILE}" | sed 's/=.*/=***/' >&2 || true
        print_info "VITE_FIREBASE_MODE=$(grep '^VITE_FIREBASE_MODE=' "${AUTH_APP_ENV_PRODUCTION_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
        print_info "VITE_USE_FIREBASE_EMULATOR=$(grep '^VITE_USE_FIREBASE_EMULATOR=' "${AUTH_APP_ENV_PRODUCTION_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
        print_info "VITE_ALLOWED_REDIRECTS=$(grep '^VITE_ALLOWED_REDIRECTS=' "${AUTH_APP_ENV_PRODUCTION_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
        print_info "VITE_DEFAULT_RETURN_URL=$(grep '^VITE_DEFAULT_RETURN_URL=' "${AUTH_APP_ENV_PRODUCTION_FILE}" | cut -d'=' -f2 || echo 'NOT FOUND')" >&2
    else
        print_error "${AUTH_APP_ENV_PRODUCTION_FILE} does not exist!" >&2
        exit 1
    fi
    
    # Check for .env.local that might override values (warn but don't fail)
    if [ -f "apps/auth-app/.env.local" ]; then
        print_warning "WARNING: apps/auth-app/.env.local exists and may override production values!" >&2
        print_warning "Consider removing it or ensuring it has the correct production values." >&2
    fi
    
    # CRITICAL: Vite reads .env files, but we also need to ensure the variables are in the environment
    # Vite will use .env file values, but we pass them via env command as well to ensure they're available
    # Also, we need to ensure NODE_ENV=production so that import.meta.env.PROD is true
    print_info "Building with environment variables..." >&2
    print_info "  NODE_ENV=production (ensures PROD=true)" >&2
    print_info "  VITE_FIREBASE_MODE=live" >&2
    print_info "  VITE_USE_FIREBASE_EMULATOR=false" >&2
    print_info "  VITE_ALLOWED_REDIRECTS=${VITE_ALLOWED_REDIRECTS:-NOT SET}" >&2
    print_info "  VITE_DEFAULT_RETURN_URL=${VITE_DEFAULT_RETURN_URL:-NOT SET}" >&2
    
    if env \
        VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-}" \
        VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN:-}" \
        VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID:-}" \
        VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET:-}" \
        VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID:-}" \
        VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID:-}" \
        VITE_FIREBASE_MEASUREMENT_ID="${VITE_FIREBASE_MEASUREMENT_ID:-}" \
        VITE_ALLOWED_REDIRECTS="${VITE_ALLOWED_REDIRECTS:-}" \
        VITE_DEFAULT_RETURN_URL="${VITE_DEFAULT_RETURN_URL:-}" \
        VITE_NONCE_SECRET="${VITE_NONCE_SECRET}" \
        VITE_ENVIRONMENT="${ENVIRONMENT}" \
        NODE_ENV=production \
        VITE_FIREBASE_MODE="live" \
        VITE_USE_FIREBASE_EMULATOR="false" \
        pnpm --filter=auth-app build --mode production; then
        print_success "Auth app client built successfully"
        
        # Restore original .env files if we backed them up
        if [ -f "${AUTH_APP_ENV_FILE}.backup.$$" ]; then
            print_info "Restoring original ${AUTH_APP_ENV_FILE}..." >&2
            mv "${AUTH_APP_ENV_FILE}.backup.$$" "${AUTH_APP_ENV_FILE}"
        fi
        if [ -f "${AUTH_APP_ENV_PRODUCTION_FILE}.backup.$$" ]; then
            print_info "Restoring original ${AUTH_APP_ENV_PRODUCTION_FILE}..." >&2
            mv "${AUTH_APP_ENV_PRODUCTION_FILE}.backup.$$" "${AUTH_APP_ENV_PRODUCTION_FILE}"
        elif [ -f "${AUTH_APP_ENV_PRODUCTION_FILE}" ]; then
            # If we created .env.production and there was no backup, remove it
            print_info "Removing temporary ${AUTH_APP_ENV_PRODUCTION_FILE}..." >&2
            rm -f "${AUTH_APP_ENV_PRODUCTION_FILE}"
        fi
        
        # Verify nonce secret is embedded in the build
        print_info "Verifying nonce secret in auth-app build..." >&2
        if [ -d "apps/auth-app/dist" ]; then
            AUTH_APP_SECRET=$(grep -roh 'VITE_NONCE_SECRET:"[^"]*"' apps/auth-app/dist/assets/*.js 2>/dev/null | head -1 | grep -o '"[^"]*"' | tr -d '"' || echo "")
            if [ -n "${AUTH_APP_SECRET}" ]; then
                if [ "${AUTH_APP_SECRET}" = "${VITE_NONCE_SECRET}" ]; then
                    print_success "Nonce secret verified in auth-app build (matches)" >&2
                else
                    print_error "Nonce secret mismatch in auth-app build!" >&2
                    print_error "  Expected: ${VITE_NONCE_SECRET:0:16}..." >&2
                    print_error "  Found: ${AUTH_APP_SECRET:0:16}..." >&2
                    exit 1
                fi
            else
                print_warning "Could not find VITE_NONCE_SECRET in auth-app build output" >&2
            fi
        fi
    else
        print_error "Auth app client build failed"
        # Restore original .env file if we backed it up
        if [ -f "${AUTH_APP_ENV_FILE}.backup.$$" ]; then
            mv "${AUTH_APP_ENV_FILE}.backup.$$" "${AUTH_APP_ENV_FILE}"
        fi
        exit 1
    fi
    
    # Restore original .env file if we backed it up
    if [ -f "${AUTH_APP_ENV_FILE}.backup.$$" ]; then
        print_info "Restoring original ${AUTH_APP_ENV_FILE}..." >&2
        mv "${AUTH_APP_ENV_FILE}.backup.$$" "${AUTH_APP_ENV_FILE}"
    fi
    
    echo ""
    print_info "Frontend apps built. To deploy to Firebase Hosting:"
    echo "  firebase deploy --only hosting:rates-${ENVIRONMENT}-main-app,hosting:rates-${ENVIRONMENT}-auth-app"
}

# ============================================================================
# Main Menu
# ============================================================================

main_menu() {
    while true; do
        print_header "Dev Environment Deployment"
        echo "What would you like to deploy?"
        echo ""
        echo "  Auth App API (Cloud Run):"
        echo "    1) Full deployment (build → push → deploy)"
        echo "    2) Build only"
        echo "    3) Push only (image already built)"
        echo "    4) Deploy only (image already pushed)"
        echo ""
        echo "  Main App (Cloud Run):"
        echo "    5) Full deployment (build → push → deploy)"
        echo "    6) Build only"
        echo "    7) Push only (image already built)"
        echo "    8) Deploy only (image already pushed)"
        echo ""
        echo "  Both Apps:"
        echo "    9) Deploy both apps (full deployment)"
        echo ""
        echo "  Frontend Apps (Firebase Hosting):"
        echo "    10) Build frontend apps (for Firebase Hosting)"
        echo ""
        echo "    11) Exit"
        echo ""
        read -p "Select option [1-11]: " choice
        
        case $choice in
            1)
                # Auth App API - Full deployment
                IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
                IMAGE_NAME=$(build_image_api "${IMAGE_TAG}" | tr -d '\n\r ')
                if [ -z "${IMAGE_NAME}" ]; then
                    print_error "Failed to get image name from build"
                    continue
                fi
                push_image "${IMAGE_NAME}"
                deploy_to_cloud_run "${IMAGE_NAME}" "${SERVICE_API}"
                echo ""
                print_success "Auth App API deployment completed!"
                ;;
            2)
                # Auth App API - Build only
                IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
                IMAGE_NAME=$(build_image_api "${IMAGE_TAG}" | tr -d '\n\r ')
                if [ -z "${IMAGE_NAME}" ]; then
                    print_error "Failed to get image name from build"
                    continue
                fi
                echo ""
                print_success "Image built: ${IMAGE_NAME}"
                print_info "To push and deploy, run option 1 or options 3-4"
                ;;
            3)
                # Auth App API - Push only
                read -p "Enter image tag [latest]: " IMAGE_TAG
                IMAGE_TAG=${IMAGE_TAG:-latest}
                IMAGE_NAME="${ARTIFACT_REGISTRY}/api:${IMAGE_TAG}"
                push_image "${IMAGE_NAME}"
                ;;
            4)
                # Auth App API - Deploy only
                read -p "Enter image tag [latest]: " IMAGE_TAG
                IMAGE_TAG=${IMAGE_TAG:-latest}
                IMAGE_NAME="${ARTIFACT_REGISTRY}/api:${IMAGE_TAG}"
                deploy_to_cloud_run "${IMAGE_NAME}" "${SERVICE_API}"
                ;;
            5)
                # Main App - Full deployment
                IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
                IMAGE_NAME=$(build_image_app "${IMAGE_TAG}" | tr -d '\n\r ')
                if [ -z "${IMAGE_NAME}" ]; then
                    print_error "Failed to get image name from build"
                    continue
                fi
                push_image "${IMAGE_NAME}"
                deploy_to_cloud_run "${IMAGE_NAME}" "${SERVICE_APP}"
                echo ""
                print_success "Main App deployment completed!"
                ;;
            6)
                # Main App - Build only
                IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
                IMAGE_NAME=$(build_image_app "${IMAGE_TAG}" | tr -d '\n\r ')
                if [ -z "${IMAGE_NAME}" ]; then
                    print_error "Failed to get image name from build"
                    continue
                fi
                echo ""
                print_success "Image built: ${IMAGE_NAME}"
                print_info "To push and deploy, run option 5 or options 7-8"
                ;;
            7)
                # Main App - Push only
                read -p "Enter image tag [latest]: " IMAGE_TAG
                IMAGE_TAG=${IMAGE_TAG:-latest}
                IMAGE_NAME="${ARTIFACT_REGISTRY}/app:${IMAGE_TAG}"
                push_image "${IMAGE_NAME}"
                ;;
            8)
                # Main App - Deploy only
                read -p "Enter image tag [latest]: " IMAGE_TAG
                IMAGE_TAG=${IMAGE_TAG:-latest}
                IMAGE_NAME="${ARTIFACT_REGISTRY}/app:${IMAGE_TAG}"
                deploy_to_cloud_run "${IMAGE_NAME}" "${SERVICE_APP}"
                ;;
            9)
                # Both apps - Full deployment
                IMAGE_TAG=$(date +%Y%m%d-%H%M%S)
                
                # Deploy Auth App API
                print_info "Deploying Auth App API..." >&2
                IMAGE_NAME_API=$(build_image_api "${IMAGE_TAG}" | tr -d '\n\r ')
                if [ -z "${IMAGE_NAME_API}" ]; then
                    print_error "Failed to build auth-app API"
                    continue
                fi
                push_image "${IMAGE_NAME_API}"
                deploy_to_cloud_run "${IMAGE_NAME_API}" "${SERVICE_API}"
                
                # Deploy Main App
                print_info "Deploying Main App..." >&2
                IMAGE_NAME_APP=$(build_image_app "${IMAGE_TAG}" | tr -d '\n\r ')
                if [ -z "${IMAGE_NAME_APP}" ]; then
                    print_error "Failed to build main app"
                    continue
                fi
                push_image "${IMAGE_NAME_APP}"
                deploy_to_cloud_run "${IMAGE_NAME_APP}" "${SERVICE_APP}"
                
                echo ""
                print_success "Both apps deployed successfully!"
                ;;
            10)
                # Frontend only
                build_frontend_apps
                ;;
            11)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-11."
                sleep 2
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# ============================================================================
# Script Entry Point
# ============================================================================

main() {
    # Check if running in repository root
    if [ ! -f "Dockerfile" ] || [ ! -f "package.json" ]; then
        print_error "Please run this script from the repository root directory"
        exit 1
    fi
    
    check_prerequisites
    main_menu
}

# Run main function
main
