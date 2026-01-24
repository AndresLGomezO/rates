# backend.tf
# Remote state configuration for Terraform
# Ref: https://developer.hashicorp.com/terraform/language/settings/backends/gcs
#
# IMPORTANT: The GCS bucket must be created separately or via bootstrap script
# before using remote state. For initial setup, use local backend.

terraform {
  # Local backend for initial setup
  # Switch to GCS backend after project and bucket are created
  backend "local" {
    path = "terraform.tfstate"
  }

  # Uncomment and configure after GCS bucket is created:
  # backend "gcs" {
  #   bucket = "tf-state-PROJECT_ID"  # Replace with actual project ID
  #   prefix = "infrastructure/ENVIRONMENT"  # e.g., infrastructure/dev
  # }
}

# Alternative: GCS backend configuration (commented out for initial setup)
# 
# To enable GCS backend:
# 1. Create GCS bucket: gsutil mb -p PROJECT_ID gs://tf-state-PROJECT_ID
# 2. Enable versioning: gsutil versioning set on gs://tf-state-PROJECT_ID
# 3. Uncomment the backend "gcs" block above
# 4. Update bucket and prefix values
# 5. Run: terraform init -migrate-state
#
# Benefits of GCS backend:
# - State locking (prevents concurrent modifications)
# - Version history
# - Team collaboration
# - Encryption at rest
#
# Ref: https://cloud.google.com/storage/docs/encryption
