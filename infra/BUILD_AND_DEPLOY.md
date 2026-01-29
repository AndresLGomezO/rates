# Build and Deploy Guide

This guide explains how to build and push application changes without running the full infrastructure setup.

## Quick Start

For simple app changes (no infrastructure changes):

```bash
# Build and push for dev environment
./infra/build-and-push.sh dev

# Build and push for prod environment (with version tag)
./infra/build-and-push.sh prod v1.0.0

# Build, push, and deploy to dev in one command
./infra/build-and-push.sh dev latest --deploy

# Build, push, and deploy to prod (with version tag)
./infra/build-and-push.sh prod v1.0.0 --deploy
```

## Infrastructure Setup Phases

The full infrastructure setup (`infra/setup.sh`) consists of 7 phases:

### Phase 0: Pre-flight Validation

- Validates required CLI tools (gcloud, terraform, firebase)
- Checks GCP authentication and project access
- Verifies billing account configuration

### Phase 1: Bootstrap

- Creates Terraform state bucket in GCS
- Sets up backend configuration
- Migrates state to GCS

### Phase 2: Foundation

- Creates service accounts (Cloud Run, Cloud Build)
- Enables required GCP APIs
- Creates Artifact Registry repositories
- **Sets up Firebase** (links project, enables Auth/Firestore, creates web app, deploys rules)
- Creates secrets in Secret Manager (Firebase config, nonce secret)

### Phase 3: Application - Dev

- Deploys Cloud Run services for dev environment
- Configures secrets and environment variables
- Builds and pushes container images (optional)
- Updates Cloud Run with images

### Phase 4: Application - Prod

- Deploys Cloud Run services for prod environment
- Configures secrets and environment variables
- Builds and pushes container images (optional)
- Updates Cloud Run with images

### Phase 5: CI/CD Integration (Optional)

- Connects GitHub repository to Cloud Build
- Creates Cloud Build triggers for automated deployments
- Configures build configurations (cloudbuild-dev.yaml, cloudbuild-prod.yaml)

### Phase 6: Cost Guardrails & Monitoring

- Sets up budget alerts
- Configures monitoring and alerting
- Enables cost optimization features

## Building and Pushing App Changes

### When to Use `build-and-push.sh`

Use this script when you:

- ✅ Made changes to `apps/app` or `apps/auth-app` code
- ✅ Want to rebuild and push new container images
- ✅ Don't need to change infrastructure (Terraform, Cloud Run config, etc.)

**Do NOT use this script when you:**

- ❌ Need to change Terraform configuration
- ❌ Need to update Cloud Run service configuration
- ❌ Need to create or update secrets
- ❌ Need to change infrastructure resources

### Prerequisites

Before running `build-and-push.sh`, ensure:

1. **Docker is installed and running**

   ```bash
   docker info
   ```

2. **Authenticated with GCP**

   ```bash
   gcloud auth login
   gcloud config set project rates-production
   ```

3. **Docker configured for Artifact Registry** (script does this automatically)

   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

4. **Secrets exist in Secret Manager** (created by Phase 2 of setup.sh)
   - `rates-dev-firebase-web-config` (for dev)
   - `rates-prod-firebase-web-config` (for prod)
   - `rates-dev-nonce-secret` (for dev)
   - `rates-prod-nonce-secret` (for prod)

### Usage

```bash
# Basic usage (dev environment, latest tag) - build and push only
./infra/build-and-push.sh dev

# With custom tag
./infra/build-and-push.sh dev v1.2.3

# Production with version tag
./infra/build-and-push.sh prod v1.0.0

# Build, push, AND deploy to Cloud Run (dev)
./infra/build-and-push.sh dev latest --deploy

# Build, push, AND deploy to Cloud Run (prod with version tag)
./infra/build-and-push.sh prod v1.0.0 --deploy

# Show help
./infra/build-and-push.sh --help
```

### What the Script Does

1. **Validates prerequisites** (Docker, gcloud, project access, Terraform if deploying)
2. **Configures Docker** for Artifact Registry authentication
3. **Retrieves secrets** from Secret Manager (Firebase config, nonce secret)
4. **Builds API image** (auth-app) with all required build args
5. **Builds app static files** with Firebase configuration embedded
6. **Builds app image** (nginx serving static files)
7. **Pushes both images** to Artifact Registry
8. **(Optional with --deploy)** Updates Cloud Run services via Terraform

### Image Locations

After building, images are pushed to:

