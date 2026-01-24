# Cloud Run Module

## Purpose

Deploys a Cloud Run service with consistent configuration, security defaults, and cost guardrails.

## Cost Guardrails (ENFORCED)

| Parameter       | Limit  | Justification                  |
| --------------- | ------ | ------------------------------ |
| `max_instances` | 2      | Prevents unbounded scaling     |
| `min_instances` | 0      | Enables scale-to-zero          |
| `cpu`           | 1 vCPU | Free tier optimization         |
| `memory`        | 512Mi  | Minimum for Node.js            |
| `timeout`       | 30s    | Prevents long-running requests |

## Usage

```hcl
module "dev_api" {
  source = "../../modules/cloud-run"

  project_id   = "rates-production"
  service_name = "rates-dev-api-us-central1"
  region       = "us-central1"
  environment  = "dev"

  service_account_email = "rates-dev-cloud-run-sa@rates-production.iam.gserviceaccount.com"
  container_image       = "us-central1-docker.pkg.dev/rates-production/rates-dev-containers/api:latest"

  secrets = {
    firebase_sa = {
      secret_id = "rates-dev-firebase-sa"
      version   = "latest"
      env_var   = "FIREBASE_SERVICE_ACCOUNT"
    }
    nonce = {
      secret_id = "rates-dev-nonce-secret"
      version   = "latest"
      env_var   = "NONCE_SECRET"
    }
  }

  environment_variables = {
    NODE_ENV    = "development"
    ENVIRONMENT = "dev"
  }
}
```

## Inputs

| Name                    | Description            | Type          | Default   | Required |
| ----------------------- | ---------------------- | ------------- | --------- | -------- |
| `project_id`            | GCP Project ID         | `string`      | -         | Yes      |
| `service_name`          | Service name           | `string`      | -         | Yes      |
| `region`                | GCP region             | `string`      | -         | Yes      |
| `environment`           | Environment (dev/prod) | `string`      | -         | Yes      |
| `service_account_email` | SA email               | `string`      | -         | Yes      |
| `container_image`       | Container image URL    | `string`      | -         | Yes      |
| `max_instances`         | Max instances          | `number`      | `2`       | No       |
| `min_instances`         | Min instances          | `number`      | `0`       | No       |
| `cpu`                   | CPU allocation         | `string`      | `"1"`     | No       |
| `memory`                | Memory allocation      | `string`      | `"512Mi"` | No       |
| `timeout_seconds`       | Request timeout        | `number`      | `30`      | No       |
| `secrets`               | Secrets to mount       | `map(object)` | `{}`      | No       |
| `environment_variables` | Env vars               | `map(string)` | `{}`      | No       |
| `allow_unauthenticated` | Public access          | `bool`        | `true`    | No       |

## Outputs

| Name                      | Description                 |
| ------------------------- | --------------------------- |
| `service_id`              | Fully qualified service ID  |
| `service_name`            | Service name                |
| `service_uri`             | Service URI                 |
| `service_url`             | Service URL                 |
| `latest_revision`         | Latest revision name        |
| `firebase_rewrite_config` | Config for Firebase Hosting |

## Source Documents

- `docs/COST_GUARDRAILS.md` - Resource limits
- `docs/IAM_SECURITY_MODEL.md` - Security configuration
- `docs/GCP_PROJECT_STRUCTURE.md` - Naming conventions
