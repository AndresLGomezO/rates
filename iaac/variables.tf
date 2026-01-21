# =============================================================================
# Core Configuration Variables
# =============================================================================

variable "github_owner" {
  description = "GitHub repository owner/username"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "gcp_region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

# =============================================================================
# Environment-Specific Project IDs
# =============================================================================

variable "project_id_dev" {
  description = "GCP Project ID for development environment (6-30 characters, lowercase letters/digits/hyphens, must start with letter)"
  type        = string
  validation {
    condition     = length(trimspace(var.project_id_dev)) >= 6 && length(trimspace(var.project_id_dev)) <= 30
    error_message = "project_id_dev must be 6-30 characters long (GCP requirement)."
  }
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", trimspace(var.project_id_dev)))
    error_message = "project_id_dev must start with a letter, contain only lowercase letters/digits/hyphens, and not end with a hyphen."
  }
}

variable "project_id_staging" {
  description = "GCP Project ID for staging environment (6-30 characters, lowercase letters/digits/hyphens, must start with letter)"
  type        = string
  validation {
    condition     = length(trimspace(var.project_id_staging)) >= 6 && length(trimspace(var.project_id_staging)) <= 30
    error_message = "project_id_staging must be 6-30 characters long (GCP requirement)."
  }
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", trimspace(var.project_id_staging)))
    error_message = "project_id_staging must start with a letter, contain only lowercase letters/digits/hyphens, and not end with a hyphen."
  }
}

variable "project_id_prod" {
  description = "GCP Project ID for production environment (6-30 characters, lowercase letters/digits/hyphens, must start with letter)"
  type        = string
  validation {
    condition     = length(trimspace(var.project_id_prod)) >= 6 && length(trimspace(var.project_id_prod)) <= 30
    error_message = "project_id_prod must be 6-30 characters long (GCP requirement)."
  }
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", trimspace(var.project_id_prod)))
    error_message = "project_id_prod must start with a letter, contain only lowercase letters/digits/hyphens, and not end with a hyphen."
  }
}

# =============================================================================
# Project Creation (Optional)
# =============================================================================

variable "create_projects" {
  description = "Whether to create GCP projects (requires billing account)"
  type        = bool
  default     = false
}

variable "billing_account_id" {
  description = "GCP Billing Account ID (required if create_projects is true)"
  type        = string
  default     = ""
}

variable "organization_id" {
  description = "GCP Organization ID (optional)"
  type        = string
  default     = ""
}

# =============================================================================
# Workload Identity Federation
# =============================================================================

variable "wif_pool_id" {
  description = "Workload Identity Pool ID"
  type        = string
  default     = "github-pool"
}

variable "wif_provider_id" {
  description = "Workload Identity Provider ID"
  type        = string
  default     = "github-provider"
}

# =============================================================================
# Service Account Configuration
# =============================================================================

variable "sa_name_dev" {
  description = "Service account name for development"
  type        = string
  default     = "github-ci-dev"
}

variable "sa_name_staging" {
  description = "Service account name for staging"
  type        = string
  default     = "github-ci-staging"
}

variable "sa_name_prod" {
  description = "Service account name for production"
  type        = string
  default     = "github-ci-prod"
}

# =============================================================================
# Artifact Registry Configuration
# =============================================================================

variable "ar_repository_dev" {
  description = "Artifact Registry repository name for development"
  type        = string
  default     = "dev-rates"
}

variable "ar_repository_staging" {
  description = "Artifact Registry repository name for staging"
  type        = string
  default     = "staging-rates"
}

variable "ar_repository_prod" {
  description = "Artifact Registry repository name for production"
  type        = string
  default     = "rates"
}

# =============================================================================
# Cloud Run Configuration
# =============================================================================

variable "cloud_run_service_app_dev" {
  description = "Cloud Run service name for app (development)"
  type        = string
  default     = "rates-app-dev"
}

variable "cloud_run_service_app_staging" {
  description = "Cloud Run service name for app (staging)"
  type        = string
  default     = "rates-app-staging"
}

variable "cloud_run_service_app_prod" {
  description = "Cloud Run service name for app (production)"
  type        = string
  default     = "rates-app"
}

variable "cloud_run_service_auth_app_dev" {
  description = "Cloud Run service name for auth app (development)"
  type        = string
  default     = "rates-auth-app-dev"
}

variable "cloud_run_service_auth_app_staging" {
  description = "Cloud Run service name for auth app (staging)"
  type        = string
  default     = "rates-auth-app-staging"
}

variable "cloud_run_service_auth_app_prod" {
  description = "Cloud Run service name for auth app (production)"
  type        = string
  default     = "rates-auth-app"
}

variable "cloud_run_service_auth_api_dev" {
  description = "Cloud Run service name for auth API (development)"
  type        = string
  default     = "rates-auth-api-dev"
}

variable "cloud_run_service_auth_api_staging" {
  description = "Cloud Run service name for auth API (staging)"
  type        = string
  default     = "rates-auth-api-staging"
}

variable "cloud_run_service_auth_api_prod" {
  description = "Cloud Run service name for auth API (production)"
  type        = string
  default     = "rates-auth-api"
}

variable "cloud_run_cpu" {
  description = "CPU allocation for Cloud Run services"
  type        = string
  # Free-tier first: keep CPU low (Cloud Run free-tier is generous enough for most SPAs behind nginx)
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run services"
  type        = string
  # Free-tier first: Gen2 requires >= 512Mi; still fits in always-free quotas for low traffic.
  default     = "512Mi"
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  # Free-tier first: cap scale-out to avoid surprise spend
  default     = 3
}

variable "cloud_run_concurrency" {
  description = "Maximum concurrent requests per Cloud Run instance"
  type        = number
  # Higher concurrency reduces instances (and cost) for bursty traffic
  default     = 80
}

variable "create_cloud_run_services" {
  description = "Whether to create Cloud Run services"
  type        = bool
  default     = true
}

# =============================================================================
# Cost / privilege knobs (free-tier-first defaults)
# =============================================================================

variable "grant_service_account_user" {
  description = "Whether to grant roles/iam.serviceAccountUser to the GitHub deployer SA (only needed if Cloud Run runs as a different runtime SA)"
  type        = bool
  default     = false
}

# =============================================================================
# Branch Configuration
# =============================================================================

variable "github_branch_dev" {
  description = "GitHub branch that triggers development deployments"
  type        = string
  default     = "develop"
}

variable "github_branch_staging" {
  description = "GitHub branch that triggers staging deployments"
  type        = string
  default     = "staging"
}

variable "github_branch_prod" {
  description = "GitHub branch that triggers production deployments"
  type        = string
  default     = "main"
}

# =============================================================================
# API Configuration
# =============================================================================

variable "enable_apis" {
  description = "Whether to enable required GCP APIs"
  type        = bool
  default     = true
}

# =============================================================================
# Terraform State (Optional)
# =============================================================================

variable "tf_state_bucket" {
  description = "GCS bucket for Terraform remote state (optional)"
  type        = string
  default     = ""
}

variable "tf_state_prefix" {
  description = "Prefix for Terraform state in GCS bucket"
  type        = string
  default     = "terraform/state"
}
