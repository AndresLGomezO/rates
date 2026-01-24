# ============================================================================
# SERVICE ACCOUNT MODULE - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/IAM_SECURITY_MODEL.md (Service Account Design)
#                  docs/TERRAFORM_DESIGN.md §3.2.2 (Module Design)
#
# Purpose: Create a service account with IAM role bindings and optional
#          environment-specific IAM conditions for resource isolation.
#
# Security Principles:
#   - No default service accounts
#   - Least privilege via IAM conditions
#   - Predefined roles only (no custom roles)
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
# Service Account
# ----------------------------------------------------------------------------

resource "google_service_account" "this" {
  project      = var.project_id
  account_id   = var.account_id
  display_name = var.display_name
  description  = var.description
}

# ----------------------------------------------------------------------------
# IAM Role Bindings (Project Level)
# ----------------------------------------------------------------------------
# Source: docs/IAM_SECURITY_MODEL.md §2 (Role Binding Matrix)
#
# Bindings support optional IAM conditions for environment isolation.
# Conditions restrict access to resources matching environment prefix.

resource "google_project_iam_member" "roles" {
  for_each = { for idx, role in var.project_roles : "${role.role}-${idx}" => role }

  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.this.email}"

  dynamic "condition" {
    for_each = each.value.condition != null ? [each.value.condition] : []
    content {
      title       = condition.value.title
      description = condition.value.description
      expression  = condition.value.expression
    }
  }
}