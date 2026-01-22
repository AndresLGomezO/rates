# outputs.tf
# Comprehensive outputs including cost summary, GitHub Actions config, and resource endpoints
# Ref: https://developer.hashicorp.com/terraform/language/values/outputs

# ============================================================================
# Project Information
# ============================================================================

output "project_id" {
  description = "GCP Project ID"
  value       = module.project.project_id
}

output "project_number" {
  description = "GCP Project Number"
  value       = module.project.project_number
}

output "project_name" {
  description = "GCP Project Name"
  value       = module.project.project_name
}

output "is_new_project" {
  description = "Whether this is a newly created project (true) or existing (false)"
  value       = module.project.is_new_project
}

# ============================================================================
# Version Information
# ============================================================================

output "version_info" {
  description = "Version information for deployed infrastructure"
  value = {
    terraform_version_constraint = ">= 1.6.0, < 2.0.0"
    google_provider_version      = "~> 6.14.0"
    google_beta_provider_version = "~> 6.14.0"
    deployment_timestamp         = timestamp()
    documentation_urls = {
      terraform_google      = "https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs"
      terraform_google_beta = "https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs"
      cloud_run             = "https://cloud.google.com/run/docs"
      firestore             = "https://cloud.google.com/firestore/docs"
      wif                   = "https://cloud.google.com/iam/docs/workload-identity-federation"
      artifact_registry     = "https://cloud.google.com/artifact-registry/docs"
    }
  }
}

# ============================================================================
# 💰 COST SUMMARY OUTPUT
# ============================================================================

output "cost_summary" {
  description = "Cost profile and free tier status"
  value = {
    mode = var.enable_free_tier_only ? "FREE_TIER" : "PAID_FEATURES_ENABLED"

    free_tier_status = {
      cloud_run = {
        scale_to_zero    = local.cloudrun_config.min_instances == 0
        within_free_tier = local.cloudrun_config.min_instances == 0
        config           = local.cloudrun_config
        pricing_doc      = "https://cloud.google.com/run/pricing"
      }
      firestore = {
        pitr_enabled     = local.firestore_pitr == "POINT_IN_TIME_RECOVERY_ENABLED"
        backups_enabled  = var.enable_firestore_backups
        within_free_tier = local.firestore_pitr == "POINT_IN_TIME_RECOVERY_DISABLED" && !var.enable_firestore_backups
        pricing_doc      = "https://cloud.google.com/firestore/pricing"
      }
      firebase_auth = {
        mfa_enabled      = local.mfa_state == "ENABLED"
        within_free_tier = local.mfa_state == "DISABLED"
        free_mau_limit   = 50000
        pricing_doc      = "https://cloud.google.com/identity-platform/pricing"
      }
      artifact_registry = {
        free_storage_gb    = 0.5
        cleanup_aggressive = local.is_free_tier
        pricing_doc        = "https://cloud.google.com/artifact-registry/pricing"
      }
      secret_manager = {
        secrets_created  = length(module.secrets.secret_ids)
        free_versions    = 6
        free_accesses    = 10000
        within_free_tier = length(module.secrets.secret_ids) <= 6
        pricing_doc      = "https://cloud.google.com/secret-manager/pricing"
      }
    }

    estimated_monthly_cost = var.enable_free_tier_only ? "$0 (within free tier)" : "Review GCP pricing calculator"
    pricing_calculator     = "https://cloud.google.com/products/calculator"

    paid_features_enabled = var.enable_free_tier_only ? [] : compact([
      local.firestore_pitr == "POINT_IN_TIME_RECOVERY_ENABLED" ? "Firestore PITR (~$0.10/GB/month)" : "",
      var.enable_firestore_backups ? "Firestore Backups (varies)" : "",
      local.cloudrun_config.min_instances > 0 ? "Cloud Run Always-On (varies)" : "",
      local.mfa_state == "ENABLED" ? "SMS MFA (after 10/day)" : "",
    ])
  }
}

# ============================================================================
# GitHub Actions Configuration
# ============================================================================

output "github_actions_config" {
  description = "Configuration for GitHub Actions workflow"
  value = {
    workload_identity_provider = module.workload_identity.workload_identity_provider_name
    service_account_email      = module.iam.cicd_deployer_service_account
    artifact_registry_url      = module.artifact_registry.repository_url
    cloud_run_region           = var.region
    cloud_run_service_name     = module.cloud_run.service_name
    project_id                 = module.project.project_id

    # Cloud Run configuration (FREE TIER defaults)
    cloudrun_config = module.cloud_run.free_tier_config

    # Pinned action versions for workflows
    recommended_action_versions = {
      checkout          = "v4.2.2"
      google_auth       = "v2.1.7"
      setup_gcloud      = "v2.1.2"
      deploy_cloudrun   = "v2.7.2"
      setup_buildx      = "v3.7.1"
      build_push_action = "v6.10.0"
    }
  }
}

# ============================================================================
# Firebase Configuration
# ============================================================================

output "firebase_config" {
  description = "Firebase configuration"
  sensitive   = true
  value = {
    project_id         = module.firebase.firebase_project_id
    project_number     = module.firebase.firebase_project_number
    web_app_id         = module.firebase.firebase_web_app_id
    firestore_database = module.firebase.firestore_database
    identity_platform  = module.firebase.identity_platform_config
    app_check          = module.firebase.app_check_config
    config_secret_id   = module.firebase.firebase_config_secret_id
  }
}

