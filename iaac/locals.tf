locals {
  github_repo_full = "${var.github_owner}/${var.github_repo}"

  environments = {
    dev = {
      project_id              = var.project_id_dev
      ar_repository           = var.ar_repository_dev
      sa_name                 = var.sa_name_dev
      cloud_run_service_app   = var.cloud_run_service_app_dev
      cloud_run_service_auth  = var.cloud_run_service_auth_app_dev
      github_branch           = var.github_branch_dev
      github_environment     = "development"
    }
    staging = {
      project_id              = var.project_id_staging
      ar_repository           = var.ar_repository_staging
      sa_name                 = var.sa_name_staging
      cloud_run_service_app   = var.cloud_run_service_app_staging
      cloud_run_service_auth  = var.cloud_run_service_auth_app_staging
      github_branch           = var.github_branch_staging
      github_environment     = "staging"
    }
    prod = {
      project_id              = var.project_id_prod
      ar_repository           = var.ar_repository_prod
      sa_name                 = var.sa_name_prod
      cloud_run_service_app   = var.cloud_run_service_app_prod
      cloud_run_service_auth  = var.cloud_run_service_auth_app_prod
      github_branch           = var.github_branch_prod
      github_environment     = "production"
    }
  }

  # Required APIs for all environments
  required_apis = [
    "iamcredentials.googleapis.com",
    "iam.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    # Firebase/Identity Platform APIs
    "identitytoolkit.googleapis.com",    # Identity Platform (GCP-native Firebase Auth)
    "firebase.googleapis.com",           # Firebase API (enables Firebase services)
    "firestore.googleapis.com",          # Firestore API
    "firebasestorage.googleapis.com",    # Firebase Storage API
    "cloudfunctions.googleapis.com"      # Cloud Functions API
  ]
}
