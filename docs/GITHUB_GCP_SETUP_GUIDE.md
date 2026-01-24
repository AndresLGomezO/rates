# Step-by-Step Setup: GitHub Actions → GCP (3 Environments)

This guide walks you through setting up GitHub Actions with GCP Workload Identity Federation for **development**, **staging**, and **production** environments.

## Prerequisites

- GitHub repository: `owner/rates` (replace with your actual owner/repo)
- Three GCP projects:
  - `your-dev-project-id` (development)
  - `your-staging-project-id` (staging)
  - `your-prod-project-id` (production)
- `gcloud` CLI installed and authenticated
- Owner/admin access to GitHub repository

---

## Part 1: GitHub Setup (No Secrets Needed!)

### Step 1.1: Create GitHub Environments

GitHub Environments provide deployment protection, approval gates, and audit trails.

1. Go to your GitHub repository: `https://github.com/owner/rates`
2. Navigate to **Settings** → **Environments**
3. Click **New environment** and create three environments:

   **Environment 1: `development`**
   - Name: `development`
   - No protection rules needed (dev can auto-deploy)

   **Environment 2: `staging`**
   - Name: `staging`
   - Optional: Add reviewers if you want manual approval

   **Environment 3: `production`**
   - Name: `production`
   - **Required reviewers**: Add yourself/team (recommended for prod)
   - **Deployment branches**: Restrict to `main` branch only

**Note**: Environments are created empty—no secrets needed! WIF handles auth automatically.

---

## Part 2: GCP Setup (Per Environment)

Repeat these steps **for each environment** (dev, staging, prod). We'll start with **production** as the example.

### Step 2.1: Set Variables (Production Example)

```bash
# Replace these with your actual values
export PROJECT_ID="your-prod-project-id"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export REGION="us-central1"
export GITHUB_OWNER="your-github-username"  # e.g., "andresgomezortiz"
export GITHUB_REPO="rates"
export GITHUB_REPO_FULL="${GITHUB_OWNER}/${GITHUB_REPO}"  # e.g., "andresgomezortiz/rates"
export POOL_ID="github-pool"
export PROVIDER_ID="github-provider"
```

**Get your project number:**

```bash
gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
```

### Step 2.2: Enable Required APIs

```bash
gcloud config set project $PROJECT_ID

gcloud services enable \
  iamcredentials.googleapis.com \
  iam.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### Step 2.3: Create Artifact Registry Repository

```bash
# Production
gcloud artifacts repositories create rates \
  --repository-format=docker \
  --location=$REGION \
  --description="Rates container images (production)"

# Development (run in dev project)
# gcloud artifacts repositories create dev-rates \
#   --repository-format=docker \
#   --location=$REGION \
#   --description="Rates container images (development)"

# Staging (run in staging project)
# gcloud artifacts repositories create staging-rates \
#   --repository-format=docker \
#   --location=$REGION \
#   --description="Rates container images (staging)"
```

### Step 2.4: Create Workload Identity Pool

**One pool per GCP project** (create in each of your 3 projects):

```bash
gcloud iam workload-identity-pools create $POOL_ID \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --project=$PROJECT_ID
```

### Step 2.5: Create Workload Identity Provider

**One provider per project**, restricted to your GitHub repo:

```bash
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID \
  --location="global" \
  --workload-identity-pool=$POOL_ID \
  --display-name="GitHub Actions Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO_FULL}'" \
  --project=$PROJECT_ID
```

**Important**: Replace `${GITHUB_REPO_FULL}` with your actual `owner/repo` (e.g., `andresgomezortiz/rates`).

### Step 2.6: Create Deployer Service Account

**Per environment** (create 3 service accounts total):

```bash
# Production
gcloud iam service-accounts create github-ci-prod \
  --display-name="GitHub Actions Deployer (Production)" \
  --project=$PROJECT_ID

# Development (run in dev project)
# gcloud iam service-accounts create github-ci-dev \
#   --display-name="GitHub Actions Deployer (Development)" \
#   --project=your-dev-project-id

# Staging (run in staging project)
# gcloud iam service-accounts create github-ci-staging \
#   --display-name="GitHub Actions Deployer (Staging)" \
#   --project=your-staging-project-id
```

### Step 2.7: Bind GitHub Identity to Service Account (Branch-Restricted)

**Production** (only `main` branch):

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO_FULL}" \
  --condition="expression=attribute.ref=='refs/heads/main',title=github-main-only,description=Only allow federation from main branch" \
  --project=$PROJECT_ID
```

**Development** (only `develop` branch):

```bash
# Run in dev project context
export DEV_PROJECT_ID="your-dev-project-id"
export DEV_PROJECT_NUMBER=$(gcloud projects describe $DEV_PROJECT_ID --format="value(projectNumber)")

gcloud iam service-accounts add-iam-policy-binding \
  "github-ci-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${DEV_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO_FULL}" \
  --condition="expression=attribute.ref=='refs/heads/develop',title=github-develop-only,description=Only allow federation from develop branch" \
  --project=$DEV_PROJECT_ID
```

