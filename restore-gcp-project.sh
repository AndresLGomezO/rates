#!/bin/bash

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
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

print_header "Restore Soft-Deleted GCP Project"

# Get project ID from terraform.tfvars or use argument
PROJECT_ID="${1:-}"
if [ -z "${PROJECT_ID}" ]; then
    # Try to get from terraform.tfvars
    if [ -f "infra/environments/application/dev/terraform.tfvars" ]; then
        PROJECT_ID=$(grep "^project_id" infra/environments/application/dev/terraform.tfvars | cut -d'"' -f2 || echo "")
    fi
    
    if [ -z "${PROJECT_ID}" ]; then
        print_error "Project ID not provided"
        print_info "Usage: $0 <project-id>"
        print_info "Example: $0 dev-rates"
        exit 1
    fi
fi

print_info "Project ID: ${PROJECT_ID}"

# Check if project exists
print_step "Checking project status..."
PROJECT_STATUS=$(gcloud projects describe "${PROJECT_ID}" --format="value(lifecycleState)" 2>&1 || echo "NOT_FOUND")

if [ "${PROJECT_STATUS}" = "ACTIVE" ]; then
    print_success "Project is already active"
    exit 0
elif [ "${PROJECT_STATUS}" = "DELETE_REQUESTED" ]; then
    print_warning "Project is soft-deleted (DELETE_REQUESTED)"
    print_info "Attempting to restore..."
    
    if gcloud projects undelete "${PROJECT_ID}" 2>&1; then
        print_success "Project restoration initiated"
        print_info "Waiting for project to be restored (this may take a few minutes)..."
        
        # Wait for project to be restored (max 5 minutes)
        MAX_WAIT=300
        ELAPSED=0
        while [ ${ELAPSED} -lt ${MAX_WAIT} ]; do
            sleep 10
            ELAPSED=$((ELAPSED + 10))
            STATUS=$(gcloud projects describe "${PROJECT_ID}" --format="value(lifecycleState)" 2>&1 || echo "NOT_FOUND")
            if [ "${STATUS}" = "ACTIVE" ]; then
                print_success "Project is now active!"
                break
            fi
            print_info "Still waiting... (${ELAPSED}s/${MAX_WAIT}s)"
        done
        
        if [ "${STATUS}" != "ACTIVE" ]; then
            print_warning "Project restoration is taking longer than expected"
            print_info "Check project status manually: gcloud projects describe ${PROJECT_ID}"
        fi
    else
        print_error "Failed to restore project"
        print_info "You may need to restore it manually:"
        print_info "  1. Go to: https://console.cloud.google.com/iam-admin/projects"
        print_info "  2. Find the project '${PROJECT_ID}'"
        print_info "  3. Click 'Restore'"
        exit 1
    fi
elif [ "${PROJECT_STATUS}" = "NOT_FOUND" ]; then
    print_error "Project '${PROJECT_ID}' not found"
    print_info "The project may have been permanently deleted (after 30 days)"
    print_info "Or you may not have permission to view it"
    exit 1
else
    print_warning "Project status: ${PROJECT_STATUS}"
    print_info "Unknown project state. Please check manually:"
    print_info "  gcloud projects describe ${PROJECT_ID}"
    exit 1
fi

# After restoration, enable required APIs
print_step "Enabling required APIs..."
APIS=(
    "identitytoolkit.googleapis.com"
    "firebase.googleapis.com"
    "run.googleapis.com"
    "artifactregistry.googleapis.com"
    "secretmanager.googleapis.com"
    "cloudbuild.googleapis.com"
)

for api in "${APIS[@]}"; do
    if gcloud services enable "${api}" --project="${PROJECT_ID}" 2>/dev/null; then
        print_success "Enabled ${api}"
    else
        print_warning "Could not enable ${api} (may already be enabled or require permissions)"
    fi
done

print_header "Done"
print_info "Project ${PROJECT_ID} should now be restored and APIs enabled"
print_info "Wait a few minutes for changes to propagate, then retry your operations"
