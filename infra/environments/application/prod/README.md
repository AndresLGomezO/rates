# Application Layer (Prod)

## ⚠️ Production Environment

This configuration deploys production infrastructure. All changes require:

1. Careful review of `terraform plan` output
2. Testing in dev environment first
3. Explicit approval via `deployment_approved = true`

## Purpose

Deploys prod environment application resources:

- Secret Manager secrets (Firebase SA, Nonce)
- Cloud Run service (API endpoint)

## Resources Created

| Resource  | Name                         | Purpose                           |
| --------- | ---------------------------- | --------------------------------- |
| Secret    | `rates-prod-firebase-sa`     | Firebase Admin SDK credentials    |
| Secret    | `rates-prod-nonce-secret`    | Shared nonce for token validation |
| Cloud Run | `rates-prod-api-us-central1` | API endpoint for token validation |

## Prerequisites

1. ✅ Phase 1 (Bootstrap) completed
2. ✅ Phase 2 (Foundation) completed
3. ✅ Phase 3 (Application Dev) completed and tested
4. ✅ Container image is production-ready
5. ✅ Production secret values are prepared

## Usage

### Review Changes First

```bash
# Navigate to application/prod directory
cd infra/environments/application/prod

# Initialize Terraform
terraform init

# ⚠️  ALWAYS review the plan before applying to production
terraform plan
```

### Deploy to Production

```bash
# Option 1: Set approval in terraform.tfvars
# Edit terraform.tfvars: deployment_approved = true
terraform apply

# Option 2: Set approval via command line
terraform apply -var="deployment_approved=true"

# Option 3: Set approval with specific image tag (recommended)
terraform apply -var="deployment_approved=true" -var="container_image_tag=v1.0.0"
```

### After Terraform Apply

Terraform creates secret **resources** but not **values**. Complete these manual steps:

#### 1. Create Secret Values (PRODUCTION)

```bash
# ⚠️  Use DIFFERENT values than dev environment!

# Firebase service account JSON (PRODUCTION)
gcloud secrets versions add rates-prod-firebase-sa \
  --data-file=path/to/firebase-service-account-PROD.json

# Nonce secret (PRODUCTION)
echo -n "your-PRODUCTION-nonce-secret-value" | \
  gcloud secrets versions add rates-prod-nonce-secret --data-file=-
```

#### 2. Build and Push Container Image (PRODUCTION)

```bash
# Build the production image with semantic versioning
docker build -t us-central1-docker.pkg.dev/rates-production/rates-prod-containers/api:v1.0.0 \
  --build-arg NODE_ENV=production \
  ./apps/auth-app

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Push the image
docker push us-central1-docker.pkg.dev/rates-production/rates-prod-containers/api:v1.0.0

# Update Terraform to use the new tag
terraform apply -var="deployment_approved=true" -var="container_image_tag=v1.0.0"
```

#### 3. Verify Deployment

```bash
# Get the service URL
terraform output cloud_run_service_url

# Test health endpoint
curl $(terraform output -raw cloud_run_service_url)/health

# Check logs for any errors
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rates-prod-api-us-central1" \
  --limit=50 \
  --project=rates-production
```

## Cost Guardrails (Enforced)

Same as dev environment to maintain free tier compliance:

| Parameter       | Value  | Justification                  |
| --------------- | ------ | ------------------------------ |
| `max_instances` | 2      | Prevents unbounded scaling     |
| `min_instances` | 0      | Enables scale-to-zero          |
| `cpu`           | 1 vCPU | Free tier optimization         |
| `memory`        | 512Mi  | Minimum for Node.js            |
| `timeout`       | 30s    | Prevents long-running requests |

## Outputs

| Output                    | Description                          |
| ------------------------- | ------------------------------------ |
| `cloud_run_service_url`   | URL of the Cloud Run service         |
| `cloud_run_service_name`  | Name of the service                  |
| `secret_names`            | Map of secret names                  |
| `firebase_rewrite_config` | Config for firebase.json             |
| `operations_info`         | Links to GCP Console (logs, metrics) |
| `manual_steps_required`   | Steps to complete after apply        |

## Production Operations

### Viewing Logs

```bash
# Via gcloud
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rates-prod-api-us-central1" \
  --limit=100 \
  --project=rates-production

# Or use the GCP Console link from terraform output
terraform output -json operations_info | jq -r '.logs_url'
```

### Updating the Deployment

```bash
# Deploy a new image version
terraform apply -var="deployment_approved=true" -var="container_image_tag=v1.0.1"
```

### Rolling Back

```bash
# List revisions
gcloud run revisions list --service=rates-prod-api-us-central1 \
  --region=us-central1 \
  --project=rates-production

# Route traffic to previous revision
gcloud run services update-traffic rates-prod-api-us-central1 \
  --to-revisions=rates-prod-api-us-central1-00001-abc=100 \
  --region=us-central1 \
  --project=rates-production
```

### Rotating Secrets

```bash
# Add new secret version
gcloud secrets versions add rates-prod-firebase-sa \
  --data-file=new-firebase-sa-prod.json

# Cloud Run uses "latest" version - redeploy to pick up new secret
gcloud run services update rates-prod-api-us-central1 \
  --region=us-central1 \
  --project=rates-production

# After verification, disable old version
gcloud secrets versions disable rates-prod-firebase-sa --version=1
```

## Environment Isolation Verification

Verify production is isolated from dev:

| Resource           | Dev                          | Prod                          |
| ------------------ | ---------------------------- | ----------------------------- |
| Service Account    | `rates-dev-cloud-run-sa@...` | `rates-prod-cloud-run-sa@...` |
| Cloud Run          | `rates-dev-api-us-central1`  | `rates-prod-api-us-central1`  |
| Secrets            | `rates-dev-*`                | `rates-prod-*`                |
| Container Registry | `rates-dev-containers`       | `rates-prod-containers`       |
| State File         | `application/dev/`           | `application/prod/`           |

## Emergency Procedures

### Service Degradation

1. Check Cloud Run logs for errors
2. Check Secret Manager access (are secrets accessible?)
3. Check container image (does it exist in Artifact Registry?)
4. Roll back to previous revision if needed

### Cost Spike

1. Check Cloud Run instance count
2. Scale to zero if needed: Set `max_instances = 0` temporarily
3. Review traffic patterns
4. Check for DDoS or abuse

## Source Documents

- `docs/IMPLEMENTATION_PLAN.md` - Phase 4 specification
- `docs/TERRAFORM_DESIGN.md` - Layer structure
- `docs/IAM_SECURITY_MODEL.md` - Secrets and IAM
- `docs/COST_GUARDRAILS.md` - Resource limits
- `docs/GCP_PROJECT_STRUCTURE.md` - Naming conventions
