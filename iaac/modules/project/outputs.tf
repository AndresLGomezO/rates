# modules/project/outputs.tf
# Project module outputs

output "project_id" {
  description = "GCP Project ID (created or existing)"
  value       = local.final_project_id
}

output "project_number" {
  description = "GCP Project Number"
  value       = var.project_id == null ? google_project.main[0].number : data.google_project.existing[0].number
}

output "project_name" {
  description = "GCP Project Name"
  value       = var.project_id == null ? google_project.main[0].name : data.google_project.existing[0].name
}

output "billing_account_id" {
  description = "Billing Account ID (if linked)"
  value       = var.billing_account_id
}

output "is_new_project" {
  description = "Whether this is a newly created project (true) or existing (false)"
  value       = var.project_id == null
}

output "labels" {
  description = "Project labels"
  value       = local.project_labels
}

output "api_propagation_complete" {
  description = "Time sleep resource indicating APIs have propagated (use as dependency)"
  value       = time_sleep.api_propagation
}
