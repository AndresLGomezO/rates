# modules/project/apis.tf
# API enablement with propagation handling
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_service
# Ref: https://registry.terraform.io/providers/hashicorp/time/0.12.1/docs/resources/sleep
# Note: Variable "required_apis" is declared in variables.tf

# ============================================================================
# CRITICAL: Enable Service Usage API FIRST (Chicken-and-Egg Problem)
# ============================================================================
# Service Usage API is required to enable other APIs, but Terraform's
# google_project_service resource itself requires Service Usage API to be enabled.
#
# For existing projects (brownfield), Service Usage API might not be enabled.
# We use gcloud CLI to enable it first (gcloud doesn't require Service Usage API).
# For new projects (greenfield), Service Usage API is usually auto-enabled.
#
# Ref: https://cloud.google.com/service-usage/docs/enable-disable
# Ref: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource

# Enable Service Usage API via gcloud CLI for existing projects
# This bypasses the chicken-and-egg problem by using gcloud directly
# Ref: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
resource "null_resource" "enable_service_usage_api" {
  # Always create this resource so it can be referenced in depends_on
  # The provisioner will check if it's an existing project and only enable if needed

  # Enable Service Usage API via gcloud CLI for existing projects
  # For new projects, Service Usage API is usually auto-enabled, so we skip
  # This works even if Service Usage API is not yet enabled
  provisioner "local-exec" {
    command = <<-EOT
      set -euo pipefail
      
      PROJECT_ID="${local.final_project_id}"
      SERVICE="serviceusage.googleapis.com"
      IS_EXISTING_PROJECT="${var.project_id != null ? "true" : "false"}"
      
      # Only enable for existing projects (brownfield)
      if [ "$${IS_EXISTING_PROJECT}" != "true" ]; then
        echo "ℹ️  New project detected - Service Usage API should be auto-enabled"
        exit 0
      fi
      
      echo "🔧 Enabling Service Usage API for existing project: $${PROJECT_ID}"
      
      # Check if Service Usage API is already enabled
      if gcloud services list --enabled \
        --project="$${PROJECT_ID}" \
        --filter="name:$${SERVICE}" \
        --format="value(name)" 2>/dev/null | grep -q "$${SERVICE}"; then
        echo "✅ Service Usage API is already enabled"
      else
        echo "📦 Enabling Service Usage API via gcloud..."
        gcloud services enable "$${SERVICE}" \
          --project="$${PROJECT_ID}" \
          --quiet || {
          echo "⚠️  Failed to enable Service Usage API. It may already be enabled or you may need to enable it manually."
          echo "   Visit: https://console.cloud.google.com/apis/library/serviceusage.googleapis.com?project=$${PROJECT_ID}"
          exit 1
        }
        echo "✅ Service Usage API enabled successfully"
        echo "⏳ Waiting 30 seconds for API to propagate..."
        sleep 30
      fi
    EOT
  }

  # Wait for project to be available and admin has permissions
  depends_on = [
    google_project.main,
    data.google_project.existing,
    google_project_iam_member.admin_owner
  ]

  # Re-run if project ID or project type changes
  triggers = {
    project_id          = local.final_project_id
    is_existing_project = var.project_id != null ? "true" : "false"
  }
}

# CRITICAL: Enable Service Usage API via Terraform (for both new and existing projects)
# This resource will work after null_resource enables it for existing projects,
# or will work directly for new projects where it's auto-enabled.
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_service
resource "google_project_service" "service_usage" {
  project = local.final_project_id
  service = "serviceusage.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false

  # Wait for:
  # 1. Project to be fully created/available and admin has permissions
  # 2. For existing projects: null_resource to enable Service Usage API via gcloud first
  # Note: null_resource always exists, so it can be safely referenced in depends_on
  depends_on = [
    google_project.main,
    data.google_project.existing,
    google_project_iam_member.admin_owner,
    null_resource.enable_service_usage_api
  ]
}

# Wait for Service Usage API to be enabled before enabling other APIs
# This ensures Service Usage API is ready before we try to enable other APIs
# Note: Service Usage API is always in required_apis, so this resource will always exist
resource "time_sleep" "service_usage_propagation" {
  depends_on = [google_project_service.service_usage]

  # Wait 30 seconds for Service Usage API to propagate
  create_duration  = "30s"
  destroy_duration = "0s"
}

# Enable all other required APIs (excluding Service Usage which is handled above)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_service
resource "google_project_service" "apis" {
  for_each = toset([
    for api in var.required_apis : api
    if api != "serviceusage.googleapis.com"
  ])

  # Use the final project ID from main.tf locals
  project = local.final_project_id
  service = each.value

  # Don't disable dependent services when disabling this service
  disable_dependent_services = false

  # Don't disable service on destroy (safer for production)
  disable_on_destroy = false

  # Wait for:
  # 1. Project to be fully created/available and admin has permissions
  # 2. Service Usage API to be enabled and propagated
  # Note: Service Usage API is always in required_apis, so service_usage_propagation will exist
  depends_on = [
    google_project.main,
    data.google_project.existing,
    google_project_iam_member.admin_owner,
    time_sleep.service_usage_propagation
  ]
}

# Critical: Wait for API propagation
# GCP APIs can take 30-90 seconds to fully propagate after enablement
# This prevents "API not enabled" errors when creating resources immediately after
# Ref: https://registry.terraform.io/providers/hashicorp/time/0.12.1/docs/resources/sleep
resource "time_sleep" "api_propagation" {
  # Wait for all APIs to be enabled
  # Note: depends_on requires a static list expression
  # We depend on the main APIs resource, which already waits for Service Usage API
  # if it was enabled (via google_project_service.service_usage dependency)
  depends_on = [
    google_project_service.apis
  ]

  # Wait 90 seconds for APIs to fully propagate
  # This is conservative but ensures reliability
  # Note: If Service Usage API was enabled, it will have already propagated
  # via time_sleep.service_usage_propagation before other APIs are enabled
  create_duration = "90s"

  # Don't wait on destroy (no need)
  destroy_duration = "0s"
}
