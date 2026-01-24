# GitHub Actions Module

This module automates GitHub Actions configuration for deploying to Google Cloud Run using Workload Identity Federation (keyless authentication) and dynamic configuration from Secret Manager.

## Features

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
│  (This Module)  │
└────────┬────────┘
         │
         │ Creates
         ▼
┌─────────────────────────────────────┐
│  Secret Manager                    │
│  - Deployment Configuration (JSON) │
│  - Project IDs, Regions, Settings  │
└────────┬───────────────────────────┘
         │
         │ Grants access
         ▼
┌─────────────────────────────────────┐
│  GitHub Repository                  │
│  - Secrets: WIF Provider, SA Email   │
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

## Usage

```hcl
module "github_actions" {
  source = "./modules/github-actions"

  # Required inputs
  project_id                      = module.project.project_id
  project_number                  = module.project.project_number
  github_owner                    = "myorg"
  github_repo_name               = "myapp"
  environment                    = "dev"
  workload_identity_provider_name = module.workload_identity.workload_identity_provider_name
  cicd_service_account_email      = module.iam.cicd_deployer_service_account
  artifact_registry_url          = module.artifact_registry.repository_url
  cloud_run_service_name         = module.cloud_run.service_name
  cloud_run_region               = var.region
  cloudrun_config                = module.cloud_run.free_tier_config

  # Optional
  github_environments        = ["dev", "staging", "prod"]
  workflow_branch            = "main"
  enable_workflow_generation = true
  labels                     = local.cost_labels

  depends_on = [
    module.project,
    module.iam,
    module.workload_identity,
    module.artifact_registry,
    module.cloud_run
  ]
}
```

## Resources Created

### Secret Manager

- `google_secret_manager_secret.deployment_config`: Stores deployment configuration JSON
- `google_secret_manager_secret_version.deployment_config`: Secret version with config
- `google_secret_manager_secret_iam_member.github_actions_config_access`: IAM binding for CI/CD SA

### GitHub

- `data.github_repository.main`: Repository data source
- `github_actions_secret.wif_provider`: WIF provider name (secret)
- `github_actions_secret.wif_service_account`: CI/CD service account email (secret)
- `github_actions_variable.deployment_config_secret`: Secret name (variable)
- `github_actions_variable.environment`: Environment name (variable)
- `github_repository_environment.environment`: GitHub environment

### Local File

- `local_file.github_workflow`: Generated workflow file (if enabled)

## Configuration

### Deployment Configuration Secret

The module creates a Secret Manager secret containing all deployment configuration:

```json
{
  "project_id": "my-project-123456",
  "project_number": "123456789012",
  "region": "us-central1",
  "service_name": "myapp-dev",
  "artifact_registry_url": "us-central1-docker.pkg.dev/my-project/repo",
  "environment": "dev",
  "cloudrun_config": {
    "min_instances": 0,
    "max_instances": 2,
    "memory": "512Mi",
    "cpu": "1",
    "timeout_seconds": 300
  },
  "created_at": "2025-01-21T12:00:00Z",
  "managed_by": "terraform"
}
```

### GitHub Secrets

Only WIF-related secrets are stored in GitHub (minimal approach):

- `WIF_PROVIDER`: Workload Identity Federation provider name
- `WIF_SERVICE_ACCOUNT`: CI/CD service account email

### GitHub Variables

Non-sensitive configuration stored as variables:

- `DEPLOYMENT_CONFIG_SECRET`: Secret Manager secret name
- `ENVIRONMENT`: Environment name

## Workflow File

The module generates a workflow file at `.github/workflows/deploy-{environment}.yml` that:

1. **Authenticates** via Workload Identity Federation (keyless)
2. **Retrieves** configuration from Secret Manager
3. **Builds** container image using Docker Buildx
4. **Pushes** to Artifact Registry
5. **Deploys** to Cloud Run with dynamic configuration

### Workflow Features

- ✅ No hardcoded project IDs or secrets
- ✅ Configuration retrieved at runtime from Secret Manager
- ✅ FREE TIER optimized defaults
- ✅ Comprehensive error handling
- ✅ GitHub Actions summary outputs
- ✅ Concurrency control (cancels in-progress deployments)

## Variables

See [variables.tf](./variables.tf) for complete variable documentation.

### Required Variables

- `project_id`: GCP Project ID
- `project_number`: GCP Project Number
- `github_owner`: GitHub repository owner
- `github_repo_name`: GitHub repository name
- `environment`: Environment name
- `workload_identity_provider_name`: WIF provider name
- `cicd_service_account_email`: CI/CD service account email
- `artifact_registry_url`: Artifact Registry repository URL
- `cloud_run_service_name`: Cloud Run service name
- `cloud_run_region`: Cloud Run service region
- `cloudrun_config`: Cloud Run configuration object

### Optional Variables

- `github_environments`: List of GitHub environment names (default: `[]`)
- `workflow_branch`: Git branch to trigger workflow (default: `"main"`)
- `workflow_path`: Path for workflow file (default: `".github/workflows"`)
- `workflow_filename`: Workflow filename (default: `"deploy"`)
- `enable_workflow_generation`: Enable workflow file generation (default: `true`)
- `labels`: Resource labels (default: `{}`)

## Outputs

See [outputs.tf](./outputs.tf) for complete output documentation.

- `deployment_config_secret_id`: Secret Manager secret ID
- `github_repository`: GitHub repository information
- `github_environment`: GitHub environment name
- `workflow_file_path`: Path to generated workflow file
- `github_secrets_configured`: List of configured secrets
- `github_variables_configured`: List of configured variables
- `next_steps`: Instructions for next steps

## Dependencies

This module depends on:

- `module.project`: For project ID and number
- `module.iam`: For CI/CD service account
- `module.workload_identity`: For WIF provider
- `module.artifact_registry`: For repository URL
- `module.cloud_run`: For service name and configuration

## Security

- ✅ **No Hardcoded Secrets**: All configuration in Secret Manager
- ✅ **Keyless Authentication**: WIF (no service account keys)
- ✅ **Least Privilege**: CI/CD SA has minimal required permissions
- ✅ **Secret Access**: Only CI/CD SA can read deployment config
- ✅ **Environment Isolation**: Separate configs per environment

## FREE TIER Compliance

The module defaults to FREE TIER configurations:

- Cloud Run: Scale to zero (min_instances = 0)
- Secret Manager: 6 secrets free, 10,000 accesses/month
- GitHub Actions: Free for public repos, 2,000 minutes/month for private

## Troubleshooting

### Workflow Fails to Authenticate

1. Verify WIF provider is configured correctly
2. Check GitHub secrets are set: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`
3. Verify service account has `roles/iam.workloadIdentityUser` binding

### Cannot Access Secret Manager

1. Verify IAM binding: `google_secret_manager_secret_iam_member.github_actions_config_access`
2. Check secret name matches: `DEPLOYMENT_CONFIG_SECRET` variable
3. Verify CI/CD SA has `roles/secretmanager.secretAccessor` role

### Configuration Retrieval Fails

1. Verify secret exists in Secret Manager
2. Check JSON format is valid
3. Verify required fields are present in config

## Examples

See the root `main.tf` for integration example.

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Run Deployment](https://cloud.google.com/run/docs/deploying)
