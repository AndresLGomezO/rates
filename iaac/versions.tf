terraform {
  # Note: repo authors may use newer Terraform, but this constraint supports local installs like 1.5.x too.
  required_version = ">= 1.5.0, < 2.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12"
    }
  }

  # Optional: Configure remote state backend
  # Uncomment and configure if you want to use remote state
  # backend "gcs" {
  #   bucket = var.tf_state_bucket
  #   prefix = var.tf_state_prefix
  # }
}
