# ============================================================================
# APPLICATION LAYER (DEV) - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 3 Outputs)
#
# These outputs are used for:
#   - Verification after deployment
#   - Firebase Hosting configuration
#   - CI/CD pipeline integration
#   - Documentation and runbooks
# ============================================================================

# ----------------------------------------------------------------------------
# Cloud Run Service - API (auth-app)
# ----------------------------------------------------------------------------

output "cloud_run_service_name" {
  description = "Name of the Cloud Run service (auth-app API)"
  value       = module.cloud_run_api.service_name
}

output "cloud_run_service_url" {
  description = "URL of the Cloud Run service (auth-app API)"
  value       = module.cloud_run_api.service_url
}

output "cloud_run_service_id" {
  description = "Fully qualified ID of the Cloud Run service (auth-app API)"
  value       = module.cloud_run_api.service_id
}

output "cloud_run_latest_revision" {
  description = "Latest revision of the Cloud Run service (auth-app API)"
  value       = module.cloud_run_api.latest_revision
}

# ----------------------------------------------------------------------------
# Cloud Run Service - App (main financial accounts SPA)
# ----------------------------------------------------------------------------

output "cloud_run_app_service_name" {
  description = "Name of the Cloud Run service (app)"
  value       = module.cloud_run_app.service_name
}

output "cloud_run_app_service_url" {
  description = "URL of the Cloud Run service (app)"
  value       = module.cloud_run_app.service_url
}

output "cloud_run_app_service_id" {
  description = "Fully qualified ID of the Cloud Run service (app)"
  value       = module.cloud_run_app.service_id
}

output "cloud_run_app_latest_revision" {
  description = "Latest revision of the Cloud Run service (app)"
  value       = module.cloud_run_app.latest_revision
}

# ----------------------------------------------------------------------------
# Secrets
# ----------------------------------------------------------------------------

output "secret_names" {
  description = "Map of secret names created"
  value = {
    firebase_sa  = module.firebase_sa_secret.secret_id
    nonce_secret = module.nonce_secret.secret_id
  }
}

output "firebase_sa_secret_name" {
  description = "Name of the Firebase service account secret"
  value       = module.firebase_sa_secret.secret_id
}

output "nonce_secret_name" {
  description = "Name of the nonce secret"
  value       = module.nonce_secret.secret_id
}

# ----------------------------------------------------------------------------
# Configuration Information
# ----------------------------------------------------------------------------

output "container_image" {
  description = "Container image URL used by Cloud Run (auth-app API)"
  value       = local.container_image_api
}

output "container_image_app" {
  description = "Container image URL used by Cloud Run (app)"
  value       = local.container_image_app
}

output "service_account_email" {
  description = "Service account attached to Cloud Run"
  value       = local.cloud_run_sa_email
}

output "environment" {
  description = "Environment identifier"
  value       = local.environment
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

# ----------------------------------------------------------------------------
# Firebase Hosting Configuration
# ----------------------------------------------------------------------------

output "firebase_rewrite_config" {
  description = "Configuration snippet for Firebase Hosting rewrites (firebase.json) - auth-app API"
  value       = module.cloud_run_api.firebase_rewrite_config
}

output "firebase_rewrite_config_app" {
  description = "Configuration snippet for Firebase Hosting rewrites (firebase.json) - app"
  value       = module.cloud_run_app.firebase_rewrite_config
}

# ----------------------------------------------------------------------------
# Manual Steps Required
# ----------------------------------------------------------------------------

output "manual_steps_required" {
  description = "Manual steps that must be completed after Terraform apply"
  value       = <<-EOT

    ============================================================================
    MANUAL STEPS REQUIRED
    ============================================================================

    1. CREATE SECRET VALUES (secrets exist but have no values yet):

       # Firebase service account JSON:
       gcloud secrets versions add ${module.firebase_sa_secret.secret_id} \
         --data-file=path/to/firebase-service-account.json

       # Nonce secret:
       echo -n "your-nonce-secret-value" | \
         gcloud secrets versions add ${module.nonce_secret.secret_id} --data-file=-

    2. BUILD AND PUSH CONTAINER IMAGES:

       # Configure Docker for Artifact Registry
       gcloud auth configure-docker ${var.region}-docker.pkg.dev

       # Build and push auth-app API image
       docker build -t ${local.container_image_api} ./apps/auth-app
       docker push ${local.container_image_api}

       # Build and push app image
       docker build -t ${local.container_image_app} ./apps/app
       docker push ${local.container_image_app}

    3. REDEPLOY CLOUD RUN SERVICES (after secrets and images are ready):

       # Update auth-app API service
       gcloud run services update ${module.cloud_run_api.service_name} \
         --region=${var.region} \
         --project=${var.project_id}

       # Update app service
       gcloud run services update ${module.cloud_run_app.service_name} \
         --region=${var.region} \
         --project=${var.project_id}

       # Or trigger a new deployment via Terraform:
       # terraform apply -var="container_image_tag=<new-tag>"

    4. VERIFY DEPLOYMENT:

       # Test the auth-app API endpoint
       curl ${module.cloud_run_api.service_url}/health

       # Test the validate endpoint (requires valid Firebase ID token)
       curl -X POST ${module.cloud_run_api.service_url}/api/validate \
         -H "Content-Type: application/json" \
         -d '{"idToken": "...", "nonce": "..."}'

       # Test the app service endpoint
       curl ${module.cloud_run_app.service_url}/health

    5. UPDATE FIREBASE HOSTING (firebase.json):

       Add this rewrite rule to your firebase.json:

       {
         "hosting": {
           "rewrites": [
             {
               "source": "/api/**",
               "run": {
                 "serviceId": "${module.cloud_run_api.service_name}",
                 "region": "${var.region}"
               }
             }
           ]
         }
       }

    ============================================================================

  EOT
}

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

output "deployment_summary" {
  description = "Summary of deployed resources"
  value = {
    environment = local.environment
    cloud_run_api = {
      name = module.cloud_run_api.service_name
      url  = module.cloud_run_api.service_url
    }
    cloud_run_app = {
      name = module.cloud_run_app.service_name
      url  = module.cloud_run_app.service_url
    }
    secrets = {
      firebase_sa  = module.firebase_sa_secret.secret_id
      nonce_secret = module.nonce_secret.secret_id
    }
    images = {
      api = local.container_image_api
      app = local.container_image_app
    }
  }
}