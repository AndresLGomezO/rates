#!/bin/bash
# Script to completely clean up Terraform temporary data and state files

set -e

echo "🧹 Cleaning up Terraform temporary data and state files..."

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IAAC_DIR="$PROJECT_DIR/iaac"

cd "$PROJECT_DIR"

# Step 1: Remove .terraform directories (recursively)
echo "📦 Removing .terraform directories..."
find "$IAAC_DIR" -type d -name ".terraform" -exec rm -rf {} + 2>/dev/null || true

# Step 2: Remove .terraform.lock.hcl files
echo "🔒 Removing .terraform.lock.hcl files..."
find "$IAAC_DIR" -type f -name ".terraform.lock.hcl" -delete 2>/dev/null || true

# Step 3: Remove terraform state files
echo "💾 Removing terraform state files (*.tfstate, *.tfstate.*)..."
find "$IAAC_DIR" -type f -name "*.tfstate" -delete 2>/dev/null || true
find "$IAAC_DIR" -type f -name "*.tfstate.*" -delete 2>/dev/null || true

# Step 4: Remove terraform plan files
echo "📋 Removing terraform plan files (tfplan, tfplan.*)..."
find "$IAAC_DIR" -type f -name "tfplan" -delete 2>/dev/null || true
find "$IAAC_DIR" -type f -name "tfplan.*" -delete 2>/dev/null || true

# Step 5: Remove crash.log files (if any)
echo "📝 Removing crash.log files..."
find "$IAAC_DIR" -type f -name "crash.log" -delete 2>/dev/null || true

# Step 6: Remove override.tf files (if any - these are sometimes temporary)
# Note: We're not removing override.tf files as they might be intentional
# Uncomment the next lines if you want to remove them:
# echo "🔄 Removing override.tf files..."
# find "$IAAC_DIR" -type f -name "override.tf" -delete 2>/dev/null || true

echo ""
echo "✅ Terraform cleanup complete!"
echo ""
echo "📁 Cleaned directory: $IAAC_DIR"
echo ""
echo "💡 You can now run 'terraform init' to recreate the environment."
