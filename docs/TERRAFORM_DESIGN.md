# Terraform Codebase Architecture

## Infrastructure-as-Code Design for Rates Monorepo

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Status:** Final - Source of Truth for Terraform Implementation  
**Governance:** Lead DevOps Engineer and Infrastructure Architect

---

## Purpose

This document defines the Terraform codebase architecture for the Rates monorepo GCP deployment. It establishes the directory structure, layer separation, state management strategy, and module organization to ensure maintainability, safety, and clear separation of concerns.

**Design Goals:**

- **Blast Radius Control:** Changes to application configuration must not impact foundational resources
- **Environment Safety:** Prevent accidental cross-environment modifications
- **Maintainability:** Clear structure for a small team
- **Simplicity:** Avoid over-engineering while maintaining safety
- **Growth Path:** Structure can evolve as requirements change

**Key Constraints:**

- Single GCP project (`rates-production`) with namespace-based environment separation
- No external orchestration tools (Terragrunt) unless absolutely necessary
- Focus on clarity, safety, and long-term maintainability

---

## 1. Directory Structure

### 1.1 Repository Layout

```
rates/
├── apps/                          # Application code (existing)
├── packages/                      # Workspace packages (existing)
├── docs/                          # Documentation (existing)
├── firebase/                      # Firebase configuration (existing)
└── infra/                         # NEW: Terraform infrastructure
    ├── modules/                   # Reusable Terraform modules
    │   ├── cloud-run/             # Cloud Run service module
    │   │   ├── main.tf
    │   │   ├── variables.tf
    │   │   ├── outputs.tf
    │   │   └── README.md
    │   ├── service-account/       # Service account module
    │   │   ├── main.tf
    │   │   ├── variables.tf
    │   │   ├── outputs.tf
    │   │   └── README.md
    │   ├── artifact-registry/     # Artifact Registry repository module
    │   │   ├── main.tf
    │   │   ├── variables.tf
    │   │   ├── outputs.tf
    │   │   └── README.md
    │   └── secret/                # Secret Manager secret module
    │       ├── main.tf
    │       ├── variables.tf
    │       ├── outputs.tf
    │       └── README.md
    └── environments/              # Environment-specific configurations
        ├── bootstrap/             # Layer 0: Bootstrap (one-time setup)
        │   ├── main.tf
        │   ├── backend.tf
        │   ├── variables.tf
        │   └── outputs.tf
        ├── foundation/            # Layer 1: Foundation (shared infrastructure)
        │   ├── main.tf
        │   ├── backend.tf
        │   ├── variables.tf
        │   ├── outputs.tf
        │   └── README.md
        └── application/           # Layer 2: Application (environment-specific)
            ├── dev/               # Dev environment
            │   ├── main.tf
            │   ├── backend.tf
            │   ├── variables.tf
            │   ├── terraform.tfvars
            │   └── README.md
            └── prod/              # Prod environment
                ├── main.tf
                ├── backend.tf
                ├── variables.tf
                ├── terraform.tfvars
                └── README.md
```

### 1.2 Directory Purpose

**`infra/modules/`:**

- **Purpose:** Reusable, environment-agnostic Terraform modules
- **Ownership:** Shared across all environments
- **Change Frequency:** Low (only when module logic changes)
- **Examples:** Cloud Run service module, service account module, Artifact Registry module

**`infra/environments/bootstrap/`:**

- **Purpose:** One-time bootstrap infrastructure (Terraform state bucket, required APIs)
- **Ownership:** Infrastructure team (one-time setup)
- **Change Frequency:** Very low (only for bootstrap changes)
- **State:** Single state file (not environment-specific)

**`infra/environments/foundation/`:**

- **Purpose:** Shared foundational infrastructure (networking, shared IAM, Artifact Registry repositories)
- **Ownership:** Infrastructure team
- **Change Frequency:** Low (foundational changes are infrequent)
- **State:** Single state file (shared across environments)

**`infra/environments/application/`:**

- **Purpose:** Environment-specific application deployments (Cloud Run services, environment-specific secrets, Firebase Hosting)
- **Ownership:** Application team (with infrastructure oversight)
- **Change Frequency:** High (application deployments are frequent)
- **State:** Separate state files per environment (`dev/` and `prod/`)

---

## 2. Terraform Layers Definition

### 2.1 Layer Architecture Overview

The infrastructure is organized into three independent layers, each with its own Terraform state file. This separation ensures that changes to higher layers (application) cannot impact lower layers (foundation), providing blast radius control.

