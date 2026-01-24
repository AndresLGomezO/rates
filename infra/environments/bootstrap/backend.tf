# ============================================================================
# BOOTSTRAP LAYER - BACKEND CONFIGURATION (GCS)
# ============================================================================
# Migrated to GCS by setup.sh on Fri Jan 23 17:34:35 -05 2026

terraform {
  backend "gcs" {
    bucket = "rates-terraform-state"
    prefix = "bootstrap/"
  }
}
