# ============================================================================
# SECRET MODULE - VARIABLES
# ============================================================================
# Source of Truth: docs/IAM_SECURITY_MODEL.md §6 (Secrets Strategy)
#                  docs/GCP_PROJECT_STRUCTURE.md §4.2 (Naming Convention)
# ============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "secret_id" {
  type        = string
  description = "Secret ID (e.g., rates-dev-firebase-sa)"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_-]{0,254}$", var.secret_id))
    error_message = "Secret ID must start with a letter and contain only letters, digits, underscores, or hyphens (max 255 chars)."
  }
}

variable "environment" {
  type        = string
  description = "Environment identifier (dev or prod)"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "description" {
  type        = string
  description = "Description of the secret's purpose"
  default     = ""
}

variable "accessor_service_account_emails" {
  type        = list(string)
  description = "List of service account emails granted secretAccessor role"
  default     = []
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the secret"
  default     = {}
}

variable "replication_locations" {
  type        = list(string)
  description = "List of locations for user-managed replication (empty for automatic)"
  default     = []
}