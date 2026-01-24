# ============================================================================
# APPLICATION LAYER (PROD) - OUTPUTS
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §5 (Dependency Management)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 4 Outputs)
#
# These outputs are used for:
#   - Verification after deployment
#   - Firebase Hosting configuration
#   - CI/CD pipeline integration
#   - Documentation and runbooks
#   - Production monitoring and operations
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
# Production Operations Information
# ----------------------------------------------------------------------------

output "operations_info" {
  description = "Information for production operations"
  value = {
    service_url           = module.cloud_run_api.service_url
    logs_url              = "https://console.cloud.google.com/run/detail/${var.region}/${module.cloud_run_api.service_name}/logs?project=${var.project_id}"
    metrics_url           = "https://console.cloud.google.com/run/detail/${var.region}/${module.cloud_run_api.service_name}/metrics?project=${var.project_id}"
    revisions_url         = "https://console.cloud.google.com/run/detail/${var.region}/${module.cloud_run_api.service_name}/revisions?project=${var.project_id}"
    secret_manager_url    = "https://console.cloud.google.com/security/secret-manager?project=${var.project_id}"
    artifact_registry_url = "https://console.cloud.google.com/artifacts/docker/${var.project_id}/${var.region}/rates-prod-containers?project=${var.project_id}"
  }
}

# ----------------------------------------------------------------------------
# Manual Steps Required
# ----------------------------------------------------------------------------

output "manual_steps_required" {
  description = "Manual steps that must be completed after Terraform apply"
  value       = <<-EOT

    ============================================================================
    ⚠️  PRODUCTION DEPLOYMENT - MANUAL STEPS REQUIRED
    ============================================================================

    1. CREATE SECRET VALUES (secrets exist but have no values yet):

       # Firebase service account JSON (PRODUCTION):
       gcloud secrets versions add ${module.firebase_sa_secret.secret_id} \
         --data-file=path/to/firebase-service-account-PROD.json

       # Nonce secret (PRODUCTION - use different value than dev):
       echo -n "your-PRODUCTION-nonce-secret-value" | \
         gcloud secrets versions add ${module.nonce_secret.secret_id} --data-file=-

       ⚠️  IMPORTANT: Use DIFFERENT secret values than dev environment!

    2. BUILD AND PUSH CONTAINER IMAGES (PRODUCTION):

       # Configure Docker for Artifact Registry
       gcloud auth configure-docker ${var.region}-docker.pkg.dev

       # Build and push auth-app API image (use semantic versioning!)
       docker build -t ${local.container_image_api} \
         --build-arg NODE_ENV=production \
         ./apps/auth-app
       docker push ${local.container_image_api}

       # Build and push app image (use semantic versioning!)
       docker build -t ${local.container_image_app} \
         --build-arg NODE_ENV=production \
         ./apps/app
       docker push ${local.container_image_app}

       💡 RECOMMENDATION: Use semantic versioning for production images
          Example: ${local.artifact_registry_url}/api:v1.0.0
          Example: ${local.artifact_registry_url}/app:v1.0.0

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
       # terraform apply -var="deployment_approved=true" -var="container_image_tag=v1.0.0"

    4. VERIFY DEPLOYMENT:

       # Test the auth-app API health endpoint
       curl ${module.cloud_run_api.service_url}/health

       # Test the validate endpoint (requires valid Firebase ID token)
       curl -X POST ${module.cloud_run_api.service_url}/api/validate \
         -H "Content-Type: application/json" \
         -d '{"idToken": "...", "nonce": "..."}'

       # Test the app service health endpoint
       curl ${module.cloud_run_app.service_url}/health

    5. UPDATE FIREBASE HOSTING (firebase.json) - PRODUCTION SITE:

       Add this rewrite rule to your production firebase.json:

       {
         "hosting": {
           "site": "rates-prod-main-app",
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

    6. END-TO-END TESTING:

       - Test main-app → auth-app → Cloud Run API flow
       - Verify Firebase Authentication works
       - Verify token validation succeeds
       - Check Cloud Logging for any errors

    ============================================================================
    📊 MONITORING LINKS
    ============================================================================

    - Logs:      https://console.cloud.google.com/run/detail/${var.region}/${module.cloud_run_api.service_name}/logs?project=${var.project_id}
    - Metrics:   https://console.cloud.google.com/run/detail/${var.region}/${module.cloud_run_api.service_name}/metrics?project=${var.project_id}
    - Revisions: https://console.cloud.google.com/run/detail/${var.region}/${module.cloud_run_api.service_name}/revisions?project=${var.project_id}

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

# ----------------------------------------------------------------------------
# Comparison with Dev (for verification)
# ----------------------------------------------------------------------------

output "environment_comparison" {
  description = "Comparison reference between dev and prod"
  value = {
    note = "Verify these resources are separate from dev environment"
    prod = {
      service_name    = module.cloud_run_api.service_name
      service_account = local.cloud_run_sa_email
      secrets         = [module.firebase_sa_secret.secret_id, module.nonce_secret.secret_id]
      image_registry  = local.artifact_registry_url
    }
    expected_dev_equivalents = {
      service_name    = "rates-dev-api-${var.region}"
      service_account = "rates-dev-cloud-run-sa@${var.project_id}.iam.gserviceaccount.com"
      secrets         = ["rates-dev-firebase-sa", "rates-dev-nonce-secret"]
      image_registry  = "${var.region}-docker.pkg.dev/${var.project_id}/rates-dev-containers"
    }
  }
}