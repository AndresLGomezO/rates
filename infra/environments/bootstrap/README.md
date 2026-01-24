# Bootstrap Layer

## Purpose

Creates foundational infrastructure for Terraform state management. This is a **one-time setup** that enables all subsequent Terraform operations.

## Resources Created

| Resource   | Name                          | Purpose                 |
| ---------- | ----------------------------- | ----------------------- |
| GCS Bucket | `rates-terraform-state`       | Terraform state storage |
| API        | `storage.googleapis.com`      | Cloud Storage API       |
| API        | `serviceusage.googleapis.com` | Service Usage API       |

## Prerequisites

Before running this layer, ensure:

1. ✅ GCP project `rates-production` exists
2. ✅ Billing account is linked to project
3. ✅ `gcloud` CLI is authenticated: `gcloud auth application-default login`
4. ✅ User has `roles/owner` or `roles/editor` on project
5. ✅ Terraform >= 1.5.0 is installed

## Usage

### Initial Bootstrap (First Time)

```bash
# Navigate to bootstrap directory
cd infra/environments/bootstrap

# Initialize Terraform (local backend)
terraform init

# Review planned changes
terraform plan

# Apply bootstrap configuration
terraform apply

# Verify outputs
terraform output
```
