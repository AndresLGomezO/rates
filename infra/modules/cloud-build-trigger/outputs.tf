# ============================================================================
# CLOUD BUILD TRIGGER MODULE - OUTPUTS
# ============================================================================

output "trigger_id" {
  description = "The ID of the Cloud Build trigger"
  value       = var.repository_type == "github" ? google_cloudbuild_trigger.github[0].trigger_id : google_cloudbuild_trigger.csr[0].trigger_id
}

output "trigger_name" {
  description = "The name of the Cloud Build trigger"
  value       = var.trigger_name
}

output "service_account_email" {
  description = "Service account used by the trigger"
  value       = var.service_account_email
}

output "build_config_file" {
  description = "Path to the build configuration file"
  value       = var.build_config_file
}

output "branch_pattern" {
  description = "Branch pattern that triggers builds"
  value       = var.branch_pattern
}

output "console_url" {
  description = "URL to view the trigger in GCP Console"
  value       = "https://console.cloud.google.com/cloud-build/triggers;region=global/edit/${var.repository_type == "github" ? google_cloudbuild_trigger.github[0].trigger_id : google_cloudbuild_trigger.csr[0].trigger_id}?project=${var.project_id}"
}