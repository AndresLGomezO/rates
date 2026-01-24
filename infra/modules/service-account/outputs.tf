# ============================================================================
# SERVICE ACCOUNT MODULE - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#
# These outputs are consumed by:
#   - Application layer (Cloud Run service account attachment)
#   - Artifact Registry IAM bindings
#   - Secret Manager IAM bindings
# ============================================================================

output "email" {
  description = "Email address of the service account"
  value       = google_service_account.this.email
}

output "id" {
  description = "Fully qualified ID of the service account"
  value       = google_service_account.this.id
}

output "name" {
  description = "Fully qualified name of the service account"
  value       = google_service_account.this.name
}

output "unique_id" {
  description = "Unique numeric ID of the service account"
  value       = google_service_account.this.unique_id
}

output "member" {
  description = "IAM member string for this service account"
  value       = "serviceAccount:${google_service_account.this.email}"
}