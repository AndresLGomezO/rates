# modules/artifact-registry/variables.tf
# Artifact Registry module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "region" {
  type        = string
  description = "GCP region for Artifact Registry"
}

variable "repository_id" {
  type        = string
  description = "Artifact Registry repository ID"
}

variable "description" {
  type        = string
  description = "Repository description"
  default     = null
}

variable "enable_immutable_tags" {
  type        = bool
  description = "Enable immutable container tags"
  default     = false
}

variable "keep_recent_versions" {
  type        = number
  description = "Number of recent tagged versions to keep (cleanup policy)"
  default     = 3
}

variable "untagged_retention_days" {
  type        = number
  description = "Number of days to keep untagged images"
  default     = 3
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the repository"
  default     = {}
}
