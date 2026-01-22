# Infrastructure as Code (IaC)

Terraform configuration for Google Cloud Platform (GCP) infrastructure including Firebase, Cloud Run, Artifact Registry, and GitHub Actions automation.

## Overview

This directory contains Terraform modules for provisioning:

- ✅ **GCP Project** - Project creation and API enablement
- ✅ **Firebase** - Firebase project, Firestore, Auth, App Check
- ✅ **Cloud Run** - Serverless container hosting (FREE TIER optimized)
- ✅ **Artifact Registry** - Container image repository
- ✅ **Secret Manager** - Secure configuration storage
- ✅ **Workload Identity Federation** - Keyless authentication for GitHub Actions
- ✅ **GitHub Actions** - Automated deployment pipeline

## Quick Start

### Prerequisites

- Terraform >= 1.6.0
- gcloud CLI
- GitHub CLI (gh)
- GCP Project with billing enabled

### Initial Setup

1. **Configure Terraform**:

   ```bash
   cd iaac
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your values
   ```

2. **Authenticate**:

   ```bash
   # GCP
   gcloud auth application-default login

   # GitHub
   gh auth login
   ```

3. **Initialize Terraform**:

   ```bash
   terraform init
   ```

4. **Apply Configuration**:

   ```bash
   # Review plan
   terraform plan

   # Apply
   terraform apply
   ```

### Automated Setup

Use the setup script for interactive configuration:

```bash
./scripts/setup.sh
```

Use the deployment setup script for GitHub Actions automation:

```bash
./scripts/deploy-setup.sh
```

## Module Structure

```
iaac/
├── main.tf                 # Root module orchestration
├── variables.tf            # Input variables
├── outputs.tf             # Output values
├── locals.tf               # Local values and computed configs
├── versions.tf             # Provider versions
├── backend.tf              # State backend configuration
├── checks.tf               # Cross-variable validation
├── terraform.tfvars        # Your configuration (gitignored)
├── terraform.tfvars.example # Example configuration
├── modules/
│   ├── project/           # GCP project creation
│   ├── iam/               # Service accounts and IAM
│   ├── workload-identity/ # WIF for GitHub Actions
│   ├── firebase/          # Firebase configuration
│   ├── secrets/            # Secret Manager
│   ├── artifact-registry/ # Container registry
│   ├── cloud-run/          # Cloud Run service
│   └── github-actions/    # GitHub Actions automation
└── scripts/
    ├── setup.sh           # Interactive setup
    └── deploy-setup.sh    # Deployment pipeline setup
```

## GitHub Actions Integration

The infrastructure includes automated GitHub Actions setup:

- **Workload Identity Federation**: Keyless authentication (no service account keys)
- **Secret Manager**: Dynamic configuration (no hardcoded project IDs)
- **Workflow Generation**: Automatic workflow file creation
- **Multi-Environment**: Support for dev/staging/prod

See [GitHub Actions Setup Guide](../../docs/GITHUB_ACTIONS_SETUP.md) for detailed documentation.

## Configuration

### Required Variables

- `project_id` - GCP Project ID (or null to create new)
- `billing_account_id` - GCP Billing Account ID
- `admin_email` - Administrator email
- `github_repo` - GitHub repository (format: "owner/repo")

### FREE TIER Defaults

All resources default to FREE TIER configurations:

- **Cloud Run**: Scale to zero (min_instances = 0)
- **Firestore**: No PITR, no backups
- **Auth**: No SMS MFA
- **Artifact Registry**: Minimal storage

See `terraform.tfvars.example` for all configuration options.

## Outputs

After applying, view outputs:

```bash
terraform output

# Specific outputs
terraform output github_integration
terraform output cloud_run_config
terraform output cost_summary
```

## Documentation

- [GitHub Actions Setup](../../docs/GITHUB_ACTIONS_SETUP.md) - Complete setup guide
- [Dynamic Configuration](../../docs/DYNAMIC_CONFIG.md) - Configuration management
- [Module Documentation](./modules/github-actions/README.md) - GitHub Actions module

## Security

- ✅ **No hardcoded secrets** - All secrets in Secret Manager
- ✅ **Keyless authentication** - Workload Identity Federation
- ✅ **Least privilege** - Minimal IAM permissions
- ✅ **Environment isolation** - Separate configs per environment

## FREE TIER Compliance

The infrastructure is optimized for GCP FREE TIER:

- Cloud Run: Scale to zero
- Firestore: No paid features
- Secret Manager: Within free limits
- Artifact Registry: Minimal storage

See `terraform output cost_summary` for cost analysis.

## Troubleshooting

### Common Issues

1. **Provider authentication**:

   ```bash
   gcloud auth application-default login
   ```

2. **GitHub authentication**:

   ```bash
   gh auth login
   export GITHUB_TOKEN=$(gh auth token)
   ```

3. **Terraform state**:
   ```bash
   terraform init
   terraform validate
   ```

### Getting Help

1. Check [GitHub Actions Setup Guide](../../docs/GITHUB_ACTIONS_SETUP.md)
2. Review Terraform outputs: `terraform output`
3. Check GCP logs: Cloud Logging console
4. Review GitHub Actions logs: `gh run view --log`

## Additional Resources

- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCP FREE TIER](https://cloud.google.com/free/docs/free-cloud-features)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
