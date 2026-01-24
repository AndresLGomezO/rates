# Terraform IaC Quick Start Guide

This guide will help you set up the infrastructure for the Rates project in under 10 minutes.

## Prerequisites Checklist

- [ ] GCP account with billing enabled
- [ ] `gcloud` CLI installed (`brew install google-cloud-sdk` on macOS)
- [ ] Terraform >= 1.9.0 installed (`brew install terraform` on macOS)
- [ ] Authenticated with GCP (`gcloud auth login`)
- [ ] Three GCP projects created (or billing account ID ready)

## Step-by-Step Setup

### Step 1: Configure Environment (2 minutes)

```bash
cd iaac
cp .iaac.env.example .iaac.env
```

Edit `.iaac.env` and fill in at minimum:

- `GCP_USER_EMAIL`: Your GCP email
- `GITHUB_OWNER`: Your GitHub username
- `GITHUB_REPO`: `rates` (or your repo name)
- `GCP_PROJECT_ID_DEV`: Your dev project ID
- `GCP_PROJECT_ID_STAGING`: Your staging project ID
- `GCP_PROJECT_ID_PROD`: Your prod project ID

Free-tier-first defaults you can keep as-is:

- `CLOUD_RUN_MEMORY=256Mi`
- `CLOUD_RUN_MAX_INSTANCES=3`
- `CLOUD_RUN_MIN_INSTANCES=0`
- `GRANT_SERVICE_ACCOUNT_USER=false`

**Optional**: If you want Terraform to create projects:

- `CREATE_PROJECTS=true`
- `GCP_BILLING_ACCOUNT_ID`: Your billing account ID

### Step 2: Initialize Terraform (1 minute)

```bash
./scripts/init.sh
# or: make init
```

This will:

- Load your `.iaac.env` file
- Generate `terraform.tfvars`
- Initialize Terraform

### Step 3: Review Plan (1 minute)

```bash
terraform plan
# or: make plan
```

Review what will be created. You should see:

- APIs being enabled
- Artifact Registry repositories
- Workload Identity Pool & Provider
- Service accounts
- Cloud Run services

### Step 4: Apply Infrastructure (3-5 minutes)

```bash
./scripts/apply.sh
# or: make apply
```

This will:

- Show you the plan
- Ask for confirmation
- Create all infrastructure
- Show outputs with WIF provider names

**Save the outputs!** You'll need them for the next step.

### Step 5: Update GitHub Workflow (2 minutes)

Option A: Use the helper script (recommended)

```bash
./scripts/generate-workflow-config.sh
cat workflow-config.txt
# Copy the content to .github/workflows/deploy.yml
```

Option B: Manual update

1. Get outputs: `terraform output`
2. Copy WIF provider names and service account emails
3. Update `.github/workflows/deploy.yml`:
   - Replace `DEV_PROJECT_NUMBER` with actual project number
   - Replace `your-dev-project-id` with actual project ID
   - Replace WIF provider names
   - Replace service account emails
   - Repeat for staging and production

### Step 6: Create GitHub Environments (2 minutes)

1. Go to your GitHub repository
2. Navigate to **Settings** → **Environments**
3. Create three environments:
   - `development` (no protection needed)
   - `staging` (optional reviewers)
   - `production` (required reviewers recommended)

### Step 7: Test Deployment (Optional)

Push to `develop` branch to test dev deployment:

```bash
git checkout develop
git commit --allow-empty -m "Test dev deployment"
git push origin develop
```

Check GitHub Actions to verify deployment works.

## Verification Checklist

After setup, verify:

- [ ] All three GCP projects have:
  - [ ] APIs enabled
  - [ ] Artifact Registry repositories created
  - [ ] Workload Identity Pool & Provider created
  - [ ] Service accounts created with correct roles
  - [ ] Cloud Run services created (placeholder)

- [ ] GitHub:
  - [ ] Three environments created
  - [ ] Workflow file updated with correct values

- [ ] Test deployment:
  - [ ] Push to `develop` → deploys to dev
  - [ ] Push to `staging` → deploys to staging
  - [ ] Push to `main` → deploys to production

## Troubleshooting

### "Permission denied"

- Run `gcloud auth login`
- Verify you have Owner/Editor role on projects

### "Project not found"

- Verify project IDs in `.iaac.env` are correct
- Or set `CREATE_PROJECTS=true` and provide billing account

### "API not enabled"

- Terraform enables APIs automatically
- Wait a few minutes and run `terraform apply` again

### Workflow fails with "Workload Identity Pool not found"

- Verify WIF provider names in workflow match Terraform outputs
- Check project numbers are correct

## Next Steps

- Configure Cloud Run settings (CPU, memory, scaling)
- Set up custom domains (if needed)
- Configure environment variables/secrets in Cloud Run
- Set up monitoring and alerting

## Getting Help

- See [README.md](./README.md) for detailed documentation
- See [../docs/IAC.md](../docs/IAC.md) for architecture details
- Check [GitHub GCP Setup Guide](../docs/GITHUB_GCP_SETUP_GUIDE.md)

## Common Commands

```bash
# Initialize
make init

# Plan changes
make plan

# Apply changes
make apply

# View outputs
make output

# Destroy infrastructure (careful!)
make destroy

# Format Terraform files
make fmt

# Validate configuration
make validate
```
