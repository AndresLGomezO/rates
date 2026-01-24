# modules/cloud-run/main.tf
# Cloud Run service infrastructure (gen2)
# Note: This module creates the infrastructure but NOT the service itself
# The actual Cloud Run service deployment is done via CI/CD (GitHub Actions)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/cloud_run_v2_service
# Ref: https://cloud.google.com/run/docs/configuring/min-instances
# Ref: https://cloud.google.com/run/pricing
#
# FREE TIER: Scale to zero (min_instances = 0)
# - 2 million requests/month
# - 360,000 GB-seconds of memory
# - 180,000 vCPU-seconds
# - 1 GB outbound data to North America

locals {
  # Merge provided labels with default labels
  service_labels = merge(
    {
      "managed-by" = "terraform"
    },
    var.labels
  )

  # Build secrets configuration for Cloud Run
  # Format: https://cloud.google.com/run/docs/configuring/secrets
  secrets_config = [
    for secret in var.secrets : {
      name        = secret.name
      secret_name = secret.secret_name
      version     = secret.version != null ? secret.version : "latest"
    }
  ]
}

# ============================================================================
# Cloud Run Service (Infrastructure Only)
# ============================================================================
# This creates the Cloud Run service infrastructure but does NOT deploy a container
# Container deployment is handled by CI/CD (GitHub Actions)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/cloud_run_v2_service
#
# Note: For initial setup, you may want to deploy a placeholder container
# or handle deployment separately via CI/CD

resource "google_cloud_run_v2_service" "main" {
  project  = var.project_id
  location = var.region
  name     = var.service_name

  # Template configuration
  template {
    # Service account for runtime
    service_account = var.runtime_service_account_email

    # Scaling configuration
    scaling {
      # 💰 Minimum instances: 0 = scale to zero (FREE)
      min_instance_count = var.min_instances

      # Maximum instances: Limit to control costs
      max_instance_count = var.max_instances
    }

    # Container configuration
    containers {
      # Placeholder image - replace with actual image via CI/CD
      image = "gcr.io/cloudrun/hello" # Placeholder, will be updated by CI/CD

      # Resource limits
      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }

        # CPU idle: Don't charge for idle CPU (always true)
        cpu_idle = true
      }

      # Environment variables
      dynamic "env" {
        for_each = var.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secrets as environment variables
      dynamic "env" {
        for_each = var.secrets
        content {
          name = env.value.name
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version != null ? env.value.version : "latest"
            }
          }
        }
      }
    }

    # Execution environment: gen2 for latest features
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"

    # Timeout: 5 minutes (300 seconds) default
    timeout = "${var.timeout_seconds}s"
  }

  # Traffic configuration: All traffic to latest revision
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  labels = local.service_labels
}
