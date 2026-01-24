# Secret Module

## Purpose

Creates a Secret Manager secret resource with IAM access control.

**IMPORTANT:** This module creates the secret RESOURCE only, not the secret VALUE.

## Usage

```hcl
module "dev_firebase_sa_secret" {
  source = "../../modules/secret"

  project_id  = "rates-production"
  secret_id   = "rates-dev-firebase-sa"
  environment = "dev"
  description = "Firebase service account JSON for dev environment"

  accessor_service_account_emails = [
    "rates-dev-cloud-run-sa@rates-production.iam.gserviceaccount.com"
  ]
}
```

## Creating Secret Values

After Terraform creates the secret resource, create the secret value manually:

```bash
# Firebase service account JSON
gcloud secrets versions add rates-dev-firebase-sa \
  --data-file=path/to/firebase-sa.json

# Nonce secret (from stdin)
echo -n "your-nonce-secret-value" | \
  gcloud secrets versions add rates-dev-nonce-secret --data-file=-
```

## Inputs

| Name                              | Description            | Type           | Required |
| --------------------------------- | ---------------------- | -------------- | -------- |
| `project_id`                      | GCP Project ID         | `string`       | Yes      |
| `secret_id`                       | Secret ID              | `string`       | Yes      |
| `environment`                     | Environment (dev/prod) | `string`       | Yes      |
| `description`                     | Secret description     | `string`       | No       |
| `accessor_service_account_emails` | SA emails for access   | `list(string)` | No       |
| `labels`                          | Additional labels      | `map(string)`  | No       |

## Outputs

| Name                    | Description                    |
| ----------------------- | ------------------------------ |
| `secret_id`             | Secret ID                      |
| `secret_name`           | Fully qualified name           |
| `secret_version_latest` | Reference to latest version    |
| `cloud_run_secret_ref`  | Secret reference for Cloud Run |

## Source Documents

- `docs/IAM_SECURITY_MODEL.md` - Secrets strategy
- `docs/GCP_PROJECT_STRUCTURE.md` - Naming conventions
