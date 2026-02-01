#!/usr/bin/env bash

# ============================================================================
# LIBRARY TEST SCRIPT
# ============================================================================
# Purpose: Test that all library modules can be sourced without errors
# Usage: ./test_libraries.sh
# ============================================================================

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Testing library modules..."
echo ""

# Test core libraries
echo "Testing core libraries..."
source "${SCRIPT_DIR}/scripts/lib/colors.sh" && echo "✓ colors.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/logging.sh" && echo "✓ logging.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/prompts.sh" && echo "✓ prompts.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/config.sh" && echo "✓ config.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/utils.sh" && echo "✓ utils.sh loaded"

echo ""
echo "Testing service libraries..."
source "${SCRIPT_DIR}/scripts/lib/gcloud.sh" && echo "✓ gcloud.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/terraform.sh" && echo "✓ terraform.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/firebase.sh" && echo "✓ firebase.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/docker.sh" && echo "✓ docker.sh loaded"
source "${SCRIPT_DIR}/scripts/lib/secrets.sh" && echo "✓ secrets.sh loaded"

echo ""
echo "All libraries loaded successfully!"
echo ""

# Test a few functions
echo "Testing logging functions..."
print_success "Success message works"
print_info "Info message works"
print_warning "Warning message works"
print_step "Step message works"

echo ""
echo "Library test complete! ✅"
