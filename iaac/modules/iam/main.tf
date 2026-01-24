# modules/iam/main.tf
# Service account definitions with least-privilege IAM roles
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_service_account
# Ref: https://cloud.google.com/iam/docs/understanding-roles

locals {
  # Cloud Run runtime service account roles
  # Ref: https://cloud.google.com/run/docs/reference/iam/roles
  # Note: Secret Manager access is granted per-secret in bindings.tf (least privilege)
  cloudrun_runtime_roles = [
    "roles/datastore.user",    # Firestore CRUD operations
    "roles/logging.logWriter", # Structured logging
    "roles/cloudtrace.agent",  # Distributed tracing
    # Secret Manager access granted per-secret in bindings.tf for least privilege
  ]

  # CI/CD deployer service account roles
  # Ref: https://cloud.google.com/iam/docs/job-functions/devops
  cicd_deployer_roles = [
    "roles/run.developer",           # Deploy services (not admin)
    "roles/artifactregistry.writer", # Push images only
    "roles/iam.serviceAccountUser",  # Impersonate runtime SA only
  ]

  # Merge provided labels with default labels
  service_account_labels = merge(
    {
      "managed-by"  = "terraform"
      "app-name"    = var.app_name
      "environment" = var.environment
    },
    var.labels
  )
}

# ============================================================================
# Cloud Run Runtime Service Account
# ============================================================================
# This service account is used by Cloud Run services at runtime
# It has minimal permissions needed for the application to function

resource "google_service_account" "cloudrun_runtime" {
  project      = var.project_id
  account_id   = "${var.service_account_prefix}-runtime"
  display_name = "Cloud Run Runtime - ${var.app_name} (${var.environment})"
  description  = "Service account for Cloud Run workloads. Managed by Terraform."

  # Note: No service account keys are created - keyless auth only
}

# Grant Cloud Run runtime roles (project-level)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_iam_member
resource "google_project_iam_member" "cloudrun_runtime_roles" {
  for_each = toset(local.cloudrun_runtime_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloudrun_runtime.email}"
}

# ============================================================================
# CI/CD Deployer Service Account
# ============================================================================
# This service account is used by GitHub Actions (via Workload Identity Federation)
# It has permissions to deploy to Cloud Run and push to Artifact Registry
# It can impersonate the runtime service account for deployments

resource "google_service_account" "cicd_deployer" {
  project      = var.project_id
  account_id   = "${var.service_account_prefix}-cicd"
  display_name = "CI/CD Deployer - ${var.app_name} (${var.environment})"
  description  = "Service account for CI/CD deployments via GitHub Actions. Managed by Terraform."

  # Note: No service account keys are created - uses Workload Identity Federation
}

# Grant CI/CD deployer roles (project-level)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_iam_member
resource "google_project_iam_member" "cicd_deployer_roles" {
  for_each = toset(local.cicd_deployer_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cicd_deployer.email}"
}

# Allow CI/CD service account to impersonate runtime service account
# This is required for Cloud Run deployments
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/service_account_iam
resource "google_service_account_iam_member" "cicd_impersonate_runtime" {
  service_account_id = google_service_account.cloudrun_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cicd_deployer.email}"
}
