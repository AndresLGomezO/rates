# modules/secrets/main.tf
# Secret Manager base configuration
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_version
# Ref: https://cloud.google.com/secret-manager/pricing
#
# FREE TIER: 6 active secret versions, 10,000 access operations/month

locals {
  # Merge provided labels with default labels
  secret_labels = merge(
    {
      "managed-by"  = "terraform"
      "environment" = var.environment
    },
    var.labels
  )

  # Default Firebase config secret ID if not provided
  firebase_secret_id = var.firebase_config_secret_id != null ? var.firebase_config_secret_id : "firebase-client-config-${var.environment}"
}

# ============================================================================
# Firebase Client Configuration Secret
# ============================================================================
# Stores Firebase client configuration (API keys, project ID, etc.)
# This is typically used by Cloud Run services to initialize Firebase SDK

resource "google_secret_manager_secret" "firebase_config" {
  count = var.firebase_config_data != null ? 1 : 0

  project   = var.project_id
  secret_id = local.firebase_secret_id

  replication {
    # Automatic replication (replicates to all regions)
    auto {}
  }

  labels = local.secret_labels
}

# Secret version containing Firebase client configuration
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_version
resource "google_secret_manager_secret_version" "firebase_config" {
  count = var.firebase_config_data != null ? 1 : 0

  secret      = google_secret_manager_secret.firebase_config[0].id
  secret_data = var.firebase_config_data

  # Note: Secret versions are immutable - create new version to update
}

# ============================================================================
# Additional Secrets Template
# ============================================================================
# Add more secrets here as needed
# Examples:
# - API keys
# - Database passwords
# - OAuth client secrets
# - Third-party service credentials

# Example: API Key Secret
# resource "google_secret_manager_secret" "api_key" {
#   project   = var.project_id
#   secret_id = "api-key-${var.environment}"
#   
#   replication {
#     auto {}
#   }
#   
#   labels = local.secret_labels
# }
# 
# resource "google_secret_manager_secret_version" "api_key" {
#   secret      = google_secret_manager_secret.api_key.id
#   secret_data = var.api_key_value  # Pass via variable
# }
