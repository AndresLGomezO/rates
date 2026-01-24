# modules/artifact-registry/main.tf
# Artifact Registry repository for container images
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/artifact_registry_repository
# Ref: https://cloud.google.com/artifact-registry/pricing
#
# FREE TIER: 0.5 GB storage
# After 0.5GB: $0.10/GB/month

locals {
  # Merge provided labels with default labels
  repository_labels = merge(
    {
      "managed-by" = "terraform"
    },
    var.labels
  )
}

# ============================================================================
# Artifact Registry Repository
# ============================================================================
# Creates a Docker repository for container images
# Ref: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs/resources/artifact_registry_repository

resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repository_id
  description   = var.description != null ? var.description : "Container images repository"
  format        = "DOCKER"
  mode          = "STANDARD_REPOSITORY"

  # Docker configuration
  docker_config {
    # 💰 Immutable tags — OFF by default (increases storage usage)
    # When enabled, prevents tag overwrites (better security but uses more storage)
    immutable_tags = var.enable_immutable_tags
  }

  # Cleanup policies — AGGRESSIVE by default to stay in free tier
  # Ref: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "${var.untagged_retention_days * 86400}s" # Convert days to seconds
    }
  }

  cleanup_policies {
    id     = "keep-recent-tagged"
    action = "KEEP"
    most_recent_versions {
      keep_count = var.keep_recent_versions
    }
  }

  labels = local.repository_labels
}
