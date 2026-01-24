# ============================================================================
# FOUNDATION LAYER - VARIABLES
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 2)
#                  docs/GCP_PROJECT_STRUCTURE.md (Naming & Hierarchy)
#                  docs/IAM_SECURITY_MODEL.md (Service Accounts)
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
  description = "GCP Region (must be free-tier eligible)"
  default     = "us-central1"

  validation {
    condition     = contains(["us-central1", "us-east1", "us-west1", "europe-west1", "asia-east1"], var.region)
    error_message = "Region must be free-tier eligible: us-central1, us-east1, us-west1, europe-west1, or asia-east1."
  }
}

variable "environments" {
  type        = list(string)
  description = "List of environments to create resources for"
  default     = ["dev", "prod"]

  validation {
    condition     = alltrue([for env in var.environments : contains(["dev", "prod"], env)])
    error_message = "Environments must be 'dev' or 'prod'."
  }
}