#!/bin/bash
# Destroy Terraform infrastructure (use with caution!)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAAC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$IAAC_DIR"

echo "⚠️  WARNING: This will destroy all infrastructure!"
echo ""
read -p "Are you sure you want to destroy? Type 'yes' to confirm: " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Destroy cancelled"
  exit 1
fi

# Load environment and generate tfvars
"$SCRIPT_DIR/load-env.sh"

echo ""
echo "🗑️  Destroying infrastructure..."
terraform destroy

echo ""
echo "✓ Infrastructure destroyed"
