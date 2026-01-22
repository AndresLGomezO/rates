# modules/secrets/variables.tf
# Secret Manager module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to secrets"
  default     = {}
}

variable "firebase_config_secret_id" {
  type        = string
  description = "Secret ID for Firebase client configuration"
  default     = null
}

variable "firebase_config_data" {
  type        = string
  description = "Firebase client configuration JSON (will be stored as secret)"
  default     = null
  sensitive   = true
}

variable "additional_secrets" {
  type = map(object({
    description = optional(string)
    data        = optional(string, null)
    sensitive   = optional(bool, true)
  }))
  description = "Map of additional secrets to create (key = secret_id, value = secret config)"
  default     = {}
}
