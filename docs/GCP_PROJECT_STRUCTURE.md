# GCP Project and Environment Structure

## Professional Cloud Architect (PCA) - Infrastructure Hierarchy Design

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Decision Type:** Project Structure & Environment Strategy  
**Status:** Final - Source of Truth for Terraform Implementation

---

## Executive Summary

This document defines the GCP project hierarchy, environment separation strategy, and resource naming conventions for the Rates monorepo deployment. The design balances **operational simplicity** for a small team under Free Tier constraints with **sufficient isolation** to prevent accidental production impact.

**Selected Strategy:** **Single Project with Namespace-Based Environment Separation** (Strategy B)

**Rationale:** For a small team or single developer operating under Free Tier constraints without a Google Cloud Organization node, a single project with strict naming conventions and IAM-based isolation provides the optimal balance of simplicity and safety. This structure can evolve into a multi-project model as requirements grow.

---

## 1. Strategy Evaluation

### 1.1 Strategy A: Multi-Project Model (Enterprise)

**Structure:**

- Separate GCP Projects: `rates-dev` and `rates-prod`
- Each project has independent billing, IAM, and resource isolation
- Complete separation of dev and production environments

**Pros:**

- ✅ **Strong isolation:** Production resources cannot be accidentally modified from dev context
- ✅ **Reduced blast radius:** Dev environment issues cannot impact production
- ✅ **Clear boundaries:** Explicit project-level separation prevents confusion
- ✅ **Independent billing:** Separate cost tracking per environment
- ✅ **Compliance-friendly:** Easier to meet regulatory requirements for production isolation

**Cons:**

- ❌ **Increased operational overhead:** Two projects to manage, two sets of service accounts, two sets of secrets
- ❌ **Potential cost duplication:** Some services (e.g., Artifact Registry) may incur costs in both projects
- ❌ **Harder secret sharing:** Secrets must be duplicated or managed across projects
- ❌ **Complex Terraform state:** Requires separate state files or workspace management
- ❌ **Free Tier fragmentation:** Free tier quotas are per-project, but usage is split across projects
- ❌ **Deployment complexity:** CI/CD pipelines must target correct project based on branch/environment

**Verdict:** **REJECTED** for MVP/small team use case. Overhead outweighs benefits at current scale.

---

### 1.2 Strategy B: Single Project with Namespace Model

**Structure:**

- Single GCP Project: `rates-production`
- Environment separation via resource naming conventions and IAM policies
- Logical isolation through service accounts, IAM roles, and naming prefixes

**Pros:**

- ✅ **Operational simplicity:** Single project to manage, unified billing, single Terraform state
- ✅ **Minimal overhead:** One set of service accounts, shared secrets, unified configuration
- ✅ **Free Tier optimization:** All free tier quotas consolidated in one project
- ✅ **Simpler CI/CD:** Single project target, environment determined by resource naming
- ✅ **Easier secret management:** Secrets stored once, accessed via IAM-based permissions
- ✅ **Unified observability:** All logs and metrics in one project

**Cons:**

- ❌ **Higher risk of accidental production impact:** Requires strict IAM guardrails
- ❌ **Shared billing:** Cannot separate dev/prod costs at project level (can use labels)
- ❌ **No project-level isolation:** All resources share the same project boundary

**Verdict:** **SELECTED** for MVP/small team use case. Risks mitigated through strict IAM policies and naming conventions.

---

## 2. Selected Strategy: Single Project with Namespace Model

### 2.1 Decision

**Strategy:** Single GCP Project with namespace-based environment separation

**Rationale:**

1. **Free Tier Optimization:** All free tier quotas (Cloud Run, Firestore, Firebase Hosting, etc.) are consolidated in a single project, maximizing free tier utilization.

2. **Operational Simplicity:** A small team or single developer benefits from:
   - Single project to configure and manage
   - Unified Terraform state (no workspace complexity)
   - Single set of service accounts and IAM policies
   - Simplified CI/CD pipeline (one project target)

3. **Cost Efficiency:** No duplication of services across projects. Shared resources (Artifact Registry, Secret Manager) are used once.

