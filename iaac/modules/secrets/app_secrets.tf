# modules/secrets/app_secrets.tf
# Additional application secrets beyond Firebase config
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/secret_manager_secret_version
# Note: Variables are declared in variables.tf
# Note: Local "secret_labels" is defined in main.tf

# ============================================================================
# Additional Application Secrets
# ============================================================================
# Creates additional secrets as specified in additional_secrets variable
# Examples: API keys, database passwords, OAuth secrets, third-party credentials

resource "google_secret_manager_secret" "additional" {
  for_each = var.additional_secrets

  project   = var.project_id
  secret_id = each.key

  replication {
    # Automatic replication (replicates to all regions)
    auto {}
  }

  labels = merge(
    local.secret_labels,
    {
      "purpose" = "application-secret"
    }
  )
}

# Secret versions for additional secrets (only if data is provided)
# Note: If data is null, secret is created but no version is added
# This allows secrets to be populated later via gcloud or console
resource "google_secret_manager_secret_version" "additional" {
  for_each = {
    for k, v in var.additional_secrets : k => v
    if v.data != null
  }

  secret      = google_secret_manager_secret.additional[each.key].id
  secret_data = each.value.data

  # Note: Secret versions are immutable - create new version to update
}
