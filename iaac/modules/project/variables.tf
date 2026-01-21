variable "project_id_dev" {
  description = "GCP Project ID for development"
  type        = string
}

variable "project_id_staging" {
  description = "GCP Project ID for staging"
  type        = string
}

variable "project_id_prod" {
  description = "GCP Project ID for production"
  type        = string
}

variable "billing_account_id" {
  description = "GCP Billing Account ID"
  type        = string
}

variable "organization_id" {
  description = "GCP Organization ID (optional)"
  type        = string
  default     = ""
}