**Staging** (only `staging` branch):

```bash
# Run in staging project context
export STAGING_PROJECT_ID="your-staging-project-id"
export STAGING_PROJECT_NUMBER=$(gcloud projects describe $STAGING_PROJECT_ID --format="value(projectNumber)")

gcloud iam service-accounts add-iam-policy-binding \
  "github-ci-staging@${STAGING_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${STAGING_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO_FULL}" \
  --condition="expression=attribute.ref=='refs/heads/staging',title=github-staging-only,description=Only allow federation from staging branch" \
  --project=$STAGING_PROJECT_ID
```

### Step 2.8: Grant IAM Roles to Deployer Service Accounts

**For each environment**, grant these roles to the deployer SA:

#### Artifact Registry Writer (push images)

**Production:**

```bash
gcloud artifacts repositories add-iam-policy-binding rates \
  --location=$REGION \
  --member="serviceAccount:github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=$PROJECT_ID
```

**Development:**

```bash
gcloud artifacts repositories add-iam-policy-binding dev-rates \
  --location=$REGION \
  --member="serviceAccount:github-ci-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=$DEV_PROJECT_ID
```

**Staging:**

```bash
gcloud artifacts repositories add-iam-policy-binding staging-rates \
  --location=$REGION \
  --member="serviceAccount:github-ci-staging@${STAGING_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=$STAGING_PROJECT_ID
```

#### Cloud Run Developer (deploy services)

**Production:**

```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.developer"
```

**Development:**

```bash
gcloud projects add-iam-policy-binding "${DEV_PROJECT_ID}" \
  --member="serviceAccount:github-ci-dev@${DEV_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.developer"
```

**Staging:**

```bash
gcloud projects add-iam-policy-binding "${STAGING_PROJECT_ID}" \
  --member="serviceAccount:github-ci-staging@${STAGING_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.developer"
```

#### Service Account User (if Cloud Run uses a runtime SA)

If your Cloud Run services use a dedicated runtime service account:

```bash
# Production example
RUNTIME_SA="cloud-run-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:github-ci-prod@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" \
  --project=$PROJECT_ID
```

---

## Part 3: Update GitHub Workflow File

### Step 3.1: Get WIF Provider Resource Names

For each environment, get the full WIF provider resource name:

**Production:**

```bash
gcloud iam workload-identity-pools providers describe $PROVIDER_ID \
  --location="global" \
  --workload-identity-pool=$POOL_ID \
  --project=$PROJECT_ID \
  --format="value(name)"
```

Output format: `projects/123456789012/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

**Repeat for dev and staging projects** to get their provider names.

### Step 3.2: Update `.github/workflows/deploy.yml`

Edit the `env-select` job (lines 83-113) and replace placeholders:

**Development section** (line ~83):

```yaml
if [ "${{ github.ref_name }}" = "develop" ]; then
  echo "gcp_project_id=your-dev-project-id" >> "$GITHUB_OUTPUT"  # ← Replace
  echo "ar_repository=dev-rates" >> "$GITHUB_OUTPUT"
  echo "cloud_run_service_app=rates-app-dev" >> "$GITHUB_OUTPUT"
  echo "cloud_run_service_auth_app=rates-auth-app-dev" >> "$GITHUB_OUTPUT"
  echo "wif_provider=projects/DEV_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider" >> "$GITHUB_OUTPUT"  # ← Replace DEV_PROJECT_NUMBER
  echo "wif_service_account=github-ci-dev@your-dev-project-id.iam.gserviceaccount.com" >> "$GITHUB_OUTPUT"  # ← Replace
  echo "github_environment=development" >> "$GITHUB_OUTPUT"
```

**Staging section** (line ~93):

```yaml
elif [ "${{ github.ref_name }}" = "staging" ]; then
  echo "gcp_project_id=your-staging-project-id" >> "$GITHUB_OUTPUT"  # ← Replace
  echo "ar_repository=staging-rates" >> "$GITHUB_OUTPUT"
  echo "cloud_run_service_app=rates-app-staging" >> "$GITHUB_OUTPUT"
  echo "cloud_run_service_auth_app=rates-auth-app-staging" >> "$GITHUB_OUTPUT"
  echo "wif_provider=projects/STAGING_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider" >> "$GITHUB_OUTPUT"  # ← Replace STAGING_PROJECT_NUMBER
  echo "wif_service_account=github-ci-staging@your-staging-project-id.iam.gserviceaccount.com" >> "$GITHUB_OUTPUT"  # ← Replace
  echo "github_environment=staging" >> "$GITHUB_OUTPUT"
```

**Production section** (line ~103):

```yaml
else
  echo "gcp_project_id=your-prod-project-id" >> "$GITHUB_OUTPUT"  # ← Replace
  echo "ar_repository=rates" >> "$GITHUB_OUTPUT"
  echo "cloud_run_service_app=rates-app" >> "$GITHUB_OUTPUT"
  echo "cloud_run_service_auth_app=rates-auth-app" >> "$GITHUB_OUTPUT"
  echo "wif_provider=projects/PROD_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider" >> "$GITHUB_OUTPUT"  # ← Replace PROD_PROJECT_NUMBER
  echo "wif_service_account=github-ci-prod@your-prod-project-id.iam.gserviceaccount.com" >> "$GITHUB_OUTPUT"  # ← Replace
  echo "github_environment=production" >> "$GITHUB_OUTPUT"
