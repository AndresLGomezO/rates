# modules/secrets/outputs.tf
# Secret Manager module outputs

output "firebase_config_secret_id" {
  description = "Secret Manager secret ID for Firebase client configuration"
  value       = try(google_secret_manager_secret.firebase_config[0].secret_id, null)
}

output "firebase_config_secret_name" {
  description = "Secret Manager secret name (full resource name) for Firebase client configuration"
  value       = try(google_secret_manager_secret.firebase_config[0].name, null)
}

output "firebase_config_secret_version" {
  description = "Latest secret version for Firebase client configuration"
  value       = try(google_secret_manager_secret_version.firebase_config[0].name, null)
}

output "secret_ids" {
  description = "List of all secret IDs created by this module"
  value = compact(concat(
    try([google_secret_manager_secret.firebase_config[0].secret_id], []),
    [for k, v in google_secret_manager_secret.additional : k]
  ))
}

output "additional_secret_ids" {
  description = "Map of additional secret IDs (key = secret_id, value = secret resource name)"
  value = {
    for k, v in google_secret_manager_secret.additional : k => v.secret_id
  }
}

output "all_secrets" {
  description = "Map of all secrets (key = secret_id, value = secret resource name)"
  # Note: Using try() to safely access resources that may not exist (when count = 0)
  value = merge(
    try({
      (google_secret_manager_secret.firebase_config[0].secret_id) = google_secret_manager_secret.firebase_config[0].name
    }, {}),
    {
      for k, v in google_secret_manager_secret.additional : k => v.name
    }
  )
}

output "free_tier_status" {
  description = "Secret Manager free tier usage information"
  value = {
    secrets_created = (
      (try(google_secret_manager_secret.firebase_config[0].id, null) != null ? 1 : 0) +
      length(google_secret_manager_secret.additional)
    )
    free_tier_limit       = 6
    monthly_accesses_free = 10000
    within_free_tier = (
      (try(google_secret_manager_secret.firebase_config[0].id, null) != null ? 1 : 0) +
      length(google_secret_manager_secret.additional)
    ) <= 6
    pricing_doc = "https://cloud.google.com/secret-manager/pricing"
  }
}
