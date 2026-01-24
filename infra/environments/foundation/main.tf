# ============================================================================
# FOUNDATION LAYER - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 2)
#                  docs/TERRAFORM_DESIGN.md (Layer 1: Foundation)
#                  docs/IAM_SECURITY_MODEL.md (Service Accounts & IAM)
#                  docs/GCP_PROJECT_STRUCTURE.md (Naming Convention)
#
# Purpose: Create shared foundational infrastructure used by all environments
#
# Resources Created:
#   - Required APIs (9 total)
#   - Service Accounts (4 total: 2 per environment)
#   - Artifact Registry Repositories (2 total: 1 per environment)
#   - IAM Role Bindings with environment-specific conditions
# ============================================================================

# ----------------------------------------------------------------------------
# Provider Configuration
# ----------------------------------------------------------------------------

provider "google" {
  project = var.project_id
  region  = var.region
  
  # Set quota project for APIs that require it (e.g., billingbudgets.googleapis.com)
  # This is required when using Application Default Credentials
  user_project_override = true
  billing_project       = var.project_id
}

# ----------------------------------------------------------------------------
# Local Values
# ----------------------------------------------------------------------------

locals {
  # Naming convention: rates-{env}-{component}-{region}
  # Source: docs/GCP_PROJECT_STRUCTURE.md §4.1
  
  environments = toset(var.environments)
  
  # Service account naming
  cloud_run_sa_ids = {
    for env in local.environments : env => "rates-${env}-cloud-run-sa"
  }
  
  cloud_build_sa_ids = {
    for env in local.environments : env => "rates-${env}-cloud-build-sa"
  }
  
  # Artifact Registry naming
  artifact_registry_ids = {
    for env in local.environments : env => "rates-${env}-containers"
  }
}

# ============================================================================
# API ENABLEMENT
# ============================================================================
# Source: docs/GCP_PROJECT_STRUCTURE.md §6.1 (Required APIs)
#         docs/IMPLEMENTATION_PLAN.md (Phase 2 - Enable required APIs)

# Required APIs for the Rates application
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",              # Cloud Run
    "firebase.googleapis.com",         # Firebase
    "firestore.googleapis.com",        # Cloud Firestore
    "secretmanager.googleapis.com",    # Secret Manager
    "artifactregistry.googleapis.com", # Artifact Registry
    "cloudbuild.googleapis.com",       # Cloud Build
    "iam.googleapis.com",              # IAM
    "cloudresourcemanager.googleapis.com", # Resource Manager
    "serviceusage.googleapis.com",     # Service Usage (already enabled in bootstrap)
    "billingbudgets.googleapis.com",   # Billing Budgets (for cost guardrails)
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false

  # Prevent destroy to avoid breaking dependent services
  # APIs should remain enabled even if Terraform resources are destroyed
}

# ============================================================================
# WAIT FOR APIS TO BE FULLY READY
# ============================================================================
# Some APIs (especially Artifact Registry) need time to fully activate
# after being enabled. This ensures all APIs are ready before creating resources.

resource "time_sleep" "wait_for_apis" {
  depends_on = [google_project_service.required_apis]

  # Wait 90s after API enablement to ensure Artifact Registry API is fully ready
  # This prevents "entity not found" errors when creating repositories
  create_duration = "90s"
}

# ============================================================================
# SERVICE ACCOUNTS - CLOUD RUN
# ============================================================================
# Source: docs/IAM_SECURITY_MODEL.md §1.1.1 (Cloud Run Service Accounts)
#         docs/IAM_SECURITY_MODEL.md §2.1 (Role Bindings)

module "cloud_run_service_accounts" {
  source   = "../../modules/service-account"
  for_each = local.environments

  project_id   = var.project_id
  account_id   = local.cloud_run_sa_ids[each.key]
  display_name = "${title(each.key)} Cloud Run Service Account"
  description  = "Service account for ${each.key} environment Cloud Run service (rates-${each.key}-api-${var.region})"

  # IAM Role Bindings
  # Source: docs/IAM_SECURITY_MODEL.md §2.1
  project_roles = [
    # Binding 1: Secret Manager Access (with condition)
    {
      role = "roles/secretmanager.secretAccessor"
      condition = {
        title       = "Limit to ${each.key} secrets"
        description = "Only allow access to ${each.key} environment secrets"
        expression  = "resource.name.startsWith('projects/${var.project_id}/secrets/rates-${each.key}-')"
      }
    },
    # Binding 2: Firebase Admin (project-level, no condition)
    # Source: docs/IAM_SECURITY_MODEL.md §2.1 - Firebase Admin SDK requires project-level access
    {
      role      = "roles/firebase.admin"
      condition = null
    }
  ]

  depends_on = [
    google_project_service.required_apis,
    time_sleep.wait_for_apis
  ]
}

# ============================================================================
# SERVICE ACCOUNTS - CLOUD BUILD
# ============================================================================
# Source: docs/IAM_SECURITY_MODEL.md §1.1.2 (Cloud Build Service Accounts)
#         docs/IAM_SECURITY_MODEL.md §2.2 (Role Bindings)

module "cloud_build_service_accounts" {
  source   = "../../modules/service-account"
  for_each = local.environments