```
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Application (High Change Frequency)              │
│ - Cloud Run services (dev/prod)                         │
│ - Environment-specific secrets                          │
│ - Firebase Hosting sites (dev/prod)                    │
│ - App-specific IAM bindings                            │
│ State: Separate per environment                         │
└─────────────────────────────────────────────────────────┘
                          ↓ depends on
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Foundation (Low Change Frequency)               │
│ - Service accounts (dev/prod)                            │
│ - Artifact Registry repositories (dev/prod)              │
│ - Shared IAM policies                                   │
│ - API enablement                                         │
│ State: Single shared state                              │
└─────────────────────────────────────────────────────────┘
                          ↓ depends on
┌─────────────────────────────────────────────────────────┐
│ Layer 0: Bootstrap (Very Low Change Frequency)           │
│ - Terraform state bucket                                │
│ - State bucket IAM                                      │
│ - Required APIs (if not enabled manually)               │
│ State: Single bootstrap state                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Layer 0: Bootstrap

**Purpose:** Create the foundational infrastructure required for Terraform state management. This layer must be created manually or via a separate bootstrap process before any other Terraform can run.

**Resources:**

- Google Cloud Storage bucket for Terraform state (`rates-terraform-state`)
- State bucket IAM bindings (for Terraform service account or human users)
- State bucket versioning and lifecycle policies
- Cloud Storage bucket for state locking (or use same bucket with locking enabled)

**State Management:**

- **Backend:** Local backend (initial bootstrap) or existing GCS bucket (if bootstrap already exists)
- **State File:** `bootstrap/terraform.tfstate` (stored locally or in separate bootstrap bucket)
- **Locking:** Cloud Storage backend locking (automatic with GCS backend)

**Change Frequency:** Very low (only when bootstrap infrastructure needs modification)

**Blast Radius:** Minimal (only affects Terraform state storage, not application resources)

**Dependencies:** None (this is the base layer)

**Ownership:** Infrastructure team (one-time setup, rarely modified)

**Implementation Notes:**

- Bootstrap can be done manually via `gcloud` or via a separate Terraform configuration with local backend
- After bootstrap, all other layers use GCS backend pointing to the bootstrap bucket
- Bootstrap state can be stored locally or in a separate "meta" bucket

### 2.3 Layer 1: Foundation

**Purpose:** Create shared foundational infrastructure that is used by all environments but is not environment-specific. This includes service accounts, Artifact Registry repositories, and shared IAM policies.

**Resources:**

- Service accounts (dev and prod: Cloud Run + Cloud Build)
- Artifact Registry repositories (dev and prod)
- IAM role bindings for service accounts (with environment-specific conditions)
- API enablement (if not done manually)
- Shared networking resources (if VPC is added later)

**State Management:**

- **Backend:** GCS backend (bucket created in Layer 0)
- **State File:** `foundation/terraform.tfstate` (stored in `rates-terraform-state` bucket with prefix `foundation/`)
- **Locking:** Cloud Storage backend locking

**Change Frequency:** Low (foundational changes are infrequent, typically when adding new service accounts or repositories)

**Blast Radius:** Medium (changes affect all environments, but resources are logically separated via naming)

**Dependencies:** Layer 0 (requires state bucket from bootstrap)

**Ownership:** Infrastructure team

**Environment Handling:**

- Foundation layer creates resources for **both** dev and prod environments
- Resources are distinguished via naming convention (`rates-dev-*` vs `rates-prod-*`)
- IAM conditions ensure environment isolation (dev service accounts cannot access prod resources)

**Rationale:**

- Service accounts and Artifact Registry repositories are foundational and shared across the project
- Creating them in a single layer simplifies management and ensures consistency
- Environment isolation is achieved via IAM conditions, not separate state files

### 2.4 Layer 2: Application

**Purpose:** Deploy environment-specific application resources. This layer contains the actual application deployments (Cloud Run services, Firebase Hosting sites, environment-specific secrets).

**Resources (per environment):**

- Cloud Run services (`rates-{env}-api-us-central1`)
- Firebase Hosting sites (`rates-{env}-main-app`, `rates-{env}-auth-app`)
- Environment-specific secrets (`rates-{env}-firebase-sa`, `rates-{env}-nonce-secret`)
- Cloud Run service IAM bindings (public invoker access)
- Application-specific configuration

**State Management:**

- **Backend:** GCS backend (bucket created in Layer 0)
- **State Files:**
  - `application/dev/terraform.tfstate` (prefix: `application/dev/`)
  - `application/prod/terraform.tfstate` (prefix: `application/prod/`)
- **Locking:** Cloud Storage backend locking

**Change Frequency:** High (application deployments are frequent, especially in dev environment)

**Blast Radius:** Low (changes are isolated per environment via separate state files)

**Dependencies:** Layer 1 (requires service accounts and Artifact Registry repositories from foundation)

**Ownership:** Application team (with infrastructure oversight)

**Environment Separation:**

- **Directory-based:** Separate directories (`dev/` and `prod/`) with separate state files
- **Rationale:** Directory-based separation is clearer for a small team than Terraform workspaces
- **Benefits:**
  - Explicit environment context (no workspace switching)
  - Reduced risk of accidental cross-environment changes
  - Clearer CI/CD integration (branch → directory mapping)

**Rationale:**

- Application layer has the highest change frequency (deployments, configuration updates)
- Separate state files per environment prevent accidental cross-environment modifications
- Directory-based separation is more intuitive than workspaces for a small team

---

## 3. Module Strategy

### 3.1 Module Philosophy

**Principle:** Create modules only when there is clear value in reusability, consistency, or abstraction. Avoid over-abstracting simple resources.

**Module Criteria:**

1. **Reusability:** Resource pattern is used multiple times (e.g., Cloud Run services for dev/prod)
2. **Complexity:** Resource has multiple related components (e.g., service account + IAM bindings)
3. **Standards Enforcement:** Module enforces security or naming standards
4. **Abstraction Value:** Module simplifies complex resource configuration

**Anti-Pattern:** Creating modules for single-use resources or overly simple resources (e.g., a module for a single Secret Manager secret with no additional logic).

### 3.2 Module Inventory

#### 3.2.1 `modules/cloud-run/`

**Purpose:** Deploy a Cloud Run service with consistent configuration, security defaults, and integration with Secret Manager.

**Why it exists:**

- Cloud Run services are deployed for both dev and prod (reusability)
- Complex configuration (service account, secrets, IAM bindings, environment variables)
- Enforces security standards (dedicated service account, secret access, public invoker)

**Module Components:**

- Cloud Run service resource
- Service account attachment (from foundation layer)
- Secret Manager secret references (environment variables)
- IAM binding for public invoker access
- Consistent naming convention enforcement

**Inputs:**

- Service name, region, project ID
- Service account email (from foundation layer)
- Container image URL (from Artifact Registry)
- Secret references (Firebase service account, nonce secret)
- Resource limits (CPU, memory, concurrency, timeout)

**Outputs:**

- Service URL
- Service name
- Service account email

**Usage:**

```hcl
module "dev_api" {
  source = "../../modules/cloud-run"

