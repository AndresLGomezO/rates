output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "project_number" {
  description = "GCP Project Number"
  value       = data.google_project.current.number
}

output "wif_pool_name" {
  description = "Workload Identity Pool resource name"
  value       = google_iam_workload_identity_pool.github_pool.name
}

output "wif_provider_name" {
  description = "Workload Identity Provider resource name"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "service_account_email" {
  description = "Deployer service account email"
  value       = google_service_account.deployer.email
}

output "service_account_id" {
  description = "Deployer service account ID"
  value       = google_service_account.deployer.id
}

output "ar_repository_name" {
  description = "Artifact Registry repository name"
  value       = google_artifact_registry_repository.rates.name
}

output "cloud_run_service_app_url" {
  description = "Cloud Run service URL for app"
  value       = var.create_cloud_run_services ? google_cloud_run_service.app[0].status[0].url : null
}

output "cloud_run_service_auth_url" {
  description = "Cloud Run service URL for auth app"
  value       = var.create_cloud_run_services ? google_cloud_run_service.auth_app[0].status[0].url : null
}
