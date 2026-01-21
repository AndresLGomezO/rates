# =============================================================================
# Enable Required APIs
# =============================================================================

resource "google_project_service" "apis" {
  for_each = var.enable_apis ? toset(var.required_apis) : toset([])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}

# API propagation guard (GCP APIs can take a bit to become usable right after enabling)
resource "time_sleep" "after_api_enable" {
  count           = var.enable_apis ? 1 : 0
  create_duration = "60s"

  depends_on = [google_project_service.apis]
}

# =============================================================================
# Artifact Registry Repository
# =============================================================================

resource "google_artifact_registry_repository" "rates" {
  project       = var.project_id
  location      = var.region
  repository_id = var.ar_repository
  description   = "Rates container images (${var.environment_name})"
  format        = "DOCKER"

  depends_on = [time_sleep.after_api_enable]
}

# =============================================================================
# Workload Identity Pool
# =============================================================================

resource "google_iam_workload_identity_pool" "github_pool" {
  project                   = var.project_id
  workload_identity_pool_id = var.wif_pool_id
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"

  depends_on = [time_sleep.after_api_enable]
}

# =============================================================================
# Workload Identity Provider
# =============================================================================

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = var.wif_provider_id
  display_name                       = "GitHub Actions Provider"
  description                        = "OIDC provider for GitHub Actions"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    "attribute.actor"      = "assertion.actor"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  # Branch restriction belongs here (provider-level), not in IAM Conditions on the service account.
  attribute_condition = "assertion.repository=='${var.github_repo_full}' && assertion.ref=='refs/heads/${var.github_branch}'"

  depends_on = [time_sleep.after_api_enable]
}

# =============================================================================
# Deployer Service Account
# =============================================================================

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = var.sa_name
  display_name = "GitHub Actions Deployer (${title(var.environment_name)})"
  description  = "Service account for GitHub Actions deployments to ${var.environment_name} environment"

  depends_on = [time_sleep.after_api_enable]
}

# Allow the deployer identity to "actAs" the runtime service account configured on Cloud Run.
# We intentionally set Cloud Run's runtime service account to this same deployer SA, so it must
# have roles/iam.serviceAccountUser on itself for `gcloud run deploy` to succeed (iam.serviceaccounts.actAs).
resource "google_service_account_iam_member" "deployer_act_as_self" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${var.wif_pool_id}/attribute.repository/${var.github_repo_full}"

  depends_on = [
    google_iam_workload_identity_pool_provider.github_provider,
    google_service_account.deployer
  ]
}

# =============================================================================
# IAM Roles for Deployer Service Account
# =============================================================================

# Artifact Registry Writer
resource "google_artifact_registry_repository_iam_member" "deployer_ar_writer" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.rates.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer.email}"
}

# Cloud Run Developer
resource "google_project_iam_member" "deployer_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# Service Account User (ONLY if Cloud Run uses a different runtime service account)
resource "google_project_iam_member" "deployer_sa_user" {
  count   = var.grant_service_account_user ? 1 : 0
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# =============================================================================
# Cloud Run Services (Placeholder)
# =============================================================================

resource "google_cloud_run_service" "app" {
  count    = var.create_cloud_run_services ? 1 : 0
  project  = var.project_id
  name     = var.cloud_run_service_app
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/hello"
        resources {
          limits = {
            cpu    = var.cloud_run_cpu
            memory = var.cloud_run_memory
          }
        }
        # Environment variables for app service
        # VITE_AUTH_APP_URL: Points to the auth-app service URL
        # Note: On first apply, this will be empty. Run 'terraform apply' again after auth-app exists.
        env {
          name  = "VITE_AUTH_APP_URL"
          # Reference auth-app URL (empty string if auth-app doesn't exist yet)
          value = var.create_cloud_run_services && length(google_cloud_run_service.auth_app) > 0 ? google_cloud_run_service.auth_app[0].status[0].url : ""
        }
      }
      service_account_name = google_service_account.deployer.email
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(var.cloud_run_min_instances)
        "autoscaling.knative.dev/maxScale" = tostring(var.cloud_run_max_instances)
        "run.googleapis.com/execution-environment" = "gen2"
        # Free-tier first: throttle CPU outside request handling to reduce billable CPU time.
        "run.googleapis.com/cpu-throttling" = "true"
        # Keep startup boost off unless you explicitly want faster cold starts at potential cost.
        "run.googleapis.com/startup-cpu-boost" = "false"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    time_sleep.after_api_enable,
    google_service_account.deployer
  ]
}

resource "google_cloud_run_service_iam_member" "app_public_access" {
  count    = var.create_cloud_run_services ? 1 : 0
  project  = var.project_id
  service  = google_cloud_run_service.app[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_service" "auth_app" {
  count    = var.create_cloud_run_services ? 1 : 0
  project  = var.project_id
  name     = var.cloud_run_service_auth
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/hello"
        resources {
          limits = {
            cpu    = var.cloud_run_cpu
            memory = var.cloud_run_memory
          }
        }
        # Environment variables for auth-app service
        # VITE_ALLOWED_REDIRECTS: Security whitelist of allowed redirect URLs
        # Note: On first apply, this will be empty. Run 'terraform apply' again after app exists.
        env {
          name  = "VITE_ALLOWED_REDIRECTS"
          # Reference app URL for allowed redirects (security whitelist)
          # Empty string if app doesn't exist yet
          value = var.create_cloud_run_services && length(google_cloud_run_service.app) > 0 ? google_cloud_run_service.app[0].status[0].url : ""
        }
      }
      service_account_name = google_service_account.deployer.email
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(var.cloud_run_min_instances)
        "autoscaling.knative.dev/maxScale" = tostring(var.cloud_run_max_instances)
        "run.googleapis.com/execution-environment" = "gen2"
        "run.googleapis.com/cpu-throttling" = "true"
        "run.googleapis.com/startup-cpu-boost" = "false"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    time_sleep.after_api_enable,
    google_service_account.deployer
  ]
}

resource "google_cloud_run_service_iam_member" "auth_app_public_access" {
  count    = var.create_cloud_run_services ? 1 : 0
  project  = var.project_id
  service  = google_cloud_run_service.auth_app[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}
