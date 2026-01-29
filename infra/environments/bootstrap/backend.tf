# ============================================================================
# BOOTSTRAP LAYER - BACKEND CONFIGURATION (GCS)
# ============================================================================
# Migrated to GCS by setup.sh on Tue Jan 27 06:41:26 -05 2026

terraform {
  backend "gcs" {
    bucket = "rates-terraform-state"
    prefix = "bootstrap/"
  }
}
