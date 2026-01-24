# ============================================================================
# APPLICATION LAYER (PROD) - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 4)
#                  docs/TERRAFORM_DESIGN.md (Layer 2: Application)
#                  docs/IAM_SECURITY_MODEL.md (Secrets & Service Accounts)
#                  docs/COST_GUARDRAILS.md (Resource Limits)
#                  docs/GCP_PROJECT_STRUCTURE.md (Naming Convention)
#
# ⚠️  PRODUCTION ENVIRONMENT
#     - All changes require careful review
#     - Test in dev environment first
#     - Verify terraform plan before apply
#
# Purpose: Deploy prod environment application resources
#
# Resources Created:
#   - Secret Manager secrets (2): rates-prod-firebase-sa, rates-prod-nonce-secret
#   - Cloud Run service (auth-app): rates-prod-api-us-central1
#   - Cloud Run service (app): rates-prod-app-us-central1
#
# Dependencies:
#   - Foundation layer outputs (service accounts, Artifact Registry)
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0, < 6.0.0"
    }
  }
}

# ----------------------------------------------------------------------------
# Provider Configuration
# ----------------------------------------------------------------------------

provider "google" {
  project = var.project_id
  region  = var.region
}

# ----------------------------------------------------------------------------
# Remote State - Foundation Layer
# ----------------------------------------------------------------------------
# Source: docs/TERRAFORM_DESIGN.md §5.2 (Dependency Injection)

data "terraform_remote_state" "foundation" {
  backend = "gcs"
  config = {
    bucket = "rates-terraform-state"
    prefix = "foundation/"
  }
}

# ----------------------------------------------------------------------------
# Local Values
# ----------------------------------------------------------------------------

locals {
  environment = var.environment
  
  # Naming convention: rates-{env}-{component}-{region}
  # Source: docs/GCP_PROJECT_STRUCTURE.md §4.1
  resource_prefix = "rates-${local.environment}"
  
  # Service account from foundation layer
  cloud_run_sa_email = data.terraform_remote_state.foundation.outputs.prod_cloud_run_sa_email
  
  # Artifact Registry URL from foundation layer
  # Note: May be null if Artifact Registry is disabled (GCP API issue)
  artifact_registry_url = try(
    data.terraform_remote_state.foundation.outputs.prod_artifact_registry_url,
    null
  )
  
  # Container image URLs
  # Fallback to a test image if Artifact Registry is not available or use_fallback_image is true
  # Set use_fallback_image=true during initial setup, then switch to false after building/pushing the actual image
  container_image_api = var.use_fallback_image || local.artifact_registry_url == null || local.artifact_registry_url == "" ? "gcr.io/google-samples/hello-app:1.0" : "${local.artifact_registry_url}/api:${var.container_image_tag}"
  container_image_app = var.use_fallback_image || local.artifact_registry_url == null || local.artifact_registry_url == "" ? "gcr.io/google-samples/hello-app:1.0" : "${local.artifact_registry_url}/app:${var.container_image_tag}"
  
  # Secret names
  # Source: docs/IAM_SECURITY_MODEL.md §6.2 (Secret Inventory)
  secrets = {
    firebase_sa  = "${local.resource_prefix}-firebase-sa"
    nonce_secret = "${local.resource_prefix}-nonce-secret"
  }
  
  # Cloud Run service names
  # Source: docs/GCP_PROJECT_STRUCTURE.md §4.2 (Cloud Run naming)
  cloud_run_service_name_api = "${local.resource_prefix}-api-${var.region}"
  cloud_run_service_name_app = "${local.resource_prefix}-app-${var.region}"
}

# ============================================================================
# DEPLOYMENT APPROVAL GATE
# ============================================================================
# Source: docs/IMPLEMENTATION_PLAN.md §Phase 4 (Manual Approval Required)
#
# This check ensures explicit approval before production deployment.
# Set deployment_approved = true in terraform.tfvars or via CLI:
#   terraform apply -var="deployment_approved=true"