# ============================================================================
# Cloud Run Configuration
# ============================================================================

output "cloud_run_config" {
  description = "Cloud Run service configuration"
  value = {
    service_name     = module.cloud_run.service_name
    service_url      = module.cloud_run.service_url
    service_id       = module.cloud_run.service_id
    location         = module.cloud_run.service_location
    free_tier_config = module.cloud_run.free_tier_config
  }
}

# ============================================================================
# Artifact Registry Configuration
# ============================================================================

output "artifact_registry_config" {
  description = "Artifact Registry configuration"
  value = {
    repository_id    = module.artifact_registry.repository_id
    repository_url   = module.artifact_registry.repository_url
    location         = module.artifact_registry.location
    free_tier_status = module.artifact_registry.free_tier_status
  }
}

# ============================================================================
# Service Accounts
# ============================================================================

output "service_accounts" {
  description = "Service account information"
  value = {
    runtime = {
      email = module.iam.cloudrun_runtime_service_account
      id    = module.iam.cloudrun_runtime_service_account_id
      name  = module.iam.cloudrun_runtime_service_account_name
      roles = module.iam.cloudrun_runtime_roles
    }
    cicd = {
      email = module.iam.cicd_deployer_service_account
      id    = module.iam.cicd_deployer_service_account_id
      name  = module.iam.cicd_deployer_service_account_name
      roles = module.iam.cicd_deployer_roles
    }
  }
}

# ============================================================================
# Workload Identity Federation
# ============================================================================

output "workload_identity" {
  description = "Workload Identity Federation configuration"
  value = {
    pool_id               = module.workload_identity.workload_identity_pool_id
    pool_name             = module.workload_identity.workload_identity_pool_name
    provider_id           = module.workload_identity.workload_identity_provider_id
    provider_name         = module.workload_identity.workload_identity_provider_name
    github_actions_config = module.workload_identity.github_actions_config
  }
}

# ============================================================================
# Secrets Configuration
# ============================================================================

output "secrets" {
  description = "Secret Manager configuration"
  value = {
    firebase_config_secret_id = module.firebase.firebase_config_secret_id
    all_secret_ids            = module.secrets.secret_ids
    free_tier_status          = module.secrets.free_tier_status
  }
}

# ============================================================================
# Backend Configuration
# ============================================================================

output "backend_config" {
  description = "Configuration for Cloud Run backend application"
  value = {
    project_id             = module.project.project_id
    region                 = var.region
    firestore_database     = module.firebase.firestore_database.name
    runtime_sa_email       = module.iam.cloudrun_runtime_service_account
    firebase_config_secret = module.firebase.firebase_config_secret_id
    free_tier_mode         = var.enable_free_tier_only
  }
}

# ============================================================================
# Ready-to-use GitHub Actions Workflow
# ============================================================================

output "github_workflow_example" {
  description = "Example GitHub Actions workflow for deployment (with pinned versions)"
  value       = <<-EOT
    # .github/workflows/deploy.yml
    # Generated by Terraform - Versions pinned as of January 2025
    name: Deploy to Cloud Run
    
    on:
      push:
        branches: [main]
      workflow_dispatch:
    
    permissions:
      contents: read
      id-token: write  # Required for OIDC
    
    env:
      PROJECT_ID: ${module.project.project_id}
      REGION: ${var.region}
      SERVICE_NAME: ${module.cloud_run.service_name}
      ARTIFACT_REGISTRY_URL: ${module.artifact_registry.repository_url}
    
    jobs:
      deploy:
        runs-on: ubuntu-24.04  # Pinned Ubuntu version
        environment: ${var.environment}
        
        steps:
          - name: Checkout
            uses: actions/checkout@v4.2.2
          
          - name: Authenticate to Google Cloud
            id: auth
            uses: google-github-actions/auth@v2.1.7
            with:
              workload_identity_provider: '${module.workload_identity.workload_identity_provider_name}'
              service_account: '${module.iam.cicd_deployer_service_account}'
          
          - name: Setup gcloud CLI
            uses: google-github-actions/setup-gcloud@v2.1.2
            with:
              version: '503.0.0'  # Pinned gcloud version
          
          - name: Configure Docker
            run: gcloud auth configure-docker $${{ env.REGION }}-docker.pkg.dev --quiet
          
          - name: Set up Docker Buildx
            uses: docker/setup-buildx-action@v3.7.1
          
          - name: Build and Push Container
            uses: docker/build-push-action@v6.10.0
            with:
              context: .
              push: true
              tags: $${{ env.ARTIFACT_REGISTRY_URL }}/app:$${{ github.sha }}
              cache-from: type=gha
              cache-to: type=gha,mode=max
          
          - name: Deploy to Cloud Run
            uses: google-github-actions/deploy-cloudrun@v2.7.2
            with:
              service: $${{ env.SERVICE_NAME }}
              region: $${{ env.REGION }}
              image: $${{ env.ARTIFACT_REGISTRY_URL }}/app:$${{ github.sha }}
              flags: |
                --min-instances=${local.cloudrun_config.min_instances}
                --max-instances=${local.cloudrun_config.max_instances}
                --memory=${local.cloudrun_config.memory}
                --cpu=${local.cloudrun_config.cpu}
                --cpu-boost
                --service-account=${module.iam.cloudrun_runtime_service_account}
  EOT
}
