# modules/firebase/variables.tf
# Firebase module input variables

variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "app_name" {
  type        = string
  description = "Application name for resource naming"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to Firebase resources"
  default     = {}
}

variable "api_propagation_delay" {
  type        = any
  description = "Time sleep resource indicating APIs have propagated (dependency)"
  default     = null
}

variable "enable_mfa" {
  type        = bool
  description = "Enable Multi-Factor Authentication (SMS-based)"
  default     = false
}

variable "mfa_state" {
  type        = string
  description = "MFA state (ENABLED or DISABLED)"
  default     = "DISABLED"
}

variable "enable_google_signin" {
  type        = bool
  description = "Enable Google Sign-In provider"
  default     = false
}

variable "google_oauth_client_id" {
  type        = string
  description = "Google OAuth 2.0 Client ID (for Google Sign-In)"
  default     = null
}

variable "google_oauth_client_secret" {
  type        = string
  description = "Google OAuth 2.0 Client Secret (for Google Sign-In)"
  default     = null
  sensitive   = true
}

variable "firestore_location" {
  type        = string
  description = "Firestore database location (cannot be changed after creation)"
  default     = "nam5"
}

variable "firestore_pitr" {
  type        = string
  description = "Point-in-time recovery enablement (POINT_IN_TIME_RECOVERY_ENABLED or POINT_IN_TIME_RECOVERY_DISABLED)"
  default     = "POINT_IN_TIME_RECOVERY_DISABLED"
}

variable "firestore_deletion_policy" {
  type        = string
  description = "Deletion protection policy (DELETE_PROTECTION_ENABLED or DELETE_PROTECTION_DISABLED)"
  default     = "DELETE_PROTECTION_DISABLED"
}

variable "enable_firestore_backups" {
  type        = bool
  description = "Enable automated Firestore backups"
  default     = false
}

variable "enable_app_check" {
  type        = bool
  description = "Enable Firebase App Check for API abuse prevention"
  default     = false
}

variable "recaptcha_site_secret" {
  type        = string
  description = "reCAPTCHA v3 Site Secret (for App Check)"
  default     = null
  sensitive   = true
}

variable "firebase_config_secret_id" {
  type        = string
  description = "Secret Manager secret ID for Firebase client configuration"
  default     = null
}

variable "firebase_api_key" {
  type        = string
  description = "Firebase API Key (optional, can be retrieved from Firebase Console)"
  default     = null
  sensitive   = true
}
