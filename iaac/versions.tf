# versions.tf
# Last updated: January 2025
# Terraform Registry: https://registry.terraform.io/
#
# This file pins all provider versions to ensure reproducible infrastructure.
# Minimum Terraform version: 1.6.0 (for check blocks and improved validation)
# Recommended Terraform version: 1.9.8

terraform {
  # Minimum version for check blocks, testing framework, and improved validation
  # Ref: https://developer.hashicorp.com/terraform/language/upgrade-guides
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    # Google Cloud Provider
    # Changelog: https://github.com/hashicorp/terraform-provider-google/blob/main/CHANGELOG.md
    # Registry: https://registry.terraform.io/providers/hashicorp/google/6.14.1/docs
    google = {
      source  = "hashicorp/google"
      version = "~> 6.14.0"
    }

    # Google Beta Provider (required for Firebase resources)
    # Changelog: https://github.com/hashicorp/terraform-provider-google-beta/blob/main/CHANGELOG.md
    # Registry: https://registry.terraform.io/providers/hashicorp/google-beta/6.14.1/docs
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.14.0"
    }

    # Random Provider (for unique naming and resource IDs)
    # Registry: https://registry.terraform.io/providers/hashicorp/random/latest
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }

    # Time Provider (for delays and timestamps)
    # Registry: https://registry.terraform.io/providers/hashicorp/time/latest
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12.0"
    }

    # Null Provider (for triggers and local-exec)
    # Registry: https://registry.terraform.io/providers/hashicorp/null/latest
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2.0"
    }
  }
}

# Provider configurations
# Note: project_id will be resolved by the project module (Step 1.3)
# For initial setup, providers use application default credentials
# Run: gcloud auth application-default login

provider "google" {
  project = var.project_id # Will be set by project module or provided directly
  region  = var.region

  # Set quota project for Application Default Credentials (ADC)
  # This is required when using ADC locally with APIs that require a quota project
  # Ref: https://cloud.google.com/docs/authentication/adc-troubleshooting/user-creds
  user_project_override = true
  billing_project       = var.project_id

  # Recommended: Use application default credentials
  # Run: gcloud auth application-default login
  # Ref: https://cloud.google.com/docs/authentication/application-default-credentials
}

provider "google-beta" {
  project = var.project_id # Will be set by project module or provided directly
  region  = var.region

  # Set quota project for Application Default Credentials (ADC)
  # This is required when using ADC locally with APIs that require a quota project
  # Ref: https://cloud.google.com/docs/authentication/adc-troubleshooting/user-creds
  user_project_override = true
  billing_project       = var.project_id

  # Required for Firebase resources (google_firebase_project, etc.)
}
