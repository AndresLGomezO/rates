# CI/CD Runbook

## Overview

This document describes the CI/CD pipeline for the Rates monorepo.

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   GitHub    │────▶│  Cloud Build    │────▶│   Deploy    │
│  (develop)  │     │  (rates-dev-*)  │     │   (dev)     │
└─────────────┘     └─────────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────────┐     ┌───────────┐     ┌─────────────┐
│   GitHub    │────▶│  Cloud Build    │────▶│  Approval │────▶│   Deploy    │
│   (main)    │     │  (rates-prod-*) │     │ (manual)  │     │   (prod)    │
└─────────────┘     └─────────────────┘     └───────────┘     └─────────────┘
```

## Branch Strategy

| Branch    | Environment | Auto-Deploy | Approval    |
| --------- | ----------- | ----------- | ----------- |
| `develop` | dev         | ✅ Yes      | None        |
| `main`    | prod        | ✅ Yes      | ⚠️ Required |

## Enabling CI/CD

### 1. Connect GitHub Repository

First, connect your GitHub repository to Cloud Build:

```bash
# Open Cloud Build settings
https://console.cloud.google.com/cloud-build/triggers/connect?project=rates-production

# Select GitHub and authorize
# Select your repository
```

### 2. Enable Triggers via Terraform

```bash
# Dev environment
cd infra/environments/application/dev
terraform apply -var="enable_cicd=true" -var="github_owner=YOUR_ORG"

# Prod environment
cd infra/environments/application/prod
terraform apply -var="deployment_approved=true" -var="enable_cicd=true" -var="github_owner=YOUR_ORG"
```

### 3. Add cloudbuild.yaml Files

Ensure these files exist in your repository root:

- `cloudbuild-dev.yaml`
- `cloudbuild-prod.yaml`
- `Dockerfile`

## Build Process

### Dev Build (`cloudbuild-dev.yaml`)

1. Install dependencies (pnpm)
2. Run tests
3. Build API container
4. Push to Artifact Registry (rates-dev-containers)
5. Deploy to Cloud Run (rates-dev-api-us-central1)
6. Build main-app and auth-app clients
7. Deploy to Firebase Hosting
8. Verify deployment

### Prod Build (`cloudbuild-prod.yaml`)

1. Install dependencies (pnpm)
2. Run tests (required)
3. Build API container (production optimized)
4. Push to Artifact Registry (rates-prod-containers)
5. Deploy to Cloud Run (no traffic initially)
6. Build main-app and auth-app clients (production)
7. Deploy to Firebase Hosting
8. Route traffic to new revision
9. Verify deployment

## Approving Production Deployments

When a build requires approval:

1. Go to Cloud Build history:

   ```
   https://console.cloud.google.com/cloud-build/builds?project=rates-production
   ```

2. Find the pending build (yellow status)

3. Click "Review" and then "Approve" (or "Reject")

4. Build will continue after approval

## Monitoring Builds

### View Build Logs

```bash
# List recent builds
gcloud builds list --limit=10 --project=rates-production

# View specific build
gcloud builds describe BUILD_ID --project=rates-production

# Stream build logs
gcloud builds log BUILD_ID --stream --project=rates-production
```

### Build URLs

- Triggers: https://console.cloud.google.com/cloud-build/triggers?project=rates-production
- History: https://console.cloud.google.com/cloud-build/builds?project=rates-production

## Troubleshooting

### Build Fails: Permission Denied

```bash
# Verify service account permissions
gcloud projects get-iam-policy rates-production \
  --flatten="bindings[].members" \
  --filter="bindings.members:rates-dev-cloud-build-sa"
```

### Build Fails: Image Push Error

```bash
# Verify Artifact Registry exists
gcloud artifacts repositories list --project=rates-production --location=us-central1

# Verify SA has writer access
gcloud artifacts repositories get-iam-policy rates-dev-containers \
  --project=rates-production --location=us-central1
```

### Build Timeout

Builds are limited to 10 minutes per `COST_GUARDRAILS.md`. If builds timeout:

1. Optimize build steps (parallelization)
2. Use build cache
3. Reduce test scope for dev builds

## Cost Considerations

| Limit               | Value  | Source             |
| ------------------- | ------ | ------------------ |
| Daily build minutes | 120    | Free tier          |
| Build timeout       | 10 min | COST_GUARDRAILS.md |
| Concurrent builds   | 1      | Quota              |

Monitor build minutes:

```bash
# View Cloud Build usage
https://console.cloud.google.com/cloud-build/settings?project=rates-production
```

## Rollback Procedures

### Cloud Run Rollback

```bash
# List revisions
gcloud run revisions list --service=rates-prod-api-us-central1 \
  --region=us-central1 --project=rates-production

# Route traffic to previous revision
gcloud run services update-traffic rates-prod-api-us-central1 \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1 --project=rates-production
```

### Firebase Hosting Rollback

```bash
# List releases
firebase hosting:releases:list --project=rates-production

# Rollback to previous release
firebase hosting:rollback --project=rates-production
```