  service_name = "rates-dev-api-us-central1"
  project_id   = var.project_id
  region       = var.region

  service_account_email = module.foundation.dev_cloud_run_sa_email
  container_image       = "us-central1-docker.pkg.dev/${var.project_id}/rates-dev-containers/api:latest"

  secrets = {
    firebase_sa = "rates-dev-firebase-sa"
    nonce       = "rates-dev-nonce-secret"
  }
}
```

#### 3.2.2 `modules/service-account/`

**Purpose:** Create a service account with IAM role bindings and environment-specific IAM conditions.

**Why it exists:**

- Service accounts are created for multiple environments (dev/prod) and multiple purposes (Cloud Run, Cloud Build)
- Complex IAM configuration (multiple role bindings with conditions)
- Enforces security standards (no default service accounts, least privilege)

**Module Components:**

- Service account resource
- IAM role bindings (with IAM conditions for environment isolation)
- Consistent naming convention enforcement

**Inputs:**

- Service account ID, display name, description
- Project ID
- IAM role bindings (list of role + condition pairs)

**Outputs:**

- Service account email
- Service account ID

**Usage:**

```hcl
module "dev_cloud_run_sa" {
  source = "../../modules/service-account"

  account_id   = "rates-dev-cloud-run-sa"
  display_name = "Dev Cloud Run Service Account"
  project_id   = var.project_id

  role_bindings = [
    {
      role    = "roles/secretmanager.secretAccessor"
      condition = "resource.name.startsWith('projects/${var.project_id}/secrets/rates-dev-')"
    },
    {
      role    = "roles/firebase.admin"
      condition = null
    }
  ]
}
```

#### 3.2.3 `modules/artifact-registry/`

**Purpose:** Create an Artifact Registry repository with consistent configuration and IAM bindings.

**Why it exists:**

- Artifact Registry repositories are created for both dev and prod (reusability)
- Enforces naming conventions and repository settings
- Simplifies IAM binding configuration

**Module Components:**

- Artifact Registry repository resource
- Repository IAM bindings (for Cloud Build service account)
- Consistent naming convention enforcement

**Inputs:**

- Repository name, location, format (Docker)
- Project ID
- IAM bindings (Cloud Build service account email)

**Outputs:**

- Repository name
- Repository URL

**Usage:**

```hcl
module "dev_containers" {
  source = "../../modules/artifact-registry"

  repository_name = "rates-dev-containers"
  location        = var.region
  project_id      = var.project_id

  cloud_build_sa_email = module.foundation.dev_cloud_build_sa_email
}
```

#### 3.2.4 `modules/secret/`

**Purpose:** Create a Secret Manager secret with version management and IAM access control.

**Why it exists:**

- Secrets are created for multiple environments (dev/prod) and multiple types (Firebase SA, nonce)
- Enforces security standards (IAM conditions, version management)
- Simplifies secret creation and access configuration

**Module Components:**

- Secret Manager secret resource
- Secret version (initial version, if provided)
- IAM bindings (for Cloud Run service account with environment-specific conditions)

**Inputs:**

- Secret name, project ID
- Initial secret value (optional, for initial creation)
- Service account email (for IAM binding)

**Outputs:**

- Secret name
- Secret ID

**Usage:**

```hcl
module "dev_firebase_sa_secret" {
  source = "../../modules/secret"

