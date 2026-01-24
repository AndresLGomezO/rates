# Artifact Registry Module

## Purpose

Creates a Google Artifact Registry Docker repository with cleanup policies and IAM bindings.

## Usage

```hcl
module "dev_containers" {
  source = "../../modules/artifact-registry"

  project_id    = "rates-production"
  repository_id = "rates-dev-containers"
  location      = "us-central1"
  environment   = "dev"
  description   = "Container images for dev environment"

  writer_service_account_email  = module.dev_cloud_build_sa.email
  reader_service_account_emails = [module.dev_cloud_run_sa.email]
}
```
