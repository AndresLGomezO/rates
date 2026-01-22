# variables.tf
# Input variables with FREE TIER defaults and validation
# Compatible with Terraform >= 1.6.0 (for validation blocks)
#
# All variables default to FREE TIER configurations.
# Paid features require explicit opt-in via feature flags.

# ============================================================================
# Project Configuration
# ============================================================================

variable "project_id" {
  type        = string
  description = <<-EOT
    GCP Project ID. 
    
    For greenfield (new project): Leave null to create a new project.
    For brownfield (existing project): Provide the existing project ID.
    
    Ref: https://cloud.google.com/resource-manager/docs/creating-managing-projects
  EOT
  default     = null

  validation {
    condition     = var.project_id == null || can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with a letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "billing_account_id" {
  type        = string
  description = <<-EOT
    GCP Billing Account ID (format: XXXXXX-XXXXXX-XXXXXX).
    
    Required for new projects. Can be found in:
    - GCP Console: Billing > Account Management
    - Command: gcloud billing accounts list
    
    Ref: https://cloud.google.com/billing/docs/how-to/manage-billing-account
  EOT
  default     = null

  validation {
    condition     = var.billing_account_id == null || can(regex("^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$", var.billing_account_id))
    error_message = "Billing account ID must be in format XXXXXX-XXXXXX-XXXXXX (e.g., 012345-678901-234567)."
  }
}

variable "org_id" {
  type        = string
  description = <<-EOT
    GCP Organization ID (numeric).
    
    Optional. Use this if you want to create the project under an organization.
    Mutually exclusive with folder_id.
    
    Ref: https://cloud.google.com/resource-manager/docs/creating-managing-organization
  EOT
  default     = null

  validation {
    condition     = var.org_id == null || can(regex("^[0-9]{1,20}$", var.org_id))
    error_message = "Organization ID must be a numeric string (1-20 digits)."
  }
}

variable "folder_id" {
  type        = string
  description = <<-EOT
    GCP Folder ID (numeric).
    
    Optional. Use this if you want to create the project under a folder.
    Mutually exclusive with org_id.
    
    Ref: https://cloud.google.com/resource-manager/docs/creating-managing-folders
  EOT
  default     = null

  validation {
    condition     = var.folder_id == null || can(regex("^[0-9]{1,20}$", var.folder_id))
    error_message = "Folder ID must be a numeric string (1-20 digits)."
  }
}

variable "admin_email" {
  type        = string
  description = <<-EOT
    Email address of the administrator.
    
    Used for:
    - Project owner assignment
    - Initial IAM bindings
    - Support contact
    
    Ref: https://cloud.google.com/iam/docs/overview
  EOT

  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.admin_email))
    error_message = "Admin email must be a valid email address."
  }
}

# ============================================================================
# Application Configuration
# ============================================================================

variable "app_name" {
  type        = string
  description = <<-EOT
    Application name used for resource naming.
    
    Will be combined with environment to create resource names like:
    - Service accounts: {app_name}-{environment}
    - Artifact Registry: {app_name}-{environment}-containers
    
    Must be lowercase alphanumeric with hyphens.
  EOT
  default     = "rates"

  validation {
    condition     = can(regex("^[a-z0-9-]{1,30}$", var.app_name))
    error_message = "App name must be 1-30 characters, lowercase alphanumeric with hyphens only."
  }
}

