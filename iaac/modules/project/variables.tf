# modules/project/variables.tf
# Project module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID. If null, a new project will be created."
  default     = null
}

variable "billing_account_id" {
  type        = string
  description = "GCP Billing Account ID (required for new projects)"
  default     = null
}

variable "org_id" {
  type        = string
  description = "GCP Organization ID (optional, for project hierarchy)"
  default     = null
}

variable "folder_id" {
  type        = string
  description = "GCP Folder ID (optional, for project hierarchy)"
  default     = null
}

variable "admin_email" {
  type        = string
  description = "Email address of the administrator"
}

variable "app_name" {
  type        = string
  description = "Application name for resource naming"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "region" {
  type        = string
  description = "GCP region for resources"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the project"
  default     = {}
}

variable "required_apis" {
  type        = list(string)
  description = "List of GCP APIs to enable"
  default     = []
}