4. **Risk Mitigation:** The primary risk (accidental production impact) is addressed through:
   - **Strict IAM policies:** Dev service accounts cannot modify production resources
   - **Naming conventions:** Clear resource naming prevents confusion
   - **Terraform state separation:** Separate state files per environment (logical separation)
   - **CI/CD guardrails:** Branch-based deployment rules prevent accidental production deploys

5. **Growth Path:** The structure can evolve to multi-project by:
   - Creating new projects (`rates-dev`, `rates-staging`, `rates-prod`)
   - Migrating resources using Terraform state import
   - Maintaining the same naming conventions across projects

---

## 3. Hierarchy Diagram

```
[Billing Account: rates-billing]
│
└── [GCP Project: rates-production]
    │
    ├── [Environment: dev]
    │   ├── Cloud Run: rates-dev-api-us-central1
    │   ├── Firebase Hosting: rates-dev-main-app
    │   ├── Firebase Hosting: rates-dev-auth-app
    │   ├── Firestore: (default) [dev data via naming]
    │   ├── Secret Manager: rates-dev-firebase-sa
    │   ├── Secret Manager: rates-dev-nonce-secret
    │   ├── Artifact Registry: rates-dev-containers (us-central1)
    │   ├── Service Account: rates-dev-cloud-run-sa@rates-production.iam.gserviceaccount.com
    │   └── Service Account: rates-dev-cloud-build-sa@rates-production.iam.gserviceaccount.com
    │
    └── [Environment: prod]
        ├── Cloud Run: rates-prod-api-us-central1
        ├── Firebase Hosting: rates-prod-main-app
        ├── Firebase Hosting: rates-prod-auth-app
        ├── Firestore: (default) [prod data via naming]
        ├── Secret Manager: rates-prod-firebase-sa
        ├── Secret Manager: rates-prod-nonce-secret
        ├── Artifact Registry: rates-prod-containers (us-central1)
        ├── Service Account: rates-prod-cloud-run-sa@rates-production.iam.gserviceaccount.com
        └── Service Account: rates-prod-cloud-build-sa@rates-production.iam.gserviceaccount.com
```

**Key Characteristics:**

- **Single Project:** `rates-production` (all environments share the project)
- **Environment Separation:** Achieved via resource naming prefixes (`rates-dev-*` vs `rates-prod-*`)
- **Logical Isolation:** IAM policies restrict dev service accounts from accessing prod resources
- **Shared Infrastructure:** Some services (Cloud Logging, Cloud Billing) are project-wide

---

## 4. Resource Naming Standard

### 4.1 Naming Convention Format

**Pattern:** `{app}-{env}-{component}-{region}`

**Components:**

- `{app}`: Application identifier (always `rates`)
- `{env}`: Environment identifier (`dev`, `prod`)
- `{component}`: Resource type/name (e.g., `api`, `main-app`, `auth-app`, `containers`, `firebase-sa`)
- `{region}`: GCP region (e.g., `us-central1`, `europe-west1`) - **only when required by resource type**

### 4.2 Naming Examples

#### Cloud Run Services

- **Format:** `rates-{env}-api-{region}`
- **Examples:**
  - `rates-dev-api-us-central1`
  - `rates-prod-api-us-central1`

#### Firebase Hosting Sites

- **Format:** `rates-{env}-{app-name}`
- **Examples:**
  - `rates-dev-main-app`
  - `rates-dev-auth-app`
  - `rates-prod-main-app`
  - `rates-prod-auth-app`

#### Secret Manager Secrets

- **Format:** `rates-{env}-{secret-name}`
- **Examples:**
  - `rates-dev-firebase-sa`
  - `rates-dev-nonce-secret`
  - `rates-prod-firebase-sa`
  - `rates-prod-nonce-secret`

#### Artifact Registry Repositories

- **Format:** `rates-{env}-containers`
- **Examples:**
  - `rates-dev-containers`
  - `rates-prod-containers`

#### Service Accounts

- **Format:** `rates-{env}-{service}-sa`
- **Examples:**
  - `rates-dev-cloud-run-sa`
  - `rates-dev-cloud-build-sa`
  - `rates-prod-cloud-run-sa`
  - `rates-prod-cloud-build-sa`
