#!/bin/bash
# import-existing.sh
# Automatically import existing GCP resources into Terraform state
# This prevents "already exists" errors during terraform apply

set -uo pipefail
# Note: We don't use 'set -e' because we want to continue even if imports fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Get project ID from terraform.tfvars or terraform output
get_project_id() {
  local project_id=""
  
  # Try to get from terraform output first
  if command -v terraform &> /dev/null && [ -f "terraform.tfstate" ] || [ -f ".terraform/terraform.tfstate" ]; then
    project_id=$(terraform output -raw project_id 2>/dev/null || echo "")
  fi
  
  # Fallback to terraform.tfvars
  if [ -z "${project_id}" ] && [ -f "terraform.tfvars" ]; then
    project_id=$(grep -E '^\s*project_id\s*=' terraform.tfvars | sed -E 's/.*project_id\s*=\s*"([^"]+)".*/\1/' | head -1)
  fi
  
  echo "${project_id}"
}

# Import a resource if it doesn't exist in state
import_resource() {
  local resource_address=$1
  local resource_id=$2
  local description=$3
  
  # Check if resource already exists in state
  if terraform state show "${resource_address}" &>/dev/null; then
    print_info "  ✓ ${description} already in state, skipping import"
    return 0
  fi
  
  print_info "  → Attempting to import ${description}..."
  # Capture both stdout and stderr
  local import_output
  local import_exit_code
  
  # Run import and capture output
  import_output=$(terraform import "${resource_address}" "${resource_id}" 2>&1)
  import_exit_code=$?
  
  if [ ${import_exit_code} -eq 0 ]; then
    print_success "  ✓ Successfully imported ${description}"
    return 0
  else
    # Check if error is "already in state" (which is OK)
    if echo "${import_output}" | grep -qi "already managed by Terraform\|Resource already managed\|already in state"; then
      print_info "  ✓ ${description} is already managed, skipping"
      return 0
    # Check if error is "does not exist" (also OK - will be created)
    elif echo "${import_output}" | grep -qi "does not exist\|not found\|404"; then
      print_info "  → ${description} does not exist (will be created)"
      return 0
    else
      # Show the actual error for debugging
      print_warning "  ⚠ Could not import ${description}"
      echo "     Error: $(echo "${import_output}" | head -1)"
      return 1  # Return error but don't fail script
    fi
  fi
}

