#!/bin/bash
# Apply Terraform changes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAAC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$IAAC_DIR"

# Load environment and generate tfvars
"$SCRIPT_DIR/load-env.sh"

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "⚠️  No active GCP authentication found"
  echo "Please run: gcloud auth login"
  exit 1
fi

# Set default project (use first non-empty project ID)
if [ -f "$IAAC_DIR/.iaac.env" ]; then
  set -a
  source "$IAAC_DIR/.iaac.env"
  set +a
  
  if [ -n "$GCP_PROJECT_ID_DEV" ]; then
    DEFAULT_PROJECT="$GCP_PROJECT_ID_DEV"
  elif [ -n "$GCP_PROJECT_ID_STAGING" ]; then
    DEFAULT_PROJECT="$GCP_PROJECT_ID_STAGING"
  elif [ -n "$GCP_PROJECT_ID_PROD" ]; then
    DEFAULT_PROJECT="$GCP_PROJECT_ID_PROD"
  fi
  
  if [ -n "$DEFAULT_PROJECT" ]; then
    echo "🔐 Setting default GCP project to: $DEFAULT_PROJECT"
    gcloud config set project "$DEFAULT_PROJECT"
  fi
fi

echo ""
echo "📋 Planning Terraform changes..."
terraform plan -out=tfplan

echo ""
read -p "Apply these changes? (yes/no): " -r
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo ""
  echo "🚀 Applying Terraform changes..."
  terraform apply tfplan
  
  echo ""
  echo "✓ Infrastructure deployed successfully!"
  echo ""
  echo "📊 Outputs:"
  terraform output
  
  echo ""
  echo "💡 Next steps:"
  echo "  1. Update .github/workflows/deploy.yml with the WIF provider names from outputs above"
  echo "  2. Create GitHub environments: development, staging, production"
  echo "  3. Test deployment by pushing to develop/staging/main branches"
else
  echo "❌ Apply cancelled"
  exit 1
fi
