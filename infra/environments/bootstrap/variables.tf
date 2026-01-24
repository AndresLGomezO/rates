# ============================================================================
# BOOTSTRAP LAYER - VARIABLES
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 1)
#                  docs/GCP_PROJECT_STRUCTURE.md (Naming Convention)
#                  docs/TERRAFORM_DESIGN.md (State Management)
# ============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID"
  default     = "rates-production"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, lowercase letters, digits, or hyphens."
  }
}

variable "region" {
  type        = string
  description = "GCP Region for state bucket (must be free-tier eligible)"
  default     = "us-central1"

  validation {
    condition     = contains(["us-central1", "us-east1", "us-west1", "europe-west1", "asia-east1"], var.region)
    error_message = "Region must be free-tier eligible: us-central1, us-east1, us-west1, europe-west1, or asia-east1."
  }
}

variable "state_bucket_name" {
  type        = string
  description = "Name of the GCS bucket for Terraform state"
  default     = "rates-terraform-state"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-_.]{1,61}[a-z0-9]$", var.state_bucket_name))
    error_message = "Bucket name must be 3-63 characters, lowercase letters, digits, hyphens, underscores, or dots."
  }
}

variable "state_retention_days" {
  type        = number
  description = "Number of days to retain old state file versions before deletion"
  default     = 90

  validation {
    condition     = var.state_retention_days >= 30 && var.state_retention_days <= 365
    error_message = "State retention must be between 30 and 365 days."
  }
}