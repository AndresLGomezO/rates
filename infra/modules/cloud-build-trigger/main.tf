# ============================================================================
# CLOUD BUILD TRIGGER MODULE - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/IMPLEMENTATION_PLAN.md (Phase 5)
#                  docs/COST_GUARDRAILS.md §1.1 (Cloud Build Limits)
#                  docs/IAM_SECURITY_MODEL.md §4 (CI/CD Permissions)
#
# Purpose: Create Cloud Build triggers for automated deployments
#
# Cost Guardrails:
#   - Build timeout: 10 minutes max
#   - Protected branches only (main, develop)
#   - Service account with least privilege
#
# Security:
#   - Environment-specific service accounts
#   - Manual approval for production
#   - Branch-based deployment routing
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0, < 6.0.0"
    }
  }
}

# ----------------------------------------------------------------------------
# Cloud Build Trigger - GitHub
# ----------------------------------------------------------------------------

resource "google_cloudbuild_trigger" "github" {
  count = var.repository_type == "github" ? 1 : 0

  project     = var.project_id
  name        = var.trigger_name
  description = var.description
  disabled    = var.disabled

  # GitHub repository configuration
  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = var.branch_pattern
    }
  }

  # File filters
  included_files = var.included_files
  ignored_files  = var.ignored_files

  # Build configuration file
  filename = var.build_config_file

  # Service account for builds
  # Source: docs/IAM_SECURITY_MODEL.md §4 (Environment-specific SA)
  service_account = "projects/${var.project_id}/serviceAccounts/${var.service_account_email}"

  # Substitution variables
  substitutions = merge(
    {
      _ENVIRONMENT = var.environment
      _PROJECT_ID  = var.project_id
    },
    var.substitutions
  )

  # Approval configuration (prod only)
  # Source: docs/IMPLEMENTATION_PLAN.md §Phase 5 (Manual approval for prod)
  dynamic "approval_config" {
    for_each = var.require_approval ? [1] : []
    content {
      approval_required = true
    }
  }

  # Labels for organization and cost tracking
  tags = concat(
    [
      var.environment,
      "managed-by-terraform",
    ],
    [for k, v in var.labels : "${k}-${v}"]
  )
}

# ----------------------------------------------------------------------------
# Cloud Build Trigger - Cloud Source Repositories
# ----------------------------------------------------------------------------

resource "google_cloudbuild_trigger" "csr" {
  count = var.repository_type == "cloud-source-repositories" ? 1 : 0

  project     = var.project_id
  name        = var.trigger_name
  description = var.description
  disabled    = var.disabled

  # Cloud Source Repository configuration
  trigger_template {
    project_id  = var.project_id
    repo_name   = var.cloud_source_repo
    branch_name = var.branch_pattern
  }

  # File filters
  included_files = var.included_files
  ignored_files  = var.ignored_files

  # Build configuration file
  filename = var.build_config_file

  # Service account for builds
  service_account = "projects/${var.project_id}/serviceAccounts/${var.service_account_email}"

  # Substitution variables
  substitutions = merge(
    {
      _ENVIRONMENT = var.environment
      _PROJECT_ID  = var.project_id
    },
    var.substitutions
  )

  # Approval configuration (prod only)
  dynamic "approval_config" {
    for_each = var.require_approval ? [1] : []
    content {
      approval_required = true
    }
  }

  tags = concat(
    [
      var.environment,
      "managed-by-terraform",
    ],
    [for k, v in var.labels : "${k}-${v}"]
  )
}