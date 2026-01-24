# ============================================================================
# FOUNDATION LAYER - COST GUARDRAILS
# ============================================================================
# Source of Truth: docs/COST_GUARDRAILS.md (Cost Control Strategy)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 6)
# ============================================================================

# ============================================================================
# DATA SOURCES
# ============================================================================

data "google_project" "current" {
  project_id = var.project_id
}

# ============================================================================
# NOTIFICATION CHANNELS
# ============================================================================

resource "google_monitoring_notification_channel" "budget_email" {
  count = var.enable_budget_alerts && var.budget_alert_email != null ? 1 : 0

  project      = var.project_id
  display_name = "Budget Alerts - Email"
  type         = "email"

  labels = {
    email_address = var.budget_alert_email
  }

  user_labels = {
    environment = "shared"
    purpose     = "billing-alerts"
    managed_by  = "terraform"
  }

  depends_on = [
    google_project_service.required_apis
  ]
}

resource "google_pubsub_topic" "budget_alerts" {
  count = var.enable_budget_alerts && var.enable_budget_pubsub ? 1 : 0

  project = var.project_id
  name    = "billing-budget-alerts"

  labels = {
    environment = "shared"
    purpose     = "billing-alerts"
    managed_by  = "terraform"
  }

  depends_on = [
    google_project_service.required_apis
  ]
}

resource "google_pubsub_topic_iam_member" "budget_alerts_publisher" {
  count = var.enable_budget_alerts && var.enable_budget_pubsub ? 1 : 0

  project = var.project_id
  topic   = google_pubsub_topic.budget_alerts[0].name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:billing-budgets@system.gserviceaccount.com"
}

# ============================================================================
# BILLING BUDGET
# ============================================================================

resource "google_billing_budget" "monthly_budget" {
  count = var.enable_budget_alerts && var.billing_account_id != null ? 1 : 0

  billing_account = var.billing_account_id
  display_name    = "Rates Monorepo Monthly Budget"

  budget_filter {
    # Use project NUMBER (not ID) in the format: projects/123456789
    projects = ["projects/${data.google_project.current.number}"]
    
    # Explicitly include all credits to avoid issues
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.budget_amount)
      # nanos is optional and defaults to 0
    }
  }

  # Static threshold rules instead of dynamic (more reliable)
  # 50% threshold
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  # 80% threshold
  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  # 100% threshold
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # 120% threshold
  threshold_rules {
    threshold_percent = 1.2
    spend_basis       = "CURRENT_SPEND"
  }

  # Forecasted spend threshold
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    # Use default billing admins as recipients - most reliable
    disable_default_iam_recipients = false
    
    # Only add custom channels if they exist
    monitoring_notification_channels = var.budget_alert_email != null && length(google_monitoring_notification_channel.budget_email) > 0 ? [
      google_monitoring_notification_channel.budget_email[0].id
    ] : []

    pubsub_topic = var.enable_budget_pubsub && length(google_pubsub_topic.budget_alerts) > 0 ? google_pubsub_topic.budget_alerts[0].id : null
  }

  depends_on = [
    google_project_service.required_apis,
    google_monitoring_notification_channel.budget_email,
    google_pubsub_topic.budget_alerts
  ]
}

# ============================================================================
# DISABLED APIS
# ============================================================================

locals {
  unused_apis = var.disable_unused_apis ? toset([
    "monitoring.googleapis.com",
    "cloudtrace.googleapis.com",
    "cloudprofiler.googleapis.com",
    "cloudkms.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "spanner.googleapis.com",
    "bigtable.googleapis.com",
    "cloudtasks.googleapis.com",
    "cloudscheduler.googleapis.com",
  ]) : toset([])
}

resource "null_resource" "disable_unused_apis" {
  count = var.disable_unused_apis ? 1 : 0

  triggers = {
    apis_hash = sha256(join(",", local.unused_apis))
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command = <<-EOT
      echo "Checking and disabling unused APIs..."
      APIS="${join(" ", local.unused_apis)}"
      for api in $APIS; do
        ENABLED=$(gcloud services list --enabled --project=${var.project_id} --format="value(name)" 2>/dev/null | grep "^$api$" || true)
        if [ -n "$ENABLED" ]; then
          echo "Disabling $api..."
          gcloud services disable "$api" --project=${var.project_id} --force --quiet 2>/dev/null || echo "Note: Could not disable $api"
        else
          echo "$api is not enabled (OK)"
        fi
      done
      echo "API check complete."
    EOT
  }
}

resource "null_resource" "billing_check" {
  count = var.enable_budget_alerts && var.billing_account_id == null ? 1 : 0

  provisioner "local-exec" {
    command = <<-EOT
      echo ""
      echo "============================================================================"
      echo "WARNING: Budget alerts enabled but billing_account_id is not set"
      echo "============================================================================"
      echo "Set billing_account_id to enable budget alerts."
      echo "Find your billing account: gcloud billing accounts list"
      echo "============================================================================"
    EOT
  }
}