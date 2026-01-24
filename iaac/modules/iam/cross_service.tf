# modules/iam/cross_service.tf
# Cross-service IAM bindings
# Connects Cloud Run, Artifact Registry, and other services
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/artifact_registry_repository_iam
# Ref: https://cloud.google.com/iam/docs/understanding-roles

# ============================================================================
# Artifact Registry Access
# ============================================================================
# Grant CI/CD service account write access to Artifact Registry
# Runtime service account typically doesn't need Artifact Registry access
# (it only needs to pull images, which is handled by Cloud Run)

# CI/CD: Writer access to push images
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/artifact_registry_repository_iam
resource "google_artifact_registry_repository_iam_member" "cicd_writer" {
  count = var.artifact_registry_repository_id != null && var.artifact_registry_repository_location != null ? 1 : 0

  project    = var.project_id
  location   = var.artifact_registry_repository_location
  repository = var.artifact_registry_repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.cicd_deployer.email}"
}

# Optional: Grant runtime service account reader access if needed
# (Usually not required - Cloud Run handles image pulling automatically)
# resource "google_artifact_registry_repository_iam_member" "runtime_reader" {
#   count = var.artifact_registry_repository_id != null && var.artifact_registry_repository_location != null ? 1 : 0
#   
#   project    = var.project_id
#   location   = var.artifact_registry_repository_location
#   repository = var.artifact_registry_repository_id
#   role       = "roles/artifactregistry.reader"
#   member     = "serviceAccount:${var.runtime_service_account_email}"
# }

# ============================================================================
# Additional Cross-Service Bindings
# ============================================================================
# Add any other cross-service IAM bindings here as needed
# Examples:
# - Cloud Storage bucket access (if using Cloud Storage)
# - Pub/Sub topic access (if using Pub/Sub)
# - Cloud Tasks access (if using Cloud Tasks)

# Example: Cloud Storage bucket access
# resource "google_storage_bucket_iam_member" "runtime_reader" {
#   bucket = var.storage_bucket_name
#   role   = "roles/storage.objectViewer"
#   member = "serviceAccount:${var.runtime_service_account_email}"
# }
