# modules/firebase/app_check.tf
# Firebase App Check configuration for API abuse prevention
# Ref: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs/resources/firebase_app_check_recaptcha_v3_config
# Ref: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs/resources/firebase_app_check_service_config
# Ref: https://firebase.google.com/docs/app-check
#
# FREE feature - no additional cost
# Protects backend resources from abuse by requiring valid app attestation tokens

# ============================================================================
# reCAPTCHA v3 Configuration
# ============================================================================
# Configures reCAPTCHA v3 as the App Check provider
# Required for App Check to work with web apps
# Ref: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs/resources/firebase_app_check_recaptcha_v3_config

resource "google_firebase_app_check_recaptcha_v3_config" "default" {
  count = var.enable_app_check && var.recaptcha_site_secret != null ? 1 : 0

  provider    = google-beta
  project     = var.project_id
  app_id      = google_firebase_web_app.default.app_id
  site_secret = var.recaptcha_site_secret

  # Token TTL: 1 hour (3600 seconds)
  # This determines how long App Check tokens are valid
  token_ttl = "3600s"

  # Wait for Firebase Web App to be created
  depends_on = [google_firebase_web_app.default]
}

# ============================================================================
# App Check Service Configuration (Firestore)
# ============================================================================
# Enables App Check enforcement for Firestore
# When enforced, only requests with valid App Check tokens are allowed
# Ref: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs/resources/firebase_app_check_service_config

resource "google_firebase_app_check_service_config" "firestore" {
  count = var.enable_app_check ? 1 : 0

  provider   = google-beta
  project    = var.project_id
  service_id = "firestore.googleapis.com"

  # Enforcement mode:
  # - UNENFORCED: App Check is enabled but not enforced (recommended for dev/staging)
  # - ENFORCED: App Check is enforced (recommended for production)
  enforcement_mode = var.environment == "prod" ? "ENFORCED" : "UNENFORCED"
}

# ============================================================================
# App Check Service Configuration (Cloud Functions - if used)
# ============================================================================
# Optional: Enable App Check for Cloud Functions
# Uncomment if using Cloud Functions
# resource "google_firebase_app_check_service_config" "cloud_functions" {
#   count = var.enable_app_check ? 1 : 0
#   
#   provider    = google-beta
#   project     = var.project_id
#   service_id  = "cloudfunctions.googleapis.com"
#   
#   enforcement_mode = var.environment == "prod" ? "ENFORCED" : "UNENFORCED"
# }
