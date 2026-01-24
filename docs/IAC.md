# Infrastructure as Code (IaC) Documentation

This document describes the Terraform-based Infrastructure as Code setup for the Rates project.

## Overview

The IaC setup automates the provisioning of all GCP infrastructure required for the CI/CD pipeline. It uses **Terraform** with a single configuration file (`.iaac.env`) as the user input.

## Architecture

The infrastructure is organized into three environments:

- **Development** (`develop` branch → `dev` project)
- **Staging** (`staging` branch → `staging` project)
- **Production** (`main` branch → `prod` project)

Each environment gets:

- GCP Project (optional, can be created or use existing)
- Required APIs enabled
- Artifact Registry repository
- Workload Identity Pool & Provider (for GitHub Actions)
- Deployer service account with IAM roles
- Cloud Run services (placeholder)

## Quick Start

### 1. Prerequisites

- GCP account with appropriate permissions
- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Terraform >= 1.9.0 installed
- Three GCP projects created (or set `CREATE_PROJECTS=true`)

### 2. Configuration

Copy the template and fill in your values:

```bash
cd iaac
cp .iaac.env.example .iaac.env
# Edit .iaac.env with your values
```

**Minimum required variables:**

- `GCP_USER_EMAIL`: Your GCP account email
- `GITHUB_OWNER`: GitHub username/organization
- `GITHUB_REPO`: Repository name (usually `rates`)
- `GCP_PROJECT_ID_DEV`: Development project ID
- `GCP_PROJECT_ID_STAGING`: Staging project ID
- `GCP_PROJECT_ID_PROD`: Production project ID

### 3. Initialize and Apply

```bash
# Initialize Terraform
make init
# or: ./scripts/init.sh

# Review plan
make plan
# or: terraform plan

# Apply infrastructure
make apply
# or: ./scripts/apply.sh
```

### 4. Update GitHub Workflow

After applying, copy the WIF provider names from outputs:

```bash
terraform output
```

Update `.github/workflows/deploy.yml` with these values (see the workflow file for placeholder locations).

### 5. Create GitHub Environments

In GitHub repository settings:

1. Go to **Settings** → **Environments**
2. Create three environments: `development`, `staging`, `production`
3. Optionally add required reviewers for production

## Configuration File: `.iaac.env`

This is the **only file** you need to modify. It contains all configuration values.

### Structure

The file uses environment variable syntax:

```bash
VARIABLE_NAME=value
```

### Variable Categories

1. **Authentication**: GCP user email
2. **GitHub**: Owner and repository name
3. **GCP Projects**: Project IDs for each environment
4. **Resource Names**: Service accounts, repositories, Cloud Run services
5. **Configuration**: Region, CPU, memory, instance counts

See `.iaac.env.example` for all available variables and defaults.

## Terraform Modules

### `modules/project`

Creates GCP projects (optional). Only used if `CREATE_PROJECTS=true`.

### `modules/environment`

Creates all resources for a single environment:

- Enables APIs
- Creates Artifact Registry repository
- Creates Workload Identity Pool & Provider
- Creates deployer service account
- Grants IAM roles
- Creates Cloud Run services

## Workflow Integration

The infrastructure created by Terraform integrates with `.github/workflows/deploy.yml`:

1. **Workload Identity Federation**: GitHub Actions authenticates using WIF (no secrets needed)
2. **Branch Restrictions**: Each environment only accessible from its branch
3. **Service Accounts**: Deployer SAs have minimal required permissions
4. **Artifact Registry**: Docker images are pushed to environment-specific repositories
5. **Cloud Run**: Services are deployed to environment-specific projects

### Manual Integration Steps

After running `terraform apply`:

1. Get outputs:

   ```bash
   terraform output dev_wif_provider
   terraform output dev_service_account_email
   # Repeat for staging and prod
   ```

2. Update `.github/workflows/deploy.yml`:
   - Replace `DEV_PROJECT_NUMBER` with actual project number
   - Replace `your-dev-project-id` with actual project ID
   - Replace service account emails
   - Repeat for staging and production

3. Create GitHub environments (if not already created)

## Best Practices

### Security

✅ **Single source of truth**: `.iaac.env` is git-ignored  
✅ **No secrets in code**: All sensitive values come from `.iaac.env`  
✅ **Branch restrictions**: Each environment only accessible from its branch  
✅ **Least privilege**: Service accounts have minimal required permissions  
✅ **Workload Identity**: No long-lived service account keys

### State Management

- **Local state**: Default (stored in `.terraform/`)
- **Remote state**: Configure in `versions.tf` for team collaboration
- **State locking**: Use Terraform Cloud or GCS backend with versioning

### Version Control

- ✅ Commit: Terraform code, `.iaac.env.example`, scripts
- ❌ Never commit: `.iaac.env`, `terraform.tfvars`, `*.tfstate`, `.terraform/`

## Common Operations

### Update Infrastructure

1. Edit `.iaac.env`
2. Run `./scripts/load-env.sh` (or `make plan`)
3. Review changes: `terraform plan`
4. Apply: `terraform apply`

### Add New Environment

1. Add variables to `.iaac.env.example` and `.iaac.env`
2. Add module call in `main.tf`
3. Add outputs in `outputs.tf`
4. Run `terraform apply`

### Destroy Infrastructure

```bash
make destroy
# or: ./scripts/destroy.sh
```

⚠️ **Warning**: This will destroy all infrastructure. Use with caution!

## Troubleshooting

### "Permission denied" errors

- Ensure authenticated: `gcloud auth login`
- Check project permissions
- Verify project IDs are correct

### "API not enabled" errors

- APIs are enabled automatically by Terraform
- If error persists, manually enable: `gcloud services enable <api> --project=<project-id>`

### "Project not found" errors

- Verify projects exist in GCP Console
- Or set `CREATE_PROJECTS=true` and provide `GCP_BILLING_ACCOUNT_ID`

### Terraform state issues

- State is local by default (`.terraform/` directory)
- For teams, configure remote state (see `versions.tf`)
- Never commit state files

## CI/CD Integration

### Current Approach (Manual)

1. Run Terraform locally or in CI
2. Extract outputs
3. Update GitHub workflow file
4. Commit changes

### Future Automation Options

1. **Terraform Cloud**: Store state remotely, use API to get outputs
2. **GitHub Actions**: Run Terraform in CI, update workflow file automatically
3. **Terraform Enterprise**: Full enterprise features with policy as code

## Additional Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [GCP Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GitHub GCP Setup Guide](./GITHUB_GCP_SETUP_GUIDE.md)

## Support

For issues:

1. Check [Terraform README](../iaac/README.md)
2. Review troubleshooting section above
3. Check Terraform and GCP provider documentation
