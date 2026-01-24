# ============================================================================
# FOUNDATION LAYER - COST GUARDRAILS VARIABLES
# ============================================================================
# Source of Truth: docs/COST_GUARDRAILS.md (Cost Control Strategy)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 6)
# ============================================================================

# ----------------------------------------------------------------------------
# Billing Configuration
# ----------------------------------------------------------------------------

variable "billing_account_id" {
  type        = string
  description = "Billing account ID for budget creation (format: XXXXXX-XXXXXX-XXXXXX)"
  default     = null # Must be provided to create budget

  validation {
    condition     = var.billing_account_id == null || can(regex("^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$", var.billing_account_id))
    error_message = "Billing account ID must be in format XXXXXX-XXXXXX-XXXXXX (uppercase alphanumeric)."
  }
}

variable "budget_amount" {
  type        = number
  description = "Monthly budget amount in USD"
  default     = 10

  validation {
    condition     = var.budget_amount >= 1 && var.budget_amount <= 100
    error_message = "Budget amount must be between $1 and $100 for free-tier focused projects."
  }
}

variable "budget_alert_email" {
  type        = string
  description = "Email address for budget alert notifications"
  default     = null

  validation {
    condition     = var.budget_alert_email == null || can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.budget_alert_email))
    error_message = "Budget alert email must be a valid email address."
  }
}

variable "enable_budget_pubsub" {
  type        = bool
  description = "Enable Pub/Sub notifications for budget alerts (for programmatic responses)"
  default     = false
}

# ----------------------------------------------------------------------------
# Cost Control Flags
# ----------------------------------------------------------------------------

variable "enable_budget_alerts" {
  type        = bool
  description = "Enable budget and billing alerts"
  default     = true
}

variable "disable_unused_apis" {
  type        = bool
  description = "Explicitly disable unused APIs to prevent accidental costs"
  default     = true
}

# ----------------------------------------------------------------------------
# Alert Thresholds
# ----------------------------------------------------------------------------

variable "budget_alert_thresholds" {
  type        = list(number)
  description = "Budget alert threshold percentages (as decimals: 0.5 = 50%)"
  default     = [0.5, 0.8, 1.0, 1.2]

  validation {
    condition     = alltrue([for t in var.budget_alert_thresholds : t > 0 && t <= 2.0])
    error_message = "Alert thresholds must be between 0 and 2.0 (0% to 200%)."
  }
}