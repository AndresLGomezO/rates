# Rates Infrastructure Deployment Guide

**Source of Truth** - This document contains all required steps for deploying the Rates infrastructure to GCP. Follow these steps exactly as written.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 0: Pre-flight Validation](#phase-0-pre-flight-validation)
3. [Phase 1: Bootstrap (State Bucket)](#phase-1-bootstrap-state-bucket)
4. [Phase 2: Foundation Layer](#phase-2-foundation-layer)
5. [Phase 3: Application Layer - Dev](#phase-3-application-layer---dev)
6. [Phase 4: Application Layer - Prod](#phase-4-application-layer---prod)
7. [Phase 5: CI/CD Integration](#phase-5-cicd-integration)
8. [Phase 6: Cost Guardrails & Monitoring](#phase-6-cost-guardrails--monitoring)
9. [Post-Deployment: Create Secret Values](#post-deployment-create-secret-values)
10. [Post-Deployment: Build and Push Container Images](#post-deployment-build-and-push-container-images)
11. [Post-Deployment: Update Cloud Run to Use Secrets](#post-deployment-update-cloud-run-to-use-secrets)

---

## Prerequisites

Before starting, ensure you have:

1. **GCP Account** with billing enabled
2. **gcloud CLI** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```
3. **Terraform** >= 1.5.0 installed
4. **jq** installed (for JSON parsing)
5. **Project ID** - Your GCP project ID (e.g., `dev-rates`)
6. **Billing Account ID** (optional, for cost guardrails)

---

## Phase 0: Pre-flight Validation

**Purpose**: Validate tools, authentication, and project configuration.

**Steps**:

1. Navigate to the infrastructure directory:

   ```bash
   cd /path/to/rates/infra
   ```

2. Run the setup script in interactive mode:

   ```bash
   ./setup.sh
   ```

3. The script will prompt for:
   - **Project ID**: Enter your GCP project ID (e.g., `dev-rates`)
   - **Region**: Enter GCP region (default: `us-central1`)
   - **Billing Account ID**: Enter if you want cost guardrails (optional)

4. The script validates:
   - Terraform version (>= 1.5.0)
   - gcloud authentication
   - Project existence and access
   - Billing account (if provided)

5. If validation fails, fix the issues and re-run:
   ```bash
   ./setup.sh --phase 0
   ```

**Expected Result**: All validations pass, configuration is saved to `.setup.config`.

---

## Phase 1: Bootstrap (State Bucket)

**Purpose**: Create the GCS bucket for Terraform state storage.

**Steps**:

1. The setup script automatically proceeds to Phase 1 after Phase 0 completes.

2. If resuming, run:

   ```bash
   ./setup.sh --phase 1
   ```

3. The script will:
   - Generate `terraform.tfvars` in `environments/bootstrap/`
   - Run `terraform init`
   - Run `terraform plan`
   - Prompt for confirmation
   - Run `terraform apply`

4. Review the plan and confirm when prompted.

**Expected Result**: GCS bucket `rates-terraform-state` is created in your project.

**Resources Created**:

- GCS bucket for Terraform state
- State file versioning enabled

---

## Phase 2: Foundation Layer

**Purpose**: Create foundational infrastructure (APIs, service accounts, Artifact Registry).

**Steps**:

1. The setup script automatically proceeds to Phase 2 after Phase 1 completes.

2. If resuming, run:

   ```bash
   ./setup.sh --phase 2
   ```

3. The script will:
   - Generate `terraform.tfvars` in `environments/foundation/`
   - Run `terraform init`
   - Run `terraform plan`
   - Prompt for confirmation
   - Run `terraform apply` (with retry logic for API propagation)

4. Review the plan and confirm when prompted.

5. If you see errors about Artifact Registry "already exists", the script will automatically attempt to import it.

**Expected Result**: Foundation resources are created.

**Resources Created**:

- Required GCP APIs enabled
- Service accounts:
  - `rates-dev-cloud-run-sa@<project>.iam.gserviceaccount.com`
  - `rates-prod-cloud-run-sa@<project>.iam.gserviceaccount.com`
- Artifact Registry repositories (created automatically if they don't exist):
  - `rates-dev-containers` (us-central1)
  - `rates-prod-containers` (us-central1)
- Cost guardrails (if billing account provided)

**Note**: The setup script automatically creates Artifact Registry repositories after Terraform apply completes. If a repository already exists, it will be skipped. If creation fails, the script will continue with a warning, and you can create the repositories manually using the commands in the "Post-Deployment: Build and Push Container Images" section.

---

## Phase 3: Application Layer - Dev

**Purpose**: Deploy dev environment application resources (Cloud Run, Secret Manager secrets).

**Steps**:

1. The setup script automatically proceeds to Phase 3 after Phase 2 completes.

2. If resuming, run:

   ```bash
   ./setup.sh --phase 3
   ```

3. The script will:
   - Generate `terraform.tfvars` in `environments/application/dev/` with:
     - `use_fallback_image = true`
     - `include_secrets = false`
   - Run `terraform init`
   - Run `terraform plan`
   - Prompt for confirmation
   - Run `terraform apply`

4. Review the plan and confirm when prompted.

**Expected Result**: Dev application resources are created.

**Resources Created**:

- Secret Manager secrets (empty, no values yet):
  - `rates-dev-firebase-sa`
  - `rates-dev-nonce-secret`
- Cloud Run service:
  - Name: `rates-dev-api-us-central1`
  - Image: `gcr.io/google-samples/hello-app:1.0` (fallback)
  - Secrets: Not included (will be added in post-deployment)

**Note**: The Cloud Run service is created with a fallback test image and without secrets. This is intentional - secrets and the actual image will be added in post-deployment steps.

---

## Phase 4: Application Layer - Prod

**Purpose**: Deploy prod environment application resources (Cloud Run, Secret Manager secrets).

**Steps**:

1. The setup script automatically proceeds to Phase 4 after Phase 3 completes.

2. If resuming, run:

   ```bash
   ./setup.sh --phase 4
   ```

3. The script will:
   - Generate `terraform.tfvars` in `environments/application/prod/` with:
     - `use_fallback_image = true`
     - `include_secrets = false`
     - `deployment_approved = false`
   - Run `terraform init`
   - Run `terraform plan`
   - Prompt for confirmation (requires explicit approval for production)
   - Prompt again: "Are you sure you want to deploy to PRODUCTION?"
   - Run `terraform apply`

4. Review the plan carefully and confirm when prompted (twice for production).

**Expected Result**: Prod application resources are created.

**Resources Created**:

- Secret Manager secrets (empty, no values yet):
  - `rates-prod-firebase-sa`
  - `rates-prod-nonce-secret`
- Cloud Run service:
  - Name: `rates-prod-api-us-central1`
  - Image: `gcr.io/google-samples/hello-app:1.0` (fallback)
  - Secrets: Not included (will be added in post-deployment)

**Note**: The Cloud Run service is created with a fallback test image and without secrets. This is intentional - secrets and the actual image will be added in post-deployment steps.

---

## Phase 5: CI/CD Integration

**Purpose**: Configure Cloud Build triggers for automated deployments from GitHub.

**Prerequisites**:

- GitHub repository with `cloudbuild-dev.yaml` and `cloudbuild-prod.yaml` files
- GitHub repository must be accessible

**Steps**:

1. The setup script automatically proceeds to Phase 5 after Phase 4 completes.

2. If resuming, run:

   ```bash
   ./setup.sh --phase 5
   ```

3. The script will prompt: **"Setup CI/CD integration?"** - Answer **yes** to proceed.

4. **Connect GitHub Repository to Cloud Build**:

   The script will display a URL. Open it in your browser:

   ```
   https://console.cloud.google.com/cloud-build/triggers/connect?project=dev-rates
   ```

   In the Cloud Build console:
   - Click **"Connect Repository"**
   - Select **"GitHub (Cloud Build GitHub App)"**
   - Authenticate with GitHub if prompted
   - Select your GitHub organization/username
   - Select your repository (e.g., `rates`)
   - Click **"Connect"**

5. Return to the terminal and provide:
   - **GitHub organization or username**: Enter your GitHub username or organization name
   - **GitHub repository name**: Enter your repository name (default: `rates`)

6. The script will:
   - Update `terraform.tfvars` in both dev and prod application directories:
     - Set `enable_cicd = true`
     - Set `github_owner = "<your-github-owner>"`
     - Set `github_repo = "<your-repo-name>"`
   - Run `terraform apply` for dev environment
   - Run `terraform apply` for prod environment (with `deployment_approved=true`)

7. Review the Terraform plans and confirm when prompted (if not using auto-approve).

**Expected Result**: Cloud Build triggers are created.

**Resources Created**:

- Cloud Build trigger: `rates-dev-deploy`
  - Branch: `develop`
  - Environment: dev
  - Approval: Not required
- Cloud Build trigger: `rates-prod-deploy`
  - Branch: `main`
  - Environment: prod
  - Approval: Required

**Note**: If you skip this phase, you can set it up later by running `./setup.sh --phase 5`.

**View Triggers**:

```bash
gcloud builds triggers list --project=dev-rates
```

Or visit: https://console.cloud.google.com/cloud-build/triggers?project=dev-rates

---

## Phase 6: Cost Guardrails & Monitoring

**Purpose**: Verify cost guardrails configuration and display monitoring information.

**Steps**:

1. The setup script automatically proceeds to Phase 6 after Phase 5 completes.

2. If resuming, run:

   ```bash
   ./setup.sh --phase 6
   ```

3. The script will prompt: **"Review cost guardrails configuration?"** - Answer **yes** to proceed.

4. The script will verify:
   - **Budget Configuration**: Checks if budget alerts are configured
   - **API Status**: Verifies required APIs are enabled and unused APIs are disabled
   - **Resource Limits**: Confirms Terraform-enforced limits

5. Review the output:
   - Required APIs should all show as enabled
   - Unused APIs should show as disabled
   - Budget alerts should be configured (if billing account was provided)

**Expected Result**: Cost guardrails verification complete.

**Cost Guardrails Summary**:

- Budget alerts: $10/month with thresholds at 50%, 80%, 100%, 120%
- Unused APIs disabled (monitoring, cloudtrace, compute, container)
- Resource limits enforced:
  - Cloud Run: max 2 instances, 1 vCPU, 512Mi memory, 30s timeout
  - Scale-to-zero enabled (min 0 instances)

**Note**: Cost guardrails were applied during Phase 2 (Foundation). This phase only verifies the configuration.

---

## Post-Deployment: Create Secret Values

**Purpose**: Add actual values to the Secret Manager secrets created in Phases 3 and 4.

**Steps**:

1. Navigate to the infrastructure directory:

   ```bash
   cd /path/to/rates/infra
   ```

2. Run the secret creation script:

   ```bash
   ./create-secrets.sh both
   ```

   This script will:
   - Create Firebase Admin service account (if it doesn't exist)
   - Generate service account key files:
     - `~/firebase-service-account-dev.json`
     - `~/firebase-service-account-prod.json`
   - Add Firebase service account JSON to secrets:
     - `rates-dev-firebase-sa`
     - `rates-prod-firebase-sa`
   - Generate and add nonce secrets:
     - `rates-dev-nonce-secret`
     - `rates-prod-nonce-secret`
   - Save nonce secrets to:
     - `~/.rates-nonce-dev.txt`
     - `~/.rates-nonce-prod.txt`
   - Automatically update `terraform.tfvars` files to set `include_secrets = true`

3. **If the script prompts for IAM policy condition**, choose **[11] None**.

4. Verify secrets were created:
   ```bash
   gcloud secrets versions list rates-dev-firebase-sa --project=dev-rates
   gcloud secrets versions list rates-dev-nonce-secret --project=dev-rates
   gcloud secrets versions list rates-prod-firebase-sa --project=dev-rates
   gcloud secrets versions list rates-prod-nonce-secret --project=dev-rates
   ```

**Expected Result**: All secrets have at least one version with actual values.

**Note**: The script automatically updates `terraform.tfvars` files. The nonce secrets are saved to your home directory for reference.

**Alternative: Manual Secret Creation**

If you prefer to create secrets manually or the script fails:

1. **Create Firebase service account key** (if not already created):

   ```bash
   gcloud iam service-accounts create firebase-admin \
     --display-name="Firebase Admin Service Account" \
     --project=dev-rates

   gcloud iam service-accounts keys create ~/firebase-service-account-dev.json \
     --iam-account=firebase-admin@dev-rates.iam.gserviceaccount.com \
     --project=dev-rates
   ```

2. **Add Firebase service account to secrets**:

   ```bash
   gcloud secrets versions add rates-dev-firebase-sa \
     --data-file=~/firebase-service-account-dev.json \
     --project=dev-rates

   gcloud secrets versions add rates-prod-firebase-sa \
     --data-file=~/firebase-service-account-dev.json \
     --project=dev-rates
   ```

3. **Generate and add nonce secrets**:

   ```bash
   echo -n "$(openssl rand -hex 32)" | gcloud secrets versions add rates-dev-nonce-secret \
     --data-file=- \
     --project=dev-rates

   echo -n "$(openssl rand -hex 32)" | gcloud secrets versions add rates-prod-nonce-secret \
     --data-file=- \
     --project=dev-rates
   ```

4. **Manually update terraform.tfvars**:

   ```bash
   # For dev
   cd environments/application/dev
   sed -i.bak "s/include_secrets = false/include_secrets = true/" terraform.tfvars
   rm -f terraform.tfvars.bak

   # For prod
   cd ../prod
   sed -i.bak "s/include_secrets = false/include_secrets = true/" terraform.tfvars
   rm -f terraform.tfvars.bak
   ```

---

## Post-Deployment: Build and Push Container Images

**Purpose**: Build your application container images and push them to Artifact Registry.

**Prerequisites**:

- Docker installed and running
- Authenticated with GCP (for pushing to Artifact Registry)
- Artifact Registry repositories created (automatically created in Phase 2, or see below if not)

**Steps**:

1. **Verify Artifact Registry repositories exist** (should have been created in Phase 2):

   ```bash
   gcloud artifacts repositories list --location=us-central1 --project=dev-rates
   ```

   If the repositories don't exist (e.g., if Phase 2 failed or was skipped), create them manually:

   ```bash
   # Create dev repository
   gcloud artifacts repositories create rates-dev-containers \
     --repository-format=docker \
     --location=us-central1 \
     --description="Docker container images for dev environment" \
     --project=dev-rates

   # Create prod repository
   gcloud artifacts repositories create rates-prod-containers \
     --repository-format=docker \
     --location=us-central1 \
     --description="Docker container images for prod environment" \
     --project=dev-rates
   ```

2. Configure Docker for Artifact Registry:

   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

3. Navigate to the project root directory:

   ```bash
   cd /path/to/rates
   ```

4. Build and push the auth-app API container image:

   **Why only auth-app API?**

   The monorepo has two applications with different deployment strategies:
   - **`apps/app`** (Main Financial Accounts App): Static React SPA deployed to **Firebase Hosting**. No Docker image needed - it's built with `pnpm --filter=app build` and deployed as static files.
   - **`apps/auth-app`**: Has two parts:
     - **Client routes** (Login, Signup, Session, etc.): Static React SPA deployed to **Firebase Hosting**. No Docker image needed.
     - **API endpoint** (`/api/validate`): Server-side Node.js code deployed to **Cloud Run**. **This requires a Docker image** because it needs a server runtime.

   The Dockerfile builds only the auth-app API server component for Cloud Run deployment.

   **Dev:**

   ```bash
   docker build -t us-central1-docker.pkg.dev/dev-rates/rates-dev-containers/api:latest \
     -f Dockerfile \
     --build-arg NODE_ENV=development \
     .
   docker push us-central1-docker.pkg.dev/dev-rates/rates-dev-containers/api:latest
   ```

   **Prod (use semantic versioning):**

   ```bash
   docker build -t us-central1-docker.pkg.dev/dev-rates/rates-prod-containers/api:v1.0.0 \
     -f Dockerfile \
     --build-arg NODE_ENV=production \
     .
   docker push us-central1-docker.pkg.dev/dev-rates/rates-prod-containers/api:v1.0.0
   ```

   **Important Notes**:
   - The Dockerfile is in the project root and **must** be run with the build context as the monorepo root (`.`), not `./apps/auth-app`.
   - The Dockerfile uses a multi-stage build:
     - **Stage 1 (deps)**: Installs all dependencies (including dev dependencies)
     - **Stage 2 (builder)**: Copies source code, runs `pnpm --filter=auth-app build:api` to build the application
     - **Stage 3 (production)**: Creates minimal production image with only runtime dependencies
   - The Dockerfile properly handles the pnpm workspace structure:
     - Copies `tsconfig.base.json` (required for TypeScript compilation)
     - Maintains workspace structure in all stages
     - Uses `--ignore-scripts` in production to skip lifecycle scripts (e.g., husky)
   - The build script (`build:api`) runs `tsc && vite build`:
     - `tsc` compiles TypeScript files
     - `vite build` creates the static assets in `dist/`
   - The production image uses `tsx` to run `server.js` directly (no compilation needed at runtime)
   - The `server.js` file serves static files from `dist/` and handles the `/api/validate` endpoint

5. Verify the image was pushed:
   ```bash
   # Verify auth-app API image
   gcloud artifacts docker images list us-central1-docker.pkg.dev/dev-rates/rates-dev-containers/api
   gcloud artifacts docker images list us-central1-docker.pkg.dev/dev-rates/rates-prod-containers/api
   ```

**Expected Result**: The auth-app API container image is available in Artifact Registry.

**Note**: Only the auth-app API image is built and pushed. The main app (`apps/app`) and auth-app client routes are static SPAs deployed to Firebase Hosting (not Cloud Run), so they don't require Docker images. See `cloudbuild-dev.yaml` and `cloudbuild-prod.yaml` for the full deployment pipeline that includes Firebase Hosting deployment.

**Note**: For production, use semantic versioning (e.g., `v1.0.0`) instead of `latest`.

---

## Post-Deployment: Update Cloud Run to Use Secrets

**Purpose**: Update Cloud Run services to use the actual container images and secrets.

### For Dev Environment

1. Navigate to dev application directory:

   ```bash
   cd /path/to/rates/infra/environments/application/dev
   ```

2. Update `terraform.tfvars` to use your actual image:

   ```bash
   # Edit terraform.tfvars and set:
   use_fallback_image = false
   include_secrets = true
   ```

3. Review the changes:

   ```bash
   terraform plan
   ```

4. Apply the changes:

   ```bash
   terraform apply
   ```

5. Verify the service is updated:
   ```bash
   # Verify auth-app API service
   gcloud run services describe rates-dev-api-us-central1 \
     --region=us-central1 \
     --project=dev-rates \
     --format="value(status.url)"
   ```

### For Prod Environment

1. Navigate to prod application directory:

   ```bash
   cd /path/to/rates/infra/environments/application/prod
   ```

2. Update `terraform.tfvars` to use your actual image:

   ```bash
   # Edit terraform.tfvars and set:
   use_fallback_image = false
   include_secrets = true
   container_image_tag = "v1.0.0"  # Use the version you pushed
   ```

3. Review the changes:

   ```bash
   terraform plan
   ```

4. Apply the changes (requires approval):

   ```bash
   terraform apply -var="deployment_approved=true"
   ```

5. Verify the service is updated:
   ```bash
   # Verify auth-app API service
   gcloud run services describe rates-prod-api-us-central1 \
     --region=us-central1 \
     --project=dev-rates \
     --format="value(status.url)"
   ```

**Expected Result**: Cloud Run service is updated with:

- Your actual container image from Artifact Registry (auth-app API)
- Secrets mounted as environment variables
- Service is accessible and running

---

## Verification

After completing all steps, verify the deployment:

1. **Check Cloud Run services**:

   ```bash
   gcloud run services list --project=dev-rates
   ```

   You should see `rates-dev-api-us-central1` and `rates-prod-api-us-central1`.

2. **Test the API endpoints**:

   ```bash
   # Get the auth-app API service URL
   DEV_API_URL=$(gcloud run services describe rates-dev-api-us-central1 \
     --region=us-central1 \
     --project=dev-rates \
     --format="value(status.url)")

   # Test auth-app API health endpoint
   curl "${DEV_API_URL}/health"

   # Test the API validate endpoint (requires authentication)
   curl -X POST "${DEV_API_URL}/api/validate" \
     -H "Content-Type: application/json" \
     -d '{"token": "your-firebase-id-token"}'
   ```

3. **Check logs**:

   ```bash
   # View recent logs for dev API
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rates-dev-api-us-central1" \
     --project=dev-rates \
     --limit=50

   # Or use Cloud Run logs command
   gcloud run services logs read rates-dev-api-us-central1 \
     --region=us-central1 \
     --project=dev-rates \
     --limit=50
   ```

---

## Troubleshooting

### If setup script fails at any phase:

1. Check the log file:

   ```bash
   tail -100 /path/to/rates/infra/.setup.log
   ```

2. Resume from the failed phase:
   ```bash
   ./setup.sh --phase N  # Replace N with the phase number
   ```

### If Terraform state lock error:

```bash
cd /path/to/rates/infra/environments/application/dev  # or prod
terraform force-unlock <LOCK_ID>
```

### If secrets creation fails:

1. Verify service account exists:

   ```bash
   gcloud iam service-accounts describe firebase-admin@dev-rates.iam.gserviceaccount.com
   ```

2. Manually add secrets:
   ```bash
   gcloud secrets versions add rates-dev-firebase-sa \
     --data-file=~/firebase-service-account-dev.json \
     --project=dev-rates
   ```

---

## Summary

The complete deployment process consists of:

1. **Phases 0-6**: Run `./setup.sh` (automated via script)
   - Phase 0: Pre-flight validation
   - Phase 1: Bootstrap (state bucket)
   - Phase 2: Foundation (APIs, service accounts, Artifact Registry)
   - Phase 3: Application - Dev (Cloud Run, secrets)
   - Phase 4: Application - Prod (Cloud Run, secrets)
   - Phase 5: CI/CD Integration (GitHub connection, Cloud Build triggers)
   - Phase 6: Cost Guardrails verification
2. **Post-Deployment Step 1**: Run `./create-secrets.sh both` (creates secret values)
3. **Post-Deployment Step 2**: Build and push container images (manual Docker commands)
4. **Post-Deployment Step 3**: Update Cloud Run via Terraform (manual terraform apply)

All infrastructure is now deployed and ready to use.
