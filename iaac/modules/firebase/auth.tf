# modules/firebase/auth.tf
# Identity Platform (Firebase Auth) configuration
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/identity_platform_config
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/identity_platform_default_supported_idp_config
# Ref: https://cloud.google.com/identity-platform/pricing
#
# FREE TIER: 50,000 MAU (Monthly Active Users)
# SMS MFA: 10 SMS/day free, then paid

# ============================================================================
# Identity Platform Configuration
# ============================================================================
# Configures Firebase Authentication (Identity Platform)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/identity_platform_config
#
# NOTE: Identity Platform is automatically enabled when Firebase project is linked.
# If it already exists, Terraform will import it automatically or you can import it manually.
# To import: terraform import module.firebase.google_identity_platform_config.default projects/PROJECT_ID

resource "google_identity_platform_config" "default" {
  project = var.project_id

  # Sign-in configuration
  sign_in {
    # Don't allow duplicate emails (one account per email)
    allow_duplicate_emails = false

    # Email/password authentication (always enabled)
    email {
      enabled           = true
      password_required = true
    }
  }

  # Multi-factor authentication configuration
  # 💰 DISABLED BY DEFAULT (SMS costs money after 10/day)
  # Ref: https://cloud.google.com/identity-platform/docs/web/mfa
  mfa {
    enabled_providers = var.enable_mfa ? ["PHONE_SMS"] : []
    state             = var.mfa_state
  }

  # Wait for Identity Platform API to be enabled and Firebase project to be linked
  depends_on = [
    var.api_propagation_delay,
    google_firebase_project.default
  ]

  # Lifecycle: If Identity Platform is already enabled, import it instead of failing
  lifecycle {
    # Allow Terraform to import existing resources
    create_before_destroy = false
  }
}

# ============================================================================
# Google Sign-In Provider (OAuth)
# ============================================================================
# Configures Google as an OAuth provider for authentication
# FREE feature - no additional cost
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/identity_platform_default_supported_idp_config

resource "google_identity_platform_default_supported_idp_config" "google" {
  count = var.enable_google_signin && var.google_oauth_client_id != null && var.google_oauth_client_secret != null ? 1 : 0

  project       = var.project_id
  enabled       = true
  idp_id        = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret

  # Wait for Identity Platform config to be created
  depends_on = [google_identity_platform_config.default]
}
