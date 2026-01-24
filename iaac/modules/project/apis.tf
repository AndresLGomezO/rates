# modules/project/apis.tf
# API enablement with propagation handling
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_service
# Ref: https://registry.terraform.io/providers/hashicorp/time/0.12.1/docs/resources/sleep
# Note: Variable "required_apis" is declared in variables.tf

# Enable all required APIs
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_service
resource "google_project_service" "apis" {
  for_each = toset(var.required_apis)

  # Use the final project ID from main.tf locals
  project = local.final_project_id
  service = each.value

  # Don't disable dependent services when disabling this service
  disable_dependent_services = false

  # Don't disable service on destroy (safer for production)
  disable_on_destroy = false

  # Wait for project to be fully created/available and admin has permissions
  depends_on = [
    google_project.main,
    data.google_project.existing,
    google_project_iam_member.admin_owner
  ]
}

# Critical: Wait for API propagation
# GCP APIs can take 30-90 seconds to fully propagate after enablement
# This prevents "API not enabled" errors when creating resources immediately after
# Ref: https://registry.terraform.io/providers/hashicorp/time/0.12.1/docs/resources/sleep
resource "time_sleep" "api_propagation" {
  depends_on = [google_project_service.apis]

  # Wait 90 seconds for APIs to fully propagate
  # This is conservative but ensures reliability
  create_duration = "90s"

  # Don't wait on destroy (no need)
  destroy_duration = "0s"
}
