# ============================================================================
# ARTIFACT REGISTRY MODULE - VARIABLES
# ============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "repository_id" {
  type        = string
  description = "Repository ID (e.g., rates-dev-containers)"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,61}[a-z0-9]$", var.repository_id))
    error_message = "Repository ID must be lowercase letters, digits, or hyphens, 3-63 characters."
  }
}

variable "location" {
  type        = string
  description = "GCP region for the repository"

  validation {
    condition     = contains(["us-central1", "us-east1", "us-west1", "europe-west1", "asia-east1"], var.location)
    error_message = "Location must be free-tier eligible: us-central1, us-east1, us-west1, europe-west1, or asia-east1."
  }
}

variable "description" {
  type        = string
  description = "Description of the repository"
  default     = ""
}

variable "environment" {
  type        = string
  description = "Environment identifier (dev or prod)"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "writer_service_account_email" {
  type        = string
  description = "Email of the service account granted writer access (typically Cloud Build SA)"
  default     = null
}

variable "reader_service_account_emails" {
  type        = list(string)
  description = "List of service account emails granted reader access"
  default     = []
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the repository"
  default     = {}
}