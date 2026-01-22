# modules/iam/outputs.tf
# IAM module outputs

output "cloudrun_runtime_service_account" {
  description = "Cloud Run runtime service account email"
  value       = google_service_account.cloudrun_runtime.email
}

output "cloudrun_runtime_service_account_id" {
  description = "Cloud Run runtime service account ID"
  value       = google_service_account.cloudrun_runtime.id
}

output "cloudrun_runtime_service_account_name" {
  description = "Cloud Run runtime service account name (for IAM bindings)"
  value       = google_service_account.cloudrun_runtime.name
}

output "cicd_deployer_service_account" {
  description = "CI/CD deployer service account email"
  value       = google_service_account.cicd_deployer.email
}

output "cicd_deployer_service_account_id" {
  description = "CI/CD deployer service account ID"
  value       = google_service_account.cicd_deployer.id
}

output "cicd_deployer_service_account_name" {
  description = "CI/CD deployer service account name (for IAM bindings)"
  value       = google_service_account.cicd_deployer.name
}

output "cloudrun_runtime_roles" {
  description = "List of IAM roles granted to Cloud Run runtime service account"
  value       = local.cloudrun_runtime_roles
}

output "cicd_deployer_roles" {
  description = "List of IAM roles granted to CI/CD deployer service account"
  value       = local.cicd_deployer_roles
}

output "cross_service_bindings" {
  description = "Cross-service IAM bindings created"
  value = {
    artifact_registry_cicd_writer = var.artifact_registry_repository_id != null ? true : false
  }
}
