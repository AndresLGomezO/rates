# modules/firebase/secrets.tf
# Firebase client configuration and secrets management
# This creates the Firebase client config JSON and stores it in Secret Manager
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_version

locals {
  # Default Firebase config secret ID
  firebase_secret_id = var.firebase_config_secret_id != null ? var.firebase_config_secret_id : "firebase-client-config-${var.environment}"

  # Build Firebase client configuration JSON
  # This is the config object that frontend apps use to initialize Firebase SDK
  # Note: Some values need to be retrieved from Firebase Console after project creation
  # IMPORTANT: Cannot use sensitive variables directly in conditionals - use nonsensitive() wrapper
  firebase_client_config = {
    apiKey            = var.firebase_api_key != null ? nonsensitive(var.firebase_api_key) : "YOUR_API_KEY" # Retrieve from Firebase Console > Project Settings
    authDomain        = "${var.project_id}.firebaseapp.com"
    projectId         = var.project_id
    storageBucket     = "${var.project_id}.appspot.com"
    messagingSenderId = "YOUR_MESSAGING_SENDER_ID" # Retrieve from Firebase Console > Project Settings
    appId             = google_firebase_web_app.default.app_id
    measurementId     = "YOUR_MEASUREMENT_ID" # Optional, for Analytics (retrieve from Firebase Console)
  }
}

# ============================================================================
# Firebase Client Configuration Secret
# ============================================================================
# Stores Firebase client configuration for frontend applications
# This secret contains the config object needed to initialize Firebase SDK
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret

resource "google_secret_manager_secret" "firebase_config" {
  project   = var.project_id
  secret_id = local.firebase_secret_id

  replication {
    # Automatic replication (replicates to all regions)
    auto {}
  }

  labels = {
    "managed-by"  = "terraform"
    "environment" = var.environment
    "purpose"     = "firebase-config"
  }

  # Wait for Firebase Web App to be created
  depends_on = [google_firebase_web_app.default]
}

# Secret version containing Firebase client configuration
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_version
resource "google_secret_manager_secret_version" "firebase_config" {
  secret      = google_secret_manager_secret.firebase_config.id
  secret_data = jsonencode(local.firebase_client_config)

  # Note: Secret versions are immutable - create new version to update
  # To update: Create a new version with updated data
}
