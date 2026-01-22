# Dynamic Configuration Guide

How dynamic configuration works in the GitHub Actions deployment pipeline, including Secret Manager structure, adding new configuration values, and multi-environment management.

## Overview

The deployment pipeline uses **dynamic configuration** - all deployment settings are retrieved from Google Cloud Secret Manager at runtime. This means:

- ✅ **No hardcoded project IDs** in workflow files
- ✅ **No hardcoded regions** in workflow files
- ✅ **No hardcoded service names** in workflow files
- ✅ **All configuration centralized** in Secret Manager
- ✅ **Easy to update** without changing workflow files

## How It Works

### 1. Configuration Storage

Deployment configuration is stored in Secret Manager as a JSON object:

**Secret Name**: `github-deployment-config-{environment}`

**Example (dev environment)**:

```json
{
  "project_id": "rates-dev-123456",
  "project_number": "123456789012",
  "region": "us-central1",
  "service_name": "rates-dev",
  "artifact_registry_url": "us-central1-docker.pkg.dev/rates-dev-123456/rates-dev-containers",
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

### 2. Configuration Retrieval

The workflow retrieves configuration in the `retrieve-config` job:

```yaml
- name: Retrieve Deployment Configuration
  id: config
  run: |
    SECRET_NAME="github-deployment-config-dev"
    CONFIG_JSON=$(gcloud secrets versions access latest \
      --secret="$SECRET_NAME" \
      --project="$(gcloud config get-value project)" \
      --format="json")

    # Extract values
    echo "project_id=$(echo "$CONFIG_JSON" | jq -r '.project_id')" >> $GITHUB_OUTPUT
    echo "region=$(echo "$CONFIG_JSON" | jq -r '.region')" >> $GITHUB_OUTPUT
    # ... etc
```

### 3. Configuration Usage

Retrieved values are used in subsequent jobs:

```yaml
- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2.7.2
  with:
    service: ${{ needs.retrieve-config.outputs.service_name }}
    region: ${{ needs.retrieve-config.outputs.region }}
    image: ${{ needs.build-and-push.outputs.image_url }}
    flags: |
      --min-instances=${{ needs.retrieve-config.outputs.min_instances }}
      --max-instances=${{ needs.retrieve-config.outputs.max_instances }}
      --memory=${{ needs.retrieve-config.outputs.memory }}
      --cpu=${{ needs.retrieve-config.outputs.cpu }}
```

## Secret Manager Structure

### Secret Naming Convention

```
github-deployment-config-{environment}
```

Examples:

- `github-deployment-config-dev`
- `github-deployment-config-staging`
- `github-deployment-config-prod`

### JSON Schema

```typescript
interface DeploymentConfig {
  // Project Information
  project_id: string;
  project_number: string;

  // Deployment Settings
  region: string;
  service_name: string;
  artifact_registry_url: string;
  environment: string;

  // Cloud Run Configuration
  cloudrun_config: {
    min_instances: number;
    max_instances: number;
    memory: string;
    cpu: string;
    timeout_seconds: number;
  };

  // Metadata
  created_at: string; // ISO 8601 timestamp
  managed_by: 'terraform';
}
```

### Current Configuration Fields

| Field                             | Type   | Description            | Example                            |
| --------------------------------- | ------ | ---------------------- | ---------------------------------- |
| `project_id`                      | string | GCP Project ID         | `"rates-dev-123456"`               |
| `project_number`                  | string | GCP Project Number     | `"123456789012"`                   |
| `region`                          | string | Cloud Run region       | `"us-central1"`                    |
| `service_name`                    | string | Cloud Run service name | `"rates-dev"`                      |
| `artifact_registry_url`           | string | Container registry URL | `"us-central1-docker.pkg.dev/..."` |
| `environment`                     | string | Environment name       | `"dev"`                            |
| `cloudrun_config.min_instances`   | number | Minimum instances      | `0`                                |
| `cloudrun_config.max_instances`   | number | Maximum instances      | `2`                                |
| `cloudrun_config.memory`          | string | Memory allocation      | `"512Mi"`                          |
| `cloudrun_config.cpu`             | string | CPU allocation         | `"1"`                              |
| `cloudrun_config.timeout_seconds` | number | Request timeout        | `300`                              |

## Adding New Configuration Values

### Step 1: Update Terraform Module

Edit `iaac/modules/github-actions/main.tf`:

```hcl
locals {
  deployment_config = jsonencode({
    # ... existing fields ...

    # Add new field
    new_setting = var.new_setting_value
  })
}
```

### Step 2: Update Module Variables

Edit `iaac/modules/github-actions/variables.tf`:

```hcl
variable "new_setting_value" {
  type        = string
  description = "Description of new setting"
  default     = "default-value"
}
```

### Step 3: Update Workflow Template

Edit `iaac/modules/github-actions/templates/deploy.yml.tpl`:

```yaml
- name: Retrieve Deployment Configuration
  id: config
  run: |
    # ... existing extraction ...

    # Extract new field
    echo "new_setting=$(echo "$CONFIG_JSON" | jq -r '.new_setting')" >> $GITHUB_OUTPUT
```

### Step 4: Use in Workflow

```yaml
- name: Use New Setting
  run: |
    echo "New setting: ${{ needs.retrieve-config.outputs.new_setting }}"
