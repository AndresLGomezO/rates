# modules/github-actions/main.tf
# GitHub Actions automation module
# Creates Secret Manager secrets, GitHub configuration, and deployment workflows
# Ref: https://registry.terraform.io/providers/integrations/github/latest/docs

locals {
  # Secret name for deployment configuration
  deployment_config_secret_id = "github-deployment-config-${var.environment}"

  # Sanitize GitHub repo for GCP labels (lowercase, replace / with -)
  # GCP labels must be lowercase and cannot contain slashes
  github_repo_label = lower(replace("${var.github_owner}/${var.github_repo_name}", "/", "-"))

  # Merge provided labels with default labels
  resource_labels = merge(
    {
      "managed-by"  = "terraform"
      "environment" = var.environment
      "github-repo" = local.github_repo_label
    },
    var.labels
  )

  # Deployment configuration JSON (stored in Secret Manager)
  # This contains all deployment settings - NO hardcoded values in workflow files
  deployment_config = jsonencode({
    project_id             = var.project_id
    project_number         = var.project_number
    region                 = var.cloud_run_region
    service_name           = var.cloud_run_service_name
    artifact_registry_url  = var.artifact_registry_url
    environment            = var.environment
    cloudrun_config = {
      min_instances   = var.cloudrun_config.min_instances
      max_instances   = var.cloudrun_config.max_instances
      memory          = var.cloudrun_config.memory
      cpu             = var.cloudrun_config.cpu
      timeout_seconds = var.cloudrun_config.timeout_seconds
    }
    # Metadata
    created_at = timestamp()
    managed_by = "terraform"
  })

  # Workflow file path (defaults to .github/workflows/deploy-{env}.yml)
  # Note: This should be relative to repository root, not Terraform directory
  # The path will be resolved when integrating into main.tf
  workflow_file_path = var.workflow_file_path != "" ? var.workflow_file_path : "${var.workflow_path}/deploy-${var.environment}.yml"
}

# ============================================================================
# Secret Manager: Deployment Configuration
# ============================================================================
# Stores all deployment configuration (project IDs, regions, etc.)
# Workflow files retrieve this at runtime - NO hardcoded values

resource "google_secret_manager_secret" "deployment_config" {
  project   = var.project_id
  secret_id = local.deployment_config_secret_id

  replication {
    # Automatic replication (replicates to all regions)
    auto {}
  }

  labels = local.resource_labels
}

resource "google_secret_manager_secret_version" "deployment_config" {
  secret      = google_secret_manager_secret.deployment_config.id
  secret_data = local.deployment_config

  # Note: Secret versions are immutable - create new version to update
}

# ============================================================================
# IAM: Grant GitHub Actions SA access to Secret Manager
# ============================================================================
# Allows CI/CD service account to read deployment configuration secret

resource "google_secret_manager_secret_iam_member" "github_actions_config_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.deployment_config.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cicd_service_account_email}"
}

# ============================================================================
# GitHub: Repository Data Source
# ============================================================================
# Fetches repository information (for validation and configuration)

data "github_repository" "main" {
  full_name = "${var.github_owner}/${var.github_repo_name}"
}

# ============================================================================
# GitHub: Repository Secrets (Minimal - Only WIF Authentication)
# ============================================================================
# Only WIF-related secrets are stored in GitHub
# All other configuration is retrieved from Secret Manager at runtime

resource "github_actions_secret" "wif_provider" {
  repository  = data.github_repository.main.name
  secret_name = "WIF_PROVIDER"
  plaintext_value = var.workload_identity_provider_name
}

resource "github_actions_secret" "wif_service_account" {
  repository  = data.github_repository.main.name
  secret_name = "WIF_SERVICE_ACCOUNT"
  plaintext_value = var.cicd_service_account_email
}

# ============================================================================
# GitHub: Repository Variables (Non-sensitive Configuration)
# ============================================================================
# Store non-sensitive configuration as variables (visible in UI)

resource "github_actions_variable" "deployment_config_secret" {
  repository    = data.github_repository.main.name
  variable_name = "DEPLOYMENT_CONFIG_SECRET"
  value         = local.deployment_config_secret_id
}

resource "github_actions_variable" "environment" {
  repository    = data.github_repository.main.name
  variable_name = "ENVIRONMENT"
  value         = var.environment
}

# ============================================================================
# GitHub: Environments (for Deployment Gates)
# ============================================================================
# Creates GitHub environments with optional protection rules
# Ref: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment

resource "github_repository_environment" "environment" {
  repository  = data.github_repository.main.name
  environment = var.environment

  # Protection rules (optional - can be configured per environment)
  # For production, you might want to add:
  # - Required reviewers
  # - Wait timer
  # - Deployment branches

  # Example: Add protection for production
  # reviewers {
  #   users = ["username"]
  # }
  # 
  # wait_timer = var.environment == "prod" ? 5 : 0
  # 
  # deployment_branch_policy {
  #   protected_branches     = true
  #   custom_branch_policies = false
  # }
}

# ============================================================================
# GitHub: Workflow File Generation
# ============================================================================
# Generates deployment workflow file from template
# Workflow retrieves configuration from Secret Manager at runtime

resource "local_file" "github_workflow" {
  count = var.enable_workflow_generation ? 1 : 0

  filename = local.workflow_file_path
  content = templatefile("${path.module}/templates/deploy.yml.tpl", {
    environment                = var.environment
    workflow_branch            = var.workflow_branch
    deployment_config_secret_id = local.deployment_config_secret_id
    wif_provider_secret        = "WIF_PROVIDER"
    wif_service_account_secret = "WIF_SERVICE_ACCOUNT"
    environment_variable       = "ENVIRONMENT"
  })

  # Ensure directory exists
  directory_permission = "0755"
  file_permission      = "0644"
}
