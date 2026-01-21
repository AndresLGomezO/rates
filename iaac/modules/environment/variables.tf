variable "environment_name" {
  description = "Environment name (dev/staging/prod)"
  type        = string
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "github_repo_full" {
  description = "Full GitHub repository name (owner/repo)"
  type        = string
}

variable "github_branch" {
  description = "GitHub branch that triggers deployments"
  type        = string
}

variable "github_environment" {
  description = "GitHub environment name"
  type        = string
}

variable "wif_pool_id" {
  description = "Workload Identity Pool ID"
  type        = string
}

variable "wif_provider_id" {
  description = "Workload Identity Provider ID"
  type        = string
}

variable "sa_name" {
  description = "Service account name"
  type        = string
}

variable "ar_repository" {
  description = "Artifact Registry repository name"
  type        = string
}

variable "cloud_run_service_app" {
  description = "Cloud Run service name for app"
  type        = string
}

variable "cloud_run_service_auth" {
  description = "Cloud Run service name for auth app"
  type        = string
}

variable "cloud_run_service_auth_api" {
  description = "Cloud Run service name for auth API"
  type        = string
}

variable "cloud_run_cpu" {
  description = "CPU allocation for Cloud Run"
  type        = string
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run"
  type        = string
}

variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run instances"
  type        = number
}

variable "cloud_run_max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
}

variable "cloud_run_concurrency" {
  description = "Cloud Run concurrency"
  type        = number
}

variable "enable_apis" {
  description = "Whether to enable required APIs"
  type        = bool
}

variable "create_cloud_run_services" {
  description = "Whether to create Cloud Run services"
  type        = bool
}

variable "grant_service_account_user" {
  description = "Whether to grant roles/iam.serviceAccountUser to the GitHub deployer SA"
  type        = bool
}

variable "required_apis" {
  description = "List of required GCP APIs"
  type        = list(string)
}
