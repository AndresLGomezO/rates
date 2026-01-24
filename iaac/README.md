# Infrastructure as Code (Terraform)

This directory contains Terraform code to provision and manage all GCP infrastructure required for the Rates application deployment pipeline.

## Overview

This IaC setup automates the creation of:

- GCP projects (optional, if `CREATE_PROJECTS=true`)
- Required GCP APIs
- Artifact Registry repositories
- Workload Identity Pool and Provider (for GitHub Actions authentication)
- Service accounts with appropriate IAM roles
- Cloud Run services (placeholder deployments)

All infrastructure is provisioned for three environments: **development**, **staging**, and **production**.

## Free-tier-first defaults

This IaC is intentionally tuned to minimize cost by default:

- **Cloud Run**: `256Mi` memory, `min_instances=0`, `max_instances=3`, CPU throttling on
- **Least privilege**: `roles/iam.serviceAccountUser` is **opt-in** via `GRANT_SERVICE_ACCOUNT_USER=false`
- **APIs**: excludes Cloud Build API by default (deploy is done from GitHub Actions)

## Quick Start

### Prerequisites

1. **GCP Account**: You need a GCP account with appropriate permissions
2. **gcloud CLI**: Install and authenticate with `gcloud auth login`
3. **Terraform**: Install Terraform >= 1.9.0 ([Installation guide](https://developer.hashicorp.com/terraform/downloads))
4. **GCP Projects**: Create three GCP projects (or set `CREATE_PROJECTS=true` to create them via Terraform)

### Setup Steps

1. **Copy the environment template**:

   ```bash
   cd iaac
   cp .iaac.env.example .iaac.env
   ```

2. **Edit `.iaac.env`** (this is the ONLY file you need to modify):

   ```bash
   # Fill in your values:
   GCP_USER_EMAIL=your-email@example.com
   GITHUB_OWNER=your-github-username
   GITHUB_REPO=rates
   GCP_PROJECT_ID_DEV=your-dev-project-id
   GCP_PROJECT_ID_STAGING=your-staging-project-id
   GCP_PROJECT_ID_PROD=your-prod-project-id
   # ... etc
   ```

3. **Initialize Terraform**:

   ```bash
   ./scripts/init.sh
   ```

4. **Review the plan**:

   ```bash
   terraform plan
   ```

5. **Apply the infrastructure**:

   ```bash
   ./scripts/apply.sh
   ```

6. **Update GitHub workflow**:
   After applying, Terraform will output the WIF provider names. Update `.github/workflows/deploy.yml` with these values (see outputs section below).

## Configuration File: `.iaac.env`

The `.iaac.env` file is the **single source of truth** for all infrastructure configuration. This file is git-ignored and should never be committed.

### Required Variables

- `GCP_USER_EMAIL`: Your GCP account email (for initial authentication)
- `GITHUB_OWNER`: GitHub username/organization
- `GITHUB_REPO`: Repository name
- `GCP_PROJECT_ID_DEV`: Development GCP project ID
- `GCP_PROJECT_ID_STAGING`: Staging GCP project ID
- `GCP_PROJECT_ID_PROD`: Production GCP project ID

### Optional Variables

Most variables have sensible defaults. See `.iaac.env.example` for all available options.

## Project Structure

```
iaac/
├── .iaac.env.example          # Template configuration file
├── .iaac.env                  # Your configuration (git-ignored)
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Variable definitions
├── outputs.tf                # Output values
├── locals.tf                  # Local values
├── versions.tf                # Terraform version constraints
├── terraform.tfvars           # Auto-generated from .iaac.env
├── modules/
│   ├── project/               # Module for creating GCP projects
│   └── environment/           # Module for environment resources
└── scripts/
    ├── load-env.sh            # Load .iaac.env and generate tfvars
    ├── init.sh                # Initialize Terraform
    ├── apply.sh                # Apply infrastructure changes
    └── destroy.sh              # Destroy infrastructure
```

## Terraform Outputs

After running `terraform apply`, you'll get outputs like:

```
dev_wif_provider = "projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
dev_service_account_email = "github-ci-dev@your-dev-project.iam.gserviceaccount.com"
staging_wif_provider = "..."
prod_wif_provider = "..."
```

Use these values to update `.github/workflows/deploy.yml`:

```yaml
# In the env-select job, replace placeholders:
echo "wif_provider=projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider" >> "$GITHUB_OUTPUT"
echo "wif_service_account=github-ci-dev@your-dev-project.iam.gserviceaccount.com" >> "$GITHUB_OUTPUT"
```

## Workflow Integration

### Manual Updates

After applying Terraform, manually update `.github/workflows/deploy.yml` with the WIF provider names from Terraform outputs.

### Automated Updates (Future)

You could automate this by:

1. Storing outputs in a GitHub secret/variable
2. Using Terraform Cloud/Enterprise with remote state
3. Creating a GitHub Action that reads Terraform outputs and updates the workflow file

## Common Operations

### Plan Changes

```bash
cd iaac
./scripts/load-env.sh
terraform plan
```

### Apply Changes

```bash
cd iaac
./scripts/apply.sh
```

### Destroy Infrastructure

```bash
cd iaac
./scripts/destroy.sh
```

### View Outputs

```bash
cd iaac
terraform output
```

### Update Configuration

1. Edit `.iaac.env`
2. Run `./scripts/load-env.sh` to regenerate `terraform.tfvars`
3. Run `terraform plan` to see changes
4. Run `terraform apply` to apply changes

## Environment-Specific Resources

Each environment (dev/staging/prod) gets:

- **Artifact Registry Repository**: For Docker images
- **Workload Identity Pool & Provider**: For GitHub Actions authentication
- **Service Account**: With roles:
  - `roles/artifactregistry.writer`
  - `roles/run.developer`
  - `roles/iam.serviceAccountUser`
- **Cloud Run Services**: Two services per environment (app + auth-app)
- **IAM Bindings**: Branch-restricted access (dev → develop, staging → staging, prod → main)

## Security Best Practices

✅ **No secrets in code**: All sensitive values come from `.iaac.env` (git-ignored)  
✅ **Branch restrictions**: Each environment only accessible from its designated branch  
✅ **Least privilege**: Service accounts have minimal required permissions  
✅ **Workload Identity Federation**: No long-lived service account keys  
✅ **Environment isolation**: Separate GCP projects per environment

## Troubleshooting

### "Permission denied" errors

- Ensure you're authenticated: `gcloud auth login`
- Check you have the required permissions on the GCP projects
- Verify project IDs in `.iaac.env` are correct

### "API not enabled" errors

- Run `terraform apply` again (APIs are enabled automatically)
- Or manually enable: `gcloud services enable <api-name> --project=<project-id>`

### "Project not found" errors

- Verify project IDs exist in GCP Console
- Or set `CREATE_PROJECTS=true` and provide `GCP_BILLING_ACCOUNT_ID`

### Terraform state issues

- State is stored locally by default (`.terraform/` directory)
- For team collaboration, configure remote state (see `versions.tf` comments)

## Service-to-Service Integration

The Terraform configuration automatically sets up environment variables to link your app and auth-app services:

### App Service (`rates-app-*`)

- **`VITE_AUTH_APP_URL`**: Automatically set to the auth-app Cloud Run service URL
- Used by your app to redirect users to the auth-app for authentication

### Auth-App Service (`rates-auth-app-*`)

- **`VITE_ALLOWED_REDIRECTS`**: Automatically set to the app Cloud Run service URL
- Security whitelist that allows redirects back to your app after authentication

### Two-Pass Deployment

Due to circular dependencies, environment variables are set in two passes:

1. **First `terraform apply`**: Creates both services with empty environment variables
2. **Second `terraform apply`**: Updates both services with the correct URLs

**Note**: After the first apply, run `terraform apply` again to populate the service URLs. Terraform will detect the changes and update the environment variables automatically.

### Verifying Environment Variables

After deployment, verify the environment variables are set correctly:

```bash
# Check app service
gcloud run services describe rates-app-dev --region us-central1 --format="value(spec.template.spec.containers[0].env)"

# Check auth-app service
gcloud run services describe rates-auth-app-dev --region us-central1 --format="value(spec.template.spec.containers[0].env)"
```

## CI/CD Integration

The infrastructure created by this Terraform code integrates seamlessly with the GitHub Actions workflow in `.github/workflows/deploy.yml`.

**After applying Terraform:**

1. Run `terraform apply` **twice** (first creates services, second sets environment variables)
2. Run `./scripts/generate-workflow-config.sh` to update the workflow file automatically
3. Create GitHub environments: `development`, `staging`, `production`
4. Push to `develop`/`staging`/`main` branches to trigger deployments

## Additional Resources

- [Terraform GCP Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Workload Identity Federation Guide](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub Actions GCP Setup Guide](../docs/GITHUB_GCP_SETUP_GUIDE.md)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the [GitHub GCP Setup Guide](../docs/GITHUB_GCP_SETUP_GUIDE.md)
3. Check Terraform documentation for GCP provider
