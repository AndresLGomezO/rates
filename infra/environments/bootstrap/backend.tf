# ============================================================================
# BOOTSTRAP LAYER - BACKEND CONFIGURATION (GCS)
# ============================================================================
# Migrated to GCS by setup.sh on Sun Feb  1 13:27:06 -05 2026

terraform {
  backend "gcs" {
    bucket = "rates-terraform-state"
    prefix = "bootstrap/"
  }
}
