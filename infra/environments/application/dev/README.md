# Application Layer (Dev)

## Purpose

Deploys dev environment application resources:

- Secret Manager secrets (Firebase SA, Nonce)
- Cloud Run service (API endpoint)

## Resources Created

| Resource  | Name                        | Purpose                           |
| --------- | --------------------------- | --------------------------------- |
| Secret    | `rates-dev-firebase-sa`     | Firebase Admin SDK credentials    |
| Secret    | `rates-dev-nonce-secret`    | Shared nonce for token validation |
| Cloud Run | `rates-dev-api-us-central1` | API endpoint for token validation |

## Prerequisites

1. ✅ Phase 1 (Bootstrap) completed
2. ✅ Phase 2 (Foundation) completed
3. ✅ Container image exists in Artifact Registry (or will be created)

## Usage

### Initial Deployment

```bash
# Navigate to application/dev directory
cd infra/environments/application/dev

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply configuration
terraform apply
```

### After Terraform Apply

Terraform creates secret **resources** but not **values**. Complete these manual steps:

#### 1. Create Secret Values

```bash
# Firebase service account JSON
gcloud secrets versions add rates-dev-firebase-sa \
  --data-file=path/to/firebase-service-account.json

# Nonce secret
echo -n "your-secure-nonce-value" | \
  gcloud secrets versions add rates-dev-nonce-secret --data-file=-
```

#### 2. Build and Push Container Image

```bash
# Build the image
docker build -t us-central1-docker.pkg.dev/rates-production/rates-dev-containers/api:latest \
  ./apps/auth-app

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Push the image
docker push us-central1-docker.pkg.dev/rates-production/rates-dev-containers/api:latest
```

#### 3. Verify Deployment

```bash
# Get the service URL
terraform output cloud_run_service_url

# Test health endpoint
curl $(terraform output -raw cloud_run_service_url)/health
```

## Cost Guardrails (Enforced)

| Parameter       | Value  | Justification                  |
| --------------- | ------ | ------------------------------ |
| `max_instances` | 2      | Prevents unbounded scaling     |
| `min_instances` | 0      | Enables scale-to-zero          |
| `cpu`           | 1 vCPU | Free tier optimization         |
| `memory`        | 512Mi  | Minimum for Node.js            |
| `timeout`       | 30s    | Prevents long-running requests |

## Outputs

| Output                    | Description                   |
| ------------------------- | ----------------------------- |
| `cloud_run_service_url`   | URL of the Cloud Run service  |
| `cloud_run_service_name`  | Name of the service           |
| `secret_names`            | Map of secret names           |
| `firebase_rewrite_config` | Config for firebase.json      |
| `manual_steps_required`   | Steps to complete after apply |

## Updating the Deployment

### Deploy a New Image Version

```bash
# Update the image tag
terraform apply -var="container_image_tag=v1.0.1"
```

### Rotate Secrets

```bash
# Add new secret version
gcloud secrets versions add rates-dev-firebase-sa \
  --data-file=new-firebase-sa.json

# Cloud Run automatically uses "latest" version
# Redeploy to pick up new secret
gcloud run services update rates-dev-api-us-central1 \
  --region=us-central1
```

## Source Documents

- `docs/IMPLEMENTATION_PLAN.md` - Phase 3 specification
- `docs/TERRAFORM_DESIGN.md` - Layer structure
- `docs/IAM_SECURITY_MODEL.md` - Secrets and IAM
- `docs/COST_GUARDRAILS.md` - Resource limits
- `docs/GCP_PROJECT_STRUCTURE.md` - Naming conventions
