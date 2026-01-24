#!/usr/bin/env bash

# Terraform Cleanup Script
# Removes all Terraform state files, cached data, and optionally destroys resources
# Use this to start fresh with a new deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR"
DESTROY_RESOURCES=false
CLEAN_REMOTE_STATE=false
AUTO_YES=false

# Parse arguments
while getopts "dryh" opt; do
  case $opt in
    d) DESTROY_RESOURCES=true ;;
    r) CLEAN_REMOTE_STATE=true ;;
    y) AUTO_YES=true ;;
    h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -d    Destroy resources via terraform destroy (requires terraform init)"
      echo "  -r    Clean remote state from GCS bucket (requires gcloud access)"
      echo "  -y    Auto-confirm all prompts (use with caution)"
      echo "  -h    Show this help message"
      echo ""
      echo "This script removes:"
      echo "  - All local Terraform state files (*.tfstate, *.tfstate.backup)"
      echo "  - All .terraform directories (provider cache)"
      echo "  - All .terraform.lock.hcl files"
      echo "  - terraform.tfvars files (keeps .example files)"
      echo ""
      echo "With -d: Also runs terraform destroy in each environment"
      echo "With -r: Also removes remote state from GCS bucket"
      exit 0
      ;;
    *) echo "Invalid option. Use -h for help."; exit 1 ;;
  esac
done

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
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

confirm() {
    if $AUTO_YES; then
        return 0
    fi
    read -rp "$1 (yes/no): " ans
    [[ "$ans" == "yes" ]]
}

# Find all Terraform directories
find_terraform_dirs() {
    find "$INFRA_DIR/environments" -type f -name "*.tf" -exec dirname {} \; | sort -u
}

# Clean local state files
clean_local_state() {
    print_header "Cleaning Local Terraform State Files"
    
    local count=0
    
    # Find and remove state files
    while IFS= read -r dir; do
        if [[ -f "$dir/terraform.tfstate" ]]; then
            rm -f "$dir/terraform.tfstate"
            print_success "Removed: $dir/terraform.tfstate"
            ((count++))
        fi
        if [[ -f "$dir/terraform.tfstate.backup" ]]; then
            rm -f "$dir/terraform.tfstate.backup"
            print_success "Removed: $dir/terraform.tfstate.backup"
            ((count++))
        fi
    done < <(find_terraform_dirs)
    
    if [[ $count -eq 0 ]]; then
        print_info "No local state files found"
    else
        print_success "Removed $count local state file(s)"
    fi
}

# Clean .terraform directories
clean_terraform_dirs() {
    print_header "Cleaning .terraform Directories"
    
    local count=0
    
    while IFS= read -r dir; do
        if [[ -d "$dir/.terraform" ]]; then
            rm -rf "$dir/.terraform"
            print_success "Removed: $dir/.terraform"
            ((count++))
        fi
    done < <(find_terraform_dirs)
    
    if [[ $count -eq 0 ]]; then
        print_info "No .terraform directories found"
    else
        print_success "Removed $count .terraform directory(ies)"
    fi
}

# Clean .terraform.lock.hcl files
clean_lock_files() {
    print_header "Cleaning .terraform.lock.hcl Files"
    
    local count=0
    
    while IFS= read -r dir; do
        if [[ -f "$dir/.terraform.lock.hcl" ]]; then
            rm -f "$dir/.terraform.lock.hcl"
            print_success "Removed: $dir/.terraform.lock.hcl"
            ((count++))
        fi
    done < <(find_terraform_dirs)
    
    if [[ $count -eq 0 ]]; then
        print_info "No .terraform.lock.hcl files found"
    else
        print_success "Removed $count .terraform.lock.hcl file(s)"
    fi
}

# Clean terraform.tfvars (but keep .example files)
clean_tfvars() {
    print_header "Cleaning terraform.tfvars Files"
    
    local count=0
    
    while IFS= read -r dir; do
        if [[ -f "$dir/terraform.tfvars" ]]; then
            rm -f "$dir/terraform.tfvars"
            print_success "Removed: $dir/terraform.tfvars"
            ((count++))
        fi
    done < <(find_terraform_dirs)
    
    if [[ $count -eq 0 ]]; then
        print_info "No terraform.tfvars files found"
    else
        print_success "Removed $count terraform.tfvars file(s)"
        print_warning "terraform.tfvars.example files were kept"
    fi
}

