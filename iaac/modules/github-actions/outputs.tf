# modules/github-actions/outputs.tf
# GitHub Actions module outputs

output "deployment_config_secret_id" {
  description = "Secret Manager secret ID containing deployment configuration"
  value       = google_secret_manager_secret.deployment_config.secret_id
}

output "deployment_config_secret_name" {
  description = "Secret Manager secret full name"
  value       = google_secret_manager_secret.deployment_config.name
}

output "github_repository" {
  description = "GitHub repository information"
  value = {
    name      = data.github_repository.main.name
    full_name = data.github_repository.main.full_name
    id        = data.github_repository.main.id
  }
}

output "github_environment" {
  description = "GitHub environment name"
  value       = github_repository_environment.environment.environment
}

output "workflow_file_created" {
  description = "Whether workflow file was generated"
  value       = var.enable_workflow_generation
}

output "workflow_file_path" {
  description = "Path to generated workflow file (relative to repo root)"
  value       = var.enable_workflow_generation ? local.workflow_file_path : null
}

output "github_secrets_configured" {
  description = "GitHub secrets that were configured"
  value = {
    wif_provider        = github_actions_secret.wif_provider.secret_name
    wif_service_account  = github_actions_secret.wif_service_account.secret_name
  }
}

output "github_variables_configured" {
  description = "GitHub variables that were configured"
  value = {
    deployment_config_secret = github_actions_variable.deployment_config_secret.variable_name
    environment             = github_actions_variable.environment.variable_name
  }
}

output "deployment_config_json" {
  description = "Deployment configuration JSON (for reference)"
  value       = local.deployment_config
  sensitive   = false # JSON contains non-sensitive config (project IDs are public)
}

output "next_steps" {
  description = "Next steps after module creation"
  value = <<-EOT
    GitHub Actions automation has been configured!
    
    Next steps:
    1. Review the generated workflow file: ${var.enable_workflow_generation ? local.workflow_file_path : "N/A"}
    2. Commit and push the workflow file to your repository
    3. Verify GitHub secrets are set:
       - WIF_PROVIDER
       - WIF_SERVICE_ACCOUNT
    4. Verify GitHub variables are set:
       - DEPLOYMENT_CONFIG_SECRET
       - ENVIRONMENT
    5. Test the deployment by pushing to ${var.workflow_branch} branch
    
    The workflow will:
    - Authenticate via Workload Identity Federation (keyless)
    - Retrieve configuration from Secret Manager (${local.deployment_config_secret_id})
    - Build and push container image to Artifact Registry
    - Deploy to Cloud Run with dynamic configuration
    
    All configuration is retrieved at runtime - NO hardcoded values!
  EOT
}
