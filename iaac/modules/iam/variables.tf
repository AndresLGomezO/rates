# modules/iam/variables.tf
# IAM module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "app_name" {
  type        = string
  description = "Application name for resource naming"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "service_account_prefix" {
  type        = string
  description = "Prefix for service account names"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to service accounts"
  default     = {}
}

variable "runtime_secrets" {
  type        = list(string)
  description = "List of Secret Manager secret IDs that the runtime service account can access"
  default     = []
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = null
}

variable "artifact_registry_repository_id" {
  type        = string
  description = "Artifact Registry repository ID"
  default     = null
}

variable "artifact_registry_repository_location" {
  type        = string
  description = "Artifact Registry repository location"
  default     = null
}

variable "cicd_secrets" {
  type        = list(string)
  description = "List of Secret Manager secret IDs that the CI/CD service account can access (e.g., deployment config secrets)"
  default     = []
}