- **Dev:**
  - `us-central1-docker.pkg.dev/rates-production/rates-dev-containers/api:latest`
  - `us-central1-docker.pkg.dev/rates-production/rates-dev-containers/app:latest`

- **Prod:**
  - `us-central1-docker.pkg.dev/rates-production/rates-prod-containers/api:v1.0.0`
  - `us-central1-docker.pkg.dev/rates-production/rates-prod-containers/app:v1.0.0`

### After Building

**Option 1: Use --deploy flag** (recommended - easiest)

```bash
# Build, push, and deploy in one command
./infra/build-and-push.sh dev latest --deploy
```

**Option 2: Update Cloud Run directly**

```bash
# For dev
gcloud run services update rates-dev-api-us-central1 \
  --image us-central1-docker.pkg.dev/rates-production/rates-dev-containers/api:latest \
  --region us-central1 \
  --project rates-production

gcloud run services update rates-dev-app-us-central1 \
  --image us-central1-docker.pkg.dev/rates-production/rates-dev-containers/app:latest \
  --region us-central1 \
  --project rates-production
```

**Option 3: Update via Terraform manually**

```bash
cd infra/environments/application/dev
terraform apply -var="container_image_tag=latest"
```

## Troubleshooting

### Docker Build Fails

**Error: "Cannot build app: Firebase config is missing"**

- Ensure secrets exist: `gcloud secrets list --project=rates-production`
- Check secret has correct format: `gcloud secrets versions access latest --secret=rates-dev-firebase-web-config --project=rates-production`

**Error: "Build failed"**

- Check build logs: `cat infra/.build-push.log`
- Ensure dependencies are installed: `pnpm install`
- Verify Firebase config values are valid

### Push Fails

**Error: "unauthorized" or "permission denied"**

- Re-authenticate: `gcloud auth login`
- Configure Docker: `gcloud auth configure-docker us-central1-docker.pkg.dev`
- Check Artifact Registry permissions

**Error: "repository not found"**

- Ensure Artifact Registry repositories exist (created in Phase 2)
- Check repository name matches: `rates-dev-containers` or `rates-prod-containers`

### Static Files Build Fails

**Error: "apps/app/dist directory does not exist"**

- Check build logs for Vite errors
- Ensure all environment variables are set correctly
- Try building manually: `cd . && pnpm --filter=app build`

## Comparison: Full Setup vs Build-Only

| Task                   | Full Setup (`setup.sh`) | Build Only (`build-and-push.sh`) | Build + Deploy (`build-and-push.sh --deploy`) |
| ---------------------- | ----------------------- | -------------------------------- | --------------------------------------------- |
| Infrastructure changes | ✅ Yes                  | ❌ No                            | ❌ No                                         |
| Create/update secrets  | ✅ Yes                  | ❌ No                            | ❌ No                                         |
| Build images           | ✅ Yes                  | ✅ Yes                           | ✅ Yes                                        |
| Push images            | ✅ Yes                  | ✅ Yes                           | ✅ Yes                                        |
| Deploy to Cloud Run    | ✅ Yes                  | ❌ No                            | ✅ Yes                                        |
| Firebase setup         | ✅ Yes                  | ❌ No                            | ❌ No                                         |
| CI/CD setup            | ✅ Yes                  | ❌ No                            | ❌ No                                         |

## Workflow Examples

### Daily Development Workflow

```bash
# 1. Make code changes
# 2. Build, push, and deploy in one command
./infra/build-and-push.sh dev latest --deploy
```

### Production Release Workflow

```bash
# 1. Make code changes and test
# 2. Build, push, and deploy with version tag (one command)
./infra/build-and-push.sh prod v1.2.0 --deploy
```

### Build-Only Workflow (if you want to review before deploying)

```bash
# 1. Build and push without deploying
./infra/build-and-push.sh dev v1.2.3

# 2. Review images, then deploy when ready
./infra/build-and-push.sh dev v1.2.3 --deploy
```

### Infrastructure Changes Workflow

```bash
# Use full setup script
./infra/setup.sh --phase 2  # Or specific phase
```

## Related Files

- `infra/setup.sh` - Full infrastructure setup script
- `infra/build-and-push.sh` - Build and push script (this guide)
- `cloudbuild-dev.yaml` - Cloud Build config for dev
- `cloudbuild-prod.yaml` - Cloud Build config for prod
- `Dockerfile` - Dockerfile for auth-app API
- `.Dockerfile.app` - Generated Dockerfile for app (static files)
