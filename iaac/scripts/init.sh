#!/bin/bash
# Initialize Terraform and load environment variables

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAAC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$IAAC_DIR"

echo "🔧 Initializing Terraform infrastructure..."

# Load environment and generate tfvars
"$SCRIPT_DIR/load-env.sh"

# Initialize Terraform
echo ""
echo "📦 Initializing Terraform..."
terraform init

echo ""
echo "✓ Terraform initialized successfully!"
echo ""
echo "Next steps:"
echo "  1. Review the plan: terraform plan"
echo "  2. Apply changes: terraform apply"
