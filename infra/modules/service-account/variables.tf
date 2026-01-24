# ============================================================================
# SERVICE ACCOUNT MODULE - VARIABLES
# ============================================================================
# Source of Truth: docs/IAM_SECURITY_MODEL.md (Service Account Inventory)
#                  docs/GCP_PROJECT_STRUCTURE.md (Naming Convention)
# ============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "account_id" {
  type        = string
  description = "Service account ID (e.g., rates-dev-cloud-run-sa)"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.account_id))
    error_message = "Service account ID must be 6-30 characters, lowercase letters, digits, or hyphens."
  }
}

variable "display_name" {
  type        = string
  description = "Human-readable display name for the service account"
}

variable "description" {
  type        = string
  description = "Description of the service account's purpose"
  default     = ""
}

variable "project_roles" {
  type = list(object({
    role      = string
    condition = optional(object({
      title       = string
      description = string
      expression  = string
    }))
  }))
  description = "List of IAM roles to grant at project level, with optional conditions"
  default     = []
}