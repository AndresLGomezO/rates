#!/bin/bash
# ============================================================================
# Fix Cloud Build Trigger Configuration
# ============================================================================
# Purpose: Verify and fix Cloud Build trigger filename configuration
#
# This script helps diagnose and fix the "File cloudbuild-dev.yaml not found"
# error by ensuring the trigger is configured correctly.
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "Cloud Build Trigger Configuration Fix"
echo "============================================================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Warning: No default project set. Please set it with:${NC}"
    echo "  gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "Project ID: ${PROJECT_ID}"
echo ""

# Check if trigger exists
TRIGGER_NAME="rates-dev-deploy"
echo "Checking trigger: ${TRIGGER_NAME}..."

TRIGGER_ID=$(gcloud builds triggers list \
    --filter="name:${TRIGGER_NAME}" \
    --format="value(id)" \
    --project="${PROJECT_ID}" 2>/dev/null || echo "")

if [ -z "$TRIGGER_ID" ]; then
    echo -e "${YELLOW}Trigger '${TRIGGER_NAME}' not found.${NC}"
    echo ""
    echo "The trigger may need to be created via Terraform:"
    echo "  cd infra/environments/application/dev"
    echo "  terraform apply"
    exit 1
fi

echo -e "${GREEN}Found trigger ID: ${TRIGGER_ID}${NC}"
echo ""

# Get current trigger configuration
echo "Current trigger configuration:"
gcloud builds triggers describe "${TRIGGER_ID}" \
    --project="${PROJECT_ID}" \
    --format="yaml" | grep -A 5 -E "(filename|github|branch)" || true

echo ""
echo "============================================================================"
echo "Verification Steps:"
echo "============================================================================"
echo ""
echo "1. Verify the file exists in your repository:"
echo "   git ls-tree develop cloudbuild-dev.yaml"
echo ""
echo "2. Check the trigger configuration in GCP Console:"
echo "   https://console.cloud.google.com/cloud-build/triggers;region=global/edit/${TRIGGER_ID}?project=${PROJECT_ID}"
echo ""
echo "3. The trigger should have:"
echo "   - Filename: cloudbuild-dev.yaml"
echo "   - Branch: ^develop$"
echo ""
echo "============================================================================"
echo "Troubleshooting:"
echo "============================================================================"
echo ""
echo "Since the trigger configuration appears correct, the issue might be:"
echo "  1. The file wasn't on the branch when a previous build was triggered"
echo "  2. The trigger needs to be refreshed/recreated"
echo "  3. A specific commit is missing the file"
echo ""
echo "Checking recent commits on develop branch..."
if git rev-parse --verify origin/develop >/dev/null 2>&1; then
    echo "Recent commits on develop:"
    git log --oneline origin/develop -5 --decorate 2>/dev/null || echo "  (Could not fetch branch info)"
else
    echo "  (Could not access origin/develop)"
fi
echo ""

# Check if file exists in current working directory
if [ -f "cloudbuild-dev.yaml" ]; then
    echo -e "${GREEN}✓ File exists in current directory${NC}"
else
    echo -e "${YELLOW}⚠ File not found in current directory${NC}"
    echo "  Make sure you're in the repository root"
fi
echo ""

echo "============================================================================"
echo "Fix Options:"
echo "============================================================================"
echo ""
echo "Option 1: Force Update via Terraform (Recommended)"
echo "  This will recreate the trigger with the correct configuration:"
echo "  cd infra/environments/application/dev"
echo "  terraform apply -replace=module.dev_deploy_trigger[0].google_cloudbuild_trigger.github[0]"
echo "  # Or simply:"
echo "  terraform apply  # Terraform will detect if changes are needed"
echo ""
echo "Option 2: Test the Trigger Manually"
echo "  Manually trigger a build to see the actual error:"
echo "  gcloud builds triggers run ${TRIGGER_ID} \\"
echo "    --branch=develop \\"
echo "    --project=${PROJECT_ID}"
echo ""
echo "  Then check the build logs:"
echo "  https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
echo ""
echo "Option 3: Export and Re-import Trigger (Force Refresh)"
echo "  # Export current trigger config"
echo "  gcloud builds triggers export ${TRIGGER_ID} \\"
echo "    --destination=trigger-config.yaml \\"
echo "    --project=${PROJECT_ID}"
echo ""
echo "  # Verify filename is 'cloudbuild-dev.yaml' in trigger-config.yaml"
echo "  # Then re-import to force refresh"
echo "  gcloud builds triggers import --source=trigger-config.yaml --project=${PROJECT_ID}"
echo ""
echo "Option 4: Manual Update via GCP Console"
echo "  1. Go to: https://console.cloud.google.com/cloud-build/triggers;region=global/edit/${TRIGGER_ID}?project=${PROJECT_ID}"
echo "  2. Click 'Edit'"
echo "  3. Verify 'Cloud Build configuration file' is: cloudbuild-dev.yaml"
echo "  4. Click 'Save' (even if no changes are needed - this forces a refresh)"
echo ""
echo "============================================================================"
echo "Understanding the Permission Error:"
echo "============================================================================"
echo ""
echo "The permission error you saw is EXPECTED and only affects MANUAL triggers."
echo "Your AUTOMATIC trigger (on push to develop) should still work!"
echo ""
echo "To check automatic build logs:"
echo "  1. Go to: https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
echo "  2. Look for builds triggered by 'rates-dev-deploy'"
echo "  3. Click on a failed build to see the actual error"
echo ""
echo "If you want to manually trigger builds, you need this IAM role:"
echo "  roles/cloudbuild.builds.editor"
echo ""
echo "Grant it with:"
echo "  gcloud projects add-iam-policy-binding ${PROJECT_ID} \\"
echo "    --member='user:$(gcloud config get-value account)' \\"
echo "    --role='roles/cloudbuild.builds.editor'"
echo ""
echo "============================================================================"
echo "Most Likely Solution for 'File not found' Error:"
echo "============================================================================"
echo ""
echo "Since your trigger config is correct, the issue is likely:"
echo "  1. A build was triggered before the file was committed"
echo "  2. The trigger needs to be refreshed"
echo ""
echo "Solution: Check automatic build logs (link above) to see the exact error."
echo "Then refresh the trigger via Option 1 (Terraform) or Option 4 (Console)."
echo ""
