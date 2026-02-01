# ============================================================================
# AI INFRASTRUCTURE - APPLICATION LAYER (DEV)
# ============================================================================

locals {
  ai_vpc_network = data.terraform_remote_state.foundation.outputs.ai_vpc_network_name
  ai_service_sa  = data.terraform_remote_state.foundation.outputs.ai_service_sa_emails[local.environment]
  ai_processor_sa = data.terraform_remote_state.foundation.outputs.ai_processor_sa_emails[local.environment]
  ai_tasks_topic = data.terraform_remote_state.foundation.outputs.ai_tasks_topics[local.environment]
  
  # Image URLs
  ai_service_image   = var.use_fallback_image ? "gcr.io/google-samples/hello-app:1.0" : "${local.artifact_registry_url}/ai-service:${var.ai_service_image_tag}"
  ai_processor_image = var.use_fallback_image ? "gcr.io/google-samples/hello-app:1.0" : "${local.artifact_registry_url}/ai-processor:${var.ai_processor_image_tag}"
}

# ----------------------------------------------------------------------------
# VPC Connector
# ----------------------------------------------------------------------------

module "ai_vpc_connector" {
  source = "../../../modules/vpc-connector"

  connector_name = "rates-${local.environment}-ai-connector"
  region         = var.region
  network        = local.ai_vpc_network
  ip_cidr_range  = var.vpc_connector_cidr
  min_instances  = 2
  max_instances  = 3
  machine_type   = "e2-micro"
}

# ----------------------------------------------------------------------------
# Secret Manager - Vertex Config
# ----------------------------------------------------------------------------

module "vertex_ai_config_secret" {
  source = "../../../modules/secret"

  project_id  = var.project_id
  secret_id   = "rates-${local.environment}-vertex-ai-config"
  environment = local.environment
  description = "Vertex AI configuration for ${local.environment}"

  accessor_service_account_emails = [local.ai_service_sa, local.ai_processor_sa]
}

# ----------------------------------------------------------------------------
# Cloud Run Service - AI Service
# ----------------------------------------------------------------------------

module "cloud_run_ai_service" {
  source = "../../../modules/cloud-run"

  project_id   = var.project_id
  service_name = "rates-${local.environment}-ai-service-${var.region}"
  region       = var.region
  environment  = local.environment
  
  service_account_email = local.ai_service_sa
  container_image       = local.ai_service_image
  
  # Internal Ingress Only (Critical Security Requirement)
  ingress = "internal"
  allow_unauthenticated = false

  # Fallback image (hello-app) uses /, real app uses /health
  probe_path = var.use_fallback_image ? "/" : "/health"

  # Environment Variables
  environment_variables = {
    GCP_PROJECT_ID              = var.project_id
    VERTEX_AI_LOCATION          = var.region
    FIRESTORE_COLLECTION_PREFIX = var.environment
    ENV                         = var.environment
    LOG_LEVEL                   = "info"
    RATE_LIMIT_REQUESTS_PER_MIN = "60"
    RATE_LIMIT_TOKENS_PER_DAY   = "100000"
  }

  # VPC Configuration
  vpc_connector_name = module.ai_vpc_connector.connector_id
  vpc_egress         = "all-traffic"

  # Secrets
  secrets = var.include_secrets ? {
    vertex_config = {
      secret_id = module.vertex_ai_config_secret.secret_id
      version   = "latest"
      env_var   = "VERTEX_AI_CONFIG"
    }
  } : {}

  depends_on = [
    data.terraform_remote_state.foundation,
    module.ai_vpc_connector
  ]
}

# Allow Main App to invoke AI Service (Service-to-Service IAM)
resource "google_cloud_run_v2_service_iam_member" "main_app_invoker" {
  project  = var.project_id
  location = var.region
  name     = module.cloud_run_ai_service.service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${data.terraform_remote_state.foundation.outputs.dev_cloud_run_sa_email}"
}

# ----------------------------------------------------------------------------
# Cloud Run Job - AI Processor
# ----------------------------------------------------------------------------

resource "google_cloud_run_v2_job" "ai_processor" {
  name     = "rates-${local.environment}-ai-processor"
  location = var.region
  project  = var.project_id

  template {
    template {
      service_account = local.ai_processor_sa
      timeout         = "1800s"
      max_retries     = 3

      containers {
        image = local.ai_processor_image
        
        resources {
          limits = {
            cpu    = "1"
            memory = "1Gi"
          }
        }

        # Static Environment Variables
        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }
        env {
          name  = "VERTEX_AI_LOCATION"
          value = var.region
        }
        env {
          name  = "FIRESTORE_COLLECTION_PREFIX"
          value = var.environment
        }
        env {
          name  = "ENV"
          value = var.environment
        }

        # Secret Environment Variables
        dynamic "env" {
          for_each = var.include_secrets ? [1] : []
          content {
            name = "VERTEX_AI_CONFIG"
            value_source {
              secret_key_ref {
                secret  = module.vertex_ai_config_secret.secret_id
                version = "latest"
              }
            }
          }
        }
      }

      vpc_access {
        connector = module.ai_vpc_connector.connector_id
        egress    = "ALL_TRAFFIC"
      }
    }
  }
}

# ----------------------------------------------------------------------------
# Pub/Sub Subscription (Push to Job)
# ----------------------------------------------------------------------------

# Service Account for Pub/Sub to trigger Cloud Run Job
resource "google_service_account" "pubsub_invoker" {
  account_id   = "rates-${local.environment}-pubsub-invoker"
  display_name = "Pub/Sub Invoker for AI Processor"
}

resource "google_project_iam_member" "pubsub_invoker_run" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

resource "google_pubsub_subscription" "ai_processor_subscription" {
  name  = "rates-${local.environment}-ai-tasks-processor"
  topic = local.ai_tasks_topic

  ack_deadline_seconds = 600

  push_config {
    # Trigger Cloud Run Job via REST API
    push_endpoint = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.ai_processor.name}:run"
    
    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }

  dead_letter_policy {
    dead_letter_topic     = "projects/${var.project_id}/topics/rates-${local.environment}-ai-dlq"
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
  
  depends_on = [google_project_iam_member.pubsub_invoker_run]
}
