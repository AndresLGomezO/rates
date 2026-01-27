#!/usr/bin/env bash

# ============================================================================
# BUILD AND PUSH SCRIPT
# ============================================================================
# Simple script to build and push app and auth-app container images
# without running the full infrastructure setup.
#
# Usage:
#   ./build-and-push.sh dev [tag]     # Build and push for dev (default tag: latest)
#   ./build-and-push.sh prod [tag]    # Build and push for prod (default tag: latest)
#   ./build-and-push.sh --help        # Show help
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="${SCRIPT_DIR}/.."
readonly DEFAULT_PROJECT_ID="rates-production"
readonly DEFAULT_REGION="us-central1"
readonly LOG_FILE="${SCRIPT_DIR}/.build-push.log"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${BOLD}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────────${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────────────────${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_step() {
    echo -e "${BOLD}→${NC} $1"
}

show_help() {
    cat << EOF
${BOLD}Build and Push Script${NC}

${BOLD}Usage:${NC}
  ./build-and-push.sh <environment> [tag]

${BOLD}Arguments:${NC}
  environment    Environment to build for: dev or prod (required)
  tag            Docker image tag (default: latest)

${BOLD}Examples:${NC}
  ./build-and-push.sh dev              # Build and push dev with 'latest' tag
  ./build-and-push.sh dev v1.2.3       # Build and push dev with 'v1.2.3' tag
  ./build-and-push.sh prod v1.0.0      # Build and push prod with 'v1.0.0' tag

${BOLD}What this script does:${NC}
  1. Builds auth-app API container image
  2. Builds app static files container image
  3. Pushes both images to Artifact Registry
  4. Uses secrets from Secret Manager for build configuration

${BOLD}Prerequisites:${NC}
  - Docker installed and running
  - Authenticated with GCP (gcloud auth login)
  - Docker configured for Artifact Registry
  - Secrets exist in Secret Manager (created by infra/setup.sh)

${BOLD}Note:${NC}
  This script only builds and pushes images. It does NOT deploy to Cloud Run.
  To deploy after building, update Cloud Run services manually or use Terraform.
EOF
}

# ============================================================================
# VALIDATION
# ============================================================================

validate_environment() {
    local env="$1"
    if [[ "${env}" != "dev" ]] && [[ "${env}" != "prod" ]]; then
        print_error "Invalid environment: ${env}"
        print_info "Must be 'dev' or 'prod'"
        return 1
    fi
    return 0
}

check_prerequisites() {
    local errors=0
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        errors=$((errors + 1))
    elif ! docker info &>/dev/null; then
        print_error "Docker daemon is not running"
        errors=$((errors + 1))
    fi
    
    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed or not in PATH"
        errors=$((errors + 1))
    fi
    
    # Check project access
    local project_id="${DEFAULT_PROJECT_ID}"
    if ! gcloud projects describe "${project_id}" &>/dev/null; then
        print_error "Cannot access GCP project: ${project_id}"
        print_info "Run: gcloud auth login"
        errors=$((errors + 1))
    fi
    
    if [[ ${errors} -gt 0 ]]; then
        return 1
    fi
    
    return 0
}

# ============================================================================
# BUILD AND PUSH FUNCTIONS
# ============================================================================

get_project_config() {
    local env="$1"
    local project_id="${DEFAULT_PROJECT_ID}"
    local region="${DEFAULT_REGION}"
    
    # Try to get region from Terraform state if available
    local app_env_dir="${SCRIPT_DIR}/environments/application/${env}"
    if [[ -d "${app_env_dir}" ]]; then
        if command -v terraform &> /dev/null; then
            local tf_region
            if tf_region=$(cd "${app_env_dir}" && terraform output -raw region 2>/dev/null); then
                region="${tf_region}"
            fi
        fi
    fi
    
    echo "${project_id}|${region}"
}

build_and_push_images() {
    local env="$1"
    local image_tag="${2:-latest}"
    
    print_header "Building and Pushing Images (${env})"
    
    # Get project configuration
    local config
    config=$(get_project_config "${env}")
    local project_id
    project_id=$(echo "${config}" | cut -d'|' -f1)
    local region
    region=$(echo "${config}" | cut -d'|' -f2)
    
    print_info "Project: ${project_id}"
    print_info "Region: ${region}"
    print_info "Tag: ${image_tag}"
    
    # Configure Docker for Artifact Registry
    print_step "Configuring Docker for Artifact Registry..."
    if gcloud auth configure-docker "${region}-docker.pkg.dev" --quiet >> "${LOG_FILE}" 2>&1; then
        print_success "Docker configured for Artifact Registry"
    else
        print_warning "Docker configuration may have failed, continuing anyway..."
    fi
    
    # Determine image names
    local image_name_api="${region}-docker.pkg.dev/${project_id}/rates-${env}-containers/api:${image_tag}"
    local image_name_app="${region}-docker.pkg.dev/${project_id}/rates-${env}-containers/app:${image_tag}"
    
    print_info "API Image: ${image_name_api}"
    print_info "App Image: ${image_name_app}"
    
    # Check Dockerfile exists
    if [[ ! -f "${PROJECT_ROOT}/Dockerfile" ]]; then
        print_error "Dockerfile not found at: ${PROJECT_ROOT}/Dockerfile"
        return 1
    fi
    
    # Retrieve Firebase config for API build
    print_step "Retrieving Firebase config from Secret Manager..."
    local firebase_config_secret="rates-${env}-firebase-web-config"
    local firebase_config_json=""
    local docker_build_args_api="--build-arg NODE_ENV=$([ "${env}" == "prod" ] && echo "production" || echo "development")"
    
    if firebase_config_json=$(gcloud secrets versions access latest --secret="${firebase_config_secret}" --project="${project_id}" 2>/dev/null); then
        print_success "Retrieved Firebase config"
        
        # Parse JSON (use jq if available, otherwise use grep/sed)
        local firebase_api_key=""
        local firebase_project_id=""
        local firebase_auth_domain=""
        local firebase_storage_bucket=""
        local firebase_messaging_sender_id=""
        local firebase_app_id=""
        local firebase_measurement_id=""
        
        if command -v jq &> /dev/null; then
            firebase_api_key=$(echo "${firebase_config_json}" | jq -r '.apiKey // ""' 2>/dev/null || echo "")
            firebase_project_id=$(echo "${firebase_config_json}" | jq -r '.projectId // ""' 2>/dev/null || echo "${project_id}")
            firebase_auth_domain=$(echo "${firebase_config_json}" | jq -r '.authDomain // ""' 2>/dev/null || echo "${project_id}.firebaseapp.com")
            firebase_storage_bucket=$(echo "${firebase_config_json}" | jq -r '.storageBucket // ""' 2>/dev/null || echo "${project_id}.appspot.com")
            firebase_messaging_sender_id=$(echo "${firebase_config_json}" | jq -r '.messagingSenderId // ""' 2>/dev/null || echo "")
            firebase_app_id=$(echo "${firebase_config_json}" | jq -r '.appId // ""' 2>/dev/null || echo "")
            firebase_measurement_id=$(echo "${firebase_config_json}" | jq -r '.measurementId // ""' 2>/dev/null || echo "")
        else
            firebase_api_key=$(echo "${firebase_config_json}" | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_project_id=$(echo "${firebase_config_json}" | grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${project_id}")
            firebase_auth_domain=$(echo "${firebase_config_json}" | grep -o '"authDomain"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"authDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${project_id}.firebaseapp.com")
            firebase_storage_bucket=$(echo "${firebase_config_json}" | grep -o '"storageBucket"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"storageBucket"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${project_id}.appspot.com")
            firebase_messaging_sender_id=$(echo "${firebase_config_json}" | grep -o '"messagingSenderId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"messagingSenderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_app_id=$(echo "${firebase_config_json}" | grep -o '"appId"[[:space:]]*:[^"]*"' | sed 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            firebase_measurement_id=$(echo "${firebase_config_json}" | grep -o '"measurementId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"measurementId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
        fi
        
        # Add Firebase config as build args
        if [[ -n "${firebase_api_key}" ]] && [[ -n "${firebase_app_id}" ]]; then
            docker_build_args_api+=" --build-arg VITE_FIREBASE_API_KEY=${firebase_api_key}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_PROJECT_ID=${firebase_project_id}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_AUTH_DOMAIN=${firebase_auth_domain}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_STORAGE_BUCKET=${firebase_storage_bucket}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=${firebase_messaging_sender_id}"
            docker_build_args_api+=" --build-arg VITE_FIREBASE_APP_ID=${firebase_app_id}"
            if [[ -n "${firebase_measurement_id}" ]]; then
                docker_build_args_api+=" --build-arg VITE_FIREBASE_MEASUREMENT_ID=${firebase_measurement_id}"
            fi
            docker_build_args_api+=" --build-arg VITE_FIREBASE_MODE=live"
            docker_build_args_api+=" --build-arg VITE_USE_FIREBASE_EMULATOR=false"
        else
            print_warning "Firebase config missing required values, building without it"
        fi
    else
        print_warning "Could not retrieve Firebase config: ${firebase_config_secret}"
        print_info "Build will proceed without Firebase config (may fail if required)"
    fi
    
    # Retrieve nonce secret
    print_step "Retrieving nonce secret..."
    local nonce_secret_name="rates-${env}-nonce-secret"
    local nonce_secret=""
    
    if nonce_secret=$(gcloud secrets versions access latest --secret="${nonce_secret_name}" --project="${project_id}" 2>/dev/null); then
        docker_build_args_api+=" --build-arg VITE_NONCE_SECRET=${nonce_secret}"
        print_success "Retrieved nonce secret"
    else
        print_warning "Could not retrieve nonce secret: ${nonce_secret_name}"
    fi
    
    # Get main app URL for VITE_ALLOWED_REDIRECTS
    print_step "Retrieving main app Cloud Run URL..."
    local project_number=""
    local main_app_url=""
    if project_number=$(gcloud projects describe "${project_id}" --format="value(projectNumber)" 2>/dev/null); then
        main_app_url="https://rates-${env}-app-${region}-${project_number}.${region}.run.app"
        docker_build_args_api+=" --build-arg VITE_ALLOWED_REDIRECTS=${main_app_url}"
        print_success "Retrieved main app URL: ${main_app_url}"
    else
        print_warning "Could not retrieve project number for main app URL"
    fi
    
    # Build API image
    print_step "Building API image (auth-app)..."
    if docker build --platform linux/amd64 -t "${image_name_api}" \
        -f "${PROJECT_ROOT}/Dockerfile" \
        ${docker_build_args_api} \
        "${PROJECT_ROOT}" >> "${LOG_FILE}" 2>&1; then
        print_success "API image built successfully"
    else
        print_error "API image build failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    # Build app static files
    print_step "Building app static files..."
    
    # Retrieve Firebase config for app build
    local vite_firebase_api_key=""
    local vite_firebase_project_id=""
    local vite_firebase_auth_domain=""
    local vite_firebase_storage_bucket=""
    local vite_firebase_messaging_sender_id=""
    local vite_firebase_app_id=""
    local vite_firebase_measurement_id=""
    
    if [[ -n "${firebase_config_json}" ]]; then
        if command -v jq &> /dev/null; then
            vite_firebase_api_key=$(echo "${firebase_config_json}" | jq -r '.apiKey // ""' 2>/dev/null || echo "")
            vite_firebase_project_id=$(echo "${firebase_config_json}" | jq -r '.projectId // ""' 2>/dev/null || echo "${project_id}")
            vite_firebase_auth_domain=$(echo "${firebase_config_json}" | jq -r '.authDomain // ""' 2>/dev/null || echo "${project_id}.firebaseapp.com")
            vite_firebase_storage_bucket=$(echo "${firebase_config_json}" | jq -r '.storageBucket // ""' 2>/dev/null || echo "${project_id}.appspot.com")
            vite_firebase_messaging_sender_id=$(echo "${firebase_config_json}" | jq -r '.messagingSenderId // ""' 2>/dev/null || echo "")
            vite_firebase_app_id=$(echo "${firebase_config_json}" | jq -r '.appId // ""' 2>/dev/null || echo "")
            vite_firebase_measurement_id=$(echo "${firebase_config_json}" | jq -r '.measurementId // ""' 2>/dev/null || echo "")
        else
            vite_firebase_api_key=$(echo "${firebase_config_json}" | grep -o '"apiKey"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"apiKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_project_id=$(echo "${firebase_config_json}" | grep -o '"projectId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"projectId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${project_id}")
            vite_firebase_auth_domain=$(echo "${firebase_config_json}" | grep -o '"authDomain"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"authDomain"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${project_id}.firebaseapp.com")
            vite_firebase_storage_bucket=$(echo "${firebase_config_json}" | grep -o '"storageBucket"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"storageBucket"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "${project_id}.appspot.com")
            vite_firebase_messaging_sender_id=$(echo "${firebase_config_json}" | grep -o '"messagingSenderId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"messagingSenderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_app_id=$(echo "${firebase_config_json}" | grep -o '"appId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"appId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
            vite_firebase_measurement_id=$(echo "${firebase_config_json}" | grep -o '"measurementId"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"measurementId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
        fi
    fi
    
    # Get auth app URL
    local cloud_run_api_service_name="rates-${env}-api-${region}"
    local vite_auth_app_url=""
    if vite_auth_app_url=$(gcloud run services describe "${cloud_run_api_service_name}" \
        --region="${region}" \
        --project="${project_id}" \
        --format="value(status.url)" 2>/dev/null); then
        print_success "Retrieved auth app URL: ${vite_auth_app_url}"
    else
        print_warning "Could not retrieve auth app URL"
    fi
    
    # Validate Firebase config
    if [[ -z "${vite_firebase_api_key}" ]] || [[ -z "${vite_firebase_app_id}" ]]; then
        print_error "Cannot build app: Firebase config is missing"
        return 1
    fi
    
    # Remove existing dist to force fresh build
    if [[ -d "${PROJECT_ROOT}/apps/app/dist" ]]; then
        print_info "Removing existing dist directory..."
        rm -rf "${PROJECT_ROOT}/apps/app/dist"
    fi
    
    # Build static files
    print_info "Building with Firebase config..."
    if (cd "${PROJECT_ROOT}" && env \
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
        VITE_AUTH_APP_URL="${vite_auth_app_url}" \
        NODE_ENV="production" \
        VITE_ENVIRONMENT="${env}" \
        pnpm --filter=app build >> "${LOG_FILE}" 2>&1); then
        print_success "App static files built successfully"
    else
        print_error "App build failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    # Verify dist exists
    if [[ ! -d "${PROJECT_ROOT}/apps/app/dist" ]]; then
        print_error "apps/app/dist directory does not exist"
        return 1
    fi
    
    # Create temporary Dockerfile for app
    local app_dockerfile="${PROJECT_ROOT}/.Dockerfile.app"
    cat > "${app_dockerfile}" <<EOF
FROM nginx:alpine
COPY apps/app/dist /usr/share/nginx/html
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files \$uri \$uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["sh", "-c", "sed -i 's/listen.*80/listen 8080/' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
EOF
    
    # Build app image
    print_step "Building app image..."
    if docker build --platform linux/amd64 -t "${image_name_app}" \
        -f "${app_dockerfile}" \
        "${PROJECT_ROOT}" >> "${LOG_FILE}" 2>&1; then
        print_success "App image built successfully"
        rm -f "${app_dockerfile}"
    else
        print_error "App image build failed"
        print_info "Check ${LOG_FILE} for details"
        rm -f "${app_dockerfile}"
        return 1
    fi
    
    # Push images
    print_step "Pushing images to Artifact Registry..."
    if docker push "${image_name_api}" >> "${LOG_FILE}" 2>&1; then
        print_success "API image pushed successfully"
    else
        print_error "API image push failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    if docker push "${image_name_app}" >> "${LOG_FILE}" 2>&1; then
        print_success "App image pushed successfully"
    else
        print_error "App image push failed"
        print_info "Check ${LOG_FILE} for details"
        return 1
    fi
    
    print_success "All images built and pushed successfully!"
    print_info ""
    print_info "Images:"
    print_info "  API: ${image_name_api}"
    print_info "  App: ${image_name_app}"
    print_info ""
    print_info "To deploy these images, update Cloud Run services or run Terraform apply."
    
    return 0
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    # Parse arguments
    if [[ $# -eq 0 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    local environment="$1"
    local image_tag="${2:-latest}"
    
    # Validate environment
    if ! validate_environment "${environment}"; then
        exit 1
    fi
    
    # Check prerequisites
    print_header "Checking Prerequisites"
    if ! check_prerequisites; then
        print_error "Prerequisites check failed"
        exit 1
    fi
    print_success "All prerequisites met"
    
    # Build and push
    if ! build_and_push_images "${environment}" "${image_tag}"; then
        print_error "Build and push failed"
        exit 1
    fi
    
    print_success "Build and push completed successfully!"
}

main "$@"
