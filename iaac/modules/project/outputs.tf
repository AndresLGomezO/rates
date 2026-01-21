output "dev_project_id" {
  description = "Development project ID"
  value       = google_project.dev.project_id
}

output "staging_project_id" {
  description = "Staging project ID"
  value       = google_project.staging.project_id
}

output "prod_project_id" {
  description = "Production project ID"
  value       = google_project.prod.project_id
}