```

### Step 5: Apply Terraform

```bash
cd iaac
terraform apply
```

This will:

1. Update the Secret Manager secret with new field
2. Regenerate the workflow file with new extraction
3. Update IAM bindings if needed

## Multi-Environment Management

### Environment-Specific Configuration

Each environment has its own Secret Manager secret:

- **Dev**: `github-deployment-config-dev`
- **Staging**: `github-deployment-config-staging`
- **Prod**: `github-deployment-config-prod`

### Creating New Environment

1. **Add to Terraform variables**:

   ```hcl
   github_environments = ["dev", "staging", "prod", "qa"]
   ```

2. **Apply Terraform**:

   ```bash
   terraform apply
   ```

3. **Verify resources created**:

   ```bash
   # Check secret
   gcloud secrets describe github-deployment-config-qa \
     --project="your-project-id"

   # Check GitHub environment
   gh api repos/your-owner/your-repo/environments/qa

   # Check workflow file
   cat .github/workflows/deploy-qa.yml
   ```

### Environment-Specific Values

Different environments can have different configurations:

**Dev**:

```json
{
  "cloudrun_config": {
    "min_instances": 0,
    "max_instances": 2,
    "memory": "512Mi"
  }
}
```

**Prod**:

```json
{
  "cloudrun_config": {
    "min_instances": 1,
    "max_instances": 10,
    "memory": "1Gi"
  }
}
```

## Updating Configuration

### Method 1: Terraform (Recommended)

Update `terraform.tfvars` or module variables, then:

```bash
cd iaac
terraform apply
```

This automatically updates the Secret Manager secret.

### Method 2: Manual Update

Update Secret Manager directly:

```bash
# Create updated JSON
cat > config.json <<EOF
{
  "project_id": "rates-dev-123456",
  "region": "us-central1",
  "service_name": "rates-dev",
  "cloudrun_config": {
    "min_instances": 1,  # Changed from 0
    "max_instances": 5,  # Changed from 2
    "memory": "1Gi",     # Changed from 512Mi
    "cpu": "2",          # Changed from 1
    "timeout_seconds": 300
  }
}
EOF

# Update secret
gcloud secrets versions add github-deployment-config-dev \
  --data-file=config.json \
  --project="your-project-id"
```

**Note**: Manual updates will be overwritten by Terraform on next apply.

## Viewing Configuration

### View Secret Contents

```bash
# View latest version
gcloud secrets versions access latest \
  --secret="github-deployment-config-dev" \
  --project="your-project-id"

# Pretty print JSON
gcloud secrets versions access latest \
  --secret="github-deployment-config-dev" \
  --project="your-project-id" | jq .

# Extract specific field
gcloud secrets versions access latest \
  --secret="github-deployment-config-dev" \
  --project="your-project-id" | jq -r '.project_id'
```

### View Secret Metadata

```bash
# List all versions
gcloud secrets versions list github-deployment-config-dev \
  --project="your-project-id"

# View specific version
gcloud secrets versions describe 1 \
  --secret="github-deployment-config-dev" \
  --project="your-project-id"
```

### View IAM Permissions

```bash
# Check who can access the secret
gcloud secrets get-iam-policy github-deployment-config-dev \
  --project="your-project-id"
```

## Best Practices

### 1. Version Control

- ✅ Store configuration in Terraform (version controlled)
- ✅ Use Terraform to update secrets (not manual)
- ✅ Review changes before applying

### 2. Environment Isolation

- ✅ Separate secrets per environment
- ✅ Different IAM bindings per environment
- ✅ Environment-specific GitHub environments

### 3. Security

- ✅ Never commit secrets to git
- ✅ Use Secret Manager for all sensitive data
- ✅ Rotate secrets regularly
- ✅ Monitor secret access

### 4. Configuration Management

- ✅ Keep configuration in Terraform
- ✅ Use variables for environment-specific values
- ✅ Document all configuration fields
- ✅ Validate JSON before updating

## Troubleshooting

### Configuration Not Found

**Error**: `Secret not found`

**Solution**:

```bash
# Verify secret exists
gcloud secrets list --project="your-project-id" | grep github-deployment-config

# Create if missing (via Terraform)
cd iaac
terraform apply
```

### Invalid JSON

**Error**: `Invalid JSON in deployment configuration`

**Solution**:

```bash
# Validate JSON
gcloud secrets versions access latest \
  --secret="github-deployment-config-dev" \
  --project="your-project-id" | jq . > /dev/null

# Fix via Terraform
cd iaac
terraform apply
```

### Missing Fields

**Error**: `Field not found in configuration`

**Solution**:

1. Check current configuration:

   ```bash
   gcloud secrets versions access latest \
     --secret="github-deployment-config-dev" \
     --project="your-project-id" | jq .
   ```

2. Update Terraform module to include field
3. Apply Terraform

## Examples

### Example: Adding Custom Environment Variable

1. **Update Terraform module**:

   ```hcl
   deployment_config = jsonencode({
     # ... existing fields ...
     custom_env_var = "custom-value"
   })
   ```

2. **Update workflow template**:

   ```yaml
   echo "custom_env_var=$(echo "$CONFIG_JSON" | jq -r '.custom_env_var')" >> $GITHUB_OUTPUT
   ```

3. **Use in workflow**:
   ```yaml
   - name: Use Custom Variable
     run: |
       echo "${{ needs.retrieve-config.outputs.custom_env_var }}"
   ```

### Example: Environment-Specific Settings

**Dev** (terraform.tfvars):

```hcl
environment = "dev"
cloudrun_min_instances = 0
cloudrun_max_instances = 2
```

**Prod** (terraform.tfvars):

```hcl
environment = "prod"
cloudrun_min_instances = 1
cloudrun_max_instances = 10
```

## Additional Resources

- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Terraform Secret Manager](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
