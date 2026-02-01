output "connector_id" {
  description = "The ID of the VPC connector"
  value       = google_vpc_access_connector.connector.id
}

output "connector_name" {
  description = "The name of the VPC connector"
  value       = google_vpc_access_connector.connector.name
}
