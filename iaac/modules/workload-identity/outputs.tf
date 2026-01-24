# modules/workload-identity/outputs.tf
# Workload Identity Federation module outputs

output "workload_identity_pool_id" {
  description = "Workload Identity Pool ID"
  value       = google_iam_workload_identity_pool.github.workload_identity_pool_id
}

output "workload_identity_pool_name" {
  description = "Workload Identity Pool full name (for IAM bindings)"
  value       = google_iam_workload_identity_pool.github.name
}

output "workload_identity_provider_id" {
  description = "Workload Identity Pool Provider ID"
  value       = google_iam_workload_identity_pool_provider.github.workload_identity_pool_provider_id
}

output "workload_identity_provider_name" {
  description = "Workload Identity Pool Provider full name (for GitHub Actions)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "workload_identity_provider_resource_name" {
  description = "Workload Identity Pool Provider resource name (projects/{project_number}/locations/global/workloadIdentityPools/{pool_id}/providers/{provider_id})"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_config" {
  description = "Configuration for GitHub Actions workflow"
  value = {
    workload_identity_provider = google_iam_workload_identity_pool_provider.github.name
    service_account_email      = var.cicd_service_account_email
    github_repo                = var.github_repo
    github_owner               = local.github_owner
    github_environments        = var.github_environments
  }
}

output "github_actions_workflow_example" {
  description = "Example GitHub Actions workflow snippet for authentication"
  value       = <<-EOT
    # Authenticate to Google Cloud using Workload Identity Federation
    - name: Authenticate to Google Cloud
      id: auth
      uses: google-github-actions/auth@v2.1.7
      with:
        workload_identity_provider: '${google_iam_workload_identity_pool_provider.github.name}'
        service_account: '${var.cicd_service_account_email}'
  EOT
}
