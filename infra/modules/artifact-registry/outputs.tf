# ============================================================================
# ARTIFACT REGISTRY MODULE - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#
# These outputs are consumed by:
#   - Application layer (Cloud Run container image reference)
#   - CI/CD pipelines (image push destination)
# ============================================================================

output "repository_id" {
  description = "The repository ID"
  value       = google_artifact_registry_repository.this.repository_id
}

output "repository_name" {
  description = "The fully qualified repository name"
  value       = google_artifact_registry_repository.this.name
}

output "repository_url" {
  description = "The repository URL for Docker operations"
  value       = "${var.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}"
}

output "location" {
  description = "The repository location"
  value       = google_artifact_registry_repository.this.location
}

output "docker_image_prefix" {
  description = "Prefix for Docker images in this repository"
  value       = "${var.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}"
}