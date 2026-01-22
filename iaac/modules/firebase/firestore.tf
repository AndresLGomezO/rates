# modules/firebase/firestore.tf
# Cloud Firestore database configuration
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/firestore_database
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/firestore_backup_schedule
# Ref: https://cloud.google.com/firestore/pricing
#
# FREE TIER: 1 GB storage, 50K reads/day, 20K writes/day, 20K deletes/day
# 💰 PITR: ~$0.10/GB/month (DISABLED BY DEFAULT)
# 💰 Backups: Variable cost (DISABLED BY DEFAULT)

# ============================================================================
# Cloud Firestore Database
# ============================================================================
# Creates a Firestore Native database
# ⚠️ WARNING: Location cannot be changed after creation!
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/firestore_database

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  # Concurrency mode: Optimistic (default, good for most use cases)
  concurrency_mode = "OPTIMISTIC"

  # App Engine integration: Disabled (not using App Engine)
  app_engine_integration_mode = "DISABLED"

  # 💰 Point-in-time recovery — DISABLED BY DEFAULT (costs ~$0.10/GB/month)
  # Ref: https://cloud.google.com/firestore/docs/pitr
  point_in_time_recovery_enablement = var.firestore_pitr

  # Deletion protection — DISABLED BY DEFAULT for easy dev cleanup
  # Enable for production environments
  deletion_policy = var.firestore_deletion_policy

  # Wait for Firestore API to be enabled and Firebase project to be linked
  depends_on = [
    var.api_propagation_delay
  ]

  # Lifecycle: If database already exists, import it instead of failing
  lifecycle {
    create_before_destroy = false
    # Ignore changes to location_id and type (immutable after creation)
    ignore_changes = [
      location_id,
      type,
      concurrency_mode,
      app_engine_integration_mode
    ]
  }
}

# ============================================================================
# Firestore Backup Schedule (Optional, PAID)
# ============================================================================
# Creates automated backups of Firestore data
# 💰 PAID FEATURE: Variable cost
# DISABLED BY DEFAULT for free tier
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/firestore_backup_schedule

resource "google_firestore_backup_schedule" "daily" {
  count = var.enable_firestore_backups ? 1 : 0

  project  = var.project_id
  database = google_firestore_database.default.name

  # Retention: 7 days (604800 seconds)
  retention = "604800s"

  # Daily recurrence (backup once per day)
  daily_recurrence {}

  # Wait for database to be created
  depends_on = [google_firestore_database.default]
}