resource "null_resource" "deployment_approval_gate" {
  count = var.deployment_approved ? 0 : 1

  provisioner "local-exec" {
    command = "echo 'ERROR: Production deployment requires explicit approval. Set deployment_approved=true after reviewing terraform plan.' && exit 1"
  }
}

# ============================================================================
# SECRET MANAGER SECRETS
# ============================================================================
# Source: docs/IAM_SECURITY_MODEL.md §6.2 (Secret Inventory)
#
# IMPORTANT: These create secret RESOURCES only, not VALUES.
# Secret values must be created manually after Terraform apply:
#   gcloud secrets versions add rates-prod-firebase-sa --data-file=firebase-sa-prod.json
#   gcloud secrets versions add rates-prod-nonce-secret --data-file=-
#
# ⚠️  PRODUCTION SECRETS
#     - Use different values than dev environment
#     - Store secret values securely (not in version control)
#     - Document secret rotation procedures

module "firebase_sa_secret" {
  source = "../../../modules/secret"

  project_id  = var.project_id
  secret_id   = local.secrets.firebase_sa
  environment = local.environment
  description = "Firebase service account JSON for ${local.environment} environment Cloud Run service"

  # Grant access to Cloud Run service account
  # Source: docs/IAM_SECURITY_MODEL.md §6.3 (Secret Access)
  accessor_service_account_emails = [local.cloud_run_sa_email]

  labels = {
    secret_type = "service-account"
    criticality = "high"
  }

  depends_on = [null_resource.deployment_approval_gate]
}

module "nonce_secret" {
  source = "../../../modules/secret"

  project_id  = var.project_id
  secret_id   = local.secrets.nonce_secret
  environment = local.environment
  description = "Shared nonce secret for ${local.environment} environment token validation"

  # Grant access to Cloud Run service account
  accessor_service_account_emails = [local.cloud_run_sa_email]

  labels = {
    secret_type = "application-secret"
    criticality = "high"
  }

  depends_on = [null_resource.deployment_approval_gate]
}

# ============================================================================
# CLOUD RUN SERVICE
# ============================================================================
# Source: docs/COST_GUARDRAILS.md §2.1 (Compute Capping)
#         docs/IAM_SECURITY_MODEL.md §1.1.1 (Cloud Run Service Account)
#         docs/GCP_PROJECT_STRUCTURE.md §4.2 (Naming)
#
# COST GUARDRAILS (ENFORCED - Same as dev for free tier compliance):
#   - max_instances = 2
#   - min_instances = 0
#   - cpu = 1 vCPU
#   - memory = 512Mi
#   - timeout = 30s
#
# ⚠️  PRODUCTION SERVICE
#     - Ensure container image is production-ready
#     - Verify secrets are created before deployment
#     - Test thoroughly in dev environment first

module "cloud_run_api" {
  source = "../../../modules/cloud-run"

  project_id   = var.project_id
  service_name = local.cloud_run_service_name_api
  region       = var.region
  environment  = local.environment

  # Service Account
  # Source: docs/IAM_SECURITY_MODEL.md (Dedicated SA, no default)
  service_account_email = local.cloud_run_sa_email

  # Container Image
  container_image = local.container_image_api

  # Resource Limits (HARD LIMITS from docs/COST_GUARDRAILS.md §2.1)
  # Same limits as dev to maintain free tier compliance
  max_instances   = 2       # HARD LIMIT - DO NOT EXCEED
  min_instances   = 0       # REQUIRED - Scale to zero
  cpu             = "1"     # HARD LIMIT
  memory          = "512Mi" # HARD LIMIT
  timeout_seconds = 30      # HARD LIMIT

  # Concurrency
  max_concurrent_requests = 80