  secret_name = "rates-dev-firebase-sa"
  project_id  = var.project_id

  service_account_email = module.foundation.dev_cloud_run_sa_email
  environment          = "dev"
}
```

**Note:** Secret values should be created manually or via `gcloud` after initial creation. Terraform should not store secret values in state.

### 3.3 Module Design Principles

**1. Opinionated Defaults:**

- Modules enforce security best practices (dedicated service accounts, IAM conditions)
- Modules enforce naming conventions (`rates-{env}-{component}-{region}`)
- Modules include sensible defaults (CPU, memory, concurrency limits)

**2. Explicit Configuration:**

- All important configuration is exposed as variables (no hidden magic)
- Variables have clear descriptions and validation rules
- Default values are documented and justified

**3. Output-Driven:**

- Modules output all values needed by dependent resources
- Outputs are clearly documented
- Outputs enable dependency injection between layers

**4. No Cross-Layer Dependencies:**

- Modules do not create resources from other layers
- Modules accept dependencies as inputs (service account emails, repository URLs)
- Modules are layer-agnostic (can be used in any layer)

---

## 4. State Management Plan

### 4.1 Backend Strategy

**Selected Approach:** Google Cloud Storage (GCS) backend with state locking

**Rationale:**

- **Reliability:** GCS provides durable, versioned storage for Terraform state
- **Locking:** GCS backend supports state locking (prevents concurrent modifications)
- **Access Control:** IAM-based access control for state files
- **Versioning:** GCS versioning provides state file history
- **Cost:** Minimal cost for state file storage (within free tier for small projects)

**Backend Configuration:**

```hcl
terraform {
  backend "gcs" {
    bucket = "rates-terraform-state"
    prefix = "foundation/"  # or "application/dev/", "application/prod/"
  }
}
```

### 4.2 Bucket Design

**Selected Approach:** Single bucket with prefix-based separation

**Bucket Name:** `rates-terraform-state`

**Prefix Structure:**

- `bootstrap/` - Bootstrap layer state (if stored in GCS)
- `foundation/` - Foundation layer state
- `application/dev/` - Dev environment application state
- `application/prod/` - Prod environment application state

**Rationale:**

- **Simplicity:** Single bucket is easier to manage than multiple buckets
- **Cost Efficiency:** Single bucket reduces storage overhead
- **Access Control:** IAM conditions can restrict access by prefix
- **Consistency:** All state files in one place simplifies backup and disaster recovery

**Alternative Considered:** Multiple buckets (`rates-terraform-state-foundation`, `rates-terraform-state-dev`, `rates-terraform-state-prod`)

**Rejected Because:**

- Increased operational overhead (multiple buckets to manage)
- No significant security benefit (IAM conditions provide sufficient isolation)
- More complex backup and disaster recovery procedures

### 4.3 State File Naming

**Convention:** `terraform.tfstate` (standard Terraform naming)

**Location:** Determined by backend prefix:

- `bootstrap/terraform.tfstate`
- `foundation/terraform.tfstate`
- `application/dev/terraform.tfstate`
- `application/prod/terraform.tfstate`

**Rationale:**

- Standard Terraform naming convention
- Prefix provides context (no ambiguity about which state file)
- Simple and predictable

### 4.4 Locking Strategy

**Mechanism:** Cloud Storage backend automatic locking

**How it works:**

- Terraform creates a lock file (`terraform.tfstate.lock.info`) in the same GCS prefix
- Lock file prevents concurrent `terraform apply` operations
- Lock is automatically released when `terraform apply` completes (success or failure)
- Manual lock release: `terraform force-unlock <lock-id>`

**Lock File Location:**

- `bootstrap/terraform.tfstate.lock.info`
- `foundation/terraform.tfstate.lock.info`
- `application/dev/terraform.tfstate.lock.info`
- `application/prod/terraform.tfstate.lock.info`

**Access Control:**

- Only users/service accounts with `roles/storage.objectAdmin` on the state bucket can acquire locks
- IAM conditions can restrict lock access by prefix (e.g., dev users cannot lock prod state)

### 4.5 State File Security

**Encryption:**

- GCS bucket encryption at rest (automatic with Google-managed keys)
- Option: Customer-managed encryption keys (CMEK) for additional security (not required for MVP)

**Access Control:**

- **Bootstrap State:** Infrastructure team only (`roles/storage.objectAdmin` on `bootstrap/` prefix)
- **Foundation State:** Infrastructure team only (`roles/storage.objectAdmin` on `foundation/` prefix)
- **Application State (Dev):** Developers + Infrastructure team (`roles/storage.objectAdmin` on `application/dev/` prefix)
- **Application State (Prod):** Production administrators + Infrastructure team (`roles/storage.objectAdmin` on `application/prod/` prefix)

**IAM Conditions Example:**

```yaml
Condition:
  resource.name.startsWith: 'projects/_/buckets/rates-terraform-state/objects/application/dev/'
