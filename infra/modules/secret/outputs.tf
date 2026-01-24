# ============================================================================
# SECRET MODULE - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#
# These outputs are consumed by:
#   - Cloud Run module (secret references in environment variables)
#   - Application layer (secret name for manual value creation)
# ============================================================================

output "secret_id" {
  description = "The secret ID"
  value       = google_secret_manager_secret.this.secret_id
}

output "secret_name" {
  description = "The fully qualified secret name"
  value       = google_secret_manager_secret.this.name
}

output "secret_version_latest" {
  description = "Reference to the latest version of the secret"
  value       = "${google_secret_manager_secret.this.name}/versions/latest"
}

output "project_id" {
  description = "The project ID where the secret is created"
  value       = var.project_id
}

# Helper output for Cloud Run secret reference
output "cloud_run_secret_ref" {
  description = "Secret reference format for Cloud Run environment variables"
  value = {
    secret_id = google_secret_manager_secret.this.secret_id
    version   = "latest"
  }
}