# modules/iam/bindings.tf
# Fine-grained IAM bindings with least privilege
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_iam
# Ref: https://cloud.google.com/iam/docs/understanding-roles

# ============================================================================
# Secret Manager Access (Scoped per Secret)
# ============================================================================
# Grant runtime service account access to specific secrets only
# This follows least privilege - only grant access to secrets that are needed
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_iam

resource "google_secret_manager_secret_iam_member" "runtime_secret_access" {
  for_each = toset(var.runtime_secrets)

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloudrun_runtime.email}"

  # Note: The secret must exist before this binding is created
  # This will be handled by the secrets module (Step 2.4)
  # Use depends_on if secrets are created in the same module
}

# ============================================================================
# CI/CD Secret Manager Access (Scoped per Secret)
# ============================================================================
# Grant CI/CD service account access to specific secrets (e.g., deployment config)
# This follows least privilege - only grant access to secrets that are needed
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_iam

resource "google_secret_manager_secret_iam_member" "cicd_secret_access" {
  for_each = toset(var.cicd_secrets)

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cicd_deployer.email}"

  # Note: The secret must exist before this binding is created
  # Deployment config secrets are created manually via setup.sh
}

# ============================================================================
# Additional Fine-Grained Permissions
# ============================================================================
# Add any other scoped IAM bindings here as needed
# Examples:
# - Artifact Registry reader access (if needed)
# - Cloud Storage bucket access (if needed)
# - Pub/Sub topic access (if needed)

# Example: Grant Artifact Registry reader access if needed
# resource "google_artifact_registry_repository_iam_member" "runtime_reader" {
#   project    = var.project_id
#   location   = var.region
#   repository = var.artifact_registry_repo
#   role       = "roles/artifactregistry.reader"
#   member     = "serviceAccount:${var.cloudrun_runtime_service_account_email}"
# }