fi
```

---

## Part 4: Create Initial Cloud Run Services (One-Time Setup)

Cloud Run services must exist before the workflow can deploy to them. Create them once per environment:

### Production

```bash
gcloud run deploy rates-app \
  --region=$REGION \
  --image=gcr.io/cloudrun/hello \
  --platform=managed \
  --allow-unauthenticated \
  --project=$PROJECT_ID

gcloud run deploy rates-auth-app \
  --region=$REGION \
  --image=gcr.io/cloudrun/hello \
  --platform=managed \
  --allow-unauthenticated \
  --project=$PROJECT_ID
```

### Development

```bash
gcloud run deploy rates-app-dev \
  --region=$REGION \
  --image=gcr.io/cloudrun/hello \
  --platform=managed \
  --allow-unauthenticated \
  --project=$DEV_PROJECT_ID

gcloud run deploy rates-auth-app-dev \
  --region=$REGION \
  --image=gcr.io/cloudrun/hello \
  --platform=managed \
  --allow-unauthenticated \
  --project=$DEV_PROJECT_ID
```

### Staging

```bash
gcloud run deploy rates-app-staging \
  --region=$REGION \
  --image=gcr.io/cloudrun/hello \
  --platform=managed \
  --allow-unauthenticated \
  --project=$STAGING_PROJECT_ID

gcloud run deploy rates-auth-app-staging \
  --region=$REGION \
  --image=gcr.io/cloudrun/hello \
  --platform=managed \
  --allow-unauthenticated \
  --project=$STAGING_PROJECT_ID
```

**Note**: These are placeholder deployments. The workflow will replace the images on first real deployment.

---

## Part 5: Verification Checklist

### ✅ GitHub Side

- [ ] Three environments created: `development`, `staging`, `production`
- [ ] Production environment has required reviewers (optional but recommended)
- [ ] Workflow file updated with real project IDs and WIF provider names

### ✅ GCP Side (Per Environment)

**For each of the 3 projects:**

- [ ] APIs enabled (IAM, Artifact Registry, Cloud Run)
- [ ] Artifact Registry repository created
- [ ] Workload Identity Pool created
- [ ] Workload Identity Provider created (repo-restricted)
- [ ] Deployer service account created (`github-ci-{env}`)
- [ ] WIF binding added (branch-restricted)
- [ ] IAM roles granted:
  - [ ] `roles/artifactregistry.writer` on AR repo
  - [ ] `roles/run.developer` on project
  - [ ] `roles/iam.serviceAccountUser` on runtime SA (if applicable)
- [ ] Cloud Run services created (placeholder)

---

## Part 6: Testing

### Test Development Deployment

1. Push a change to `develop` branch:

   ```bash
   git checkout develop
   git commit --allow-empty -m "Test dev deployment"
   git push origin develop
   ```

2. Check GitHub Actions: `https://github.com/owner/rates/actions`
3. Verify deployment to dev Cloud Run services

### Test Staging Deployment

1. Push to `staging` branch:

   ```bash
   git checkout staging
   git commit --allow-empty -m "Test staging deployment"
   git push origin staging
   ```

2. Verify staging deployment

### Test Production Deployment

1. Merge to `main` branch (or push directly if allowed)
2. If production environment has reviewers, approve the deployment
3. Verify production deployment

---

## Troubleshooting

### "Permission denied" errors

- Verify WIF provider attribute condition matches your repo: `assertion.repository=='owner/repo'`
- Check branch restriction in IAM binding matches the branch you're pushing to
- Ensure deployer SA has required IAM roles

### "Service not found" errors

- Ensure Cloud Run services exist (create them as shown in Part 4)
- Verify service names match what's in the workflow file

### "Workload Identity Pool not found"

- Verify you're using the correct project number in the WIF provider resource name
- Check the pool/provider were created in the correct project

### GitHub Environment not found

- Ensure environments are created in GitHub repo settings
- Verify environment names match: `development`, `staging`, `production` (case-sensitive)

---

## Security Notes

✅ **No secrets stored in GitHub** - WIF handles authentication automatically  
✅ **Branch-restricted access** - Each environment only accessible from its branch  
✅ **Least privilege IAM** - Deployer SAs only have deploy permissions  
✅ **Environment isolation** - Separate GCP projects per environment  
✅ **Audit trail** - GitHub Environments log all deployments

---

## Next Steps

After setup is complete:

1. Configure Cloud Run service settings (CPU, memory, concurrency, etc.)
2. Set up custom domains (if needed)
3. Configure environment variables/secrets in Cloud Run
4. Set up monitoring/alerting
5. Document your deployment process for your team
