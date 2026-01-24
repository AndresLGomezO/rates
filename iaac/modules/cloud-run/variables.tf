# modules/cloud-run/variables.tf
# Cloud Run module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "region" {
  type        = string
  description = "GCP region for Cloud Run"
}

variable "service_name" {
  type        = string
  description = "Cloud Run service name"
}

variable "runtime_service_account_email" {
  type        = string
  description = "Cloud Run runtime service account email"
}

variable "min_instances" {
  type        = number
  description = "Minimum Cloud Run instances (0 = scale to zero, FREE)"
  default     = 0
}

variable "max_instances" {
  type        = number
  description = "Maximum Cloud Run instances"
  default     = 2
}

variable "memory" {
  type        = string
  description = "Cloud Run memory allocation"
  default     = "256Mi"
}

variable "cpu" {
  type        = string
  description = "Cloud Run CPU allocation"
  default     = "1"
}

variable "timeout_seconds" {
  type        = number
  description = "Request timeout in seconds"
  default     = 300
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to Cloud Run service"
  default     = {}
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for Cloud Run service"
  default     = {}
}

variable "secrets" {
  type = list(object({
    name        = string
    secret_name = string
    version     = string
  }))
  description = "Secrets to mount as environment variables"
  default     = []
}
