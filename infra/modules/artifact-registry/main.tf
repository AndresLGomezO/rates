# ============================================================================
# ARTIFACT REGISTRY MODULE - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §3.2.3 (Module Design)
#                  docs/COST_GUARDRAILS.md §2.2 (Lifecycle Policies)
#                  docs/GCP_PROJECT_STRUCTURE.md §4.2 (Naming)
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
# Artifact Registry Repository
# ----------------------------------------------------------------------------
# Note: API readiness is handled by the parent module's depends_on and time_sleep
# The parent waits 60s after API enablement before calling this module

resource "google_artifact_registry_repository" "this" {
  project       = var.project_id
  location      = var.location
  repository_id = var.repository_id
  format        = "DOCKER"
  mode          = "STANDARD_REPOSITORY"
  description   = var.description

  labels = merge(
    {
      environment = var.environment
      application = "rates"
      component   = "containers"
      managed_by  = "terraform"
    },
    var.labels
  )

  # Cleanup policies for cost control
  # Source: docs/COST_GUARDRAILS.md §2.2
  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      older_than = "2592000s" # 30 days in seconds
    }
  }

  cleanup_policies {
    id     = "keep-recent-images"
    action = "KEEP"

    most_recent_versions {
      keep_count = 3
    }
  }

  # No depends_on needed here - parent module handles API readiness via depends_on

  # Handle potential race conditions and API propagation delays
  # Increased create timeout to handle "entity not found" transient errors
  timeouts {
    create = "15m"
    delete = "10m"
  }
}

# ----------------------------------------------------------------------------
# IAM Bindings - Writer Access (Cloud Build SA)
# ----------------------------------------------------------------------------

resource "google_artifact_registry_repository_iam_member" "writer" {
  for_each = var.writer_service_account_email != null ? { "writer" = var.writer_service_account_email } : {}

  project    = var.project_id
  location   = var.location
  repository = google_artifact_registry_repository.this.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${each.value}"
}

# ----------------------------------------------------------------------------
# IAM Bindings - Reader Access (Cloud Run SA)
# ----------------------------------------------------------------------------

resource "google_artifact_registry_repository_iam_member" "readers" {
  for_each = {
    for idx, email in var.reader_service_account_emails : tostring(idx) => email
  }

  project    = var.project_id
  location   = var.location
  repository = google_artifact_registry_repository.this.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${each.value}"
}