# ============================================================================
# AI INFRASTRUCTURE - FOUNDATION
# ============================================================================
# Source: docs/AI_SERVICES.md
# Purpose: VPC, Pub/Sub, and IAM for AI Services
# ============================================================================

# ----------------------------------------------------------------------------
# VPC Network (Shared)
# ----------------------------------------------------------------------------

module "ai_vpc" {
  source = "../../modules/vpc"

  network_name = "rates-ai-vpc"
  subnet_name  = "rates-ai-subnet-${var.region}"
  subnet_cidr  = var.ai_vpc_subnet_cidr
  region       = var.region
  
  enable_private_google_access = true

  depends_on = [google_project_service.required_apis] # Depends on compute API
}

# ----------------------------------------------------------------------------
# Pub/Sub Topics
# ----------------------------------------------------------------------------

module "ai_tasks_topic" {
  source   = "../../modules/pubsub"
  for_each = local.environments

  topic_name       = "rates-${each.key}-ai-tasks"
  create_dlq_topic = true
  dlq_topic_name   = "rates-${each.key}-ai-dlq"

  depends_on = [google_project_service.required_apis]
}

# ----------------------------------------------------------------------------
# Service Accounts - AI Service
# ----------------------------------------------------------------------------

module "ai_service_sa" {
  source   = "../../modules/service-account"
  for_each = local.environments

  project_id   = var.project_id
  account_id   = "rates-${each.key}-ai-service-sa"
  display_name = "${title(each.key)} AI Service Runner"
  description  = "Service account for ${each.key} AI Service Cloud Run"

  project_roles = [
    {
      role = "roles/aiplatform.user"
      condition = null
    },
    {
      role = "roles/datastore.user"
      condition = null
    },
    {
      role = "roles/logging.logWriter"
      condition = null
    },
    # Secret Access
    {
      role = "roles/secretmanager.secretAccessor"
      condition = {
        title       = "Limit to ${each.key} secrets"
        description = "Only allow access to ${each.key} environment secrets"
        expression  = "resource.name.startsWith('projects/${var.project_id}/secrets/rates-${each.key}-')"
      }
    },
    # Pub/Sub Publisher (to publish tasks)
    {
      role = "roles/pubsub.publisher"
      condition = {
        title       = "Limit to ${each.key} topics"
        description = "Only allow publishing to ${each.key} topics"
        expression  = "resource.name.startsWith('projects/${var.project_id}/topics/rates-${each.key}-')"
      }
    }
  ]
}

# ----------------------------------------------------------------------------
# Service Accounts - AI Processor
# ----------------------------------------------------------------------------

module "ai_processor_sa" {
  source   = "../../modules/service-account"
  for_each = local.environments

  project_id   = var.project_id
  account_id   = "rates-${each.key}-ai-processor-sa"
  display_name = "${title(each.key)} AI Async Processor"
  description  = "Service account for ${each.key} AI Processor Cloud Run Job"

  project_roles = [
    {
      role = "roles/aiplatform.user"
      condition = null
    },
    {
      role = "roles/datastore.user"
      condition = null
    },
    {
      role = "roles/logging.logWriter"
      condition = null
    },
    # Secret Access
    {
      role = "roles/secretmanager.secretAccessor"
      condition = {
        title       = "Limit to ${each.key} secrets"
        description = "Only allow access to ${each.key} environment secrets"
        expression  = "resource.name.startsWith('projects/${var.project_id}/secrets/rates-${each.key}-')"
      }
    }
  ]
}