  # Secrets (mounted as environment variables)
  # Source: docs/IAM_SECURITY_MODEL.md §6.3 (Secret Access)
  # Only include secrets if include_secrets is true AND secrets have versions
  # Set include_secrets=false during initial setup, then set to true after creating secret values
  secrets = var.include_secrets ? {
    firebase_sa = {
      secret_id = module.firebase_sa_secret.secret_id
      version   = "latest"
      env_var   = "FIREBASE_SERVICE_ACCOUNT"
    }
    nonce = {
      secret_id = module.nonce_secret.secret_id
      version   = "latest"
      env_var   = "NONCE_SECRET"
    }
  } : {}

  # Non-sensitive environment variables
  environment_variables = {
    NODE_ENV    = var.node_env
    ENVIRONMENT = local.environment
    PROJECT_ID  = var.project_id
    REGION      = var.region
  }

  # Ingress Configuration
  # Source: docs/IAM_SECURITY_MODEL.md §5.1 (Public internet access)
  ingress               = "all"
  allow_unauthenticated = true

  labels = {
    environment = local.environment
    component   = "auth-app-api"
    criticality = "high"
  }

  depends_on = [
    null_resource.deployment_approval_gate,
    module.firebase_sa_secret,
    module.nonce_secret
  ]
}

# ============================================================================
# CLOUD RUN SERVICE - APP (Main Financial Accounts SPA)
# ============================================================================
# Source: docs/COST_GUARDRAILS.md §2.1 (Compute Capping)
#         docs/IAM_SECURITY_MODEL.md §1.1.1 (Cloud Run Service Account)
#         docs/GCP_PROJECT_STRUCTURE.md §4.2 (Naming)
#
# COST GUARDRAILS (ENFORCED - Same as dev for free tier compliance):
#   - max_instances = 2
#   - min_instances = 0
#   - cpu = 1 vCPU
#   - memory = 512Mi
#   - timeout = 30s
#
# ⚠️  PRODUCTION SERVICE
#     - Ensure container image is production-ready
#     - Verify secrets are created before deployment
#     - Test thoroughly in dev environment first

module "cloud_run_app" {
  source = "../../../modules/cloud-run"

  project_id   = var.project_id
  service_name = local.cloud_run_service_name_app
  region       = var.region
  environment  = local.environment

  # Service Account
  # Source: docs/IAM_SECURITY_MODEL.md (Dedicated SA, no default)
  service_account_email = local.cloud_run_sa_email

  # Container Image
  container_image = local.container_image_app

  # Resource Limits (HARD LIMITS from docs/COST_GUARDRAILS.md §2.1)
  # Same limits as dev to maintain free tier compliance
  max_instances   = 2       # HARD LIMIT - DO NOT EXCEED
  min_instances   = 0       # REQUIRED - Scale to zero
  cpu             = "1"     # HARD LIMIT
  memory          = "512Mi" # HARD LIMIT
  timeout_seconds = 30      # HARD LIMIT

  # Concurrency
  max_concurrent_requests = 80

  # Secrets (mounted as environment variables)
  # Source: docs/IAM_SECURITY_MODEL.md §6.3 (Secret Access)
  # Only include secrets if include_secrets is true AND secrets have versions
  # Set include_secrets=false during initial setup, then set to true after creating secret values
  secrets = var.include_secrets ? {
    firebase_sa = {
      secret_id = module.firebase_sa_secret.secret_id
      version   = "latest"
      env_var   = "FIREBASE_SERVICE_ACCOUNT"
    }
    nonce = {
      secret_id = module.nonce_secret.secret_id
      version   = "latest"
      env_var   = "NONCE_SECRET"
    }
  } : {}

  # Non-sensitive environment variables
  environment_variables = {
    NODE_ENV    = var.node_env
    ENVIRONMENT = local.environment
    PROJECT_ID  = var.project_id
    REGION      = var.region
  }

  # Ingress Configuration
  # Source: docs/IAM_SECURITY_MODEL.md §5.1 (Public internet access)
  ingress               = "all"
  allow_unauthenticated = true

  labels = {
    environment = local.environment
    component   = "app"
    criticality = "high"
  }

  depends_on = [
    null_resource.deployment_approval_gate,
    module.firebase_sa_secret,
    module.nonce_secret
  ]
}