  project_id   = var.project_id
  account_id   = local.cloud_build_sa_ids[each.key]
  display_name = "${title(each.key)} Cloud Build Service Account"
  description  = "Service account for ${each.key} environment Cloud Build triggers (CI/CD deployments)"

  # IAM Role Bindings
  # Source: docs/IAM_SECURITY_MODEL.md §2.2
  project_roles = [
    # Binding 1: Artifact Registry Write Access (with condition)
    {
      role = "roles/artifactregistry.writer"
      condition = {
        title       = "Limit to ${each.key} container repository"
        description = "Only allow push to ${each.key} environment container repository"
        expression  = "resource.name.startsWith('projects/${var.project_id}/locations/${var.region}/repositories/rates-${each.key}-containers')"
      }
    },
    # Binding 2: Cloud Run Deployment Access (with condition)
    {
      role = "roles/run.admin"
      condition = {
        title       = "Limit to ${each.key} Cloud Run services"
        description = "Only allow deployment to ${each.key} environment Cloud Run services"
        expression  = "resource.name.startsWith('projects/${var.project_id}/locations/${var.region}/services/rates-${each.key}-')"
      }
    },
    # Binding 3: Firebase Deployment Access (with condition)
    {
      role = "roles/firebase.admin"
      condition = {
        title       = "Limit to ${each.key} Firebase Hosting sites"
        description = "Only allow deployment to ${each.key} environment Firebase Hosting sites"
        expression  = "resource.name.startsWith('projects/${var.project_id}/sites/rates-${each.key}-')"
      }
    },
    # Binding 4: Service Account User (to attach SA to Cloud Run)
    {
      role = "roles/iam.serviceAccountUser"
      condition = {
        title       = "Limit to ${each.key} service accounts"
        description = "Only allow use of ${each.key} environment service accounts"
        expression  = "resource.name.startsWith('projects/${var.project_id}/serviceAccounts/rates-${each.key}-')"
      }
    },
    # Binding 5: Cloud Build Builder (for build operations)
    {
      role      = "roles/cloudbuild.builds.builder"
      condition = null
    }
  ]

  depends_on = [
    google_project_service.required_apis,
    time_sleep.wait_for_apis
  ]
}

# ============================================================================
# ARTIFACT REGISTRY REPOSITORIES
# ============================================================================
# Source: docs/GCP_PROJECT_STRUCTURE.md §3 (Hierarchy - Artifact Registry)
#         docs/COST_GUARDRAILS.md §2.2 (Lifecycle Policies)
#
# ⚠️  TEMPORARILY DISABLED due to GCP API issue (Error code 5: entity not found)
#     This affects both Terraform and manual gcloud commands.
#     Artifact Registry can be added later when GCP issue resolves.
#     For now, Cloud Run can use external images (Docker Hub, GCR, etc.)

# Create dev repository first
# DISABLED: Uncomment when GCP Artifact Registry API issue is resolved
# module "artifact_registry_dev" {
#   source   = "../../modules/artifact-registry"
#   count    = contains(var.environments, "dev") ? 1 : 0
#
#   project_id    = var.project_id
#   repository_id = local.artifact_registry_ids["dev"]
#   location      = var.region
#   environment   = "dev"
#   description   = "Docker container images for dev environment"
#
#   writer_service_account_email = module.cloud_build_service_accounts["dev"].email
#   reader_service_account_emails = [
#     module.cloud_run_service_accounts["dev"].email
#   ]
#
#   labels = {
#     environment = "dev"
#     application = "rates"
#   }
#
#   depends_on = [
#     google_project_service.required_apis,
#     time_sleep.wait_for_apis,
#     module.cloud_build_service_accounts,
#     module.cloud_run_service_accounts
#   ]
# }

# Create prod repository after dev
# DISABLED: Uncomment when GCP Artifact Registry API issue is resolved
# module "artifact_registry_prod" {
#   source   = "../../modules/artifact-registry"
#   count    = contains(var.environments, "prod") ? 1 : 0
#
#   project_id    = var.project_id
#   repository_id = local.artifact_registry_ids["prod"]
#   location      = var.region
#   environment   = "prod"
#   description   = "Docker container images for prod environment"
#
#   writer_service_account_email = module.cloud_build_service_accounts["prod"].email
#   reader_service_account_emails = [
#     module.cloud_run_service_accounts["prod"].email
#   ]
#
#   labels = {
#     environment = "prod"
#     application = "rates"
#   }
#
#   depends_on = [
#     google_project_service.required_apis,
#     time_sleep.wait_for_apis,
#     module.cloud_build_service_accounts,
#     module.cloud_run_service_accounts,
#     module.artifact_registry_dev
#   ]
# }

# ============================================================================
# ADDITIONAL IAM BINDINGS
# ============================================================================
# Source: docs/IAM_SECURITY_MODEL.md §7.1 (Log Writing)

# Cloud Run service accounts need logging permissions
resource "google_project_iam_member" "cloud_run_logging" {
  for_each = local.environments

  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = module.cloud_run_service_accounts[each.key].member
}

# Cloud Build service accounts need logging permissions
resource "google_project_iam_member" "cloud_build_logging" {
  for_each = local.environments

  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = module.cloud_build_service_accounts[each.key].member
}