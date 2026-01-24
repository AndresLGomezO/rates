# ============================================================================
# SECRET MODULE - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/IAM_SECURITY_MODEL.md §6 (Secrets Strategy)
#                  docs/TERRAFORM_DESIGN.md §3.2.4 (Module Design)
#
# Purpose: Create a Secret Manager secret with IAM access control.
#
# IMPORTANT: This module creates the secret RESOURCE only, not the secret VALUE.
#            Secret values must be created manually via:
#              gcloud secrets versions add <secret-id> --data-file=<file>
#
# Security Principles:
#   - IAM-based access control
#   - Environment-specific secrets
#   - Audit logging (automatic via Secret Manager)
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0, < 6.0.0"
    }
  }
}

# ----------------------------------------------------------------------------
# Secret Manager Secret
# ----------------------------------------------------------------------------
# Note: This creates the secret resource only, NOT the secret value.
# Secret values are created manually to avoid storing sensitive data in state.

resource "google_secret_manager_secret" "this" {
  project   = var.project_id
  secret_id = var.secret_id

  # Replication configuration
  # Source: Use automatic replication for simplicity and cost efficiency
  replication {
    dynamic "user_managed" {
      for_each = length(var.replication_locations) > 0 ? [1] : []
      content {
        dynamic "replicas" {
          for_each = var.replication_locations
          content {
            location = replicas.value
          }
        }
      }
    }

    dynamic "auto" {
      for_each = length(var.replication_locations) == 0 ? [1] : []
      content {}
    }
  }

  labels = merge(
    {
      environment = var.environment
      application = "rates"
      managed_by  = "terraform"
    },
    var.labels
  )
}

# ----------------------------------------------------------------------------
# IAM Bindings - Secret Accessor
# ----------------------------------------------------------------------------
# Source: docs/IAM_SECURITY_MODEL.md §6.3 (Secret Access Implementation)
#
# Grant secretAccessor role to specified service accounts.
# This allows Cloud Run services to read the secret at runtime.

resource "google_secret_manager_secret_iam_member" "accessors" {
  for_each = toset(var.accessor_service_account_emails)

  project   = var.project_id
  secret_id = google_secret_manager_secret.this.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value}"
}