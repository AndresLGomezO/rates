# checks.tf
# Validation checks including cost validation
# Requires Terraform >= 1.5.0
# Ref: https://developer.hashicorp.com/terraform/language/checks

# ============================================================================
# Free Tier Compliance Checks
# ============================================================================

check "free_tier_cloudrun_config" {
  assert {
    condition     = !var.enable_free_tier_only || var.cloudrun_min_instances == 0
    error_message = "⚠️ COST WARNING: Free tier mode is enabled but min_instances > 0. This WILL incur charges. Set cloudrun_min_instances = 0 for free tier."
  }
}

check "free_tier_firestore_pitr" {
  assert {
    condition     = !var.enable_free_tier_only || !var.enable_firestore_pitr
    error_message = "⚠️ COST WARNING: Free tier mode is enabled but Firestore PITR is enabled. This WILL incur charges (~$0.10/GB/month). Set enable_firestore_pitr = false for free tier."
  }
}

check "free_tier_firestore_backups" {
  assert {
    condition     = !var.enable_free_tier_only || !var.enable_firestore_backups
    error_message = "⚠️ COST WARNING: Free tier mode is enabled but Firestore backups are enabled. This WILL incur charges. Set enable_firestore_backups = false for free tier."
  }
}

check "free_tier_mfa" {
  assert {
    condition     = !var.enable_free_tier_only || !var.enable_mfa
    error_message = "⚠️ COST WARNING: Free tier mode is enabled but MFA is enabled. SMS beyond 10/day WILL incur charges. Set enable_mfa = false for free tier."
  }
}

check "free_tier_immutable_tags" {
  assert {
    condition     = !var.enable_free_tier_only || !var.enable_immutable_tags
    error_message = "⚠️ INFO: Free tier mode is enabled but immutable tags are enabled. This may increase Artifact Registry storage usage. Consider setting enable_immutable_tags = false."
  }
}

# ============================================================================
# Configuration Validation Checks
# ============================================================================

check "firestore_location_matches_region" {
  assert {
    condition     = var.firestore_location == var.region || contains(["nam5", "eur3"], var.firestore_location)
    error_message = "⚠️ WARNING: Firestore location (${var.firestore_location}) should match Cloud Run region (${var.region}) for optimal latency, or use multi-region (nam5, eur3). Ref: https://cloud.google.com/firestore/docs/locations"
  }
}

check "billing_account_required_for_new_project" {
  assert {
    condition     = var.project_id != null || var.billing_account_id != null
    error_message = "❌ ERROR: Billing account ID is required when creating a new project (project_id is null). Provide billing_account_id variable."
  }
}

check "github_repo_format" {
  assert {
    condition     = can(regex("^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$", var.github_repo))
    error_message = "❌ ERROR: GitHub repository must be in format 'owner/repo-name' (e.g., 'myorg/myapp'). Current value: ${var.github_repo}"
  }
}

check "org_or_folder_not_both" {
  assert {
    condition     = var.org_id == null || var.folder_id == null
    error_message = "❌ ERROR: Cannot specify both org_id and folder_id. Use either org_id OR folder_id, not both."
  }
}

# ============================================================================
# Resource Dependency Checks
# ============================================================================

check "google_signin_requires_credentials" {
  assert {
    condition     = !var.enable_google_signin || (var.google_oauth_client_id != null && var.google_oauth_client_secret != null)
    error_message = "❌ ERROR: Google Sign-In is enabled but OAuth credentials are missing. Provide google_oauth_client_id and google_oauth_client_secret when enable_google_signin = true."
  }
}

check "app_check_requires_recaptcha" {
  assert {
    condition     = !var.enable_app_check || var.recaptcha_site_secret != null
    error_message = "❌ ERROR: App Check is enabled but reCAPTCHA site secret is missing. Provide recaptcha_site_secret when enable_app_check = true."
  }
}

# ============================================================================
# Cost Estimate Warning
# ============================================================================

check "cost_estimate_warning" {
  assert {
    condition     = var.enable_free_tier_only
    error_message = "💰 INFO: Paid features are enabled (enable_free_tier_only = false). Review terraform plan output and cost_summary output for cost implications. Use GCP pricing calculator: https://cloud.google.com/products/calculator"
  }
}
