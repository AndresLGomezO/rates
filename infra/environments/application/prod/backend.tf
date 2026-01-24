# ============================================================================
# APPLICATION LAYER (PROD) - BACKEND CONFIGURATION
# ============================================================================
# Source of Truth: docs/TERRAFORM_DESIGN.md §4 (State Management)
#                  docs/IMPLEMENTATION_PLAN.md (Phase 4)
#
# State Location: gs://rates-terraform-state/application/prod/
# Dependencies: Phase 1 (Bootstrap) and Phase 2 (Foundation) must be completed
#
# ⚠️  PRODUCTION STATE FILE - Handle with care
#     - State contains sensitive resource references
#     - Always use state locking (automatic with GCS backend)
#     - Never manually edit state files
# ============================================================================

terraform {
  backend "gcs" {
    bucket = "rates-terraform-state"
    prefix = "application/prod/"
  }
}