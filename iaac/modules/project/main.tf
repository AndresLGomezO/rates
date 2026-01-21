# Create development project
resource "google_project" "dev" {
  name            = var.project_id_dev
  project_id      = var.project_id_dev
  billing_account = var.billing_account_id
  org_id          = var.organization_id != "" ? var.organization_id : null
}

# Create staging project
resource "google_project" "staging" {
  name            = var.project_id_staging
  project_id      = var.project_id_staging
  billing_account = var.billing_account_id
  org_id          = var.organization_id != "" ? var.organization_id : null
}

# Create production project
resource "google_project" "prod" {
  name            = var.project_id_prod
  project_id      = var.project_id_prod
  billing_account = var.billing_account_id
  org_id          = var.organization_id != "" ? var.organization_id : null
}
