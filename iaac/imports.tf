# imports.tf
# Import blocks for brownfield scenarios (existing resources)
# Requires Terraform >= 1.5.0
# Ref: https://developer.hashicorp.com/terraform/language/import
#
# Usage: Uncomment and update the import blocks for resources you want to import
# Then run: terraform plan -generate-config-out=generated.tf

# ============================================================================
# Project Import (if using existing project)
# ============================================================================
# Uncomment if you want to import an existing GCP project
# 
# import {
#   to = module.project.google_project.main[0]
#   id = "projects/EXISTING_PROJECT_ID"
# }

# ============================================================================
# Service Account Imports
# ============================================================================
# Uncomment if you have existing service accounts to import
#
# import {
#   to = module.iam.google_service_account.cloudrun_runtime
#   id = "projects/PROJECT_ID/serviceAccounts/EXISTING_SA@PROJECT_ID.iam.gserviceaccount.com"
# }
#
# import {
#   to = module.iam.google_service_account.cicd_deployer
#   id = "projects/PROJECT_ID/serviceAccounts/EXISTING_SA@PROJECT_ID.iam.gserviceaccount.com"
# }

# ============================================================================
# Workload Identity Federation Imports
# ============================================================================
# Uncomment if you have existing WIF pool/provider
#
# import {
#   to = module.workload_identity.google_iam_workload_identity_pool.github
#   id = "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/EXISTING_POOL_ID"
# }
#
# import {
#   to = module.workload_identity.google_iam_workload_identity_pool_provider.github
#   id = "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/EXISTING_PROVIDER_ID"
# }

# ============================================================================
# Firebase Imports
# ============================================================================
# Uncomment if you have existing Firebase resources
#
# import {
#   to = module.firebase.google_firebase_project.default
#   id = "projects/PROJECT_ID"
# }
#
# import {
#   to = module.firebase.google_firebase_web_app.default
#   id = "projects/PROJECT_ID/webApps/EXISTING_APP_ID"
# }
#
# import {
#   to = module.firebase.google_identity_platform_config.default
#   id = "projects/PROJECT_ID"
# }
#
# import {
#   to = module.firebase.google_firestore_database.default
#   id = "projects/PROJECT_ID/databases/(default)"
# }

# ============================================================================
# Artifact Registry Imports
# ============================================================================
# Uncomment if you have existing Artifact Registry repository
#
# import {
#   to = module.artifact_registry.google_artifact_registry_repository.containers
#   id = "projects/PROJECT_ID/locations/REGION/repositories/EXISTING_REPO_ID"
# }

# ============================================================================
# Cloud Run Imports
# ============================================================================
# Uncomment if you have existing Cloud Run service
#
# import {
#   to = module.cloud_run.google_cloud_run_v2_service.main
#   id = "projects/PROJECT_ID/locations/REGION/services/EXISTING_SERVICE_NAME"
# }

# ============================================================================
# Secret Manager Imports
# ============================================================================
# Uncomment if you have existing secrets
#
# import {
#   to = module.firebase.google_secret_manager_secret.firebase_config
#   id = "projects/PROJECT_ID/secrets/EXISTING_SECRET_ID"
# }
#
# import {
#   to = module.secrets.google_secret_manager_secret.additional["SECRET_ID"]
#   id = "projects/PROJECT_ID/secrets/EXISTING_SECRET_ID"
# }

# ============================================================================
# Import Instructions
# ============================================================================
#
# To import existing resources:
#
# 1. Uncomment the relevant import blocks above
# 2. Update the 'id' field with your actual resource IDs
# 3. Run: terraform plan -generate-config-out=generated.tf
# 4. Review generated.tf and merge into appropriate module files
# 5. Run: terraform plan to verify imports
# 6. Run: terraform apply to complete the import
#
# Resource ID formats:
# - Projects: projects/PROJECT_ID
# - Service Accounts: projects/PROJECT_ID/serviceAccounts/EMAIL
# - WIF Pool: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID
# - WIF Provider: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
# - Firebase: projects/PROJECT_ID
# - Firestore: projects/PROJECT_ID/databases/(default)
# - Artifact Registry: projects/PROJECT_ID/locations/REGION/repositories/REPO_ID
# - Cloud Run: projects/PROJECT_ID/locations/REGION/services/SERVICE_NAME
# - Secrets: projects/PROJECT_ID/secrets/SECRET_ID
#
# Ref: https://developer.hashicorp.com/terraform/language/import