```

**Audit Logging:**

- Cloud Audit Logs capture all state file access (read, write, delete)
- Logs include identity, operation, and timestamp
- Access restricted to production administrators

### 4.6 State File Backup and Disaster Recovery

**Versioning:**

- GCS bucket versioning enabled (automatic state file history)
- Previous versions retained for 30 days (configurable)
- Can restore previous state file version if corruption occurs

**Backup Strategy:**

- **Automatic:** GCS versioning provides automatic backups
- **Manual:** Periodic exports to separate backup bucket (optional, for long-term retention)
- **Disaster Recovery:** State files can be recreated from infrastructure (Terraform import) if bucket is lost

**State File Recovery Process:**

1. Identify lost state file (from audit logs or manual detection)
2. Restore from GCS versioning (if available)
3. OR: Recreate state via `terraform import` (if versioning unavailable)
4. Verify state file integrity (`terraform plan` should show no changes)

---

## 5. Dependency Management

### 5.1 Layer Dependencies

**Dependency Flow:**

```
Layer 2 (Application) → Layer 1 (Foundation) → Layer 0 (Bootstrap)
```

**Dependency Rules:**

- Higher layers depend on lower layers
- Lower layers must be created before higher layers
- Lower layers cannot reference higher layers (prevents circular dependencies)

### 5.2 Dependency Injection Strategy

**Selected Approach:** Explicit variable injection via Terraform outputs

**How it works:**

1. Lower layer outputs values (service account emails, repository URLs, etc.)
2. Higher layer reads outputs via `terraform_remote_state` data source
3. Higher layer injects outputs as module variables or resource attributes

**Example (Foundation → Application):**

```hcl
# Foundation layer outputs
output "dev_cloud_run_sa_email" {
  value = module.dev_cloud_run_sa.email
}

# Application layer (dev) reads foundation outputs
data "terraform_remote_state" "foundation" {
  backend = "gcs"
  config = {
    bucket = "rates-terraform-state"
    prefix = "foundation/"
  }
}

# Application layer uses foundation outputs
module "dev_api" {
  source = "../../modules/cloud-run"

