# ============================================================================
# CLOUD BUILD TRIGGER MODULE - VARIABLES
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 5)
#                  docs/COST_GUARDRAILS.md (Build Limits)
#                  docs/IAM_SECURITY_MODEL.md §4 (CI/CD Permissions)
# ============================================================================

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "trigger_name" {
  type        = string
  description = "Name of the Cloud Build trigger"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,62}[a-z0-9]$", var.trigger_name))
    error_message = "Trigger name must be lowercase letters, digits, or hyphens (max 64 chars)."
  }
}

variable "description" {
  type        = string
  description = "Description of the trigger"
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

# ----------------------------------------------------------------------------
# Repository Configuration
# ----------------------------------------------------------------------------

variable "repository_type" {
  type        = string
  description = "Type of repository connection (github, cloud-source-repositories)"
  default     = "github"

  validation {
    condition     = contains(["github", "cloud-source-repositories"], var.repository_type)
    error_message = "Repository type must be 'github' or 'cloud-source-repositories'."
  }
}

variable "github_owner" {
  type        = string
  description = "GitHub repository owner (organization or username)"
  default     = null
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name"
  default     = null
}

variable "cloud_source_repo" {
  type        = string
  description = "Cloud Source Repository name (if using CSR)"
  default     = null
}

# ----------------------------------------------------------------------------
# Branch Configuration
# ----------------------------------------------------------------------------

variable "branch_pattern" {
  type        = string
  description = "Branch pattern to trigger builds (regex)"
  default     = "^main$"

  validation {
    condition     = can(regex("^\\^", var.branch_pattern))
    error_message = "Branch pattern should be a regex starting with ^."
  }
}

variable "included_files" {
  type        = list(string)
  description = "File patterns that trigger builds (glob patterns)"
  default     = ["**"]
}

variable "ignored_files" {
  type        = list(string)
  description = "File patterns to ignore for triggering builds"
  default     = ["docs/**", "*.md", ".gitignore"]
}

# ----------------------------------------------------------------------------
# Build Configuration
# ----------------------------------------------------------------------------

variable "build_config_file" {
  type        = string
  description = "Path to cloudbuild.yaml file in repository"
  default     = "cloudbuild.yaml"
}

variable "service_account_email" {
  type        = string
  description = "Service account email for Cloud Build"
}

variable "substitutions" {
  type        = map(string)
  description = "Build substitution variables"
  default     = {}
}

# ----------------------------------------------------------------------------
# Cost Guardrails
# ----------------------------------------------------------------------------

variable "build_timeout" {
  type        = string
  description = "Build timeout (max 10 minutes per COST_GUARDRAILS.md)"
  default     = "600s"

  validation {
    condition     = can(regex("^[0-9]+s$", var.build_timeout)) && tonumber(trimsuffix(var.build_timeout, "s")) <= 600
    error_message = "Build timeout must be <= 600s (10 minutes) per COST_GUARDRAILS.md."
  }
}

# ----------------------------------------------------------------------------
# Approval Configuration (Prod Only)
# ----------------------------------------------------------------------------

variable "require_approval" {
  type        = bool
  description = "Require manual approval before build executes (recommended for prod)"
  default     = false
}

# ----------------------------------------------------------------------------
# Labels
# ----------------------------------------------------------------------------

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the trigger"
  default     = {}
}

# ----------------------------------------------------------------------------
# Feature Flags
# ----------------------------------------------------------------------------

variable "disabled" {
  type        = bool
  description = "Whether the trigger is disabled"
  default     = false
}