- **Full Email Format:** `rates-{env}-{service}-sa@rates-production.iam.gserviceaccount.com`

#### Firestore Collections

- **Format:** Collections use environment prefix in data model (not resource name)
- **Examples:**
  - `financialAccounts` (environment determined by Firebase project configuration or data isolation via security rules)
  - **Note:** Firestore is project-scoped; environment separation achieved via application logic or security rules

### 4.3 Naming Rules

1. **Lowercase only:** All resource names must be lowercase
2. **Hyphen-separated:** Use hyphens (`-`) to separate components
3. **No underscores:** Underscores are not allowed in GCP resource names
4. **Length limits:** Respect GCP resource name length limits (varies by service)
5. **Environment prefix required:** All resources must include environment identifier
6. **Region suffix:** Only include region when required by resource type (Cloud Run, Artifact Registry)

### 4.4 Terraform Enforcement

Terraform must enforce naming conventions via:

- **Variable validation:** Environment variable must be one of `["dev", "prod"]`
- **Local values:** Construct resource names using `local.resource_name = "rates-${var.environment}-${var.component}-${var.region}"`
- **Validation rules:** Terraform `validation` blocks to ensure naming pattern compliance

---

## 5. Isolation Implementation

### 5.1 IAM Strategy

#### 5.1.1 Service Account Design

**Dev Environment Service Accounts:**

- `rates-dev-cloud-run-sa@rates-production.iam.gserviceaccount.com`
  - **Roles:**
    - `roles/secretmanager.secretAccessor` (limited to `rates-dev-*` secrets via IAM conditions)
    - `roles/firebase.admin` (limited to dev Firebase project/app via IAM conditions)
- `rates-dev-cloud-build-sa@rates-production.iam.gserviceaccount.com`
  - **Roles:**
    - `roles/artifactregistry.writer` (limited to `rates-dev-containers` repository)
    - `roles/run.admin` (limited to `rates-dev-*` Cloud Run services via IAM conditions)
    - `roles/firebase.admin` (limited to dev Firebase sites via IAM conditions)

**Prod Environment Service Accounts:**

- `rates-prod-cloud-run-sa@rates-production.iam.gserviceaccount.com`
  - **Roles:**
    - `roles/secretmanager.secretAccessor` (limited to `rates-prod-*` secrets via IAM conditions)
    - `roles/firebase.admin` (limited to prod Firebase project/app via IAM conditions)
- `rates-prod-cloud-build-sa@rates-production.iam.gserviceaccount.com`
  - **Roles:**
    - `roles/artifactregistry.writer` (limited to `rates-prod-containers` repository)
    - `roles/run.admin` (limited to `rates-prod-*` Cloud Run services via IAM conditions)
    - `roles/firebase.admin` (limited to prod Firebase sites via IAM conditions)

#### 5.1.2 IAM Conditions for Resource Isolation

**Secret Manager Isolation:**

```yaml
Condition:
  resource.name.startsWith: 'projects/*/secrets/rates-{env}-'
```

**Cloud Run Isolation:**

```yaml
Condition:
  resource.name.startsWith: 'projects/*/locations/*/services/rates-{env}-'
```

**Artifact Registry Isolation:**

```yaml
Condition:
  resource.name.startsWith: 'projects/*/locations/*/repositories/rates-{env}-'
```

**Firebase Hosting Isolation:**

```yaml
Condition:
  resource.name.startsWith: 'projects/*/sites/rates-{env}-'
```

#### 5.1.3 Human User IAM Roles

**Developers (Dev Access Only):**

- **Role:** `roles/viewer` (project-wide read access)
- **Additional Permissions:**
  - `roles/run.developer` (limited to `rates-dev-*` services via IAM conditions)
  - `roles/artifactregistry.reader` (limited to `rates-dev-containers` via IAM conditions)
  - `roles/secretmanager.secretAccessor` (limited to `rates-dev-*` secrets via IAM conditions)

**Production Administrators:**

