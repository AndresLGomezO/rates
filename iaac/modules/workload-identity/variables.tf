# modules/workload-identity/variables.tf
# Workload Identity Federation module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in format 'owner/repo-name'"
}

variable "github_environments" {
  type        = list(string)
  description = "List of GitHub environment names"
  default     = []
}

variable "wif_pool_id" {
  type        = string
  description = "Workload Identity Pool ID"
}

variable "wif_provider_id" {
  type        = string
  description = "Workload Identity Pool Provider ID"
}

variable "cicd_service_account_email" {
  type        = string
  description = "CI/CD service account email (to grant WIF access)"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to resources"
  default     = {}
}
