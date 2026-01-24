# ============================================================================
# APPLICATION LAYER (DEV) - BACKEND CONFIGURATION
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §4 (State Management)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 3)
#
# State Location: gs://rates-terraform-state/application/dev/
# Dependencies: Phase 1 (Bootstrap) and Phase 2 (Foundation) must be completed
# ============================================================================

terraform {
  backend "gcs" {
    bucket = "rates-terraform-state"
    prefix = "application/dev/"
  }
}