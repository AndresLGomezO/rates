# ============================================================================
# CLOUD RUN MODULE - VARIABLES
# ============================================================================
# Source of Truth: docs/COST_GUARDRAILS.md §2.1 (Compute Capping)
#                  docs/GCP_PROJECT_STRUCTURE.md §4.2 (Naming Convention)
#                  docs/IAM_SECURITY_MODEL.md §5 (Network Security)
# ============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "service_name" {
  type        = string
  description = "Cloud Run service name (e.g., rates-dev-api-us-central1)"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,48}[a-z0-9]$", var.service_name))
    error_message = "Service name must be lowercase letters, digits, or hyphens (max 50 chars)."
  }
}

variable "region" {
  type        = string
  description = "GCP region for the service"

  validation {
    condition     = contains(["us-central1", "us-east1", "us-west1", "europe-west1", "asia-east1"], var.region)
    error_message = "Region must be free-tier eligible: us-central1, us-east1, us-west1, europe-west1, or asia-east1."
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

variable "service_account_email" {
  type        = string
  description = "Service account email to attach to the Cloud Run service"
}

variable "container_image" {
  type        = string
  description = "Container image URL (e.g., us-central1-docker.pkg.dev/project/repo/image:tag)"
}

# ----------------------------------------------------------------------------
# Resource Limits (with cost guardrail defaults)
# ----------------------------------------------------------------------------
# Source: docs/COST_GUARDRAILS.md §2.1 (Compute Capping)

variable "max_instances" {
  type        = number
  description = "Maximum number of instances (HARD LIMIT: 2)"
  default     = 2

  validation {
    condition     = var.max_instances <= 2
    error_message = "max_instances must be <= 2 to stay within cost guardrails (docs/COST_GUARDRAILS.md §2.1)."
  }
}

variable "min_instances" {
  type        = number
  description = "Minimum number of instances (MUST be 0 for scale-to-zero)"
  default     = 0

  validation {
    condition     = var.min_instances == 0
    error_message = "min_instances must be 0 to enable scale-to-zero (docs/COST_GUARDRAILS.md §2.1)."
  }
}

variable "cpu" {
  type        = string
  description = "CPU allocation (HARD LIMIT: 1)"
  default     = "1"

  validation {
    condition     = contains(["1", "0.5", "0.25"], var.cpu)
    error_message = "CPU must be 1, 0.5, or 0.25 (docs/COST_GUARDRAILS.md §2.1)."
  }
}

variable "memory" {
  type        = string
  description = "Memory allocation (HARD LIMIT: 512Mi)"
  default     = "512Mi"

  validation {
    condition     = contains(["512Mi", "256Mi", "128Mi"], var.memory)
    error_message = "Memory must be 512Mi, 256Mi, or 128Mi (docs/COST_GUARDRAILS.md §2.1)."
  }
}

variable "timeout_seconds" {
  type        = number
  description = "Request timeout in seconds (HARD LIMIT: 30)"
  default     = 30

  validation {
    condition     = var.timeout_seconds <= 30
    error_message = "Timeout must be <= 30 seconds (docs/COST_GUARDRAILS.md §2.1)."
  }
}

variable "max_concurrent_requests" {
  type        = number
  description = "Maximum concurrent requests per instance"
  default     = 80

  validation {
    condition     = var.max_concurrent_requests >= 1 && var.max_concurrent_requests <= 250
    error_message = "Concurrency must be between 1 and 250."
  }
}

# ----------------------------------------------------------------------------
# Secrets Configuration
# ----------------------------------------------------------------------------

variable "secrets" {
  type = map(object({
    secret_id = string
    version   = optional(string, "latest")
    env_var   = string
  }))
  description = "Map of secrets to mount as environment variables"
  default     = {}
}

# ----------------------------------------------------------------------------
# Environment Variables
# ----------------------------------------------------------------------------

variable "environment_variables" {
  type        = map(string)
  description = "Non-sensitive environment variables"
  default     = {}
}

# ----------------------------------------------------------------------------
# Ingress Configuration
# ----------------------------------------------------------------------------

variable "ingress" {
  type        = string
  description = "Ingress setting (all, internal, internal-and-cloud-load-balancing)"
  default     = "all"

  validation {
    condition     = contains(["all", "internal", "internal-and-cloud-load-balancing"], var.ingress)
    error_message = "Ingress must be 'all', 'internal', or 'internal-and-cloud-load-balancing'."
  }
}

variable "allow_unauthenticated" {
  type        = bool
  description = "Allow unauthenticated invocations (public access)"
  default     = true
}

# ----------------------------------------------------------------------------
# VPC Configuration
# ----------------------------------------------------------------------------

variable "vpc_connector_name" {
  type        = string
  description = "Name of the VPC connector to use (optional)"
  default     = null
}

variable "vpc_egress" {
  type        = string
  description = "VPC egress setting (private-ranges-only or all-traffic)"
  default     = "private-ranges-only"

  validation {
    condition     = contains(["private-ranges-only", "all-traffic"], var.vpc_egress)
    error_message = "VPC egress must be 'private-ranges-only' or 'all-traffic'."
  }
}

# ----------------------------------------------------------------------------
# Labels
# ----------------------------------------------------------------------------

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the service"
  default     = {}
}
variable "probe_path" {
  type        = string
  description = "Path for the startup probe"
  default     = "/health"
}
