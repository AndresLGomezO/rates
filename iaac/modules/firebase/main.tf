# modules/firebase/main.tf
# Firebase project linking
# Ref: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs/resources/firebase_project
# Ref: https://firebase.google.com/docs/projects/terraform/get-started

locals {
  # Merge provided labels with default labels
  firebase_labels = merge(
    {
      "managed-by"  = "terraform"
      "app-name"    = var.app_name
      "environment" = var.environment
    },
    var.labels
  )
}

# ============================================================================
# Firebase Project
# ============================================================================
# Links the GCP project to Firebase
# This must be done before creating Firebase resources (Auth, Firestore, etc.)
# Ref: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs/resources/firebase_project

resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  # Wait for Firebase API to be enabled and propagated
  depends_on = [var.api_propagation_delay]
}

# ============================================================================
# Firebase Web App (Optional)
# ============================================================================
# Creates a Firebase Web App for the project
# This is required for some Firebase features (App Check, etc.)
# Ref: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs/resources/firebase_web_app

resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = var.project_id
  display_name = "${var.app_name} (${var.environment})"

  # Wait for Firebase project to be linked
  depends_on = [google_firebase_project.default]
}
