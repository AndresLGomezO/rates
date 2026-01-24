# Cloud Build Trigger Module

## Purpose

Creates Cloud Build triggers for automated CI/CD deployments.

## Usage

```hcl
module "dev_deploy_trigger" {
  source = "../../../modules/cloud-build-trigger"

  project_id   = "rates-production"
  trigger_name = "rates-dev-deploy"
  description  = "Deploy to dev environment on develop branch push"
  environment  = "dev"

  repository_type = "github"
  github_owner    = "your-org"
  github_repo     = "rates"
  branch_pattern  = "^develop$"

  build_config_file     = "cloudbuild-dev.yaml"
  service_account_email = "rates-dev-cloud-build-sa@rates-production.iam.gserviceaccount.com"

  require_approval = false
}
```

## Cost Guardrails

| Constraint    | Value      | Source                    |
| ------------- | ---------- | ------------------------- |
| Build timeout | 10 min max | `docs/COST_GUARDRAILS.md` |
| Daily quota   | 120 min    | Free tier limit           |

## Inputs

| Name                    | Description                         | Type     | Required    |
| ----------------------- | ----------------------------------- | -------- | ----------- |
| `project_id`            | GCP Project ID                      | `string` | Yes         |
| `trigger_name`          | Trigger name                        | `string` | Yes         |
| `environment`           | Environment (dev/prod)              | `string` | Yes         |
| `repository_type`       | github or cloud-source-repositories | `string` | No          |
| `github_owner`          | GitHub org/user                     | `string` | Conditional |
| `github_repo`           | GitHub repo name                    | `string` | Conditional |
| `branch_pattern`        | Branch regex                        | `string` | No          |
| `build_config_file`     | Path to cloudbuild.yaml             | `string` | No          |
| `service_account_email` | Build SA email                      | `string` | Yes         |
| `require_approval`      | Manual approval required            | `bool`   | No          |

## Outputs

| Name           | Description     |
| -------------- | --------------- |
| `trigger_id`   | Trigger ID      |
| `trigger_name` | Trigger name    |
| `console_url`  | GCP Console URL |
