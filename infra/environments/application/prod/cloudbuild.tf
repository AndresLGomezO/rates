# ============================================================================
# APPLICATION LAYER (PROD) - CLOUD BUILD TRIGGERS
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 5)
#                  docs/IAM_SECURITY_MODEL.md §4 (CI/CD Permissions)
#                  docs/COST_GUARDRAILS.md (Build Limits)
#
# ⚠️  PRODUCTION CI/CD - Manual approval required
#
# Purpose: Create Cloud Build triggers for prod environment deployments
#
# Triggers:
#   - rates-prod-deploy: Full deployment on main branch push (WITH APPROVAL)
#
# Branch: main → prod environment
# Approval: REQUIRED (production safety guardrail)
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

variable "cicd_require_approval" {
  type        = bool
  description = "Require manual approval for production deployments (STRONGLY RECOMMENDED)"
  default     = true
}

# ----------------------------------------------------------------------------
# Cloud Build Trigger - Prod Deployment
# ----------------------------------------------------------------------------
# Trigger: Push to main branch
# Action: Build and deploy to prod environment
# Approval: REQUIRED (configurable but defaults to true)

module "prod_deploy_trigger" {
  source = "../../../modules/cloud-build-trigger"
  count  = var.enable_cicd && var.github_owner != null ? 1 : 0

  project_id   = var.project_id
  trigger_name = "rates-prod-deploy"
  description  = "Deploy Rates application to prod environment on main branch push (requires approval)"
  environment  = "prod"

  # Repository configuration
  repository_type = var.repository_type
  github_owner    = var.github_owner
  github_repo     = var.github_repo

  # Branch configuration
  # Source: docs/IMPLEMENTATION_PLAN.md §Phase 5 (main → prod)
  branch_pattern = "^main$"

  # File filters - trigger on application code changes
  included_files = [
    "apps/**",
    "packages/**",
    "cloudbuild-prod.yaml",
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
  build_config_file = "cloudbuild-prod.yaml"

  # Service account
  # Source: docs/IAM_SECURITY_MODEL.md §4.1 (Prod Cloud Build SA)
  service_account_email = data.terraform_remote_state.foundation.outputs.prod_cloud_build_sa_email

  # Substitution variables for build
  substitutions = {
    _REGION              = var.region
    _ARTIFACT_REGISTRY   = data.terraform_remote_state.foundation.outputs.prod_artifact_registry_url
    _CLOUD_RUN_SERVICE   = local.cloud_run_service_name_api
    _CLOUD_RUN_SERVICE_APP = local.cloud_run_service_name_app
    _FIREBASE_SA_SECRET  = module.firebase_sa_secret.secret_id
    _NONCE_SECRET        = module.nonce_secret.secret_id
  }

  # ⚠️  APPROVAL REQUIRED FOR PRODUCTION
  # Source: docs/IMPLEMENTATION_PLAN.md §Phase 5 (Manual approval for prod)
  require_approval = var.cicd_require_approval

  labels = {
    application = "rates"
    component   = "full-stack"
    criticality = "high"
  }
}

# ----------------------------------------------------------------------------
# CI/CD Outputs
# ----------------------------------------------------------------------------

output "cicd_trigger_id" {
  description = "Cloud Build trigger ID for prod deployment"
  value       = var.enable_cicd && var.github_owner != null ? module.prod_deploy_trigger[0].trigger_id : null
}

output "cicd_trigger_url" {
  description = "URL to view the trigger in GCP Console"
  value       = var.enable_cicd && var.github_owner != null ? module.prod_deploy_trigger[0].console_url : null
}

output "cicd_configuration" {
  description = "CI/CD configuration summary"
  value = var.enable_cicd ? {
    enabled              = true
    trigger_name         = "rates-prod-deploy"
    branch               = "main"
    build_config         = "cloudbuild-prod.yaml"
    service_account      = data.terraform_remote_state.foundation.outputs.prod_cloud_build_sa_email
    approval_required    = var.cicd_require_approval
    warning              = var.cicd_require_approval ? null : "⚠️ APPROVAL DISABLED - Production deployments will be automatic!"
  } : {
    enabled = false
    note    = "Set enable_cicd=true and github_owner to enable CI/CD"
  }
}

output "cicd_approval_warning" {
  description = "Warning if approval is disabled for production"
  value       = var.enable_cicd && !var.cicd_require_approval ? "⚠️ WARNING: Production CI/CD approval is DISABLED. This is NOT RECOMMENDED." : null
}