# imports-auto.tf
# Automatic import blocks for existing resources
# These will be automatically processed by Terraform during plan/apply
# Ref: https://developer.hashicorp.com/terraform/language/import
#
# NOTE: These imports are conditional - they only work if the resources exist
# If a resource doesn't exist, Terraform will create it normally
#
# To use these imports, uncomment the relevant blocks and update the IDs

# ============================================================================
# Firebase Resources
# ============================================================================

# Identity Platform Config
# Uncomment and update PROJECT_ID if Identity Platform is already enabled
# import {
#   to = module.firebase.google_identity_platform_config.default
#   id = "projects/PROJECT_ID"
# }

# Firestore Database
# Uncomment and update PROJECT_ID if Firestore database already exists
# import {
#   to = module.firebase.google_firestore_database.default
#   id = "projects/PROJECT_ID/databases/(default)"
# }

# Firebase Config Secret
# Uncomment and update PROJECT_ID and SECRET_ID if secret already exists
# import {
#   to = module.firebase.google_secret_manager_secret.firebase_config
#   id = "projects/PROJECT_ID/secrets/firebase-client-config-ENVIRONMENT"
# }

# ============================================================================
# Artifact Registry
# ============================================================================

# Artifact Registry Repository
# Uncomment and update PROJECT_ID, REGION, and REPOSITORY_ID if repository already exists
# import {
#   to = module.artifact_registry.google_artifact_registry_repository.containers
#   id = "projects/PROJECT_ID/locations/REGION/repositories/REPOSITORY_ID"
# }

# ============================================================================
# Auto-Import Script Helper
# ============================================================================
# The import-existing.sh script will automatically populate these import blocks
# by detecting existing resources and generating the import statements
