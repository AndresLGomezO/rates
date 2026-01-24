# modules/firebase/outputs.tf
# Firebase module outputs

output "firebase_project_id" {
  description = "Firebase Project ID (same as GCP Project ID)"
  value       = google_firebase_project.default.project
}

output "firebase_project_number" {
  description = "Firebase Project Number"
  value       = google_firebase_project.default.project_number
}

output "firebase_web_app_id" {
  description = "Firebase Web App ID"
  value       = google_firebase_web_app.default.app_id
}

output "firebase_web_app_name" {
  description = "Firebase Web App name"
  value       = google_firebase_web_app.default.name
}

output "firebase_web_app_display_name" {
  description = "Firebase Web App display name"
  value       = google_firebase_web_app.default.display_name
}

output "identity_platform_config" {
  description = "Identity Platform configuration"
  value = {
    project_id            = google_identity_platform_config.default.project
    mfa_enabled           = var.enable_mfa
    mfa_state             = var.mfa_state
    google_signin_enabled = var.enable_google_signin && var.google_oauth_client_id != null
  }
}

output "google_signin_provider" {
  description = "Google Sign-In provider configuration (if enabled)"
  # Note: Using try() to avoid Terraform crash with conditional object expressions
  value = merge(
    {
      enabled = var.enable_google_signin && var.google_oauth_client_id != null
    },
    {
      idp_id = try(google_identity_platform_default_supported_idp_config.google[0].idp_id, null)
    }
  )
}

output "firestore_database" {
  description = "Firestore database configuration"
  value = {
    name                = google_firestore_database.default.name
    location_id         = google_firestore_database.default.location_id
    type                = google_firestore_database.default.type
    pitr_enabled        = var.firestore_pitr == "POINT_IN_TIME_RECOVERY_ENABLED"
    deletion_protection = var.firestore_deletion_policy == "DELETE_PROTECTION_ENABLED"
    backups_enabled     = var.enable_firestore_backups
  }
}

output "firestore_free_tier_status" {
  description = "Firestore free tier usage information"
  value = {
    pitr_enabled     = var.firestore_pitr == "POINT_IN_TIME_RECOVERY_ENABLED"
    backups_enabled  = var.enable_firestore_backups
    within_free_tier = var.firestore_pitr == "POINT_IN_TIME_RECOVERY_DISABLED" && !var.enable_firestore_backups
    free_tier_limits = {
      storage_gb      = 1
      reads_per_day   = 50000
      writes_per_day  = 20000
      deletes_per_day = 20000
    }
    pricing_doc = "https://cloud.google.com/firestore/pricing"
  }
}

output "app_check_config" {
  description = "Firebase App Check configuration"
  value = {
    enabled              = var.enable_app_check
    recaptcha_configured = var.enable_app_check && var.recaptcha_site_secret != null
    firestore_enforcement = var.enable_app_check ? (
      var.environment == "prod" ? "ENFORCED" : "UNENFORCED"
    ) : null
  }
}

output "firebase_config_secret_id" {
  description = "Secret Manager secret ID for Firebase client configuration"
  value       = google_secret_manager_secret.firebase_config.secret_id
}

output "firebase_config_secret_name" {
  description = "Secret Manager secret name (full resource name) for Firebase client configuration"
  value       = google_secret_manager_secret.firebase_config.name
}

output "firebase_client_config" {
  description = "Firebase client configuration object (for reference, actual config is in Secret Manager)"
  value       = local.firebase_client_config
  sensitive   = true
}
