# ============================================================================
# BOOTSTRAP LAYER - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 1 Outputs)
#
# These outputs are consumed by:
#   - Foundation layer (backend configuration)
#   - Application layers (backend configuration)
# ============================================================================

output "state_bucket_name" {
  description = "Name of the GCS bucket for Terraform state"
  value       = google_storage_bucket.terraform_state.name
}

output "state_bucket_url" {
  description = "URL of the GCS bucket for Terraform state"
  value       = google_storage_bucket.terraform_state.url
}

output "state_bucket_location" {
  description = "Location of the GCS bucket for Terraform state"
  value       = google_storage_bucket.terraform_state.location
}

output "state_bucket_self_link" {
  description = "Self-link of the GCS bucket for Terraform state"
  value       = google_storage_bucket.terraform_state.self_link
}

output "project_id" {
  description = "GCP Project ID (passthrough for dependent layers)"
  value       = var.project_id
}

output "region" {
  description = "GCP Region (passthrough for dependent layers)"
  value       = var.region
}

# ----------------------------------------------------------------------------
# Backend Configuration Snippet (for copy-paste into other layers)
# ----------------------------------------------------------------------------

output "foundation_backend_config" {
  description = "Backend configuration snippet for Foundation layer"
  value       = <<-EOT
    terraform {
      backend "gcs" {
        bucket = "${google_storage_bucket.terraform_state.name}"
        prefix = "foundation/"
      }
    }
  EOT
}

output "application_dev_backend_config" {
  description = "Backend configuration snippet for Application (Dev) layer"
  value       = <<-EOT
    terraform {
      backend "gcs" {
        bucket = "${google_storage_bucket.terraform_state.name}"
        prefix = "application/dev/"
      }
    }
  EOT
}

output "application_prod_backend_config" {
  description = "Backend configuration snippet for Application (Prod) layer"
  value       = <<-EOT
    terraform {
      backend "gcs" {
        bucket = "${google_storage_bucket.terraform_state.name}"
        prefix = "application/prod/"
      }
    }
  EOT
}