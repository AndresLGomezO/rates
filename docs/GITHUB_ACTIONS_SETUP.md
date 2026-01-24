# GitHub Actions Setup Guide

Complete guide for setting up automated deployment pipeline using GitHub Actions with Workload Identity Federation (keyless authentication) and dynamic configuration from Secret Manager.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Overview

This deployment pipeline provides:

✅ **No Hardcoded Secrets**: All project IDs and configuration retrieved from Secret Manager at runtime  
✅ **Keyless Authentication**: Uses Workload Identity Federation (no service account keys)  
✅ **Dynamic Configuration**: Deployment settings stored in Secret Manager, retrieved by workflow  
✅ **FREE TIER Optimized**: Defaults to free tier configurations  
✅ **Multi-Environment Support**: Separate configurations per environment  
✅ **Automatic Workflow Generation**: Creates deployment workflow file from template

## Architecture

```
┌─────────────────┐
│  Terraform      │
│  Configuration  │
└────────┬────────┘
         │
         │ Creates
         ▼
┌─────────────────────────────────────┐
│  Secret Manager                     │
│  - Deployment Configuration (JSON)  │
│  - Project IDs, Regions, Settings   │
└────────┬───────────────────────────┘
         │
         │ Grants access
         ▼
┌─────────────────────────────────────┐
│  GitHub Repository                  │
│  - Secrets: WIF Provider, SA Email │
│  - Variables: Secret Name, Env      │
│  - Environment: ${environment}      │
│  - Workflow: deploy-${env}.yml      │
└────────┬───────────────────────────┘
         │
         │ Workflow runs
         ▼
┌─────────────────────────────────────┐
│  GitHub Actions Workflow           │
│  1. Authenticate via WIF            │
│  2. Retrieve config from Secret     │
│  3. Build & push container          │
│  4. Deploy to Cloud Run             │
└─────────────────────────────────────┘
```

## Prerequisites

### Required Tools

- **Terraform** >= 1.6.0
- **GitHub CLI** (gh) >= 2.40.0
- **jq** >= 1.6
- **Git**
- **gcloud CLI** (for GCP authentication)

### Required Access

- **GitHub**: Repository admin access
- **GCP**: Project Owner or Editor role
- **GitHub Token**: Personal Access Token or GitHub App with:
  - `repo` scope
  - `admin:repo_hook` scope
  - `admin:org` scope (if org repository)

## Quick Start

### 1. Configure Terraform

Ensure your `terraform.tfvars` has GitHub repository information:

```hcl
github_repo = "your-owner/your-repo"
github_environments = ["dev", "staging", "prod"]
configure_github_actions = true
```

### 2. Authenticate to GitHub

```bash
# Authenticate GitHub CLI
gh auth login

# Verify authentication
gh auth status
```

### 3. Run Setup Script

```bash
cd iaac
./scripts/deploy-setup.sh
```

The script will:

- Check required tools
- Verify GitHub authentication
- Apply Terraform configuration
- Commit and push workflow file
- Show next steps

### 4. Verify Configuration

```bash
# Check GitHub secrets
gh secret list --repo your-owner/your-repo

# Check GitHub variables
gh variable list --repo your-owner/your-repo

# Check Secret Manager
gcloud secrets versions access latest \
  --secret="github-deployment-config-dev" \
  --project="your-project-id"
```

## Detailed Setup

### Step 1: Terraform Configuration

The GitHub Actions module is integrated into `main.tf`:

```hcl
module "github_actions" {
  source = "./modules/github-actions"

  project_id     = module.project.project_id
  project_number = module.project.project_number
  github_owner   = local.github_owner_auto
  github_repo_name = local.github_repo_name_auto
  # ... other variables
}
```

### Step 2: Apply Terraform

```bash
cd iaac

# Initialize (if needed)
terraform init

# Plan
terraform plan

# Apply
terraform apply
```

### Step 3: Verify Resources Created

After applying, verify:

1. **Secret Manager Secret**:

   ```bash
   gcloud secrets describe github-deployment-config-dev \
     --project="your-project-id"
   ```

2. **GitHub Secrets**:

   ```bash
   gh secret list --repo your-owner/your-repo
   # Should show: WIF_PROVIDER, WIF_SERVICE_ACCOUNT
   ```

3. **GitHub Variables**:

   ```bash
   gh variable list --repo your-owner/your-repo
   # Should show: DEPLOYMENT_CONFIG_SECRET, ENVIRONMENT
   ```

4. **GitHub Environment**:

   ```bash
   gh api repos/your-owner/your-repo/environments/dev
   ```

5. **Workflow File**:
   ```bash
   cat .github/workflows/deploy-dev.yml
   ```

## How It Works

### 1. Configuration Storage

Deployment configuration is stored in Secret Manager as JSON:

```json
{
  "project_id": "your-project-id",
  "project_number": "123456789012",
  "region": "us-central1",
  "service_name": "your-app-dev",
  "artifact_registry_url": "us-central1-docker.pkg.dev/...",
  "environment": "dev",
  "cloudrun_config": {
    "min_instances": 0,
    "max_instances": 2,
    "memory": "512Mi",
    "cpu": "1",
    "timeout_seconds": 300
  }
}
```

### 2. Workflow Execution

When a workflow runs:

1. **Authenticate**: Uses Workload Identity Federation (keyless)

   ```yaml
   - uses: google-github-actions/auth@v2.1.7
     with:
       workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
       service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
   ```

