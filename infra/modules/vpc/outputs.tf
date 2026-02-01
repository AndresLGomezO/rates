output "network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.vpc_network.id
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.vpc_network.name
}

output "subnet_id" {
  description = "The ID of the subnetwork"
  value       = google_compute_subnetwork.subnetwork.id
}

output "subnet_self_link" {
  description = "The self link of the subnetwork"
  value       = google_compute_subnetwork.subnetwork.self_link
}
