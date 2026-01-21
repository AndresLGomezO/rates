# =============================================================================
# Provider Configuration
# =============================================================================

provider "google" {
  region = var.gcp_region
}

provider "google-beta" {
  region = var.gcp_region
}

# =============================================================================
# Create GCP Projects (Optional)
# =============================================================================

module "projects" {
  source = "./modules/project"
  count  = var.create_projects ? 1 : 0

  project_id_dev     = var.project_id_dev
  project_id_staging = var.project_id_staging
  project_id_prod    = var.project_id_prod
  billing_account_id = var.billing_account_id
  organization_id    = var.organization_id
}

# =============================================================================
# Environment Resources
# =============================================================================

module "environment_dev" {
  source = "./modules/environment"

  environment_name = "dev"
  project_id       = var.project_id_dev
  region           = var.gcp_region

  github_repo_full     = local.github_repo_full
  github_branch        = var.github_branch_dev
  github_environment   = local.environments.dev.github_environment

  wif_pool_id     = var.wif_pool_id
  wif_provider_id = var.wif_provider_id

  sa_name = var.sa_name_dev

  ar_repository = var.ar_repository_dev

  cloud_run_service_app      = var.cloud_run_service_app_dev
  cloud_run_service_auth     = var.cloud_run_service_auth_app_dev
  cloud_run_service_auth_api = var.cloud_run_service_auth_api_dev

  cloud_run_cpu           = var.cloud_run_cpu
  cloud_run_memory        = var.cloud_run_memory
  cloud_run_min_instances = var.cloud_run_min_instances
  cloud_run_max_instances = var.cloud_run_max_instances
  cloud_run_concurrency   = var.cloud_run_concurrency

  enable_apis              = var.enable_apis
  create_cloud_run_services = var.create_cloud_run_services
  grant_service_account_user = var.grant_service_account_user

  required_apis = local.required_apis

  depends_on = [module.projects]
}

module "environment_staging" {
  source = "./modules/environment"

  environment_name = "staging"
  project_id       = var.project_id_staging
  region           = var.gcp_region

  github_repo_full     = local.github_repo_full
  github_branch        = var.github_branch_staging
  github_environment   = local.environments.staging.github_environment

  wif_pool_id     = var.wif_pool_id
  wif_provider_id = var.wif_provider_id

  sa_name = var.sa_name_staging

  ar_repository = var.ar_repository_staging

  cloud_run_service_app      = var.cloud_run_service_app_staging
  cloud_run_service_auth     = var.cloud_run_service_auth_app_staging
  cloud_run_service_auth_api = var.cloud_run_service_auth_api_staging

  cloud_run_cpu           = var.cloud_run_cpu
  cloud_run_memory        = var.cloud_run_memory
  cloud_run_min_instances = var.cloud_run_min_instances
  cloud_run_max_instances = var.cloud_run_max_instances
  cloud_run_concurrency   = var.cloud_run_concurrency

  enable_apis              = var.enable_apis
  create_cloud_run_services = var.create_cloud_run_services
  grant_service_account_user = var.grant_service_account_user

  required_apis = local.required_apis

  depends_on = [module.projects]
}

module "environment_prod" {
  source = "./modules/environment"

  environment_name = "prod"
  project_id       = var.project_id_prod
  region           = var.gcp_region

  github_repo_full     = local.github_repo_full
  github_branch        = var.github_branch_prod
  github_environment   = local.environments.prod.github_environment

  wif_pool_id     = var.wif_pool_id
  wif_provider_id = var.wif_provider_id

  sa_name = var.sa_name_prod

  ar_repository = var.ar_repository_prod

  cloud_run_service_app      = var.cloud_run_service_app_prod
  cloud_run_service_auth     = var.cloud_run_service_auth_app_prod
  cloud_run_service_auth_api = var.cloud_run_service_auth_api_prod

  cloud_run_cpu           = var.cloud_run_cpu
  cloud_run_memory        = var.cloud_run_memory
  cloud_run_min_instances = var.cloud_run_min_instances
  cloud_run_max_instances = var.cloud_run_max_instances
  cloud_run_concurrency   = var.cloud_run_concurrency

  enable_apis              = var.enable_apis
  create_cloud_run_services = var.create_cloud_run_services
  grant_service_account_user = var.grant_service_account_user

  required_apis = local.required_apis

  depends_on = [module.projects]
}
