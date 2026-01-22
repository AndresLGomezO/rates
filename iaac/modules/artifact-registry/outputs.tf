# modules/artifact-registry/outputs.tf
# Artifact Registry module outputs

output "repository_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.containers.repository_id
}

output "repository_name" {
  description = "Artifact Registry repository name (full resource name)"
  value       = google_artifact_registry_repository.containers.name
}

output "repository_url" {
  description = "Artifact Registry repository URL for Docker push/pull"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "location" {
  description = "Artifact Registry repository location"
  value       = google_artifact_registry_repository.containers.location
}

output "free_tier_status" {
  description = "Artifact Registry free tier usage information"
  value = {
    free_storage_gb    = 0.5
    cleanup_aggressive = var.keep_recent_versions <= 3 && var.untagged_retention_days <= 3
    immutable_tags     = var.enable_immutable_tags
    pricing_doc        = "https://cloud.google.com/artifact-registry/pricing"
  }
}
