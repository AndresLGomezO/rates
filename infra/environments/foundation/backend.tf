# ============================================================================
# FOUNDATION LAYER - BACKEND CONFIGURATION
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §4 (State Management)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 2)
#
# State Location: gs://rates-terraform-state/foundation/
# Dependencies: Phase 1 (Bootstrap) must be completed first
# ============================================================================

terraform {
  backend "gcs" {
    bucket = "rates-terraform-state"
    prefix = "foundation/"
  }
}