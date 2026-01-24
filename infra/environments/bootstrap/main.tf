# ============================================================================
# BOOTSTRAP LAYER - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 1)
#                  docs/TERRAFORM_DESIGN.md (State Management)
#                  docs/COST_GUARDRAILS.md (Storage Policies)
#
# Purpose: Create foundational infrastructure for Terraform state management
#
# Resources Created:
#   - GCS bucket for Terraform state (rates-terraform-state)
#   - Bucket versioning (enabled for state history)
#   - Bucket lifecycle policy (delete old versions after 90 days)
#   - Required APIs (storage, serviceusage)
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
# Provider Configuration
# ----------------------------------------------------------------------------

provider "google" {
  project = var.project_id
  region  = var.region
}

# ----------------------------------------------------------------------------
# API Enablement
# ----------------------------------------------------------------------------
# Enable required APIs before creating resources
# These APIs are prerequisites for Terraform state management

resource "google_project_service" "storage" {
  project            = var.project_id
  service            = "storage.googleapis.com"
  disable_on_destroy = false

  # Prevent accidental disable during destroy
  # Storage API is fundamental and may be used by other resources
}

resource "google_project_service" "serviceusage" {
  project            = var.project_id
  service            = "serviceusage.googleapis.com"
  disable_on_destroy = false

  # Service Usage API is required for enabling other APIs
}

# ----------------------------------------------------------------------------
# Terraform State Bucket
# ----------------------------------------------------------------------------
# Source: docs/TERRAFORM_DESIGN.md §4.2 (Single bucket with prefix-based separation)
# Source: docs/COST_GUARDRAILS.md §2.2 (Storage Policies)

resource "google_storage_bucket" "terraform_state" {
  name     = var.state_bucket_name
  location = var.region
  project  = var.project_id

  # Storage class: STANDARD (not NEARLINE/COLDLINE)
  # Source: docs/COST_GUARDRAILS.md §2.2
  storage_class = "STANDARD"

  # Versioning: Enabled for state file history
  # Source: docs/TERRAFORM_DESIGN.md §4.1 (Versioning for state file history)
  versioning {
    enabled = true
  }

  # Lifecycle Policy: Delete old state versions after retention period
  # Source: docs/COST_GUARDRAILS.md §2.2 (Delete state files older than 90 days)
  lifecycle_rule {
    condition {
      age                   = var.state_retention_days
      with_state            = "ARCHIVED"
      num_newer_versions    = 3
    }
    action {
      type = "Delete"
    }
  }

  # Delete noncurrent versions older than retention period
  lifecycle_rule {
    condition {
      days_since_noncurrent_time = var.state_retention_days
    }
    action {
      type = "Delete"
    }
  }

  # Prevent accidental deletion of state bucket
  # This is critical infrastructure - require force_destroy to be false
  force_destroy = false

  # Uniform bucket-level access (recommended for security)
  uniform_bucket_level_access = true

  # Labels for cost tracking
  # Source: docs/GCP_PROJECT_STRUCTURE.md §10 (Billing Labels)
  labels = {
    environment = "shared"
    application = "rates"
    component   = "terraform-state"
    managed_by  = "terraform"
  }

  depends_on = [
    google_project_service.storage
  ]
}

# ----------------------------------------------------------------------------
# State Bucket IAM Bindings
# ----------------------------------------------------------------------------
# Source: docs/TERRAFORM_DESIGN.md §4.5 (State File Security)
#
# Access Control:
#   - Bootstrap State: Infrastructure team only
#   - Foundation State: Infrastructure team only
#   - Application State (Dev): Developers + Infrastructure team
#   - Application State (Prod): Production administrators + Infrastructure team
#
# Note: For initial bootstrap, we grant objectAdmin to the current user/SA
#       More granular IAM with conditions will be added in Foundation layer

# Ensure the bucket can be managed by Terraform (current identity)
# Additional IAM bindings with conditions will be added in Foundation layer

resource "google_storage_bucket_iam_member" "terraform_state_admin" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = "projectEditor:${var.project_id}"

  # Note: This grants broad access initially
  # Foundation layer will add conditional IAM bindings for prefix-based access
}

# Legacy bucket reader for state locking (required by Terraform GCS backend)
resource "google_storage_bucket_iam_member" "terraform_state_reader" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.legacyBucketReader"
  member = "projectEditor:${var.project_id}"
}