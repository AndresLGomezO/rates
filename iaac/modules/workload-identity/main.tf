# modules/workload-identity/main.tf
# Workload Identity Federation for GitHub Actions (keyless authentication)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/iam_workload_identity_pool
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/iam_workload_identity_pool_provider
# Ref: https://cloud.google.com/iam/docs/workload-identity-federation

locals {
  # Extract GitHub owner from repository string (format: "owner/repo")
  github_owner = split("/", var.github_repo)[0]

  # Extract GitHub repository name from repository string
  github_repo_name = split("/", var.github_repo)[1]

  # Merge provided labels with default labels
  wif_labels = merge(
    {
      "managed-by"  = "terraform"
      "environment" = var.environment
      "github-repo" = var.github_repo
    },
    var.labels
  )
}

# ============================================================================
# Workload Identity Pool
# ============================================================================
# Creates a pool for external identity providers (GitHub in this case)
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/iam_workload_identity_pool

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = var.wif_pool_id
  display_name              = "GitHub Actions Pool - ${var.environment}"
  description               = "Identity pool for GitHub Actions OIDC authentication"
  disabled                  = false

  # Note: Pool names are globally unique per project
}

# ============================================================================
# Workload Identity Pool Provider (GitHub OIDC)
# ============================================================================
# Configures GitHub as an OIDC identity provider
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/iam_workload_identity_pool_provider

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = var.wif_provider_id
  display_name                       = "GitHub OIDC Provider"
  description                        = "OIDC identity provider for GitHub Actions"

  # Attribute mapping: Maps GitHub OIDC claims to Google Cloud attributes
  # Ref: https://cloud.google.com/iam/docs/workload-identity-federation#mapping
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.ref"              = "assertion.ref"
    "attribute.environment"      = "assertion.environment"
    "attribute.workflow"         = "assertion.workflow"
  }

  # Security: Restrict to specific GitHub repository owner
  # This prevents other repositories from using this WIF configuration
  # Ref: https://cloud.google.com/iam/docs/workload-identity-federation#conditions
  attribute_condition = "assertion.repository_owner == '${local.github_owner}'"

  # OIDC configuration
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"

    # Allowed audiences (GitHub Actions uses the default)
    allowed_audiences = []
  }
}

# ============================================================================
# Service Account Impersonation via WIF
# ============================================================================
# Grants the CI/CD service account permission to be impersonated by WIF principals
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/service_account_iam

resource "google_service_account_iam_member" "wif_deployer" {
  # Service account ID must be in full resource name format
  # Format: projects/{project_id}/serviceAccounts/{email}
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.cicd_service_account_email}"
  role               = "roles/iam.workloadIdentityUser"

  # Grant access to principals from the WIF pool
  # Format: principalSet://iam.googleapis.com/projects/{project_number}/locations/global/workloadIdentityPools/{pool_id}/attribute.repository/{repo}
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

# Optional: Grant access per GitHub environment for environment-specific deployments
# This allows restricting deployments to specific GitHub environments
# Ref: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
resource "google_service_account_iam_member" "wif_deployer_by_environment" {
  for_each = toset(var.github_environments)

  # Service account ID must be in full resource name format
  # Format: projects/{project_id}/serviceAccounts/{email}
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.cicd_service_account_email}"
  role               = "roles/iam.workloadIdentityUser"

  # Restrict to specific GitHub environment
  # Format: principalSet://iam.googleapis.com/.../attribute.environment/{environment}
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.environment/${each.value}"
}