- **Role:** `roles/editor` (project-wide, but should use service accounts for deployments)
- **Additional Permissions:**
  - `roles/run.admin` (limited to `rates-prod-*` services via IAM conditions)
  - `roles/artifactregistry.writer` (limited to `rates-prod-containers` via IAM conditions)
  - `roles/secretmanager.secretAccessor` (limited to `rates-prod-*` secrets via IAM conditions)

**CI/CD Service Account (Cloud Build):**

- Uses environment-specific service account based on branch/trigger:
  - `main` branch → `rates-prod-cloud-build-sa`
  - `develop` branch → `rates-dev-cloud-build-sa`

### 5.2 Logical Isolation Mechanisms

#### 5.2.1 Resource Naming

- **All resources** must include environment prefix (`rates-dev-*` or `rates-prod-*`)
- **Terraform state files** are separated by environment (e.g., `terraform-dev.tfstate`, `terraform-prod.tfstate`)
- **CI/CD pipelines** use environment-specific variables and service accounts

#### 5.2.2 Firestore Data Isolation

**Option A: Collection-Level Separation (Recommended)**

- Use environment prefix in collection names:
  - Dev: `dev_financialAccounts`, `dev_paymentPeriods`
  - Prod: `prod_financialAccounts`, `prod_paymentPeriods`
- Firestore security rules enforce environment-based access

**Option B: Single Collections with Environment Field**

- Add `environment` field to documents
- Firestore security rules filter by `environment` field
- **Risk:** Higher chance of data leakage if rules misconfigured

**Selected:** **Option A** (Collection-Level Separation) for stronger isolation.

#### 5.2.3 Firebase Hosting Isolation

- Separate Firebase Hosting sites per environment:
  - `rates-dev-main-app`
  - `rates-dev-auth-app`
  - `rates-prod-main-app`
  - `rates-prod-auth-app`
- Each site has independent deployment configuration

#### 5.2.4 Secret Manager Isolation

- Secrets are environment-specific:
  - `rates-dev-firebase-sa`
  - `rates-dev-nonce-secret`
  - `rates-prod-firebase-sa`
  - `rates-prod-nonce-secret`
- IAM conditions prevent cross-environment access

### 5.3 Network Isolation

**Not Required:** All services use public internet access. No VPC or private networking needed per ADR-012.

**Future Consideration:** If private networking is required later, VPCs can be created with environment-specific naming:

- `rates-dev-vpc`
- `rates-prod-vpc`

---

## 6. Prerequisites

### 6.1 GCP APIs to Enable

The following APIs must be enabled in the `rates-production` project before Terraform deployment:

#### Required APIs (Core Services)

1. **Cloud Run API** (`run.googleapis.com`)
   - Purpose: Deploy Cloud Run services for auth-app API endpoint
   - Required for: `rates-{env}-api-{region}` services

2. **Firebase API** (`firebase.googleapis.com`)
   - Purpose: Enable Firebase services (Hosting, Authentication, Firestore)
   - Required for: Firebase Hosting sites, Firebase Authentication, Cloud Firestore

3. **Cloud Firestore API** (`firestore.googleapis.com`)
   - Purpose: Enable Cloud Firestore database
   - Required for: Database storage for financial accounts and payment periods

4. **Secret Manager API** (`secretmanager.googleapis.com`)
   - Purpose: Store and manage secrets (service account credentials, nonce secrets)
   - Required for: `rates-{env}-firebase-sa`, `rates-{env}-nonce-secret` secrets

5. **Artifact Registry API** (`artifactregistry.googleapis.com`)
   - Purpose: Store container images for Cloud Run
   - Required for: `rates-{env}-containers` repositories

6. **Cloud Build API** (`cloudbuild.googleapis.com`) - **Optional but Recommended**
   - Purpose: CI/CD pipeline automation
   - Required for: Automated deployments via Cloud Build triggers

7. **Cloud Resource Manager API** (`cloudresourcemanager.googleapis.com`)
   - Purpose: Project and resource management
   - Required for: Terraform state management, IAM operations

8. **Identity and Access Management API** (`iam.googleapis.com`)
   - Purpose: Service account and IAM policy management
   - Required for: Service account creation, IAM role bindings