# Destroy resources via terraform destroy
destroy_resources() {
    print_header "Destroying Terraform Resources"
    
    print_warning "This will destroy all resources managed by Terraform!"
    print_warning "This action cannot be undone!"
    
    if ! confirm "Are you sure you want to destroy all resources?"; then
        print_info "Skipping resource destruction"
        return
    fi
    
    # Destroy in reverse order: prod -> dev -> foundation -> bootstrap
    local phases=(
        "application/prod"
        "application/dev"
        "foundation"
        "bootstrap"
    )
    
    for phase in "${phases[@]}"; do
        local phase_dir="$INFRA_DIR/environments/$phase"
        
        if [[ ! -d "$phase_dir" ]]; then
            print_info "Skipping $phase (directory not found)"
            continue
        fi
        
        print_info "Destroying resources in: $phase"
        
        cd "$phase_dir"
        
        # Check if terraform is initialized
        if [[ ! -d ".terraform" ]]; then
            print_warning "Terraform not initialized in $phase, skipping destroy"
            continue
        fi
        
        # Run terraform destroy
        if terraform destroy -auto-approve 2>/dev/null; then
            print_success "Destroyed resources in: $phase"
        else
            print_error "Failed to destroy resources in: $phase"
            print_info "This may be expected if resources don't exist"
        fi
    done
    
    cd "$SCRIPT_DIR"
}

# Clean remote state from GCS
clean_remote_state() {
    print_header "Cleaning Remote State from GCS"
    
    print_warning "This will remove all Terraform state files from the GCS bucket!"
    
    if ! confirm "Are you sure you want to clean remote state?"; then
        print_info "Skipping remote state cleanup"
        return
    fi
    
    # Try to get bucket name from bootstrap backend or use default
    local bucket_name="rates-terraform-state"
    
    # Check if bucket exists
    if ! gsutil ls "gs://$bucket_name" &>/dev/null; then
        print_warning "Bucket gs://$bucket_name does not exist or is not accessible"
        print_info "Skipping remote state cleanup"
        return
    fi
    
    print_info "Removing state files from gs://$bucket_name"
    
    # Remove state files for each phase
    local prefixes=(
        "application/prod/"
        "application/dev/"
        "foundation/"
        "bootstrap/"
    )
    
    for prefix in "${prefixes[@]}"; do
        local state_path="gs://$bucket_name/$prefix"
        
        if gsutil ls "$state_path" &>/dev/null; then
            print_info "Removing: $state_path"
            gsutil -m rm -r "$state_path" || true
            print_success "Removed: $state_path"
        else
            print_info "No state found at: $state_path"
        fi
    done
    
    print_success "Remote state cleanup complete"
}

# Main execution
main() {
    print_header "Terraform Cleanup Script"
    
    print_info "This script will clean up all Terraform state and cached data"
    print_info "Script directory: $INFRA_DIR"
    
    if [[ "$DESTROY_RESOURCES" == true ]]; then
        print_warning "Resource destruction is ENABLED (-d flag)"
    fi
    
    if [[ "$CLEAN_REMOTE_STATE" == true ]]; then
        print_warning "Remote state cleanup is ENABLED (-r flag)"
    fi
    
    if ! $AUTO_YES; then
        echo ""
        if ! confirm "Continue with cleanup?"; then
            print_info "Cleanup cancelled"
            exit 0
        fi
    fi
    
    # Clean local files
    clean_local_state
    clean_terraform_dirs
    clean_lock_files
    clean_tfvars
    
    # Optional: Destroy resources
    if [[ "$DESTROY_RESOURCES" == true ]]; then
        destroy_resources
    fi
    
    # Optional: Clean remote state
    if [[ "$CLEAN_REMOTE_STATE" == true ]]; then
        clean_remote_state
    fi
    
    print_header "Cleanup Complete"
    print_success "All Terraform state and cached data has been cleaned"
    print_info "You can now run deploy.sh to start fresh"
    echo ""
}

# Run main function
main
