# locals.tf
# Free tier logic and computed values
# Compatible with Terraform >= 1.6.0, Google Provider >= 6.0.0
#
# This file contains all the conditional logic for FREE TIER vs PAID features
# All defaults favor FREE TIER to minimize costs

locals {
  # Determine if we're in strict free tier mode
  # When true, all paid features are disabled regardless of individual flags
  is_free_tier = var.enable_free_tier_only

  # ============================================================================
  # Firestore Configuration (FREE TIER DEFAULTS)
  # ============================================================================
  # Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/firestore_database
  # Ref: https://cloud.google.com/firestore/docs/pitr (PITR costs ~$0.10/GB/month)

  # Point-in-time recovery — DISABLED BY DEFAULT (costs ~$0.10/GB/month)
  # Only enable if explicitly requested AND free tier mode is disabled
  firestore_pitr = local.is_free_tier ? "POINT_IN_TIME_RECOVERY_DISABLED" : (
    var.enable_firestore_pitr ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
  )

  # Deletion protection — DISABLED BY DEFAULT for easy dev cleanup
  # Enable for production environments
  firestore_deletion_policy = local.is_free_tier ? "DELETE_PROTECTION_DISABLED" : (
    var.enable_deletion_protection ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
  )

  # ============================================================================
  # Cloud Run Configuration (FREE TIER DEFAULTS)
  # ============================================================================
  # Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/cloud_run_v2_service
  # Ref: https://cloud.google.com/run/docs/configuring/min-instances
  # Ref: https://cloud.google.com/run/pricing
  #
  # FREE TIER: Scale to zero (min_instances = 0)
  # - 2 million requests/month
  # - 360,000 GB-seconds of memory
  # - 180,000 vCPU-seconds
  # - 1 GB outbound data to North America

  cloudrun_config = {
    # Minimum instances: 0 = scale to zero (FREE), >0 = always-on (PAID)
    min_instances = local.is_free_tier ? 0 : var.cloudrun_min_instances

    # Maximum instances: Limit to control costs
    max_instances = local.is_free_tier ? 2 : var.cloudrun_max_instances

    # Memory: Gen2 requires minimum 512Mi (still within free tier)
    # Free tier: 360,000 GB-seconds/month (plenty for 512Mi with scale-to-zero)
    memory = local.is_free_tier ? "512Mi" : var.cloudrun_memory

    # CPU: 1 vCPU is sufficient for most workloads
    cpu = local.is_free_tier ? "1" : var.cloudrun_cpu

    # CPU idle: Always true - don't charge for idle CPU
    cpu_idle = true

    # Timeout: 5 minutes (300 seconds) - reasonable default
    timeout_seconds = 300

    # Execution environment: gen2 for latest features
    execution_environment = "gen2"

    # Ingress: Allow all (can be restricted later)
    ingress = "all"
  }

  # ============================================================================
  # Artifact Registry Configuration
  # ============================================================================
  # Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/artifact_registry_repository
  # Ref: https://cloud.google.com/artifact-registry/pricing
  #
  # FREE TIER: 0.5 GB storage

  artifact_registry_config = {
    # Immutable tags: OFF by default (can increase storage usage)
    immutable_tags = local.is_free_tier ? false : var.enable_immutable_tags

    # Cleanup policy: Aggressive in free tier to stay within 0.5GB
    keep_recent_versions    = local.is_free_tier ? 3 : 10
    untagged_retention_days = local.is_free_tier ? 3 : 7
  }

  # ============================================================================
  # Identity Platform (Firebase Auth) Configuration
  # ============================================================================
  # Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/identity_platform_config
  # Ref: https://cloud.google.com/identity-platform/pricing
  #
  # FREE TIER: 50,000 MAU (Monthly Active Users)
  # SMS MFA: 10 SMS/day free, then paid

  # Multi-factor authentication — DISABLED BY DEFAULT (SMS costs money)
  mfa_state = local.is_free_tier ? "DISABLED" : (var.enable_mfa ? "ENABLED" : "DISABLED")

  # ============================================================================
  # Cost Labels
  # ============================================================================
  # Labels to track cost profile and management tool
  # Note: Using merge() to avoid Terraform crash with conditional object expressions

  cost_labels = merge(
    {
      "managed-by"  = "terraform"
      "environment" = var.environment
    },
    {
      "cost-profile" = local.is_free_tier ? "free-tier" : "paid-features-enabled"
    }
  )

  # ============================================================================
  # Required GCP APIs
  # ============================================================================
  # Ref: https://cloud.google.com/apis/docs/overview
  # Enabling APIs is FREE (usage may cost)

  required_apis = [
    # Core GCP APIs (Service Usage MUST be first - required to enable other APIs)
    "serviceusage.googleapis.com", # Required to enable other APIs - MUST be enabled first
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com", # Required for Workload Identity Federation

    # Firebase APIs
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com", # Identity Platform (Firebase Auth)
    "firebaseappcheck.googleapis.com",

    # Cloud Run APIs
    "run.googleapis.com",
    "cloudtrace.googleapis.com", # Distributed tracing

    # Artifact Registry APIs
    "artifactregistry.googleapis.com",
    "containeranalysis.googleapis.com", # Vulnerability scanning
    "containerscanning.googleapis.com", # Auto-scan on push

    # Secret Manager API
    "secretmanager.googleapis.com",

    # Logging API
    "logging.googleapis.com",
  ]

  # ============================================================================
  # Service Account Naming
  # ============================================================================
  # Consistent naming pattern for service accounts

  service_account_prefix = "${var.app_name}-${var.environment}"

  # ============================================================================
  # Workload Identity Federation
  # ============================================================================
  # WIF pool and provider naming

  wif_pool_id     = "github-pool-${var.environment}"
  wif_provider_id = "github-provider"

  # ============================================================================
  # Resource Naming
  # ============================================================================
  # Consistent naming patterns for resources

  resource_prefix = "${var.app_name}-${var.environment}"

  # Artifact Registry repository name
  artifact_registry_repo = "${local.resource_prefix}-containers"

  # Secret Manager secret names
  firebase_config_secret = "firebase-client-config-${var.environment}"

  # ============================================================================
  # GitHub Repository Parsing
  # ============================================================================
  # Parse github_repo string (format: "owner/repo-name") into components
  # Used by GitHub Actions module for repository configuration

  github_repo_parts     = split("/", var.github_repo)
  github_owner_auto     = length(local.github_repo_parts) > 1 ? local.github_repo_parts[0] : ""
  github_repo_name_auto = length(local.github_repo_parts) > 1 ? local.github_repo_parts[1] : var.github_repo
}
