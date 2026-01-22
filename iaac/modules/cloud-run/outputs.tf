# modules/cloud-run/outputs.tf
# Cloud Run module outputs

output "service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.main.name
}

output "service_id" {
  description = "Cloud Run service ID"
  value       = google_cloud_run_v2_service.main.id
}

output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.main.uri
}

output "service_location" {
  description = "Cloud Run service location"
  value       = google_cloud_run_v2_service.main.location
}

output "free_tier_config" {
  description = "Cloud Run configuration optimized for free tier"
  value = {
    min_instances         = var.min_instances # 0 = scale to zero
    max_instances         = var.max_instances # 2 max
    memory                = var.memory        # 256Mi
    cpu                   = var.cpu           # 1 vCPU
    cpu_idle              = true              # Don't charge for idle CPU
    timeout_seconds       = var.timeout_seconds
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    scale_to_zero         = var.min_instances == 0
  }
}

output "deployment_instructions" {
  description = "Instructions for deploying container to Cloud Run"
  value       = <<-EOT
    To deploy a container to this Cloud Run service:
    
    1. Build and push your container image to Artifact Registry:
       docker build -t {region}-docker.pkg.dev/{project_id}/{repo}/app:latest .
       docker push {region}-docker.pkg.dev/{project_id}/{repo}/app:latest
    
    2. Update the service with the new image:
       gcloud run services update {service_name} \
         --image {region}-docker.pkg.dev/{project_id}/{repo}/app:latest \
         --region {region}
    
    Or use GitHub Actions with the provided workflow (see outputs.github_actions_config)
  EOT
}