variable "environment" {
  type        = string
  description = <<-EOT
    Environment name (dev, staging, prod).
    
    Used for:
    - Resource naming
    - Environment-specific configurations
    - GitHub Actions environment targeting
  EOT
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "region" {
  type        = string
  description = <<-EOT
    GCP region for resources.
    
    Must be a region that supports:
    - Cloud Run (gen2)
    - Artifact Registry
    - Firestore (with compatible location)
    
    Recommended: us-central1, us-east1, europe-west1
    
    Ref: https://cloud.google.com/run/docs/locations
  EOT
  default     = "us-central1"

  validation {
    condition = contains([
      "us-central1", "us-east1", "us-east4", "us-west1",
      "europe-west1", "europe-west2", "europe-west4",
      "asia-east1", "asia-northeast1", "asia-southeast1",
      "australia-southeast1"
    ], var.region)
    error_message = "Region must be a valid GCP region with full Cloud Run and Firestore support."
  }
}

variable "firestore_location" {
  type        = string
  description = <<-EOT
    Firestore database location.
    
    ⚠️ WARNING: This cannot be changed after database creation!
    
    Must be compatible with Cloud Run region for optimal latency.
    Common locations:
    - nam5 (multi-region US)
    - eur3 (multi-region Europe)
    - us-central1, us-east1, etc. (single region)
    
    Ref: https://cloud.google.com/firestore/docs/locations
  EOT
  default     = "nam5" # Multi-region US (good default for most US deployments)

  validation {
    condition = contains([
      "nam5", "eur3", # Multi-region
      "us-central1", "us-east1", "us-west1",
      "europe-west1", "europe-west2", "europe-west4",
      "asia-east1", "asia-northeast1", "asia-southeast1",
      "australia-southeast1"
    ], var.firestore_location)
    error_message = "Firestore location must be a valid Firestore location ID."
  }
}

# ============================================================================
# GitHub Actions / CI/CD Configuration
# ============================================================================

variable "github_repo" {
  type        = string
  description = <<-EOT
    GitHub repository in format 'owner/repo-name'.
    
    Required for Workload Identity Federation setup.
    Used to restrict WIF access to specific repository.
    
    Examples:
    - "myorg/myapp"
    - "username/myproject"
    
    Ref: https://docs.github.com/en/repositories
  EOT

  validation {
    condition     = can(regex("^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$", var.github_repo))
    error_message = "GitHub repository must be in format 'owner/repo-name' (e.g., 'myorg/myapp')."
  }
}

variable "github_environments" {
  type        = list(string)
  description = <<-EOT
    List of GitHub environment names for deployment gates.
    
    Each environment will be configured in Workload Identity Federation
    for environment-specific deployments.
    
    Common values: ["dev", "staging", "prod"]
    
    Ref: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
  EOT
  default     = ["dev", "staging", "prod"]

  validation {
    condition     = length(var.github_environments) > 0 && length(var.github_environments) <= 10
    error_message = "GitHub environments must be a non-empty list with at most 10 environments."
  }
}

# ============================================================================
# FREE TIER Configuration (DEFAULT: ENABLED)
# ============================================================================

variable "enable_free_tier_only" {
  type        = bool
  description = <<-EOT
    🆓 Restrict all resources to free tier configurations.
    
    When true (default):
    - Cloud Run: Scale to zero (min_instances = 0)
    - Firestore: No PITR, no backups
    - Auth: No SMS MFA
    - All paid features disabled
    
    Set to false to enable paid features (requires explicit opt-in per feature).
    
    Ref: https://cloud.google.com/free/docs/free-cloud-features
  EOT
  default     = true # FREE TIER BY DEFAULT
}

# ============================================================================
# Cloud Run Configuration (FREE TIER DEFAULTS)
# ============================================================================

variable "cloudrun_min_instances" {
  type        = number
  description = <<-EOT
    💰 Minimum Cloud Run instances.
    
    - 0 = Scale to zero (FREE) ✅ DEFAULT
    - >0 = Always-on instance (PAID)
    
    FREE TIER: Keep at 0 to scale to zero.
    PAID: Set to 1+ for always-on instances (incurs charges even when idle).
    
    Ref: https://cloud.google.com/run/docs/configuring/min-instances
    Ref: https://cloud.google.com/run/pricing
  EOT
  default     = 0 # Scale to zero = FREE

  validation {
    condition     = var.cloudrun_min_instances >= 0 && var.cloudrun_min_instances <= 10
    error_message = "min_instances must be between 0 and 10."
  }
}

variable "cloudrun_max_instances" {
  type        = number
  description = <<-EOT
    Maximum Cloud Run instances (limit to control costs).
    
    FREE TIER: 2 (default)
    PAID: Can be increased as needed
    
    Ref: https://cloud.google.com/run/docs/configuring/max-instances
  EOT
  default     = 2 # Low default to stay in free tier

  validation {
    condition     = var.cloudrun_max_instances >= 1 && var.cloudrun_max_instances <= 100
    error_message = "max_instances must be between 1 and 100."
  }
}

variable "cloudrun_memory" {
  type        = string
  description = <<-EOT
    Cloud Run memory allocation.
    
    FREE TIER: 256Mi (default) - minimum for free tier optimization
    PAID: Can be increased (128Mi, 256Mi, 512Mi, 1Gi, 2Gi, 4Gi, 8Gi)
    
    Ref: https://cloud.google.com/run/docs/configuring/memory-limits
  EOT
  default     = "256Mi" # Minimum for free tier optimization

  validation {
    condition     = contains(["128Mi", "256Mi", "512Mi", "1Gi", "2Gi", "4Gi", "8Gi"], var.cloudrun_memory)
    error_message = "Memory must be one of: 128Mi, 256Mi, 512Mi, 1Gi, 2Gi, 4Gi, 8Gi."
  }
}

variable "cloudrun_cpu" {
  type        = string
  description = <<-EOT
    Cloud Run CPU allocation.
    
    Options: "1", "2", "4", "6", "8"
    FREE TIER: "1" (default) - sufficient for most workloads
    
    Ref: https://cloud.google.com/run/docs/configuring/cpu
  EOT
  default     = "1" # 1 vCPU

  validation {
    condition     = contains(["1", "2", "4", "6", "8"], var.cloudrun_cpu)
    error_message = "CPU must be one of: 1, 2, 4, 6, 8."
  }
}

# ============================================================================
# Firestore Configuration (FREE TIER DEFAULTS)
# ============================================================================

variable "enable_firestore_pitr" {
  type        = bool
  description = <<-EOT
    💰 Enable Firestore Point-in-Time Recovery (PITR).
    
    PAID FEATURE: ~$0.10/GB/month
    
    When enabled, allows point-in-time recovery of data.
    DISABLED BY DEFAULT for free tier.
    
    Ref: https://cloud.google.com/firestore/docs/pitr
    Ref: https://cloud.google.com/firestore/pricing
  EOT
  default     = false # OFF by default - costs money
}

variable "enable_firestore_backups" {
  type        = bool
  description = <<-EOT
    💰 Enable automated Firestore backups.
    
    PAID FEATURE: Variable cost
    
    When enabled, creates scheduled backups of Firestore data.
    DISABLED BY DEFAULT for free tier.
    
    Ref: https://cloud.google.com/firestore/docs/backups
  EOT
  default     = false # OFF by default - costs money
}

variable "enable_deletion_protection" {
  type        = bool
  description = <<-EOT
    Enable deletion protection on critical resources.
    
    FREE but may complicate teardown.
    
    When enabled, prevents accidental deletion of:
    - Firestore database
    - Other critical resources
    
    DISABLED BY DEFAULT for easy dev cleanup.
  EOT
  default     = false # OFF for easy dev cleanup
}

# ============================================================================
# Identity Platform (Firebase Auth) Configuration
# ============================================================================

variable "enable_mfa" {
  type        = bool
  description = <<-EOT
    💰 Enable Multi-Factor Authentication (SMS-based).
    
    PAID FEATURE: 10 SMS/day free, then paid
    
    FREE TIER: DISABLED BY DEFAULT
    - Identity Platform: FREE up to 50,000 MAU
    - SMS MFA: Costs after 10 SMS/day
    
    Ref: https://cloud.google.com/identity-platform/docs/web/mfa
    Ref: https://cloud.google.com/identity-platform/pricing
  EOT
  default     = false # OFF by default - SMS costs money
}

variable "enable_google_signin" {
  type        = bool
  description = <<-EOT
    Enable Google Sign-In provider.
    
    FREE feature - no additional cost.
    
    When enabled, users can sign in with their Google accounts.
    
    Ref: https://cloud.google.com/identity-platform/docs/web/google
  EOT
  default     = false # OFF by default - requires OAuth credentials
}

variable "google_oauth_client_id" {
  type        = string
  description = <<-EOT
    Google OAuth 2.0 Client ID (for Google Sign-In).
    
    Required if enable_google_signin is true.
    
    Create at: https://console.cloud.google.com/apis/credentials
    
    Ref: https://cloud.google.com/identity-platform/docs/web/google
  EOT
  default     = null
  sensitive   = false # Client ID is not sensitive (public)
}

variable "google_oauth_client_secret" {
  type        = string
  description = <<-EOT
    Google OAuth 2.0 Client Secret (for Google Sign-In).
    
    Required if enable_google_signin is true.
    
    ⚠️ SENSITIVE: Store in Secret Manager or use terraform.tfvars with .gitignore
    
    Ref: https://cloud.google.com/identity-platform/docs/web/google
  EOT
  default     = null
  sensitive   = true
}

# ============================================================================
# Firebase App Check Configuration
# ============================================================================

variable "enable_app_check" {
  type        = bool
  description = <<-EOT
    Enable Firebase App Check for API abuse prevention.
    
    FREE feature - no additional cost.
    
    When enabled, protects backend resources from abuse by requiring
    valid app attestation tokens.
    
    Ref: https://firebase.google.com/docs/app-check
  EOT
  default     = false # OFF by default - requires reCAPTCHA setup
}

variable "recaptcha_site_secret" {
  type        = string
  description = <<-EOT
    reCAPTCHA v3 Site Secret (for App Check).
    
    Required if enable_app_check is true.
    
    Get from: https://www.google.com/recaptcha/admin
    
    ⚠️ SENSITIVE: Store in Secret Manager or use terraform.tfvars with .gitignore
    
    Ref: https://firebase.google.com/docs/app-check/web/recaptcha-provider
  EOT
  default     = null
  sensitive   = true
}

# ============================================================================
# Artifact Registry Configuration
# ============================================================================

variable "enable_immutable_tags" {
  type        = bool
  description = <<-EOT
    Enable immutable container tags.
    
    When enabled, prevents tag overwrites (increases storage usage).
    
    FREE TIER: DISABLED BY DEFAULT (to minimize storage usage)
    PAID: Can be enabled for better security
    
    Ref: https://cloud.google.com/artifact-registry/docs/repositories/create#tag-immutability
  EOT
  default     = false # OFF by default - can increase storage costs
}

# ============================================================================
# Validation Checks (Cross-Variable)
# ============================================================================

# Note: Cross-variable validation is done in checks.tf (Step 5.3)
# This file only contains per-variable validation blocks.
