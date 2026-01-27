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

print_header "Enable Identity Toolkit API"

# Get project ID
PROJECT_ID="${1:-}"
if [ -z "${PROJECT_ID}" ]; then
    # Try to get from gcloud config
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -z "${PROJECT_ID}" ]; then
        print_error "Project ID not provided and could not get from gcloud config"
        print_info "Usage: $0 <project-id>"
        print_info "Or set your default project: gcloud config set project <project-id>"
        exit 1
    fi
fi

print_info "Using project: ${PROJECT_ID}"

# Enable Identity Toolkit API
print_step "Enabling Identity Toolkit API..."
if gcloud services enable identitytoolkit.googleapis.com --project="${PROJECT_ID}"; then
    print_success "Identity Toolkit API enabled successfully"
else
    print_error "Failed to enable Identity Toolkit API"
    print_info "You can enable it manually at:"
    print_info "  https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=${PROJECT_ID}"
    exit 1
fi

# Also enable Firebase-related APIs that might be needed
print_step "Enabling additional Firebase APIs..."
APIS=(
    "firebase.googleapis.com"
    "firebasehosting.googleapis.com"
    "firestore.googleapis.com"
    "storage-component.googleapis.com"
)

for api in "${APIS[@]}"; do
    if gcloud services enable "${api}" --project="${PROJECT_ID}" 2>/dev/null; then
        print_success "Enabled ${api}"
    else
        print_warning "Could not enable ${api} (may already be enabled or require permissions)"
    fi
done

print_header "Done"
print_info "The Identity Toolkit API is now enabled for project ${PROJECT_ID}"
print_info "If you just enabled it, wait a few minutes for the changes to propagate"
print_info "Then retry your authentication request"
