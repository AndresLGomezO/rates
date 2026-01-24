# ============================================================================
# APPLICATION LAYER (DEV) - CLOUD BUILD TRIGGERS
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 5)
#                  docs/IAM_SECURITY_MODEL.md §4 (CI/CD Permissions)
#                  docs/COST_GUARDRAILS.md (Build Limits)
#
# Purpose: Create Cloud Build triggers for dev environment deployments
#
# Triggers:
#   - rates-dev-deploy: Full deployment on develop branch push
#
# Branch: develop → dev environment
# Approval: Not required (dev is safe for automatic deployments)
# ============================================================================

# ----------------------------------------------------------------------------
# Variables for CI/CD Configuration
# ----------------------------------------------------------------------------

variable "enable_cicd" {
  type        = bool
  description = "Enable Cloud Build triggers for CI/CD"
  default     = false
}

variable "github_owner" {
  type        = string
  description = "GitHub repository owner (organization or username)"
  default     = null
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name"
  default     = "rates"
}

variable "repository_type" {
  type        = string
  description = "Type of repository (github or cloud-source-repositories)"
  default     = "github"

  validation {
    condition     = contains(["github", "cloud-source-repositories"], var.repository_type)
    error_message = "Repository type must be 'github' or 'cloud-source-repositories'."
  }
}

# ----------------------------------------------------------------------------
# Cloud Build Trigger - Dev Deployment
# ----------------------------------------------------------------------------
# Trigger: Push to develop branch
# Action: Build and deploy to dev environment
# Approval: Not required

module "dev_deploy_trigger" {
  source = "../../../modules/cloud-build-trigger"
  count  = var.enable_cicd && var.github_owner != null ? 1 : 0

  project_id   = var.project_id
  trigger_name = "rates-dev-deploy"
  description  = "Deploy Rates application to dev environment on develop branch push"
  environment  = "dev"

  # Repository configuration
  repository_type = var.repository_type
  github_owner    = var.github_owner
  github_repo     = var.github_repo

  # Branch configuration
  # Source: docs/IMPLEMENTATION_PLAN.md §Phase 5 (develop → dev)
  branch_pattern = "^develop$"

  # File filters - trigger on application code changes
  included_files = [
    "apps/**",
    "packages/**",
    "cloudbuild-dev.yaml",
    "Dockerfile",
    "package.json",
    "pnpm-lock.yaml",
  ]

  # Ignore documentation and config changes
  ignored_files = [
    "docs/**",
    "*.md",
    "infra/**",
    ".github/**",
  ]

  # Build configuration
  build_config_file = "cloudbuild-dev.yaml"

  # Service account
  # Source: docs/IAM_SECURITY_MODEL.md §4.1 (Dev Cloud Build SA)
  service_account_email = data.terraform_remote_state.foundation.outputs.dev_cloud_build_sa_email

  # Substitution variables for build
  substitutions = {
    _REGION              = var.region
    _ARTIFACT_REGISTRY   = data.terraform_remote_state.foundation.outputs.dev_artifact_registry_url
    _CLOUD_RUN_SERVICE   = local.cloud_run_service_name_api
    _CLOUD_RUN_SERVICE_APP = local.cloud_run_service_name_app
    _FIREBASE_SA_SECRET  = module.firebase_sa_secret.secret_id
    _NONCE_SECRET        = module.nonce_secret.secret_id
  }

  # No approval required for dev
  require_approval = false

  labels = {
    application = "rates"
    component   = "full-stack"
  }
}

# ----------------------------------------------------------------------------
# CI/CD Outputs
# ----------------------------------------------------------------------------

output "cicd_trigger_id" {
  description = "Cloud Build trigger ID for dev deployment"
  value       = var.enable_cicd && var.github_owner != null ? module.dev_deploy_trigger[0].trigger_id : null
}

output "cicd_trigger_url" {
  description = "URL to view the trigger in GCP Console"
  value       = var.enable_cicd && var.github_owner != null ? module.dev_deploy_trigger[0].console_url : null
}

output "cicd_configuration" {
  description = "CI/CD configuration summary"
  value = var.enable_cicd ? {
    enabled              = true
    trigger_name         = "rates-dev-deploy"
    branch               = "develop"
    build_config         = "cloudbuild-dev.yaml"
    service_account      = data.terraform_remote_state.foundation.outputs.dev_cloud_build_sa_email
    approval_required    = false
  } : {
    enabled = false
    note    = "Set enable_cicd=true and github_owner to enable CI/CD"
  }
}