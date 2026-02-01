# ============================================================================
# APPLICATION LAYER (PROD) - VARIABLES
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 4)
#                  docs/GCP_PROJECT_STRUCTURE.md (Naming Convention)
#                  docs/COST_GUARDRAILS.md (Resource Limits)
#
# ⚠️  PRODUCTION ENVIRONMENT - Changes require careful review
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

variable "environment" {
  type        = string
  description = "Environment identifier"
  default     = "prod"

  validation {
    condition     = var.environment == "prod"
    error_message = "This configuration is for prod environment only."
  }
}

# ----------------------------------------------------------------------------
# Container Image Configuration
# ----------------------------------------------------------------------------

variable "container_image_tag" {
  type        = string
  description = "Container image tag (e.g., v1.0.0, sha-abc123). Avoid 'latest' in production."
  default     = "latest"

  # Production recommendation: Use semantic versioning or commit SHA
  # Example: "v1.0.0" or "sha-a1b2c3d4"
}

variable "use_fallback_image" {
  type        = bool
  description = "Use fallback test image instead of Artifact Registry image (useful during initial setup before image is built)"
  default     = false
}

variable "include_secrets" {
  type        = bool
  description = "Include secrets in Cloud Run service (set to false during initial setup if secrets don't have versions yet)"
  default     = true
}

# ----------------------------------------------------------------------------
# Application Configuration
# ----------------------------------------------------------------------------

variable "node_env" {
  type        = string
  description = "NODE_ENV environment variable"
  default     = "production"

  validation {
    condition     = var.node_env == "production"
    error_message = "NODE_ENV must be 'production' for prod environment."
  }
}

# ----------------------------------------------------------------------------
# Deployment Safety
# ----------------------------------------------------------------------------

variable "deployment_approved" {
  type        = bool
  description = "Explicit approval flag for production deployment. Must be set to true."
  default     = false

  # This variable serves as a manual gate for production deployments.
  # Set to true only after reviewing terraform plan output.
}
# ============================================================================
# AI INFRASTRUCTURE VARIABLES
# ============================================================================

variable "vpc_connector_cidr" {
  description = "CIDR range for VPC Connector"
  type        = string
  default     = "10.8.0.16/28"
}

variable "ai_service_image_tag" {
  description = "Image tag for AI Service"
  type        = string
  default     = "latest"
}

variable "ai_processor_image_tag" {
  description = "Image tag for AI Processor"
  type        = string
  default     = "latest"
}