  service_account_email = data.terraform_remote_state.foundation.outputs.dev_cloud_run_sa_email
  # ... other configuration
}
```

**Rationale:**

- **Explicit:** Dependencies are clearly visible in code
- **Safe:** No risk of circular dependencies (lower layers cannot reference higher layers)
- **Testable:** Can test layers independently by mocking remote state
- **Versioned:** State file outputs are versioned (changes are tracked)

**Alternative Considered:** Direct resource references (e.g., `module.foundation.dev_cloud_run_sa.email`)

**Rejected Because:**

- Requires all layers in same Terraform configuration (monolithic state file)
- Violates layer separation principle
- Increases blast radius (application changes could affect foundation state)

### 5.3 Remote State Data Source

**Data Source:** `terraform_remote_state`

**Configuration:**

```hcl
data "terraform_remote_state" "foundation" {
  backend = "gcs"
  config = {
    bucket = "rates-terraform-state"
    prefix = "foundation/"
  }
}
```

**Access Pattern:**

```hcl
# Access foundation outputs
data.terraform_remote_state.foundation.outputs.dev_cloud_run_sa_email
data.terraform_remote_state.foundation.outputs.dev_artifact_registry_url
```

**Security:**

- Remote state data source requires read access to state bucket
- IAM conditions can restrict read access by prefix
- Audit logs capture all remote state reads

**Limitations:**

- Remote state data source reads entire state file (not just outputs)
- State file must exist (foundation layer must be applied before application layer)
- No automatic dependency detection (must manually ensure layer order)

### 5.4 Dependency Validation

**Preconditions:**

- Terraform `precondition` blocks validate that dependencies exist
- Example: Application layer validates that foundation service accounts exist before creating Cloud Run services

**Example:**

```hcl
resource "google_cloud_run_service" "dev_api" {
  # ... configuration ...

  lifecycle {
    precondition {
      condition     = data.terraform_remote_state.foundation.outputs.dev_cloud_run_sa_email != null
      error_message = "Foundation layer must be applied before application layer. Service account does not exist."
    }
  }
}
```

**Manual Validation:**

- Documentation specifies layer application order
- CI/CD pipelines enforce layer order (bootstrap → foundation → application)
- Manual runbooks include dependency checks

---

## 6. Variables, Secrets, and Configuration Boundaries

### 6.1 Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Runtime Configuration (Application Code)                 │
│ - Environment variables in Cloud Run                     │
│ - Secret Manager secrets (accessed at runtime)           │
│ - Firebase configuration (from client SDK)               │
└─────────────────────────────────────────────────────────┘
                          ↑ injected via
┌─────────────────────────────────────────────────────────┐
│ Infrastructure Configuration (Terraform)                │
│ - Resource names, regions, project IDs                   │
│ - Service account emails, repository URLs                │
│ - IAM role bindings, resource limits                     │
│ - Secret references (not secret values)                  │
└─────────────────────────────────────────────────────────┘
                          ↑ defined in
┌─────────────────────────────────────────────────────────┐
│ Terraform Variables (terraform.tfvars)                  │
│ - Environment-specific values (dev vs prod)             │
│ - Project IDs, regions, resource names                  │
│ - Non-sensitive configuration                            │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Terraform Variables

**What belongs in Terraform variables:**

- **Resource identifiers:** Project ID, region, resource names
- **Configuration values:** CPU, memory, concurrency limits, timeout values
- **References:** Service account emails, repository URLs (from other layers)
- **Environment identifiers:** Environment name (`dev`, `prod`)
- **Non-sensitive settings:** Ingress settings, API enablement flags

**What does NOT belong in Terraform variables:**

- **Secret values:** Firebase service account JSON, nonce secrets, API keys
- **Credentials:** Service account keys, passwords, tokens
- **Sensitive configuration:** Any value that should not be stored in Terraform state

**Variable Organization:**

```hcl
# variables.tf
variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "environment" {
  type        = string
  description = "Environment identifier (dev or prod)"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "region" {
  type        = string
  description = "GCP Region"
  default     = "us-central1"
}

# terraform.tfvars (environment-specific)
project_id  = "rates-production"
environment = "dev"
region      = "us-central1"
```

### 6.3 Secret Manager Secrets

**What belongs in Secret Manager:**

- **Firebase service account JSON:** Required for Firebase Admin SDK initialization
- **Nonce secrets:** Shared secrets between applications
- **API keys:** Third-party API keys (if needed)
- **Database credentials:** If Cloud SQL is added later
- **Any sensitive value:** Passwords, tokens, private keys

**Secret Lifecycle:**

1. **Creation:** Secret created via Terraform (or manually) with initial version
2. **Value Management:** Secret values created/updated manually via `gcloud` or Secret Manager API
3. **Access:** Secrets accessed at runtime by Cloud Run service (via Secret Manager client library)
4. **Rotation:** New secret version created, Cloud Run service updated to reference new version

**Terraform Role:**

- Terraform creates Secret Manager secret resources (not secret values)
- Terraform configures IAM bindings for secret access
- Terraform references secrets in Cloud Run environment variables (as secret references, not values)

**Example:**

```hcl
# Terraform creates secret resource (not value)
resource "google_secret_manager_secret" "firebase_sa" {
  secret_id = "rates-dev-firebase-sa"
  project   = var.project_id
}

# Secret value created manually:
# gcloud secrets versions add rates-dev-firebase-sa --data-file=firebase-sa.json

# Terraform references secret in Cloud Run (as environment variable)
resource "google_cloud_run_service" "api" {
  # ... configuration ...

  template {
    spec {
      containers {
        env {
          name  = "FIREBASE_SERVICE_ACCOUNT_SECRET"
          value = "rates-dev-firebase-sa"
        }
      }
    }
  }
}
```

### 6.4 Runtime Configuration

**What belongs in runtime configuration (application code):**

- **Secret access:** Application reads secrets from Secret Manager at runtime
- **Environment-specific logic:** Application determines environment from configuration
- **Client-side configuration:** Firebase client SDK configuration (from environment variables or config files)

**Separation:**

- **Infrastructure (Terraform):** Creates resources, configures IAM, references secrets
- **Application (Code):** Reads secrets, implements business logic, handles runtime configuration

**Example (Node.js):**

```javascript
// Application reads secret at runtime
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

const secretName = process.env.FIREBASE_SERVICE_ACCOUNT_SECRET; // From Terraform
const [version] = await client.accessSecretVersion({
  name: `projects/rates-production/secrets/${secretName}/versions/latest`,
});
const firebaseSaJson = JSON.parse(version.payload.data.toString());
```

### 6.5 Configuration Boundaries Summary

| Configuration Type      | Storage Location    | Managed By    | Example                                                 |
| ----------------------- | ------------------- | ------------- | ------------------------------------------------------- |
| Resource names, regions | Terraform variables | Terraform     | `project_id = "rates-production"`                       |
| Service account emails  | Terraform outputs   | Terraform     | `dev_cloud_run_sa_email`                                |
| Secret values           | Secret Manager      | Manual/gcloud | Firebase SA JSON                                        |
| Secret references       | Terraform variables | Terraform     | `FIREBASE_SERVICE_ACCOUNT_SECRET=rates-dev-firebase-sa` |
| Runtime configuration   | Application code    | Application   | Environment-specific logic                              |
| IAM bindings            | Terraform           | Terraform     | Role bindings with conditions                           |

---

## 7. Anti-Patterns to Avoid

### 7.1 State File Anti-Patterns

**❌ FORBIDDEN: Sharing state files between applications**

- **Anti-Pattern:** Single state file for dev and prod environments
- **Why Forbidden:** Increases risk of accidental cross-environment modifications
- **Correct Approach:** Separate state files per environment (`application/dev/` and `application/prod/`)

**❌ FORBIDDEN: Monolithic state file (all layers in one state)**

- **Anti-Pattern:** Single state file containing bootstrap, foundation, and application resources
- **Why Forbidden:** Violates blast radius control (application changes could affect foundation)
- **Correct Approach:** Separate state files per layer (bootstrap, foundation, application)

**❌ FORBIDDEN: Local state files in production**

- **Anti-Pattern:** Using local backend for production infrastructure
- **Why Forbidden:** Local state files are not shared, cannot be locked, and are easily lost
- **Correct Approach:** GCS backend for all production state files

### 7.2 Cross-Layer Anti-Patterns

**❌ FORBIDDEN: Cross-layer resource creation**

- **Anti-Pattern:** Application layer creating foundation resources (e.g., service accounts)
- **Why Forbidden:** Violates layer separation, increases blast radius
- **Correct Approach:** Foundation layer creates resources, application layer references them via remote state

**❌ FORBIDDEN: Lower layers referencing higher layers**

- **Anti-Pattern:** Foundation layer referencing application layer resources
- **Why Forbidden:** Creates circular dependencies, violates dependency flow
- **Correct Approach:** Unidirectional dependency flow (higher → lower)

**❌ FORBIDDEN: Direct resource references across state files**

- **Anti-Pattern:** `resource "google_service_account" "sa" { ... }` in application layer
- **Why Forbidden:** Creates resources in wrong layer, violates separation
- **Correct Approach:** Use `terraform_remote_state` to read foundation outputs

### 7.3 Module Anti-Patterns

**❌ FORBIDDEN: Hardcoding environment-specific values in modules**

- **Anti-Pattern:** Module with hardcoded `environment = "dev"` or `project_id = "rates-production"`
- **Why Forbidden:** Modules should be reusable across environments
- **Correct Approach:** Pass environment and project ID as variables

**❌ FORBIDDEN: Modules creating resources from other layers**

- **Anti-Pattern:** Cloud Run module creating service accounts
- **Why Forbidden:** Violates layer separation, modules should be layer-agnostic
- **Correct Approach:** Modules accept dependencies as inputs (service account email)

**❌ FORBIDDEN: Over-abstraction (modules for single-use resources)**

- **Anti-Pattern:** Module for a single Secret Manager secret with no additional logic
- **Why Forbidden:** Adds complexity without value
- **Correct Approach:** Use Terraform resource directly, or create module only if pattern is reused

### 7.4 Security Anti-Patterns

**❌ FORBIDDEN: Storing secret values in Terraform variables or state**

- **Anti-Pattern:** `variable "firebase_sa_json" { sensitive = true }` with secret value in `terraform.tfvars`
- **Why Forbidden:** Secret values stored in Terraform state (even if marked sensitive)
- **Correct Approach:** Store secrets in Secret Manager, reference in Terraform

**❌ FORBIDDEN: Using default service accounts**

- **Anti-Pattern:** Cloud Run service using default Compute Engine service account
- **Why Forbidden:** Violates least-privilege principle, default SA has overly broad permissions
- **Correct Approach:** Create dedicated service accounts per component (enforced in modules)

**❌ FORBIDDEN: Project-level IAM bindings without conditions**

- **Anti-Pattern:** `roles/secretmanager.secretAccessor` on project without IAM conditions
- **Why Forbidden:** Allows access to all secrets, violates environment isolation
- **Correct Approach:** IAM conditions restrict access to environment-specific resources

### 7.5 Environment Management Anti-Patterns

**❌ FORBIDDEN: Terraform workspaces for environment separation**

- **Anti-Pattern:** Using `terraform workspace select dev` for environment switching
- **Why Forbidden:** Workspaces are error-prone (easy to forget workspace context), less explicit
- **Correct Approach:** Directory-based separation (`application/dev/` and `application/prod/`)

**❌ FORBIDDEN: Environment-specific values in shared modules**

- **Anti-Pattern:** Module with `if var.environment == "dev"` logic
- **Why Forbidden:** Modules should be environment-agnostic, environment logic belongs in layer configurations
- **Correct Approach:** Pass environment-specific values as variables, handle logic in layer configurations

**❌ FORBIDDEN: Cross-environment resource references**

- **Anti-Pattern:** Dev application referencing prod service accounts
- **Why Forbidden:** Violates environment isolation, increases risk of accidental prod modifications
- **Correct Approach:** Each environment references its own resources (enforced via IAM conditions)

### 7.6 General Anti-Patterns

**❌ FORBIDDEN: Manual resource modifications without Terraform**

- **Anti-Pattern:** Modifying Cloud Run service via `gcloud` without updating Terraform
- **Why Forbidden:** Causes Terraform state drift, manual changes will be overwritten
- **Correct Approach:** All infrastructure changes via Terraform (except secret values)

**❌ FORBIDDEN: Terraform state file in version control**

- **Anti-Pattern:** Committing `terraform.tfstate` to Git repository
- **Why Forbidden:** State files may contain sensitive data, should not be version controlled
- **Correct Approach:** Use remote backend (GCS), add `*.tfstate` to `.gitignore`

**❌ FORBIDDEN: Disabling state locking**

- **Anti-Pattern:** `backend "gcs" { ... }` without locking enabled
- **Why Forbidden:** Allows concurrent modifications, can corrupt state file
- **Correct Approach:** Use GCS backend with automatic locking (default behavior)

---

## 8. Implementation Roadmap

### 8.1 Phase 1: Bootstrap (One-Time Setup)

**Tasks:**

1. Create GCS bucket for Terraform state (`rates-terraform-state`)
2. Configure bucket versioning and lifecycle policies
3. Set up bucket IAM (infrastructure team access)
4. Document bootstrap process

**Deliverables:**

- `infra/environments/bootstrap/` directory with Terraform configuration
- Bootstrap state file (local or in separate meta bucket)
- Documentation for bootstrap process

### 8.2 Phase 2: Foundation Layer

**Tasks:**

1. Create Terraform modules (`modules/service-account/`, `modules/artifact-registry/`)
2. Create foundation layer configuration (`infra/environments/foundation/`)
3. Implement service accounts (dev and prod: Cloud Run + Cloud Build)
4. Implement Artifact Registry repositories (dev and prod)
5. Implement IAM role bindings with environment-specific conditions
6. Test foundation layer deployment

**Deliverables:**

- Foundation layer Terraform configuration
- Foundation state file in GCS (`foundation/terraform.tfstate`)
- Service accounts and repositories created in GCP

### 8.3 Phase 3: Application Layer (Dev)

**Tasks:**

1. Create Terraform modules (`modules/cloud-run/`, `modules/secret/`)
2. Create dev application layer configuration (`infra/environments/application/dev/`)
3. Implement Cloud Run service for dev environment
4. Implement Secret Manager secrets (dev)
5. Implement Firebase Hosting sites (dev)
6. Test dev application deployment

**Deliverables:**

- Dev application layer Terraform configuration
- Dev state file in GCS (`application/dev/terraform.tfstate`)
- Dev Cloud Run service, secrets, and Firebase Hosting sites created

### 8.4 Phase 4: Application Layer (Prod)

**Tasks:**

1. Create prod application layer configuration (`infra/environments/application/prod/`)
2. Implement Cloud Run service for prod environment
3. Implement Secret Manager secrets (prod)
4. Implement Firebase Hosting sites (prod)
5. Test prod application deployment
6. Implement production guardrails (branch protection, manual approval)

**Deliverables:**

- Prod application layer Terraform configuration
- Prod state file in GCS (`application/prod/terraform.tfstate`)
- Prod Cloud Run service, secrets, and Firebase Hosting sites created

### 8.5 Phase 5: CI/CD Integration

**Tasks:**

1. Create Cloud Build configuration for Terraform deployments
2. Implement branch-based deployment (develop → dev, main → prod)
3. Implement Terraform state locking in CI/CD
4. Implement manual approval for prod deployments
5. Document CI/CD process

**Deliverables:**

- Cloud Build configuration files
- CI/CD pipeline documentation
- Deployment runbooks

---

## 9. Document Governance

**Change Process:**

1. Any deviation from this architecture requires formal review
2. Changes must be approved by Lead DevOps Engineer and Infrastructure Architect
3. Terraform implementations must reference this document
4. All changes must maintain layer separation and blast radius control

**Review Cycle:**

- This document is locked for Terraform implementation phase
- Post-MVP review may consider additional layers or modules if requirements change
- All amendments must maintain safety and maintainability principles

---

## 10. Summary

**Key Decisions:**

1. **Three-Layer Architecture:** Bootstrap → Foundation → Application (independent state files)
2. **Directory-Based Environment Separation:** `application/dev/` and `application/prod/` (not workspaces)
3. **Single State Bucket with Prefixes:** `rates-terraform-state` with prefix-based separation
4. **Explicit Dependency Injection:** `terraform_remote_state` for layer dependencies
5. **Module Strategy:** Modules only for reusable, complex, or standards-enforcing patterns
6. **Configuration Boundaries:** Terraform for infrastructure, Secret Manager for secrets, application code for runtime config

**Layer Responsibilities:**

- **Layer 0 (Bootstrap):** Terraform state bucket, one-time setup
- **Layer 1 (Foundation):** Service accounts, Artifact Registry, shared IAM (both environments)
- **Layer 2 (Application):** Cloud Run services, Firebase Hosting, environment-specific secrets (per environment)

**State Management:**

- **Backend:** GCS with automatic locking
- **Bucket:** Single bucket (`rates-terraform-state`) with prefix-based separation
- **Security:** IAM-based access control with prefix conditions

**Next Steps:**

1. Create `infra/` directory structure
2. Implement bootstrap layer
3. Implement foundation layer
4. Implement application layers (dev, then prod)
5. Integrate with CI/CD pipeline

---

**Document End**

This Terraform design document represents the final, locked architecture for the Rates monorepo infrastructure. All Terraform implementations must adhere to the layer separation, state management, and module strategy defined herein.