2. **Retrieve Config**: Gets configuration from Secret Manager

   ```bash
   gcloud secrets versions access latest \
     --secret="${{ vars.DEPLOYMENT_CONFIG_SECRET }}"
   ```

3. **Build & Push**: Builds container and pushes to Artifact Registry

4. **Deploy**: Deploys to Cloud Run with dynamic configuration

### 3. No Hardcoded Values

- ❌ **No project IDs in workflow files**
- ❌ **No regions in workflow files**
- ❌ **No service names in workflow files**
- ✅ **All configuration retrieved at runtime**

## Configuration

### Terraform Variables

| Variable                   | Description                    | Default                      |
| -------------------------- | ------------------------------ | ---------------------------- |
| `github_repo`              | GitHub repository (owner/repo) | Required                     |
| `github_environments`      | List of environment names      | `["dev", "staging", "prod"]` |
| `configure_github_actions` | Enable automation              | `true`                       |
| `workflow_branch`          | Branch to trigger workflow     | `"main"`                     |

### Secret Manager Configuration

The deployment configuration secret contains:

- `project_id`: GCP Project ID
- `project_number`: GCP Project Number
- `region`: Cloud Run region
- `service_name`: Cloud Run service name
- `artifact_registry_url`: Container registry URL
- `environment`: Environment name
- `cloudrun_config`: Cloud Run settings (instances, memory, CPU, timeout)

### GitHub Secrets

Only WIF-related secrets are stored in GitHub:

- `WIF_PROVIDER`: Workload Identity Federation provider name
- `WIF_SERVICE_ACCOUNT`: CI/CD service account email

### GitHub Variables

Non-sensitive configuration:

- `DEPLOYMENT_CONFIG_SECRET`: Secret Manager secret name
- `ENVIRONMENT`: Environment name

## Troubleshooting

### Workflow Fails to Authenticate

**Error**: `Error: failed to exchange token`

**Solution**:

1. Verify WIF provider is configured:

   ```bash
   gcloud iam workload-identity-pools providers describe github-provider \
     --workload-identity-pool=github-pool-dev \
     --location=global \
     --project="your-project-id"
   ```

2. Check GitHub secrets are set:

   ```bash
   gh secret list --repo your-owner/your-repo
   ```

3. Verify service account has WIF binding:
   ```bash
   gcloud iam service-accounts get-iam-policy \
     cicd-deployer@your-project-id.iam.gserviceaccount.com \
     --project="your-project-id"
   ```

### Cannot Access Secret Manager

**Error**: `Permission denied on secret`

**Solution**:

1. Verify IAM binding:

   ```bash
   gcloud secrets get-iam-policy github-deployment-config-dev \
     --project="your-project-id"
   ```

2. Check service account has `roles/secretmanager.secretAccessor`:
   ```bash
   gcloud projects get-iam-policy your-project-id \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:cicd-deployer@your-project-id.iam.gserviceaccount.com"
   ```

### Configuration Retrieval Fails

**Error**: `Invalid JSON in deployment configuration`

**Solution**:

1. Verify secret exists:

   ```bash
   gcloud secrets describe github-deployment-config-dev \
     --project="your-project-id"
   ```

2. Check JSON format:

   ```bash
   gcloud secrets versions access latest \
     --secret="github-deployment-config-dev" \
     --project="your-project-id" | jq .
   ```

3. Validate required fields:
   ```bash
   gcloud secrets versions access latest \
     --secret="github-deployment-config-dev" \
     --project="your-project-id" | jq -r '.project_id, .region, .service_name'
   ```

### Deployment Fails

**Error**: `Cloud Run deployment failed`

**Solution**:

1. Check Cloud Run permissions:

   ```bash
   gcloud projects get-iam-policy your-project-id \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:cicd-deployer@your-project-id.iam.gserviceaccount.com"
   ```

2. Verify service account has `roles/run.developer`:

   ```bash
   gcloud projects get-iam-policy your-project-id \
     --flatten="bindings[].members" \
     --format="table(bindings.role)" \
     --filter="bindings.members:serviceAccount:cicd-deployer@your-project-id.iam.gserviceaccount.com"
   ```

3. Check Artifact Registry access:
   ```bash
   gcloud artifacts repositories get-iam-policy your-repo \
     --location=us-central1 \
     --project="your-project-id"
   ```

## Security Considerations

### Workload Identity Federation

- ✅ **No service account keys**: Uses OIDC token exchange
- ✅ **Repository-scoped**: Only your repository can authenticate
- ✅ **Environment-scoped**: Can restrict to specific environments

### Secret Manager

- ✅ **Encrypted at rest**: All secrets encrypted
- ✅ **IAM-controlled**: Only CI/CD SA can access
- ✅ **Versioned**: Immutable versions for audit

### GitHub Secrets

- ✅ **Minimal secrets**: Only WIF authentication stored
- ✅ **Encrypted**: GitHub encrypts all secrets
- ✅ **Audit trail**: Access logged in GitHub audit log

### Best Practices

1. **Never commit secrets**: All secrets in Secret Manager or GitHub secrets
2. **Use least privilege**: CI/CD SA has minimal required permissions
3. **Rotate regularly**: Update WIF provider if compromised
4. **Monitor access**: Review GitHub Actions logs regularly
5. **Environment isolation**: Separate configs per environment

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Deployment](https://cloud.google.com/run/docs/deploying)
- [Terraform GitHub Provider](https://registry.terraform.io/providers/integrations/github/latest/docs)

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review Terraform outputs: `terraform output github_integration`
3. Check GitHub Actions logs: `gh run view --log`
4. Review GCP logs: Cloud Logging console
