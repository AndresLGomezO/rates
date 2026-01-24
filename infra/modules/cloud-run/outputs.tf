# ============================================================================
# CLOUD RUN MODULE - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#
# These outputs are consumed by:
#   - Firebase Hosting rewrites (service URL)
#   - CI/CD pipelines (service name for deployments)
#   - Monitoring and observability (service ID)
# ============================================================================

output "service_id" {
  description = "The fully qualified service ID"
  value       = google_cloud_run_v2_service.this.id
}

output "service_name" {
  description = "The service name"
  value       = google_cloud_run_v2_service.this.name
}

output "service_uri" {
  description = "The URI of the Cloud Run service"
  value       = google_cloud_run_v2_service.this.uri
}

output "service_url" {
  description = "The URL of the Cloud Run service (alias for uri)"
  value       = google_cloud_run_v2_service.this.uri
}

output "location" {
  description = "The location of the service"
  value       = google_cloud_run_v2_service.this.location
}

output "latest_revision" {
  description = "The latest revision of the service"
  value       = google_cloud_run_v2_service.this.latest_ready_revision
}

output "service_account_email" {
  description = "The service account attached to the service"
  value       = var.service_account_email
}

# Output for Firebase Hosting rewrite configuration
output "firebase_rewrite_config" {
  description = "Configuration snippet for Firebase Hosting rewrites"
  value = {
    source = "/api/**"
    run = {
      serviceId = google_cloud_run_v2_service.this.name
      region    = google_cloud_run_v2_service.this.location
    }
  }
}