main() {
  local project_id=$(get_project_id)
  
  if [ -z "${project_id}" ]; then
    print_error "Could not determine project_id. Please ensure terraform.tfvars exists or terraform has been initialized."
    exit 1
  fi
  
  print_info "Project ID: ${project_id}"
  echo ""
  
  # Check if terraform is initialized
  if [ ! -d ".terraform" ]; then
    print_warning "Terraform not initialized. Running terraform init..."
    terraform init -upgrade
  fi
  
  print_info "Checking for existing resources to import..."
  echo ""
  
  # Get environment and region from terraform.tfvars
  local environment=$(grep -E '^\s*environment\s*=' terraform.tfvars 2>/dev/null | sed -E 's/.*environment\s*=\s*"([^"]+)".*/\1/' | head -1 || echo "dev")
  local region=$(grep -E '^\s*region\s*=' terraform.tfvars 2>/dev/null | sed -E 's/.*region\s*=\s*"([^"]+)".*/\1/' | head -1 || echo "us-central1")
  local app_name=$(grep -E '^\s*app_name\s*=' terraform.tfvars 2>/dev/null | sed -E 's/.*app_name\s*=\s*"([^"]+)".*/\1/' | head -1 || echo "rates")
  
  # Import Identity Platform config (if exists)
  # Format: projects/PROJECT_ID
  # NOTE: Identity Platform is automatically enabled when Firebase is linked
  print_info "Checking Identity Platform config..."
  if gcloud identity config describe --project="${project_id}" &>/dev/null 2>&1; then
    import_resource \
      "module.firebase.google_identity_platform_config.default" \
      "projects/${project_id}" \
      "Identity Platform config"
  else
    print_info "Identity Platform config does not exist (will be created)"
  fi
  
  # Import Firestore database (if exists)
  # Format: projects/PROJECT_ID/databases/(default)
  print_info "Checking Firestore database..."
  if gcloud firestore databases describe --database="(default)" --project="${project_id}" &>/dev/null 2>&1; then
    import_resource \
      "module.firebase.google_firestore_database.default" \
      "projects/${project_id}/databases/(default)" \
      "Firestore database: (default)"
  else
    print_info "Firestore database does not exist (will be created)"
  fi
  
  # Import Firebase config secret (if exists)
  # Format: projects/PROJECT_ID/secrets/SECRET_ID
  local secret_id="firebase-client-config-${environment}"
  print_info "Checking Firebase config secret..."
  if gcloud secrets describe "${secret_id}" --project="${project_id}" &>/dev/null 2>&1; then
    import_resource \
      "module.firebase.google_secret_manager_secret.firebase_config" \
      "projects/${project_id}/secrets/${secret_id}" \
      "Secret Manager secret: ${secret_id}"
  else
    print_info "Firebase config secret does not exist (will be created)"
  fi
  
  # Import Artifact Registry repository (if exists)
  # Format: projects/PROJECT_ID/locations/REGION/repositories/REPOSITORY_ID
  local repo_id=$(grep -E '^\s*artifact_registry_repository_id\s*=' terraform.tfvars 2>/dev/null | sed -E 's/.*artifact_registry_repository_id\s*=\s*"([^"]+)".*/\1/' | head -1 || echo "")
  
  if [ -z "${repo_id}" ]; then
    # Try to infer from app_name and environment
    repo_id="${app_name}-${environment}-containers"
  fi
  
  print_info "Checking Artifact Registry repository..."
  if gcloud artifacts repositories describe "${repo_id}" --location="${region}" --project="${project_id}" &>/dev/null 2>&1; then
    import_resource \
      "module.artifact_registry.google_artifact_registry_repository.containers" \
      "projects/${project_id}/locations/${region}/repositories/${repo_id}" \
      "Artifact Registry repository: ${repo_id}"
  else
    print_info "Artifact Registry repository does not exist (will be created)"
  fi
  
  echo ""
  print_info "Verifying imports..."
  
  # Verify which resources are now in state
  local imported_count=0
  local failed_count=0
  
  if terraform state show "module.firebase.google_identity_platform_config.default" &>/dev/null; then
    print_success "✓ Identity Platform config is in state"
    ((imported_count++))
  else
    print_warning "⚠ Identity Platform config not in state (will be created)"
    ((failed_count++))
  fi
  
  if terraform state show "module.firebase.google_firestore_database.default" &>/dev/null; then
    print_success "✓ Firestore database is in state"
    ((imported_count++))
  else
    print_warning "⚠ Firestore database not in state (will be created)"
    ((failed_count++))
  fi
  
  if terraform state show "module.firebase.google_secret_manager_secret.firebase_config" &>/dev/null; then
    print_success "✓ Firebase config secret is in state"
    ((imported_count++))
  else
    print_warning "⚠ Firebase config secret not in state (will be created)"
    ((failed_count++))
  fi
  
  if terraform state show "module.artifact_registry.google_artifact_registry_repository.containers" &>/dev/null; then
    print_success "✓ Artifact Registry repository is in state"
    ((imported_count++))
  else
    print_warning "⚠ Artifact Registry repository not in state (will be created)"
    ((failed_count++))
  fi
  
  echo ""
  if [ ${imported_count} -gt 0 ]; then
    print_success "Import process complete! ${imported_count} resource(s) imported."
  else
    print_warning "No resources were imported. This is OK if they don't exist yet."
  fi
  
  if [ ${failed_count} -gt 0 ]; then
    print_warning "⚠ ${failed_count} resource(s) could not be imported."
    print_info "If these resources already exist in GCP, you may need to import them manually:"
    echo ""
    echo "  terraform import module.firebase.google_identity_platform_config.default projects/${project_id}"
    echo "  terraform import module.firebase.google_firestore_database.default projects/${project_id}/databases/(default)"
    echo "  terraform import module.firebase.google_secret_manager_secret.firebase_config projects/${project_id}/secrets/firebase-client-config-${environment}"
    echo "  terraform import module.artifact_registry.google_artifact_registry_repository.containers projects/${project_id}/locations/${region}/repositories/${repo_id}"
    echo ""
  fi
  
  print_info "You can now run 'terraform plan' to see what changes Terraform wants to make."
  echo ""
}

main "$@"
