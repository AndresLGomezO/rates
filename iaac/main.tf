# main.tf
# Root module orchestration
# This file orchestrates all infrastructure modules and connects dependencies

# ============================================================================
# Project Module
# ============================================================================
# Creates or selects GCP project, enables APIs, handles propagation

module "project" {
  source = "./modules/project"

  project_id         = var.project_id
  billing_account_id = var.billing_account_id
  org_id             = var.org_id
  folder_id          = var.folder_id
  admin_email        = var.admin_email
  app_name           = var.app_name
  environment        = var.environment
  region             = var.region
  labels             = local.cost_labels
  required_apis      = local.required_apis
}

# ============================================================================
# IAM Module
# ============================================================================
# Creates service accounts and IAM bindings

module "iam" {
  source = "./modules/iam"

  project_id             = module.project.project_id
  app_name               = var.app_name
  environment            = var.environment
  service_account_prefix = local.service_account_prefix
  labels                 = local.cost_labels
  # Runtime secrets: Firebase config secret + any additional secrets
  runtime_secrets = concat(
    [module.firebase.firebase_config_secret_id],
    module.secrets.secret_ids
  )
  region                                = var.region
  artifact_registry_repository_id       = module.artifact_registry.repository_id
  artifact_registry_repository_location = module.artifact_registry.location

  depends_on = [
    module.project,
    module.firebase,
    module.secrets,
    module.artifact_registry
  ]
}

# ============================================================================
# Workload Identity Federation Module
# ============================================================================
# Sets up keyless authentication for GitHub Actions

module "workload_identity" {
  source = "./modules/workload-identity"

  project_id                 = module.project.project_id
  github_repo                = var.github_repo
  github_environments        = var.github_environments
  wif_pool_id                = local.wif_pool_id
  wif_provider_id            = local.wif_provider_id
  cicd_service_account_email = module.iam.cicd_deployer_service_account
  environment                = var.environment
  labels                     = local.cost_labels

  depends_on = [module.iam]
}

# ============================================================================
# Firebase Module
# ============================================================================
# Links Firebase project, configures Auth, Firestore, App Check

module "firebase" {
  source = "./modules/firebase"

  project_id            = module.project.project_id
  app_name              = var.app_name
  environment           = var.environment
  labels                = local.cost_labels
  api_propagation_delay = module.project.api_propagation_complete

  # Identity Platform (Auth)
  enable_mfa                 = var.enable_mfa
  mfa_state                  = local.mfa_state
  enable_google_signin       = var.enable_google_signin
  google_oauth_client_id     = var.google_oauth_client_id
  google_oauth_client_secret = var.google_oauth_client_secret

  # Firestore
  firestore_location        = var.firestore_location
  firestore_pitr            = local.firestore_pitr
  firestore_deletion_policy = local.firestore_deletion_policy
  enable_firestore_backups  = var.enable_firestore_backups

  # App Check
  enable_app_check      = var.enable_app_check
  recaptcha_site_secret = var.recaptcha_site_secret

  # Secrets
  firebase_config_secret_id = local.firebase_config_secret
  firebase_api_key          = null # Can be provided via variable if needed

  depends_on = [module.project]
}

# ============================================================================
# Secrets Module
# ============================================================================
# Manages application secrets (Firebase config + additional secrets)

module "secrets" {
  source = "./modules/secrets"

  project_id  = module.project.project_id
  environment = var.environment
  labels      = local.cost_labels

  # Firebase config is handled by Firebase module
  firebase_config_secret_id = null
  firebase_config_data      = null

  # Additional application secrets
  additional_secrets = {} # Add additional secrets here as needed

  depends_on = [module.project]
}

# ============================================================================
# Artifact Registry Module
# ============================================================================
# Creates container image repository

module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id              = module.project.project_id
  region                  = var.region
  repository_id           = local.artifact_registry_repo
  description             = "Container images for ${var.app_name} (${var.environment})"
  enable_immutable_tags   = local.artifact_registry_config.immutable_tags
  keep_recent_versions    = local.artifact_registry_config.keep_recent_versions
  untagged_retention_days = local.artifact_registry_config.untagged_retention_days
  labels                  = local.cost_labels

  depends_on = [module.project]
}

# ============================================================================
# Cloud Run Module
# ============================================================================
# Creates Cloud Run service infrastructure

module "cloud_run" {
  source = "./modules/cloud-run"

  project_id                    = module.project.project_id
  region                        = var.region
  service_name                  = "${var.app_name}-${var.environment}"
  runtime_service_account_email = module.iam.cloudrun_runtime_service_account

  # FREE TIER DEFAULTS
  min_instances   = local.cloudrun_config.min_instances
  max_instances   = local.cloudrun_config.max_instances
  memory          = local.cloudrun_config.memory
  cpu             = local.cloudrun_config.cpu
  timeout_seconds = local.cloudrun_config.timeout_seconds

  labels = local.cost_labels

  # Environment variables
  environment_variables = {}

  # Secrets (Firebase config + any additional secrets)
  # Note: Firebase config secret is always created by Firebase module
  secrets = concat(
    [
      {
        name        = "FIREBASE_CONFIG"
        secret_name = module.firebase.firebase_config_secret_id
        version     = "latest"
      }
    ],
    # Add additional secrets here as needed
    # Example:
    # [
    #   {
    #     name        = "API_KEY"
    #     secret_name = "api-key-${var.environment}"
    #     version     = "latest"
    #   }
    # ]
    []
  )

  depends_on = [
    module.project,
    module.iam,
    module.firebase
  ]
}

# ============================================================================
# GitHub Actions Module
# ============================================================================
# NOTE: This module is not implemented. The deployment config secret is created
# manually via ./scripts/setup.sh create-secret <environment>
# 
# To enable automated GitHub Actions setup in the future, implement the
# github-actions module or set configure_github_actions = false in terraform.tfvars

# module "github_actions" {
#   count = var.configure_github_actions ? 1 : 0
#   source = "./modules/github-actions"
#
#   # Project information
#   project_id     = module.project.project_id
#   project_number = module.project.project_number
#
#   # GitHub repository information
#   github_owner     = local.github_owner_auto
#   github_repo_name = local.github_repo_name_auto
#
#   # Environment
#   environment = var.environment
#
#   # Workload Identity Federation
#   workload_identity_provider_name = module.workload_identity.workload_identity_provider_name
#   cicd_service_account_email      = module.iam.cicd_deployer_service_account
#
#   # Artifact Registry
#   artifact_registry_url = module.artifact_registry.repository_url
#
#   # Cloud Run
#   cloud_run_service_name = module.cloud_run.service_name
#   cloud_run_region       = var.region
#   cloudrun_config        = module.cloud_run.free_tier_config
#
#   # GitHub environments
#   github_environments = var.github_environments
#
#   # Workflow configuration
#   workflow_branch            = "main" # Default branch
#   workflow_path              = ".github/workflows"
#   workflow_filename          = "deploy"
#   enable_workflow_generation  = true
#   # Workflow file path: relative to repository root (one level up from iaac/)
#   workflow_file_path = "../.github/workflows/deploy-${var.environment}.yml"
#
#   # Labels
#   labels = local.cost_labels
#
#   depends_on = [
#     module.project,
#     module.iam,
#     module.workload_identity,
#     module.artifact_registry,
#     module.cloud_run
#   ]
# }
