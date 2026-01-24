# ============================================================================
# FOUNDATION LAYER - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 2 Outputs)
#
# These outputs are consumed by:
#   - Application layer (dev) via terraform_remote_state
#   - Application layer (prod) via terraform_remote_state
# ============================================================================

# ----------------------------------------------------------------------------
# Cloud Run Service Accounts
# ----------------------------------------------------------------------------

output "cloud_run_service_account_emails" {
  description = "Map of environment to Cloud Run service account emails"
  value = {
    for env, sa in module.cloud_run_service_accounts : env => sa.email
  }
}

output "dev_cloud_run_sa_email" {
  description = "Dev Cloud Run service account email"
  value       = module.cloud_run_service_accounts["dev"].email
}

output "prod_cloud_run_sa_email" {
  description = "Prod Cloud Run service account email"
  value       = module.cloud_run_service_accounts["prod"].email
}

# ----------------------------------------------------------------------------
# Cloud Build Service Accounts
# ----------------------------------------------------------------------------

output "cloud_build_service_account_emails" {
  description = "Map of environment to Cloud Build service account emails"
  value = {
    for env, sa in module.cloud_build_service_accounts : env => sa.email
  }
}

output "dev_cloud_build_sa_email" {
  description = "Dev Cloud Build service account email"
  value       = module.cloud_build_service_accounts["dev"].email
}

output "prod_cloud_build_sa_email" {
  description = "Prod Cloud Build service account email"
  value       = module.cloud_build_service_accounts["prod"].email
}

# ----------------------------------------------------------------------------
# Artifact Registry Repositories
# ----------------------------------------------------------------------------

output "artifact_registry_urls" {
  description = "Map of environment to Artifact Registry repository URLs (temporarily disabled due to GCP API issue)"
  value = {
    dev  = null  # Temporarily disabled - use external image registry
    prod = null  # Temporarily disabled - use external image registry
  }
}

output "dev_artifact_registry_url" {
  description = "Dev Artifact Registry repository URL (temporarily disabled - returns placeholder)"
  # Return a placeholder URL that can be used as a template
  # Application layer should handle null and use alternative image source
  value = "${var.region}-docker.pkg.dev/${var.project_id}/rates-dev-containers"
}

output "prod_artifact_registry_url" {
  description = "Prod Artifact Registry repository URL (temporarily disabled - returns placeholder)"
  value = "${var.region}-docker.pkg.dev/${var.project_id}/rates-prod-containers"
}

output "artifact_registry_docker_prefixes" {
  description = "Map of environment to Docker image prefixes (temporarily disabled)"
  value = {
    dev  = "${var.region}-docker.pkg.dev/${var.project_id}/rates-dev-containers"
    prod = "${var.region}-docker.pkg.dev/${var.project_id}/rates-prod-containers"
  }
}

# ----------------------------------------------------------------------------
# Project Information (Passthrough)
# ----------------------------------------------------------------------------

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

# ----------------------------------------------------------------------------
# API Status
# ----------------------------------------------------------------------------

output "enabled_apis" {
  description = "List of enabled APIs"
  value       = [for api in google_project_service.required_apis : api.service]
}

# ----------------------------------------------------------------------------
# Summary Output (for verification)
# ----------------------------------------------------------------------------

output "foundation_summary" {
  description = "Summary of all foundation resources created"
  value = {
    service_accounts = {
      cloud_run = {
        for env, sa in module.cloud_run_service_accounts : env => sa.email
      }
      cloud_build = {
        for env, sa in module.cloud_build_service_accounts : env => sa.email
      }
    }
    artifact_registry = {
      dev  = null  # Temporarily disabled due to GCP API issue
      prod = null  # Temporarily disabled due to GCP API issue
    }
    apis_enabled = length(google_project_service.required_apis)
  }
}