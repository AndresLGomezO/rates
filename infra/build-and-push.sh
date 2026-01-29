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

# Export LOG_FILE before sourcing libraries so logging.sh can use it
export LOG_FILE="${SCRIPT_DIR}/.build-push.log"

# ============================================================================
# SOURCE LIBRARIES
# ============================================================================

# Source required libraries
source "${SCRIPT_DIR}/scripts/lib/colors.sh"
source "${SCRIPT_DIR}/scripts/lib/logging.sh"
source "${SCRIPT_DIR}/scripts/lib/prompts.sh"
source "${SCRIPT_DIR}/scripts/lib/gcloud.sh"
source "${SCRIPT_DIR}/scripts/build/api_image.sh"
source "${SCRIPT_DIR}/scripts/build/app_assets.sh"
source "${SCRIPT_DIR}/scripts/build/app_image.sh"
source "${SCRIPT_DIR}/scripts/deploy/cloud_run.sh"

# ============================================================================
# HELP
# ============================================================================

show_help() {
    cat <<EOF
${BOLD}Build and Push Script${NC}

${BOLD}Usage:${NC}
  ./build-and-push.sh <environment> [tag] [--deploy]

${BOLD}Arguments:${NC}
  environment    Environment to build for: dev or prod (required)
  tag            Docker image tag (default: latest)
  --deploy       Also deploy to Cloud Run after building/pushing

${BOLD}Examples:${NC}
  ./build-and-push.sh dev                    # Build and push dev with 'latest' tag
  ./build-and-push.sh dev v1.2.3             # Build and push dev with 'v1.2.3' tag
  ./build-and-push.sh dev latest --deploy    # Build, push, and deploy to dev
  ./build-and-push.sh prod v1.0.0 --deploy  # Build, push, and deploy to prod

${BOLD}What this script does:${NC}
  1. Builds auth-app API container image
  2. Builds app static files container image
  3. Pushes both images to Artifact Registry
  4. Uses secrets from Secret Manager for build configuration
  5. (Optional with --deploy) Deploys to Cloud Run via Terraform

${BOLD}Deploying with "latest":${NC}
  For --deploy with tag "latest", the script uses a unique tag (e.g. dev-1738...)
  and builds without cache so Terraform and Cloud Run see a real change.
  Use an explicit tag (e.g. v1.0.0) to avoid that and control the image tag.

${BOLD}Prerequisites:${NC}
  - Docker installed and running
  - Authenticated with GCP (gcloud auth login)
  - Docker configured for Artifact Registry
  - Secrets exist in Secret Manager (created by infra/setup.sh)

${BOLD}Note:${NC}
  By default, this script only builds and pushes images.
  Use --deploy flag to also deploy to Cloud Run via Terraform.
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

# ============================================================================
# BUILD AND PUSH
# ============================================================================

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
    
    # Retrieve Firebase config from Secret Manager
    print_step "Retrieving Firebase config from Secret Manager..."
    local firebase_config_secret="rates-${env}-firebase-web-config"
    local firebase_config_json=""
    
    if firebase_config_json=$(gcloud secrets versions access latest --secret="${firebase_config_secret}" --project="${project_id}" 2>/dev/null); then
        print_success "Retrieved Firebase config"
    else
        print_warning "Could not retrieve Firebase config: ${firebase_config_secret}"
        print_info "Build will proceed without Firebase config (may fail if required)"
    fi
    
    # Retrieve nonce secret
    print_step "Retrieving nonce secret..."
    local nonce_secret_name="rates-${env}-nonce-secret"
    local nonce_secret=""
    
    if nonce_secret=$(gcloud secrets versions access latest --secret="${nonce_secret_name}" --project="${project_id}" 2>/dev/null); then
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
        print_success "Retrieved main app URL: ${main_app_url}"
    else
        print_warning "Could not retrieve project number for main app URL"
    fi
    
    # Build API image
    if ! build_api_image "${PROJECT_ROOT}" "${image_name_api}" "${env}" \
        "${firebase_config_json}" "${nonce_secret}" "${main_app_url}" \
        "${LOG_FILE}" "${FORCE_REBUILD:-0}"; then
        return 1
    fi
    
    # Get auth app URL
    local cloud_run_api_service_name="rates-${env}-api-${region}"
    local auth_app_url=""
    if auth_app_url=$(gcloud run services describe "${cloud_run_api_service_name}" \
        --region="${region}" \
        --project="${project_id}" \
        --format="value(status.url)" 2>/dev/null); then
        print_success "Retrieved auth app URL: ${auth_app_url}"
    else
        print_warning "Could not retrieve auth app URL"
    fi
    
    # Build app static files
    if ! build_app_assets "${PROJECT_ROOT}" "${env}" "${firebase_config_json}" \
        "${nonce_secret}" "${auth_app_url}" "${LOG_FILE}"; then
        return 1
    fi
    
    # Build app image
    if ! build_app_image "${PROJECT_ROOT}" "${image_name_app}" "${LOG_FILE}" "${FORCE_REBUILD:-0}"; then
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
    
    local environment=""
    local image_tag="latest"
    local deploy=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --deploy)
                deploy=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            dev|prod)
                if [[ -z "${environment}" ]]; then
                    environment="$1"
                else
                    print_error "Environment specified multiple times"
                    exit 1
                fi
                shift
                ;;
            *)
                # Assume it's a tag if it doesn't start with --
                if [[ "$1" =~ ^v?[0-9] ]] || [[ "$1" == "latest" ]]; then
                    image_tag="$1"
                else
                    print_error "Unknown argument: $1"
                    print_info "Use --help for usage information"
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # Validate environment was provided
    if [[ -z "${environment}" ]]; then
        print_error "Environment is required (dev or prod)"
        print_info "Use --help for usage information"
        exit 1
    fi
    
    # Validate environment
    if ! validate_environment "${environment}"; then
        exit 1
    fi
    
    # When deploying with tag "latest", use a unique tag so Terraform will update
    # Cloud Run. Terraform only sees the image URL (e.g. .../api:latest), not the
    # digest, so re-pushing :latest produces no plan change and no deploy.
    if [[ "${deploy}" == "true" ]] && [[ "${image_tag}" == "latest" ]]; then
        image_tag="${environment}-$(date +%s)"
        export FORCE_REBUILD=1
        print_info "Using unique deploy tag: ${image_tag} (avoids Terraform no-op on :latest; building without cache)"
    fi
    
    # Check prerequisites
    print_header "Checking Prerequisites"
    if ! check_prerequisites; then
        print_error "Prerequisites check failed"
        exit 1
    fi
    
    # Check Terraform if deploying
    if [[ "${deploy}" == "true" ]]; then
        if ! command -v terraform &> /dev/null; then
            print_error "Terraform is required for deployment"
            print_info "Install Terraform: https://www.terraform.io/downloads"
            exit 1
        fi
    fi
    
    print_success "All prerequisites met"
    
    # Build and push
    if ! build_and_push_images "${environment}" "${image_tag}"; then
        print_error "Build and push failed"
        exit 1
    fi
    
    # Deploy if requested
    if [[ "${deploy}" == "true" ]]; then
        print_header "Deploying to Cloud Run"
        if ! deploy_to_cloud_run "${environment}" "${image_tag}" "${SCRIPT_DIR}" "${LOG_FILE}"; then
            print_error "Deployment failed"
            exit 1
        fi
        print_success "Build, push, and deployment completed successfully!"
    else
        print_success "Build and push completed successfully!"
        print_info ""
        print_info "To deploy these images, run:"
        print_info "  ./infra/build-and-push.sh ${environment} ${image_tag} --deploy"
    fi
}

main "$@"
