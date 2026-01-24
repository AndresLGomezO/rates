# ============================================================================
# CLOUD RUN MODULE - MAIN CONFIGURATION
# ============================================================================
# Source of Truth: docs/COST_GUARDRAILS.md §2.1 (Compute Capping)
#                  docs/TERRAFORM_DESIGN.md §3.2.1 (Module Design)
#                  docs/IAM_SECURITY_MODEL.md §5 (Network Security)
#
# Purpose: Deploy a Cloud Run service with consistent configuration,
#          security defaults, and integration with Secret Manager.
#
# Cost Guardrails (ENFORCED):
#   - max_instances = 2 (prevents unbounded scaling)
#   - min_instances = 0 (enables scale-to-zero)
#   - cpu = 1 vCPU
#   - memory = 512Mi
#   - timeout = 30s
#
# Security Principles:
#   - Dedicated service account (no default SA)
#   - Secret Manager integration for sensitive config
#   - Configurable ingress (default: public)
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
# Cloud Run Service (V2 API)
# ----------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "this" {
  name     = var.service_name
  location = var.region
  project  = var.project_id

  # Ingress setting
  # Source: docs/IAM_SECURITY_MODEL.md §5.1 (Public internet access)
  ingress = "INGRESS_TRAFFIC_${upper(replace(var.ingress, "-", "_"))}"

  template {
    # Service Account
    # Source: docs/IAM_SECURITY_MODEL.md §1.1.1 (Dedicated SA, no default)
    service_account = var.service_account_email

    # Scaling Configuration
    # Source: docs/COST_GUARDRAILS.md §2.1 (HARD LIMITS)
    scaling {
      max_instance_count = var.max_instances  # HARD LIMIT: 2
      min_instance_count = var.min_instances  # REQUIRED: 0 (scale-to-zero)
    }

    # Request timeout
    # Source: docs/COST_GUARDRAILS.md §2.1 (30s max)
    timeout = "${var.timeout_seconds}s"

    # Concurrency
    max_instance_request_concurrency = var.max_concurrent_requests

    containers {
      image = var.container_image

      # Resource Limits
      # Source: docs/COST_GUARDRAILS.md §2.1 (HARD LIMITS)
      resources {
        limits = {
          cpu    = var.cpu     # HARD LIMIT: 1
          memory = var.memory  # HARD LIMIT: 512Mi
        }
        cpu_idle          = true  # Scale down CPU when idle (cost savings)
        startup_cpu_boost = false # Disable startup boost (cost savings)
      }

      # Non-sensitive environment variables
      dynamic "env" {
        for_each = var.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret environment variables
      # Source: docs/IAM_SECURITY_MODEL.md §6.3 (Secret Access)
      dynamic "env" {
        for_each = var.secrets
        content {
          name = env.value.env_var
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = env.value.version
            }
          }
        }
      }

      # Health check / startup probe (optional)
      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 0
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  # Traffic routing (100% to latest revision)
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  labels = merge(
    {
      environment = var.environment
      application = "rates"
      component   = "api"
      managed_by  = "terraform"
    },
    var.labels
  )

  # Lifecycle preconditions for cost guardrail enforcement
  lifecycle {
    precondition {
      condition     = var.max_instances <= 2
      error_message = "COST GUARDRAIL VIOLATION: max_instances must be <= 2 (docs/COST_GUARDRAILS.md §2.1)"
    }
    precondition {
      condition     = var.min_instances == 0
      error_message = "COST GUARDRAIL VIOLATION: min_instances must be 0 for scale-to-zero (docs/COST_GUARDRAILS.md §2.1)"
    }
    precondition {
      condition     = var.timeout_seconds <= 30
      error_message = "COST GUARDRAIL VIOLATION: timeout must be <= 30 seconds (docs/COST_GUARDRAILS.md §2.1)"
    }
  }
}

# ----------------------------------------------------------------------------
# IAM Binding - Public Access
# ----------------------------------------------------------------------------
# Source: docs/IAM_SECURITY_MODEL.md §5.2 (Service-to-Service Auth)
#
# Allow unauthenticated invocations (public access).
# Application-level authentication (Firebase ID tokens) provides security.

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}