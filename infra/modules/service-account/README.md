# Service Account Module

## Purpose

Creates a GCP service account with IAM role bindings and optional environment-specific IAM conditions.

## Usage

```hcl
module "dev_cloud_run_sa" {
  source = "../../modules/service-account"

  project_id   = "rates-production"
  account_id   = "rates-dev-cloud-run-sa"
  display_name = "Dev Cloud Run Service Account"
  description  = "Service account for dev environment Cloud Run service"

  project_roles = [
    {
      role = "roles/secretmanager.secretAccessor"
      condition = {
        title       = "Limit to dev secrets"
        description = "Only allow access to dev environment secrets"
        expression  = "resource.name.startsWith('projects/rates-production/secrets/rates-dev-')"
      }
    },
    {
      role      = "roles/firebase.admin"
      condition = null
    }
  ]
}
```
