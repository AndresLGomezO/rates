# modules/github-actions/variables.tf
# GitHub Actions module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "project_number" {
  type        = string
  description = "GCP Project Number"
}

variable "github_owner" {
  type        = string
  description = "GitHub repository owner (username or organization)"
}

variable "github_repo_name" {
  type        = string
  description = "GitHub repository name"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "workload_identity_provider_name" {
  type        = string
  description = "Workload Identity Federation provider name (full resource name)"
}

variable "cicd_service_account_email" {
  type        = string
  description = "CI/CD service account email (for WIF authentication)"
}

variable "artifact_registry_url" {
  type        = string
  description = "Artifact Registry repository URL (for Docker push/pull)"
}

variable "cloud_run_service_name" {
  type        = string
  description = "Cloud Run service name"
}

variable "cloud_run_region" {
  type        = string
  description = "Cloud Run service region"
}

variable "cloudrun_config" {
  type = object({
    min_instances   = number
    max_instances   = number
    memory          = string
    cpu             = string
    timeout_seconds = number
  })
  description = "Cloud Run configuration (for deployment flags)"
}

variable "github_environments" {
  type        = list(string)
  description = "List of GitHub environment names"
  default     = []
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to resources"
  default     = {}
}

variable "workflow_branch" {
  type        = string
  description = "Git branch to trigger workflow (default: main)"
  default     = "main"
}

variable "workflow_path" {
  type        = string
  description = "Path where workflow file will be created (relative to repo root)"
  default     = ".github/workflows"
}

variable "workflow_filename" {
  type        = string
  description = "Workflow filename (without .yml extension)"
  default     = "deploy"
}

variable "enable_workflow_generation" {
  type        = bool
  description = "Enable automatic workflow file generation"
  default     = true
}

variable "workflow_file_path" {
  type        = string
  description = "Full path to workflow file (for local_file resource)"
  default     = ""
}
