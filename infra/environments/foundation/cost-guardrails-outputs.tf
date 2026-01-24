# ============================================================================
# FOUNDATION LAYER - COST GUARDRAILS OUTPUTS
# ============================================================================
# Source of Truth: docs/COST_GUARDRAILS.md (Cost Control Strategy)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 6 Outputs)
# ============================================================================

# ----------------------------------------------------------------------------
# Budget Outputs
# ----------------------------------------------------------------------------

output "budget_id" {
  description = "ID of the billing budget (if created)"
  value       = var.enable_budget_alerts && var.billing_account_id != null ? google_billing_budget.monthly_budget[0].id : null
}

output "budget_name" {
  description = "Display name of the billing budget"
  value       = var.enable_budget_alerts && var.billing_account_id != null ? google_billing_budget.monthly_budget[0].display_name : null
}

output "budget_amount" {
  description = "Budget amount in USD"
  value       = var.budget_amount
}

output "budget_alert_thresholds" {
  description = "Budget alert threshold percentages"
  value       = var.budget_alert_thresholds
}

# ----------------------------------------------------------------------------
# Notification Channel Outputs
# ----------------------------------------------------------------------------

output "budget_notification_channel_id" {
  description = "ID of the email notification channel for budget alerts"
  value       = var.enable_budget_alerts && var.budget_alert_email != null ? google_monitoring_notification_channel.budget_email[0].id : null
}

output "budget_pubsub_topic" {
  description = "Pub/Sub topic for budget alerts (if enabled)"
  value       = var.enable_budget_alerts && var.enable_budget_pubsub ? google_pubsub_topic.budget_alerts[0].id : null
}

# ----------------------------------------------------------------------------
# API Status Outputs
# ----------------------------------------------------------------------------

output "disabled_apis" {
  description = "List of APIs that are disabled (or should be disabled)"
  value       = local.unused_apis
}

# ----------------------------------------------------------------------------
# Cost Guardrails Summary
# ----------------------------------------------------------------------------

output "cost_guardrails_summary" {
  description = "Summary of cost guardrails configuration"
  value = {
    budget = {
      enabled           = var.enable_budget_alerts && var.billing_account_id != null
      amount_usd        = var.budget_amount
      alert_thresholds  = var.budget_alert_thresholds
      email_configured  = var.budget_alert_email != null
      pubsub_configured = var.enable_budget_pubsub
    }
    api_controls = {
      unused_apis_disabled = var.disable_unused_apis
      disabled_api_count   = length(local.unused_apis)
    }
    resource_limits = {
      cloud_run_max_instances = 2
      cloud_run_min_instances = 0
      cloud_run_cpu           = "1"
      cloud_run_memory        = "512Mi"
      cloud_run_timeout       = "30s"
    }
  }
}

# ----------------------------------------------------------------------------
# Manual Steps Required
# ----------------------------------------------------------------------------

output "cost_guardrails_manual_steps" {
  description = "Manual steps for cost guardrails setup"
  value       = <<-EOT

    ============================================================================
    COST GUARDRAILS - MANUAL STEPS & VERIFICATION
    ============================================================================

    1. VERIFY BUDGET ALERTS:

       # Check budget in GCP Console:
       https://console.cloud.google.com/billing/budgets?project=${var.project_id}

       # Or via gcloud:
       gcloud billing budgets list --billing-account=${var.billing_account_id != null ? var.billing_account_id : "YOUR_BILLING_ACCOUNT_ID"}

    2. SET QUOTAS (Manual - Terraform has limited quota support):

       # Cloud Run instance quota (per service):
       # Set via: GCP Console → IAM & Admin → Quotas
       # Or contact Google Cloud support for quota increases

       # Recommended quotas:
       # - Cloud Run instances per service: 2
       # - Cloud Build build-minutes per day: 120

    3. VERIFY DISABLED APIs:

       # List enabled APIs:
       gcloud services list --enabled --project=${var.project_id}

       # Manually disable any unwanted APIs:
       gcloud services disable <API_NAME> --project=${var.project_id}

    4. TEST BUDGET ALERTS:

       # Budget alerts are triggered automatically when thresholds are reached
       # To verify email configuration, check notification channel in:
       https://console.cloud.google.com/monitoring/alerting/notifications?project=${var.project_id}

    5. CONFIGURE ARTIFACT REGISTRY LIFECYCLE (if needed):

       # Lifecycle policies are configured in Terraform (artifact-registry module)
       # Verify in GCP Console:
       https://console.cloud.google.com/artifacts?project=${var.project_id}

    6. MONITOR FREE TIER USAGE:

       # Cloud Run:
       https://console.cloud.google.com/run?project=${var.project_id}

       # Firestore:
       https://console.cloud.google.com/firestore/usage?project=${var.project_id}

       # Cloud Build:
       https://console.cloud.google.com/cloud-build/builds?project=${var.project_id}

    ============================================================================
    COST GUARDRAILS REFERENCE (from docs/COST_GUARDRAILS.md)
    ============================================================================

    Hard Limits (Enforced via Terraform):
    ┌─────────────────────┬─────────────────┬─────────────────────────────┐
    │ Parameter           │ Limit           │ Justification               │
    ├─────────────────────┼─────────────────┼─────────────────────────────┤
    │ Cloud Run max_inst  │ 2               │ Prevents unbounded scaling  │
    │ Cloud Run min_inst  │ 0               │ Enables scale-to-zero       │
    │ Cloud Run CPU       │ 1 vCPU          │ Free tier optimization      │
    │ Cloud Run Memory    │ 512Mi           │ Minimum for Node.js         │
    │ Cloud Run Timeout   │ 30s             │ Prevents long requests      │
    │ Artifact Lifecycle  │ 30 days / 3 img │ Prevents storage bloat      │
    └─────────────────────┴─────────────────┴─────────────────────────────┘

    Soft Limits (Alerts only):
    ┌─────────────────────┬─────────────────┬─────────────────────────────┐
    │ Alert               │ Threshold       │ Action                      │
    ├─────────────────────┼─────────────────┼─────────────────────────────┤
    │ Budget 50%          │ $${var.budget_amount * 0.5}             │ Informational               │
    │ Budget 80%          │ $${var.budget_amount * 0.8}             │ Warning - review usage      │
    │ Budget 100%         │ $${var.budget_amount}            │ Critical - investigate      │
    │ Budget 120%         │ $${var.budget_amount * 1.2}            │ Exceeded - take action      │
    └─────────────────────┴─────────────────┴─────────────────────────────┘

    Free Tier Limits:
    ┌─────────────────────┬─────────────────┬─────────────────────────────┐
    │ Service             │ Free Tier       │ Monthly Limit               │
    ├─────────────────────┼─────────────────┼─────────────────────────────┤
    │ Cloud Run           │ 2M requests     │ 2,000,000 requests/month    │
    │ Cloud Run           │ 360K GiB-sec    │ 360,000 GiB-seconds/month   │
    │ Cloud Run           │ 180K vCPU-sec   │ 180,000 vCPU-seconds/month  │
    │ Firestore           │ 50K reads/day   │ ~1,500,000 reads/month      │
    │ Firestore           │ 20K writes/day  │ ~600,000 writes/month       │
    │ Secret Manager      │ 6 secrets       │ 6 active secrets            │
    │ Secret Manager      │ 10K accesses    │ 10,000 accesses/month       │
    │ Artifact Registry   │ 0.5 GB storage  │ 500 MB storage              │
    │ Cloud Build         │ 120 min/day     │ ~3,600 minutes/month        │
    └─────────────────────┴─────────────────┴─────────────────────────────┘

    ============================================================================

  EOT
}