9. **Service Usage API** (`serviceusage.googleapis.com`)
   - Purpose: Enable/disable APIs programmatically
   - Required for: Terraform API enablement

#### Optional APIs (Observability)

10. **Cloud Logging API** (`logging.googleapis.com`)
    - Purpose: Log collection and viewing
    - **Note:** Enabled automatically with Cloud Run and Firebase services
    - Required for: Application log access

11. **Cloud Monitoring API** (`monitoring.googleapis.com`) - **Rejected for MVP**
    - Purpose: Metrics and alerting
    - **Status:** Not required per ADR-009 (Cloud Logging sufficient for MVP)

### 6.2 Billing Account

- **Requirement:** Billing account must be linked to `rates-production` project
- **Purpose:** Enable paid services if free tier is exceeded
- **Note:** All selected services are within free tier for MVP scale, but billing account is required for API enablement

### 6.3 Firebase Project Linking

- **Requirement:** Firebase project must be linked to GCP project `rates-production`
- **Purpose:** Enable Firebase services (Hosting, Authentication, Firestore)
- **Action:** Link via Firebase Console or `firebase use --add`

### 6.4 Initial Service Account Permissions

The user/service account running Terraform must have:

- **Role:** `roles/owner` or `roles/editor` (project-wide)
- **Additional Permissions:**
  - `roles/serviceusage.serviceUsageAdmin` (to enable APIs)
  - `roles/iam.serviceAccountAdmin` (to create service accounts)
  - `roles/resourcemanager.projectIamAdmin` (to manage IAM policies)

**Note:** After initial setup, Terraform should use service accounts with minimal required permissions for ongoing operations.

---

## 7. Growth Path: Evolution to Multi-Project Model

### 7.1 When to Migrate

**Triggers for Multi-Project Migration:**

1. **Team Growth:** Team size exceeds 3-5 developers
2. **Compliance Requirements:** Regulatory requirements mandate project-level isolation
3. **Cost Separation:** Need for independent billing per environment
4. **Blast Radius Concerns:** Production incidents require stronger isolation
5. **Organization Node:** Google Cloud Organization node becomes available

### 7.2 Migration Strategy

**Step 1: Create New Projects**

- Create `rates-dev` project
- Create `rates-prod` project (or rename existing `rates-production`)
- Link both projects to billing account

**Step 2: Migrate Resources**

- Use Terraform state import to migrate resources:
  - Export state from `rates-production`
  - Import into environment-specific projects
  - Update resource names (remove environment prefix, as project name provides isolation)

**Step 3: Update Naming Conventions**

- Remove environment prefix from resource names (project name provides isolation)
- New pattern: `rates-{component}-{region}` (no `{env}` needed)

**Step 4: Update IAM**

- Remove IAM conditions (project boundary provides isolation)
- Simplify service account names (no environment prefix needed)

**Step 5: Update CI/CD**

- Update Cloud Build triggers to target correct project based on branch
- Update service account references

### 7.3 Backward Compatibility

The naming convention (`rates-{env}-{component}-{region}`) is designed to be **forward-compatible** with multi-project migration:

- Resources can be renamed to remove `{env}` prefix when moved to dedicated projects
- IAM conditions can be removed (project boundary provides isolation)
- Terraform modules can be parameterized to support both single-project and multi-project models

---

## 8. Terraform Implementation Guidance

### 8.1 State File Strategy

**Recommended:** Separate Terraform state files per environment:

- `terraform-dev.tfstate` (stored in Cloud Storage bucket: `rates-terraform-state-dev`)
- `terraform-prod.tfstate` (stored in Cloud Storage bucket: `rates-terraform-state-prod`)

**Alternative:** Single state file with workspace separation (less recommended for single-project model).

### 8.2 Variable Structure

```hcl
variable "environment" {
  type        = string
  description = "Environment identifier (dev or prod)"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "project_id" {
  type        = string
  description = "GCP Project ID"
  default     = "rates-production"
}

variable "region" {
  type        = string
  description = "GCP Region"
  default     = "us-central1"
}
```

