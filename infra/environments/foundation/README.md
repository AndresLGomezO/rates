# Foundation Layer

## Purpose

Creates shared foundational infrastructure used by all environments:

- Service accounts (4 total: 2 per environment)
- Artifact Registry repositories (2 total: 1 per environment)
- Required API enablement

## Resources Created

### APIs Enabled

| API                                   | Purpose           |
| ------------------------------------- | ----------------- |
| `run.googleapis.com`                  | Cloud Run         |
| `firebase.googleapis.com`             | Firebase          |
| `firestore.googleapis.com`            | Cloud Firestore   |
| `secretmanager.googleapis.com`        | Secret Manager    |
| `artifactregistry.googleapis.com`     | Artifact Registry |
| `cloudbuild.googleapis.com`           | Cloud Build       |
| `iam.googleapis.com`                  | IAM               |
| `cloudresourcemanager.googleapis.com` | Resource Manager  |
| `serviceusage.googleapis.com`         | Service Usage     |

### Service Accounts

| Account ID                  | Environment | Purpose                    |
| --------------------------- | ----------- | -------------------------- |
| `rates-dev-cloud-run-sa`    | Dev         | Cloud Run service identity |
| `rates-dev-cloud-build-sa`  | Dev         | CI/CD deployment identity  |
| `rates-prod-cloud-run-sa`   | Prod        | Cloud Run service identity |
| `rates-prod-cloud-build-sa` | Prod        | CI/CD deployment identity  |

### Artifact Registry Repositories

| Repository ID           | Environment | URL                                                                 |
| ----------------------- | ----------- | ------------------------------------------------------------------- |
| `rates-dev-containers`  | Dev         | `us-central1-docker.pkg.dev/rates-production/rates-dev-containers`  |
| `rates-prod-containers` | Prod        | `us-central1-docker.pkg.dev/rates-production/rates-prod-containers` |

## Prerequisites

1. ✅ Phase 1 (Bootstrap) completed - state bucket exists
2. ✅ GCP project `rates-production` exists
3. ✅ User has `roles/owner` or `roles/editor` on project

## Usage

````bash
# Navigate to foundation directory
cd infra/environments/foundation

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply foundation configuration
terraform apply

# Verify outputs
terraform output

## Cost Guardrails (Phase 6)

### Overview

Cost guardrails enforce spending limits and alert on budget thresholds.

| Control Type | Mechanism | Purpose |
|--------------|-----------|---------|
| Hard Limits | Terraform resource config | Prevent overspending |
| Soft Alerts | Budget notifications | Inform of spending |
| API Controls | Disable unused APIs | Prevent accidental usage |

### Budget Configuration

To enable budget alerts, set these variables:

```hcl
# In terraform.tfvars or via CLI
billing_account_id = "XXXXXX-XXXXXX-XXXXXX"
budget_alert_email = "your-email@example.com"
budget_amount      = 10  # USD per month
````

Find your billing account ID:

```bash
gcloud billing accounts list
```

### Alert Thresholds

| Threshold | Amount | Action                           |
| --------- | ------ | -------------------------------- |
| 50%       | $5.00  | Informational                    |
| 80%       | $8.00  | Warning - review usage           |
| 100%      | $10.00 | Critical - investigate           |
| 120%      | $12.00 | Exceeded - take immediate action |

### Disabled APIs

The following APIs are disabled to prevent accidental costs:

- `monitoring.googleapis.com` - Cloud Monitoring (rejected per ADR-009)
- `cloudtrace.googleapis.com` - Cloud Trace (not needed)
- `cloudprofiler.googleapis.com` - Cloud Profiler (not needed)
- `cloudkms.googleapis.com` - Cloud KMS (Secret Manager used instead)
- `compute.googleapis.com` - Compute Engine (Cloud Run only)
- `container.googleapis.com` - GKE (not in architecture)
- `sqladmin.googleapis.com` - Cloud SQL (Firestore used instead)
- `spanner.googleapis.com` - Spanner (not in architecture)
- `bigtable.googleapis.com` - Bigtable (not in architecture)
- `cloudtasks.googleapis.com` - Cloud Tasks (not in architecture)
- `cloudscheduler.googleapis.com` - Cloud Scheduler (not in architecture)

### Hard Limits (Enforced via Terraform)

| Parameter                   | Limit   | Location                     |
| --------------------------- | ------- | ---------------------------- |
| Cloud Run max_instances     | 2       | `modules/cloud-run/`         |
| Cloud Run min_instances     | 0       | `modules/cloud-run/`         |
| Cloud Run CPU               | 1 vCPU  | `modules/cloud-run/`         |
| Cloud Run Memory            | 512Mi   | `modules/cloud-run/`         |
| Cloud Run Timeout           | 30s     | `modules/cloud-run/`         |
| Artifact Registry Lifecycle | 30 days | `modules/artifact-registry/` |

### Verification

After applying, verify cost guardrails:

```bash
# Check budget
gcloud billing budgets list --billing-account=YOUR_BILLING_ACCOUNT_ID

# Check enabled APIs (should NOT include disabled APIs)
gcloud services list --enabled --project=rates-production

# View cost guardrails summary
terraform output cost_guardrails_summary
```
