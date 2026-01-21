# =============================================================================
# Development Environment Outputs
# =============================================================================

output "dev_project_id" {
  description = "Development GCP Project ID"
  value       = var.project_id_dev
}

output "dev_wif_provider" {
  description = "Workload Identity Provider resource name for development"
  value       = module.environment_dev.wif_provider_name
}

output "dev_service_account_email" {
  description = "Service account email for development deployments"
  value       = module.environment_dev.service_account_email
}

output "dev_ar_repository" {
  description = "Artifact Registry repository name for development"
  value       = var.ar_repository_dev
}

output "dev_cloud_run_services" {
  description = "Cloud Run service names for development"
  value = {
    app  = var.cloud_run_service_app_dev
    auth = var.cloud_run_service_auth_app_dev
    auth_api = var.cloud_run_service_auth_api_dev
  }
}

# =============================================================================
# Staging Environment Outputs
# =============================================================================

output "staging_project_id" {
  description = "Staging GCP Project ID"
  value       = var.project_id_staging
}

output "staging_wif_provider" {
  description = "Workload Identity Provider resource name for staging"
  value       = module.environment_staging.wif_provider_name
}

output "staging_service_account_email" {
  description = "Service account email for staging deployments"
  value       = module.environment_staging.service_account_email
}

output "staging_ar_repository" {
  description = "Artifact Registry repository name for staging"
  value       = var.ar_repository_staging
}

output "staging_cloud_run_services" {
  description = "Cloud Run service names for staging"
  value = {
    app  = var.cloud_run_service_app_staging
    auth = var.cloud_run_service_auth_app_staging
    auth_api = var.cloud_run_service_auth_api_staging
  }
}

# =============================================================================
# Production Environment Outputs
# =============================================================================

output "prod_project_id" {
  description = "Production GCP Project ID"
  value       = var.project_id_prod
}

output "prod_wif_provider" {
  description = "Workload Identity Provider resource name for production"
  value       = module.environment_prod.wif_provider_name
}

output "prod_service_account_email" {
  description = "Service account email for production deployments"
  value       = module.environment_prod.service_account_email
}

output "prod_ar_repository" {
  description = "Artifact Registry repository name for production"
  value       = var.ar_repository_prod
}

output "prod_cloud_run_services" {
  description = "Cloud Run service names for production"
  value = {
    app  = var.cloud_run_service_app_prod
    auth = var.cloud_run_service_auth_app_prod
    auth_api = var.cloud_run_service_auth_api_prod
  }
}

# =============================================================================
# GitHub Workflow Configuration
# =============================================================================

output "github_workflow_config" {
  description = "Configuration values for GitHub Actions workflow"
  value = {
    dev = {
      gcp_project_id           = var.project_id_dev
      ar_repository            = var.ar_repository_dev
      cloud_run_service_app    = var.cloud_run_service_app_dev
      cloud_run_service_auth   = var.cloud_run_service_auth_app_dev
      wif_provider             = module.environment_dev.wif_provider_name
      wif_service_account      = module.environment_dev.service_account_email
      github_environment       = "development"
    }
    staging = {
      gcp_project_id           = var.project_id_staging
      ar_repository            = var.ar_repository_staging
      cloud_run_service_app    = var.cloud_run_service_app_staging
      cloud_run_service_auth   = var.cloud_run_service_auth_app_staging
      wif_provider             = module.environment_staging.wif_provider_name
      wif_service_account      = module.environment_staging.service_account_email
      github_environment       = "staging"
    }
    prod = {
      gcp_project_id           = var.project_id_prod
      ar_repository            = var.ar_repository_prod
      cloud_run_service_app    = var.cloud_run_service_app_prod
      cloud_run_service_auth   = var.cloud_run_service_auth_app_prod
      wif_provider             = module.environment_prod.wif_provider_name
      wif_service_account      = module.environment_prod.service_account_email
      github_environment       = "production"
    }
  }
}