### 8.3 Resource Naming Pattern

```hcl
locals {
  resource_prefix = "rates-${var.environment}"

  # Examples
  cloud_run_name     = "${local.resource_prefix}-api-${var.region}"
  hosting_site_name  = "${local.resource_prefix}-main-app"
  secret_name        = "${local.resource_prefix}-firebase-sa"
  service_account    = "${local.resource_prefix}-cloud-run-sa"
}
```

### 8.4 IAM Condition Examples

```hcl
resource "google_project_iam_member" "dev_cloud_run_secret_access" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.dev_cloud_run.email}"

  condition {
    title       = "Limit to dev secrets"
    description = "Only allow access to dev environment secrets"
    expression  = "resource.name.startsWith('projects/${var.project_id}/secrets/rates-dev-')"
  }
}
```

---

## 9. Security Considerations

### 9.1 Least Privilege Principle

- **Service accounts** have minimal required permissions (IAM conditions enforce environment isolation)
- **Human users** should use service accounts for deployments (not personal credentials)
- **CI/CD pipelines** use environment-specific service accounts

### 9.2 Secret Management

- **Secrets** are environment-specific and stored in Secret Manager
- **Access** is restricted via IAM conditions (dev service accounts cannot access prod secrets)
- **Rotation** can be performed per-environment without cross-environment impact

### 9.3 Audit Logging

- **Cloud Audit Logs** are enabled by default for all GCP services
- **Logs** are project-wide but can be filtered by resource name (environment prefix)
- **Access** to audit logs should be restricted to administrators

### 9.4 Production Guardrails

**Recommended Practices:**

1. **Branch Protection:** `main` branch requires approval for production deployments
2. **Terraform State Locking:** Use Cloud Storage backend with state locking
3. **Manual Approval:** Production deployments require manual approval in CI/CD pipeline
4. **Resource Deletion Protection:** Enable deletion protection on production resources where supported

---

## 10. Cost Management

### 10.1 Billing Labels

**Recommended:** Apply billing labels to resources for cost tracking:

- `environment: dev`
- `environment: prod`
- `application: rates`
- `component: api`, `hosting`, `database`, etc.

### 10.2 Budget Alerts

**Recommended:** Set up budget alerts:

- **Project-wide budget:** $50/month (with alert at $25)
- **Environment-specific budgets:** Use labels to track dev vs prod costs

### 10.3 Free Tier Monitoring

- Monitor free tier usage via Cloud Billing dashboard
- Set up alerts if approaching free tier limits
- Consider multi-project migration if free tier limits are consistently exceeded

---

## 11. Document Governance

**Change Process:**

1. Any deviation from this structure requires formal ADR amendment
2. ADR amendments must be approved by Lead Google Cloud Architect
3. Terraform configurations must reference this document
4. All changes must maintain backward compatibility or include migration plan

**Review Cycle:**

- This document is locked for Terraform implementation phase
- Post-MVP review may consider multi-project migration if requirements change
- All amendments must maintain free tier compliance unless explicitly approved

---

## 12. Summary

**Selected Strategy:** Single Project with Namespace-Based Environment Separation

**Key Decisions:**

1. **Single GCP Project:** `rates-production` (all environments)
2. **Environment Separation:** Via resource naming (`rates-dev-*` vs `rates-prod-*`) and IAM conditions
3. **Naming Convention:** `rates-{env}-{component}-{region}`
4. **Isolation Mechanism:** IAM conditions + logical separation via naming
5. **Growth Path:** Can evolve to multi-project model when requirements change

**Prerequisites:**

- 9 core APIs must be enabled
- Billing account linked
- Firebase project linked to GCP project
- Initial Terraform user with `roles/owner` or `roles/editor`

**Next Steps:**

1. Create GCP project `rates-production`
2. Enable required APIs
3. Link billing account and Firebase project
4. Implement Terraform configurations following this structure
5. Create service accounts with IAM conditions for environment isolation

---

**Document End**

This project structure document represents the final, locked design for the Rates monorepo GCP deployment. All Terraform implementations must adhere to the naming conventions, IAM strategy, and isolation mechanisms defined herein.
