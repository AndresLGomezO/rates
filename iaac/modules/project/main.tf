# modules/project/main.tf
# Project creation or selection (greenfield/brownfield support)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project

# Generate a unique project ID if not provided (greenfield)
# Ref: https://registry.terraform.io/providers/hashicorp/random/3.6.3/docs/resources/id
resource "random_id" "project_suffix" {
  count       = var.project_id == null ? 1 : 0
  byte_length = 4

  keepers = {
    app_name    = var.app_name
    environment = var.environment
  }
}

locals {
  # Determine the project ID to use
  # If project_id is null, generate one; otherwise use provided ID
  final_project_id = var.project_id != null ? var.project_id : "${var.app_name}-${var.environment}-${random_id.project_suffix[0].hex}"

  # Determine project parent (org or folder)
  # Note: Construct object directly to avoid Terraform crash with conditional object expressions
  # The object will have null values when not set, which is handled where it's used
  _project_parent_type = var.org_id != null ? "organization" : (var.folder_id != null ? "folder" : null)
  _project_parent_id   = var.org_id != null ? var.org_id : var.folder_id

  # Construct project_parent directly without conditional wrapper
  # This prevents Terraform crash when values are marked (sensitive)
  # Note: This local is not currently used in resources (they use org_id/folder_id directly)
  # but kept for potential future use or outputs
  project_parent = {
    type = local._project_parent_type
    id   = local._project_parent_id
  }

  # Merge provided labels with default labels
  project_labels = merge(
    {
      "managed-by"  = "terraform"
      "app-name"    = var.app_name
      "environment" = var.environment
    },
    var.labels
  )
}

# Create new project (greenfield) or use existing (brownfield)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project
resource "google_project" "main" {
  count = var.project_id == null ? 1 : 0

  project_id      = local.final_project_id
  name            = "${var.app_name}-${var.environment}"
  org_id          = var.org_id
  folder_id       = var.folder_id
  billing_account = var.billing_account_id

  labels = local.project_labels

  # Note: Deletion protection for projects is handled at the organization level
  # via organization policies, not at the resource level.
  # To prevent project deletion, configure organization policies:
  # Ref: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints

  lifecycle {
    # Prevent accidental project ID changes
    ignore_changes = [project_id]
  }
}

# Move project to folder/org if specified (for new projects)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_organization_policy
# Note: Project is created in the correct location via org_id/folder_id above

# Data source for existing project (brownfield)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/data-sources/google_project
data "google_project" "existing" {
  count      = var.project_id != null ? 1 : 0
  project_id = var.project_id
}

# Link billing account to existing project if needed (brownfield)
# Note: For existing projects, billing must be linked via gcloud or console first
# This resource ensures the billing account is attached
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project
# 
# For existing projects, use gcloud to link billing:
# gcloud billing projects link PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
#
# Or use the google_project resource with billing_account attribute (requires project creation permission)
# For brownfield, we assume billing is already linked or will be linked manually

# Grant project owner role to admin email
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/google_project_iam_member
resource "google_project_iam_member" "admin_owner" {
  project = local.final_project_id
  role    = "roles/owner"
  member  = "user:${var.admin_email}"

  # Wait for project to be fully created/available
  depends_on = [
    google_project.main,
    data.google_project.existing
  ]
}
