#!/bin/bash
# Load .iaac.env file and generate terraform.tfvars

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IAAC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$IAAC_DIR/.iaac.env"
TFVARS_FILE="$IAAC_DIR/terraform.tfvars"

# Check if .iaac.env exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .iaac.env file not found at $ENV_FILE"
  echo "Please copy .iaac.env.example to .iaac.env and fill in your values"
  exit 1
fi

# Source the .iaac.env file
set -a
source "$ENV_FILE"
set +a

# Basic required inputs
if [ -z "${GITHUB_OWNER:-}" ] || [ -z "${GITHUB_REPO:-}" ]; then
  echo "Error: GITHUB_OWNER and GITHUB_REPO are required in .iaac.env"
  exit 1
fi

if [ -z "${GCP_PROJECT_ID_DEV:-}" ] || [ -z "${GCP_PROJECT_ID_STAGING:-}" ] || [ -z "${GCP_PROJECT_ID_PROD:-}" ]; then
  echo "Error: GCP_PROJECT_ID_DEV, GCP_PROJECT_ID_STAGING, and GCP_PROJECT_ID_PROD must be set in .iaac.env"
  echo "Tip: If you're creating projects via Terraform, still set the desired project IDs here."
  exit 1
fi

# Validate project ID length (GCP requires 6-30 characters)
validate_project_id() {
  local project_id="$1"
  local env_name="$2"
  local len=${#project_id}
  
  if [ $len -lt 6 ] || [ $len -gt 30 ]; then
    echo "Error: GCP_PROJECT_ID_${env_name}='${project_id}' is ${len} characters"
    echo "GCP project IDs must be 6-30 characters long"
    echo "Suggested fix: Use a longer name like '${project_id}-prod' or '${project_id}app'"
    exit 1
  fi
  
  # Validate format: lowercase letters, digits, hyphens, must start with letter
  if ! echo "$project_id" | grep -qE '^[a-z][a-z0-9-]*[a-z0-9]$'; then
    echo "Error: GCP_PROJECT_ID_${env_name}='${project_id}' has invalid format"
    echo "Project IDs must: start with a letter, contain only lowercase letters/digits/hyphens, no trailing hyphens"
    exit 1
  fi
}

validate_project_id "${GCP_PROJECT_ID_DEV}" "DEV"
validate_project_id "${GCP_PROJECT_ID_STAGING}" "STAGING"
validate_project_id "${GCP_PROJECT_ID_PROD}" "PROD"

if [ "${CREATE_PROJECTS:-false}" = "true" ] && [ -z "${GCP_BILLING_ACCOUNT_ID:-}" ]; then
  echo "Error: CREATE_PROJECTS=true requires GCP_BILLING_ACCOUNT_ID in .iaac.env"
  exit 1
fi

# Generate terraform.tfvars
cat > "$TFVARS_FILE" <<EOF
# Auto-generated from .iaac.env - DO NOT EDIT MANUALLY
# Edit .iaac.env instead and run scripts/load-env.sh

github_owner = "${GITHUB_OWNER}"
github_repo = "${GITHUB_REPO}"
gcp_region = "${GCP_REGION:-us-central1}"

project_id_dev = "${GCP_PROJECT_ID_DEV}"
project_id_staging = "${GCP_PROJECT_ID_STAGING}"
project_id_prod = "${GCP_PROJECT_ID_PROD}"

create_projects = ${CREATE_PROJECTS:-false}
billing_account_id = "${GCP_BILLING_ACCOUNT_ID:-}"
organization_id = "${GCP_ORGANIZATION_ID:-}"

wif_pool_id = "${WIF_POOL_ID:-github-pool}"
wif_provider_id = "${WIF_PROVIDER_ID:-github-provider}"

sa_name_dev = "${SA_NAME_DEV:-github-ci-dev}"
sa_name_staging = "${SA_NAME_STAGING:-github-ci-staging}"
sa_name_prod = "${SA_NAME_PROD:-github-ci-prod}"

ar_repository_dev = "${AR_REPOSITORY_DEV:-dev-rates}"
ar_repository_staging = "${AR_REPOSITORY_STAGING:-staging-rates}"
ar_repository_prod = "${AR_REPOSITORY_PROD:-rates}"

cloud_run_service_app_dev = "${CLOUD_RUN_SERVICE_APP_DEV:-rates-app-dev}"
cloud_run_service_app_staging = "${CLOUD_RUN_SERVICE_APP_STAGING:-rates-app-staging}"
cloud_run_service_app_prod = "${CLOUD_RUN_SERVICE_APP_PROD:-rates-app}"

cloud_run_service_auth_app_dev = "${CLOUD_RUN_SERVICE_AUTH_APP_DEV:-rates-auth-app-dev}"
cloud_run_service_auth_app_staging = "${CLOUD_RUN_SERVICE_AUTH_APP_STAGING:-rates-auth-app-staging}"
cloud_run_service_auth_app_prod = "${CLOUD_RUN_SERVICE_AUTH_APP_PROD:-rates-auth-app}"

cloud_run_cpu = "${CLOUD_RUN_CPU:-1}"
cloud_run_memory = "${CLOUD_RUN_MEMORY:-512Mi}"
cloud_run_min_instances = ${CLOUD_RUN_MIN_INSTANCES:-0}
cloud_run_max_instances = ${CLOUD_RUN_MAX_INSTANCES:-3}
cloud_run_concurrency = ${CLOUD_RUN_CONCURRENCY:-80}

github_branch_dev = "${GITHUB_BRANCH_DEV:-develop}"
github_branch_staging = "${GITHUB_BRANCH_STAGING:-staging}"
github_branch_prod = "${GITHUB_BRANCH_PROD:-main}"

enable_apis = ${ENABLE_APIS:-true}
create_cloud_run_services = ${CREATE_CLOUD_RUN_SERVICES:-true}
grant_service_account_user = ${GRANT_SERVICE_ACCOUNT_USER:-false}
EOF

echo "✓ Generated terraform.tfvars from .iaac.env"
echo "  Location: $TFVARS_FILE"
