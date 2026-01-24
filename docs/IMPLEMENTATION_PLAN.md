# Implementation Readiness Checklist and Execution Plan

## Terraform Deployment Gate Document

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Status:** Pre-Implementation Gate Review  
**Governance:** Technical Delivery Lead & Solutions Architect

---

## Purpose

This document serves as the **formal gate between architecture and implementation**. It validates that all architectural decisions are complete, identifies external prerequisites, and provides the sequential execution plan ("battle plan") for writing Terraform code.

**Critical Principle:** No Terraform code should be written until this document declares the project **READY FOR DEVELOPMENT** and all blocking issues are resolved.

---

## 1. Architecture Definition Status

### 1.1 Document Audit

| Component                  | Status   | Notes                                                                                                                                                                                |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Service Selection**      | ✅ Ready | All services locked in `ARCHITECTURAL_DECISION_LOG.md`. Cloud Run, Firebase Hosting, Firestore, Secret Manager, Artifact Registry selected. Rejected services explicitly documented. |
| **Project Structure**      | ✅ Ready | Single project (`rates-production`) with namespace-based environment separation defined in `GCP_PROJECT_STRUCTURE.md`. Naming convention: `rates-{env}-{component}-{region}`.        |
| **IAM & Security Model**   | ✅ Ready | Complete service account inventory, role bindings, and IAM conditions specified in `IAM_SECURITY_MODEL.md`. 4 service accounts (2 per environment), all with least-privilege roles.  |
| **Terraform Architecture** | ✅ Ready | Three-layer architecture (Bootstrap → Foundation → Application) defined in `TERRAFORM_DESIGN.md`. State management, module strategy, and dependency injection specified.             |
| **Cost Guardrails**        | ✅ Ready | Hard limits, quotas, and budget strategy defined in `COST_GUARDRAILS.md`. Cloud Run max_instances=2, lifecycle policies, $10/month budget.                                           |
| **Service Dependencies**   | ✅ Ready | Complete dependency matrix in `GCP_ARCHITECTURE_ANALYSIS.md`. All transitive dependencies identified.                                                                                |
| **Resource Naming**        | ✅ Ready | Naming convention fully specified in `GCP_PROJECT_STRUCTURE.md`. Pattern: `rates-{env}-{component}-{region}`.                                                                        |
| **Environment Isolation**  | ✅ Ready | IAM conditions and resource naming provide isolation. Separate state files per environment.                                                                                          |
| **State Management**       | ✅ Ready | GCS backend with prefix-based separation. Single bucket: `rates-terraform-state`. Locking strategy defined.                                                                          |
| **Module Strategy**        | ✅ Ready | 4 modules identified: `cloud-run/`, `service-account/`, `artifact-registry/`, `secret/`. Module criteria and design principles specified.                                            |

### 1.2 Architectural Completeness Assessment

**✅ All Critical Decisions Locked:**

- Compute: Cloud Run (Gen 2) with 1 vCPU, 512Mi memory, max_instances=2
- Static Hosting: Firebase Hosting for both apps
- Database: Cloud Firestore (Native mode)
- Authentication: Firebase Authentication
- Secrets: Secret Manager
- Container Registry: Artifact Registry
- CI/CD: Cloud Build (optional but recommended)
- Observability: Cloud Logging only (Cloud Monitoring rejected)
- Networking: Public internet access (no VPC)
- Environment Strategy: Single project with namespace separation

**✅ All Specifications Complete:**

- Service account design (4 accounts with specific roles)
- IAM conditions for environment isolation
- Resource naming conventions
- Terraform layer structure
- State file organization
- Module boundaries
- Cost guardrails and quotas

### 1.3 Identified Ambiguities (Non-Blocking)

| Ambiguity                         | Severity | Resolution                                 | Notes                                                                                           |
| --------------------------------- | -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Container Image Build Process** | Low      | Document in deployment runbook             | Cloud Build vs manual build not fully specified. Both approaches are valid.                     |
| **Firebase Hosting Deployment**   | Low      | Use Firebase CLI (not Terraform)           | Firebase Hosting uses `firebase deploy`, not Terraform. Documented in analysis.                 |
| **Secret Value Creation**         | Low      | Manual via `gcloud` or Secret Manager API  | Secret resources created by Terraform; values created manually. Documented in IAM model.        |
| **Quota Setting Method**          | Low      | Manual via `gcloud` or Organization Policy | Some quotas may require manual setting. Document in deployment runbook.                         |
| **Bootstrap State Backend**       | Low      | Local backend for initial bootstrap        | Bootstrap can use local backend initially, then migrate to GCS. Documented in Terraform design. |

**Verdict:** All ambiguities are **non-blocking**. They are operational details that can be resolved during implementation or documented in runbooks.

---

## 2. External Prerequisites

### 2.1 GCP Account & Billing

| Prerequisite               | Status      | Required Action                                               | Owner             |
| -------------------------- | ----------- | ------------------------------------------------------------- | ----------------- |
| **Google Cloud Account**   | ⚠️ Required | Create Google Cloud account if not exists                     | Human             |
| **Billing Account ID**     | ⚠️ Required | Create or identify billing account ID                         | Human             |
| **Billing Account Linked** | ⚠️ Required | Link billing account to project (required even for free tier) | Human             |
| **Project Creation**       | ⚠️ Required | Create GCP project `rates-production` (or use existing)       | Human / Terraform |

**Resolution:** These are **human actions** that must be completed before Terraform execution. Cannot be automated via Terraform (chicken-and-egg problem).

### 2.2 Firebase Project Setup

| Prerequisite                   | Status      | Required Action                                         | Owner |
| ------------------------------ | ----------- | ------------------------------------------------------- | ----- |
| **Firebase Project Linked**    | ⚠️ Required | Link Firebase project to GCP project `rates-production` | Human |
| **Firebase CLI Installed**     | ⚠️ Required | Install Firebase CLI (`npm install -g firebase-tools`)  | Human |
| **Firebase CLI Authenticated** | ⚠️ Required | Run `firebase login` and `firebase use --add`           | Human |

**Resolution:** Firebase project linking is a **one-time manual action** via Firebase Console or CLI. Cannot be automated via Terraform.

### 2.3 Local Tooling

| Prerequisite                 | Status      | Required Action                                                       | Owner |
| ---------------------------- | ----------- | --------------------------------------------------------------------- | ----- |
| **Terraform Installed**      | ⚠️ Required | Install Terraform >= 1.5.0                                            | Human |
| **gcloud CLI Installed**     | ⚠️ Required | Install Google Cloud SDK                                              | Human |
| **gcloud CLI Authenticated** | ⚠️ Required | Run `gcloud auth login` and `gcloud auth application-default login`   | Human |
| **jq Installed**             | ⚠️ Optional | Install `jq` for JSON parsing (useful for scripts)                    | Human |
| **Docker Installed**         | ⚠️ Optional | Install Docker for local container testing (if not using Cloud Build) | Human |

**Resolution:** Standard developer tooling. Installation and authentication are **human actions**.

### 2.4 Required Access & Permissions

| Prerequisite                           | Status      | Required Action                                                             | Owner             |
| -------------------------------------- | ----------- | --------------------------------------------------------------------------- | ----------------- |
| **Initial Terraform User Permissions** | ⚠️ Required | User must have `roles/owner` or `roles/editor` on project for initial setup | Human / GCP Admin |
| **Service Usage Admin**                | ⚠️ Required | `roles/serviceusage.serviceUsageAdmin` to enable APIs                       | Human / GCP Admin |
| **IAM Admin**                          | ⚠️ Required | `roles/iam.serviceAccountAdmin` to create service accounts                  | Human / GCP Admin |
| **Project IAM Admin**                  | ⚠️ Required | `roles/resourcemanager.projectIamAdmin` to manage IAM policies              | Human / GCP Admin |

**Resolution:** Initial Terraform execution requires **broad permissions**. After foundation layer is created, Terraform can use service accounts with minimal permissions.

### 2.5 Secret Values (Post-Terraform)

| Prerequisite                      | Status      | Required Action                                             | Owner |
| --------------------------------- | ----------- | ----------------------------------------------------------- | ----- |
| **Firebase Service Account JSON** | ⚠️ Required | Generate Firebase service account key (one per environment) | Human |
| **Nonce Secret Value**            | ⚠️ Required | Generate shared nonce secret (one per environment)          | Human |

**Resolution:** Secret **resources** are created by Terraform. Secret **values** are created manually via `gcloud secrets versions add` after Terraform creates the secret resources.

### 2.6 Domain & DNS (Optional)

| Prerequisite          | Status      | Required Action                                                | Owner |
| --------------------- | ----------- | -------------------------------------------------------------- | ----- |
| **Custom Domain**     | ⚠️ Optional | Register domain name (if using custom domains)                 | Human |
| **DNS Configuration** | ⚠️ Optional | Configure DNS records pointing to Firebase Hosting / Cloud Run | Human |

**Resolution:** Custom domains are **optional** for MVP. Can be added post-deployment.

---

## 3. Build Sequence (Step-by-Step Execution Plan)

### Phase 0: Pre-Flight Validation

**Purpose:** Verify all prerequisites are met before writing any Terraform code.

**Terraform Responsibilities:** None (pre-Terraform phase)

**Human Responsibilities:**

1. ✅ Verify GCP account exists and is accessible
2. ✅ Verify billing account ID is known and linked to project
3. ✅ Verify `gcloud` CLI is installed and authenticated
4. ✅ Verify `terraform` CLI is installed (>= 1.5.0)
5. ✅ Verify Firebase CLI is installed and authenticated
6. ✅ Verify required permissions (`roles/owner` or `roles/editor`)
7. ✅ Create or identify GCP project `rates-production`
8. ✅ Link Firebase project to GCP project

**Validation Checklist:**

```bash
# Verify gcloud authentication
gcloud auth list

# Verify project access
gcloud projects describe rates-production

# Verify billing account
gcloud billing accounts list
gcloud billing projects link rates-production --billing-account=<BILLING_ACCOUNT_ID>

# Verify Firebase CLI
firebase --version
firebase login
firebase projects:list
```

**Outputs:**

- ✅ GCP project accessible
- ✅ Billing account linked
- ✅ CLI tools authenticated
- ✅ Permissions verified

**Blocking Issues:** If any prerequisite is missing, **STOP**. Resolve before proceeding.

---

### Phase 1: Bootstrap Layer

**Purpose:** Create the foundational infrastructure required for Terraform state management. This is a **one-time setup** that enables all subsequent Terraform operations.

**Terraform Responsibilities:**

1. Create GCS bucket for Terraform state (`rates-terraform-state`)
2. Configure bucket versioning (optional, for state file history)
3. Configure bucket lifecycle policies (delete old state files after 90 days)
4. Set bucket IAM bindings (for Terraform service account or human users)
5. Enable required APIs (if not enabled manually):
   - `storage.googleapis.com` (for state bucket)
   - `serviceusage.googleapis.com` (for API enablement)

**Human Responsibilities:**

1. Run `terraform init` with local backend (initial bootstrap)
2. Run `terraform plan` to review changes
3. Run `terraform apply` to create bootstrap resources
4. (Optional) Migrate bootstrap state to GCS backend after bucket creation

**Inputs:**

- `project_id = "rates-production"`
- `region = "us-central1"` (or preferred region)
- `billing_account_id` (for budget creation, optional in bootstrap)

**Outputs:**

- State bucket name: `rates-terraform-state`
- State bucket location: `us-central1`
- State bucket IAM bindings configured

**Terraform Configuration:**

```
infra/environments/bootstrap/
├── main.tf              # GCS bucket, versioning, lifecycle
├── backend.tf           # Local backend (initial) or GCS backend (after migration)
├── variables.tf         # project_id, region
└── outputs.tf           # bucket name, bucket location
```

**Execution Steps:**

1. Create `infra/environments/bootstrap/` directory
2. Write Terraform configuration for state bucket
3. Initialize Terraform: `terraform init`
4. Plan: `terraform plan`
5. Apply: `terraform apply`
6. (Optional) Migrate backend to GCS: Update `backend.tf`, run `terraform init -migrate-state`

**Dependencies:** None (this is the base layer)

**Blocking Issues:** None (bootstrap is self-contained)

**Success Criteria:**

- ✅ State bucket created and accessible
- ✅ Bucket versioning enabled (if configured)
- ✅ Bucket IAM bindings configured
- ✅ Terraform can write state to bucket

---

### Phase 2: Foundation Layer

**Purpose:** Create shared foundational infrastructure used by all environments. This includes service accounts, Artifact Registry repositories, and shared IAM policies.

**Terraform Responsibilities:**

1. Enable required APIs:
   - `run.googleapis.com` (Cloud Run)
   - `firebase.googleapis.com` (Firebase)
   - `firestore.googleapis.com` (Cloud Firestore)
   - `secretmanager.googleapis.com` (Secret Manager)
   - `artifactregistry.googleapis.com` (Artifact Registry)
   - `cloudbuild.googleapis.com` (Cloud Build, optional)
   - `iam.googleapis.com` (IAM)
   - `serviceusage.googleapis.com` (Service Usage)
2. Create service accounts (4 total):
   - `rates-dev-cloud-run-sa`
   - `rates-dev-cloud-build-sa`
   - `rates-prod-cloud-run-sa`
   - `rates-prod-cloud-build-sa`
3. Create IAM role bindings with environment-specific conditions:
   - Cloud Run SAs: `roles/secretmanager.secretAccessor` (with conditions), `roles/firebase.admin`
   - Cloud Build SAs: `roles/artifactregistry.writer` (with conditions), `roles/run.admin` (with conditions), `roles/firebase.admin` (with conditions)
4. Create Artifact Registry repositories (2 total):
   - `rates-dev-containers` (us-central1)
   - `rates-prod-containers` (us-central1)
5. Configure Artifact Registry IAM bindings (Cloud Build SAs)

**Human Responsibilities:**

1. Run `terraform init` with GCS backend (pointing to bootstrap bucket)
2. Run `terraform plan` to review changes
3. Run `terraform apply` to create foundation resources
4. Verify service accounts created in GCP Console
5. Verify Artifact Registry repositories created

**Inputs:**

- `project_id = "rates-production"`
- `region = "us-central1"`
- (Read from bootstrap remote state: state bucket name)

**Outputs:**

- Service account emails (4 total)
- Artifact Registry repository URLs (2 total)
- API enablement status

**Terraform Configuration:**

```
infra/environments/foundation/
├── main.tf              # Service accounts, Artifact Registry, IAM bindings
├── backend.tf           # GCS backend (bootstrap bucket)
├── variables.tf         # project_id, region
├── outputs.tf           # Service account emails, repository URLs
└── README.md            # Foundation layer documentation
```

**Execution Steps:**

1. Create `infra/environments/foundation/` directory
2. Create Terraform modules:
   - `infra/modules/service-account/`
   - `infra/modules/artifact-registry/`
3. Write foundation layer configuration
4. Initialize Terraform: `terraform init`
5. Plan: `terraform plan`
6. Apply: `terraform apply`
7. Verify outputs: `terraform output`

**Dependencies:** Phase 1 (Bootstrap) - requires state bucket

**Blocking Issues:** None (foundation is self-contained after bootstrap)

**Success Criteria:**

- ✅ All required APIs enabled
- ✅ 4 service accounts created with correct names
- ✅ IAM role bindings created with environment-specific conditions
- ✅ 2 Artifact Registry repositories created
- ✅ Foundation outputs available for application layer

---

### Phase 3: Application Layer (Dev Environment)

**Purpose:** Deploy dev environment application resources. This includes Cloud Run services, Firebase Hosting sites, and environment-specific secrets.

**Terraform Responsibilities:**

1. Create Secret Manager secrets (resources only, not values):
   - `rates-dev-firebase-sa`
   - `rates-dev-nonce-secret`
2. Configure Secret Manager IAM bindings (Cloud Run SA access)
3. Create Cloud Run service:
   - Service name: `rates-dev-api-us-central1`
   - Region: `us-central1`
   - Service account: `rates-dev-cloud-run-sa` (from foundation)
   - Container image: (reference to Artifact Registry, image must exist)
   - Environment variables: Secret references (Firebase SA, nonce secret)
   - Resource limits: 1 vCPU, 512Mi memory, max_instances=2, min_instances=0
   - Timeout: 30s
4. Configure Cloud Run IAM binding (public invoker access)
5. (Optional) Create Firebase Hosting sites (if Terraform provider supports):
   - `rates-dev-main-app`
   - `rates-dev-auth-app`
   - **Note:** Firebase Hosting may require Firebase CLI deployment instead of Terraform

**Human Responsibilities:**

1. Build container image for auth-app API:
   - Build Docker image locally or via Cloud Build
   - Push image to Artifact Registry: `rates-dev-containers`
   - Tag: `latest` or specific version
2. Create secret values (after Terraform creates secret resources):
   - `gcloud secrets versions add rates-dev-firebase-sa --data-file=firebase-sa.json`
   - `gcloud secrets versions add rates-dev-nonce-secret --data-file=-` (paste secret value)
3. Deploy Firebase Hosting (if not managed by Terraform):
   - Build main app: `pnpm build` (from `apps/app/`)
   - Build auth app: `pnpm build:auth-app` (from `apps/auth-app/`)
   - Deploy: `firebase deploy --only hosting --project rates-production`
4. Run `terraform init` with GCS backend
5. Run `terraform plan` to review changes
6. Run `terraform apply` to create application resources

**Inputs:**

- `project_id = "rates-production"`
- `region = "us-central1"`
- `environment = "dev"`
- (Read from foundation remote state: service account emails, Artifact Registry URLs)

**Outputs:**

- Cloud Run service URL
- Secret names (for reference)
- Firebase Hosting site URLs (if managed by Terraform)

**Terraform Configuration:**

```
infra/environments/application/dev/
├── main.tf              # Cloud Run, Secret Manager, Firebase Hosting
├── backend.tf           # GCS backend (bootstrap bucket, prefix: application/dev/)
├── variables.tf         # project_id, region, environment
├── terraform.tfvars     # Environment-specific values
└── README.md            # Dev environment documentation
```

**Execution Steps:**

1. Create `infra/environments/application/dev/` directory
2. Create Terraform modules:
   - `infra/modules/cloud-run/`
   - `infra/modules/secret/`
3. Write dev application layer configuration
4. Build and push container image to Artifact Registry
5. Initialize Terraform: `terraform init`
6. Plan: `terraform plan`
7. Apply: `terraform apply` (creates secret resources)
8. Create secret values manually: `gcloud secrets versions add ...`
9. (Optional) Deploy Firebase Hosting via Firebase CLI
10. Verify Cloud Run service is accessible

**Dependencies:** Phase 2 (Foundation) - requires service accounts and Artifact Registry

**Blocking Issues:**

- ⚠️ Container image must exist in Artifact Registry before Cloud Run deployment
- ⚠️ Secret values must be created manually after Terraform creates secret resources
- ⚠️ Firebase Hosting deployment may require Firebase CLI (not Terraform)

**Success Criteria:**

- ✅ Cloud Run service deployed and accessible
- ✅ Secret Manager secrets created (resources)
- ✅ Secret values created manually
- ✅ Cloud Run service can access secrets
- ✅ Firebase Hosting sites deployed (via CLI or Terraform)

---

### Phase 4: Application Layer (Prod Environment)

**Purpose:** Deploy prod environment application resources. Identical to dev environment but with prod-specific configuration.

**Terraform Responsibilities:**

1. Create Secret Manager secrets (resources only):
   - `rates-prod-firebase-sa`
   - `rates-prod-nonce-secret`
2. Configure Secret Manager IAM bindings (Cloud Run SA access)
3. Create Cloud Run service:
   - Service name: `rates-prod-api-us-central1`
   - Service account: `rates-prod-cloud-run-sa` (from foundation)
   - Same resource limits as dev (max_instances=2, min_instances=0)
4. Configure Cloud Run IAM binding (public invoker access)
5. (Optional) Create Firebase Hosting sites:
   - `rates-prod-main-app`
   - `rates-prod-auth-app`

**Human Responsibilities:**

1. Build container image for prod:
   - Build Docker image (production-optimized)
   - Push to Artifact Registry: `rates-prod-containers`
2. Create secret values:
   - `gcloud secrets versions add rates-prod-firebase-sa --data-file=firebase-sa-prod.json`
   - `gcloud secrets versions add rates-prod-nonce-secret --data-file=-`
3. Deploy Firebase Hosting (if not managed by Terraform)
4. Run `terraform init` with GCS backend
5. Run `terraform plan` to review changes
6. **Manual Approval:** Prod deployments require explicit approval
7. Run `terraform apply` to create prod resources

**Inputs:**

- `project_id = "rates-production"`
- `region = "us-central1"`
- `environment = "prod"`
- (Read from foundation remote state)

**Outputs:**

- Cloud Run service URL
- Secret names
- Firebase Hosting site URLs

**Terraform Configuration:**

```
infra/environments/application/prod/
├── main.tf              # Cloud Run, Secret Manager, Firebase Hosting
├── backend.tf           # GCS backend (bootstrap bucket, prefix: application/prod/)
├── variables.tf         # project_id, region, environment
├── terraform.tfvars     # Environment-specific values
└── README.md            # Prod environment documentation
```

**Execution Steps:**

1. Create `infra/environments/application/prod/` directory
2. Copy dev configuration as template, update for prod
3. Build and push container image to Artifact Registry (prod repository)
4. Initialize Terraform: `terraform init`
5. Plan: `terraform plan` (review carefully)
6. **Manual Approval Gate:** Require explicit approval for prod deployment
7. Apply: `terraform apply` (creates secret resources)
8. Create secret values manually
9. Deploy Firebase Hosting via Firebase CLI
10. Verify prod Cloud Run service is accessible
11. Test end-to-end: Main app → Auth app → Cloud Run API

**Dependencies:** Phase 2 (Foundation) - requires service accounts and Artifact Registry

**Blocking Issues:**

- ⚠️ Container image must exist in Artifact Registry
- ⚠️ Secret values must be created manually
- ⚠️ **Manual approval required** for prod deployments (safety guardrail)

**Success Criteria:**

- ✅ Prod Cloud Run service deployed and accessible
- ✅ Prod secrets created and accessible
- ✅ Prod Firebase Hosting sites deployed
- ✅ End-to-end functionality verified

---

### Phase 5: CI/CD Integration (Optional)

**Purpose:** Automate deployments via Cloud Build triggers. This phase is **optional** but recommended for operational efficiency.

**Terraform Responsibilities:**

1. Create Cloud Build triggers:
   - Dev trigger: `develop` branch → deploy to dev environment
   - Prod trigger: `main` branch → deploy to prod environment (with manual approval)
2. Configure Cloud Build service account attachments (from foundation)
3. Configure build configuration files (`cloudbuild.yaml`)
4. Set up branch protection rules (via Terraform or manual)

**Human Responsibilities:**

1. Create `cloudbuild.yaml` files for:
   - Main app build and Firebase Hosting deployment
   - Auth app build and Firebase Hosting deployment
   - Auth app API container build and Cloud Run deployment
2. Configure GitHub/GitLab webhook (if using external Git)
3. Test CI/CD pipeline:
   - Push to `develop` branch → verify dev deployment
   - Push to `main` branch → verify prod deployment (with approval)

**Inputs:**

- GitHub/GitLab repository URL
- Branch names: `develop` (dev), `main` (prod)
- Cloud Build service account emails (from foundation)

**Outputs:**

- Cloud Build trigger IDs
- Build configuration status

**Terraform Configuration:**

```
infra/environments/application/dev/cloudbuild.tf    # Dev trigger
infra/environments/application/prod/cloudbuild.tf    # Prod trigger
```

**Execution Steps:**

1. Create `cloudbuild.yaml` files in repository root
2. Write Terraform configuration for Cloud Build triggers
3. Initialize and apply Terraform
4. Configure GitHub/GitLab webhook (if external Git)
5. Test pipeline: Push to `develop` branch
6. Test pipeline: Push to `main` branch (with approval)

**Dependencies:** Phase 2 (Foundation) - requires Cloud Build service accounts

**Blocking Issues:**

- ⚠️ Cloud Build configuration files must be created manually
- ⚠️ GitHub/GitLab webhook configuration (if external Git)

**Success Criteria:**

- ✅ Cloud Build triggers created and active
- ✅ Dev deployments automated on `develop` branch push
- ✅ Prod deployments automated on `main` branch push (with approval)
- ✅ Build logs accessible and successful

---

### Phase 6: Cost Guardrails & Monitoring

**Purpose:** Enforce cost guardrails and configure budget alerts. This phase can be executed in parallel with application layers.

**Terraform Responsibilities:**

1. Create billing budget:
   - Budget amount: $10.00/month
   - Alert thresholds: 50%, 80%, 100%, 120%
   - Notification channels: Email, Pub/Sub (optional)
2. Configure Cloud Run quotas (if supported by Terraform):
   - Max instances per service: 2
   - Request quota: 2,000,000/month
3. Configure Artifact Registry lifecycle policies (if supported):
   - Retain last 3 images OR delete images > 30 days old
4. Disable unused APIs (explicit disable):
   - `monitoring.googleapis.com`
   - `cloudtrace.googleapis.com`
   - `cloudprofiler.googleapis.com`
   - `cloudkms.googleapis.com`
   - `compute.googleapis.com`
   - `container.googleapis.com`
   - `sqladmin.googleapis.com`
   - `spanner.googleapis.com`
   - `bigtable.googleapis.com`
   - `pubsub.googleapis.com` (if not using Pub/Sub for budget alerts)
   - `cloudtasks.googleapis.com`
   - `cloudscheduler.googleapis.com`

**Human Responsibilities:**

1. Set quotas manually (if Terraform doesn't support):
   - Cloud Run instance quota: 2 per service
   - Cloud Build quota: 120 build-minutes/day
2. Configure Artifact Registry lifecycle policy manually (if Terraform doesn't support):
   - `gcloud artifacts repositories update ... --lifecycle-policy=...`
3. Test budget alerts:
   - Trigger test alert to verify email notifications
4. Monitor free tier consumption:
   - Set up manual monitoring or Cloud Monitoring (if enabled later)

**Inputs:**

- `billing_account_id` (required for budget)
- `billing_alert_email` (for email notifications)

**Outputs:**

- Budget ID
- Notification channel IDs
- Quota status

**Terraform Configuration:**

```
infra/environments/foundation/cost-guardrails.tf    # Budget, quotas, API disablement
```

**Execution Steps:**

1. Write Terraform configuration for budget and quotas
2. Initialize and apply Terraform
3. Set quotas manually (if required)
4. Configure Artifact Registry lifecycle policy manually
5. Test budget alert notifications
6. Document quota monitoring process

**Dependencies:** Phase 0 (Prerequisites) - requires billing account ID

**Blocking Issues:**

- ⚠️ Billing account ID must be known
- ⚠️ Some quotas may require manual setting via `gcloud` or Organization Policy

**Success Criteria:**

- ✅ Budget created with alert thresholds
- ✅ Email notifications working
- ✅ Quotas set to free tier limits
- ✅ Unused APIs disabled
- ✅ Artifact Registry lifecycle policy active

---

## 4. Go / No-Go Decision

### 4.1 Verdict: **✅ GO**

**Rationale:**

- All architectural decisions are locked and complete
- All service selections are specified
- IAM model is fully defined
- Terraform architecture is clear
- Cost guardrails are specified
- Execution sequence is defined
- All ambiguities are non-blocking

### 4.2 Blocking Issues: **NONE**

**All identified issues are non-blocking:**

- Container image build process: Documented in deployment runbook
- Firebase Hosting deployment: Use Firebase CLI (standard practice)
- Secret value creation: Manual process (standard security practice)
- Quota setting: Manual process (Terraform limitation)
- Bootstrap state backend: Local backend initially (standard practice)

### 4.3 Risk Assessment

| Risk                             | Severity | Mitigation                                                              | Status       |
| -------------------------------- | -------- | ----------------------------------------------------------------------- | ------------ |
| **Missing Prerequisites**        | High     | Pre-flight validation checklist (Phase 0)                               | ✅ Mitigated |
| **Secret Value Management**      | Medium   | Documented manual process, clear separation of concerns                 | ✅ Mitigated |
| **Container Image Availability** | Medium   | Document build process, verify image exists before Cloud Run deployment | ✅ Mitigated |
| **Firebase Hosting Deployment**  | Low      | Use Firebase CLI (standard practice, not a blocker)                     | ✅ Mitigated |
| **Quota Setting Limitations**    | Low      | Document manual quota setting in deployment runbook                     | ✅ Mitigated |
| **Cost Overruns**                | High     | Hard limits in Terraform (max_instances=2), budget alerts, quotas       | ✅ Mitigated |

### 4.4 Pre-Implementation Checklist

**Before writing any Terraform code, verify:**

- [ ] **Phase 0 Complete:**
  - [ ] GCP account accessible
  - [ ] Billing account ID known and linked
  - [ ] `gcloud` CLI installed and authenticated
  - [ ] `terraform` CLI installed (>= 1.5.0)
  - [ ] Firebase CLI installed and authenticated
  - [ ] Required permissions verified (`roles/owner` or `roles/editor`)
  - [ ] GCP project `rates-production` created or identified
  - [ ] Firebase project linked to GCP project

- [ ] **Architecture Documents Reviewed:**
  - [ ] `ARCHITECTURAL_DECISION_LOG.md` - Service selections understood
  - [ ] `GCP_PROJECT_STRUCTURE.md` - Naming conventions understood
  - [ ] `IAM_SECURITY_MODEL.md` - Service accounts and IAM understood
  - [ ] `TERRAFORM_DESIGN.md` - Layer structure understood
  - [ ] `COST_GUARDRAILS.md` - Hard limits understood
  - [ ] `GCP_ARCHITECTURE_ANALYSIS.md` - Dependencies understood

- [ ] **Execution Plan Understood:**
  - [ ] Phase sequence clear (Bootstrap → Foundation → Application)
  - [ ] Dependencies between phases understood
  - [ ] Human vs Terraform responsibilities clear
  - [ ] Success criteria defined for each phase

### 4.5 Next Steps

**Immediate Actions:**

1. ✅ Complete Phase 0 (Pre-Flight Validation)
2. ✅ Create `infra/` directory structure
3. ✅ Begin Phase 1 (Bootstrap Layer) - Write Terraform code
4. ✅ Execute phases sequentially (Bootstrap → Foundation → Application)

**Documentation Updates:**

- Create deployment runbook with manual steps (secret creation, container builds, Firebase Hosting)
- Document quota setting process
- Document troubleshooting procedures

**Implementation Timeline:**

- **Phase 1 (Bootstrap):** 1-2 hours
- **Phase 2 (Foundation):** 2-4 hours
- **Phase 3 (Application - Dev):** 4-6 hours
- **Phase 4 (Application - Prod):** 2-4 hours
- **Phase 5 (CI/CD):** 2-4 hours (optional)
- **Phase 6 (Cost Guardrails):** 1-2 hours

**Total Estimated Time:** 12-22 hours (depending on CI/CD inclusion)

---

## 5. Human vs Machine Responsibility Matrix

### 5.1 Terraform Responsibilities

| Task                                      | Phase           | Terraform Resource                    |
| ----------------------------------------- | --------------- | ------------------------------------- |
| Create GCS state bucket                   | Bootstrap       | `google_storage_bucket`               |
| Enable APIs                               | Foundation      | `google_project_service`              |
| Create service accounts                   | Foundation      | `google_service_account`              |
| Create IAM role bindings                  | Foundation      | `google_project_iam_member`           |
| Create Artifact Registry repositories     | Foundation      | `google_artifact_registry_repository` |
| Create Secret Manager secrets (resources) | Application     | `google_secret_manager_secret`        |
| Create Cloud Run services                 | Application     | `google_cloud_run_v2_service`         |
| Create billing budget                     | Cost Guardrails | `google_billing_budget`               |
| Disable unused APIs                       | Cost Guardrails | `google_project_service` (disable)    |

### 5.2 Human Responsibilities

| Task                                  | Phase           | Action Required                          |
| ------------------------------------- | --------------- | ---------------------------------------- |
| Create GCP project                    | Pre-Flight      | `gcloud projects create` or Console      |
| Link billing account                  | Pre-Flight      | `gcloud billing projects link`           |
| Link Firebase project                 | Pre-Flight      | Firebase Console or `firebase use --add` |
| Authenticate CLI tools                | Pre-Flight      | `gcloud auth login`, `firebase login`    |
| Build container images                | Application     | Docker build + push to Artifact Registry |
| Create secret values                  | Application     | `gcloud secrets versions add`            |
| Deploy Firebase Hosting               | Application     | `firebase deploy --only hosting`         |
| Set quotas manually                   | Cost Guardrails | `gcloud` or Organization Policy          |
| Configure Artifact Registry lifecycle | Cost Guardrails | `gcloud artifacts repositories update`   |
| Test end-to-end functionality         | Application     | Manual testing                           |
| Configure CI/CD webhooks              | CI/CD           | GitHub/GitLab webhook configuration      |

### 5.3 Hybrid Responsibilities (Terraform + Human)

| Task                           | Phase           | Terraform Role             | Human Role                                      |
| ------------------------------ | --------------- | -------------------------- | ----------------------------------------------- |
| **Container Image Deployment** | Application     | Cloud Run references image | Build and push image to Artifact Registry       |
| **Secret Management**          | Application     | Creates secret resources   | Creates secret values                           |
| **Firebase Hosting**           | Application     | (Optional) Creates sites   | Deploys static assets via Firebase CLI          |
| **Quota Enforcement**          | Cost Guardrails | Validates in Terraform     | Sets quotas via `gcloud` or Organization Policy |

---

## 6. Success Criteria Summary

### 6.1 Phase Completion Criteria

| Phase                           | Success Criteria                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| **Phase 0: Pre-Flight**         | All prerequisites verified, CLI tools authenticated, project accessible                       |
| **Phase 1: Bootstrap**          | State bucket created, Terraform can write state to GCS                                        |
| **Phase 2: Foundation**         | 4 service accounts created, 2 Artifact Registry repositories created, IAM bindings configured |
| **Phase 3: Application (Dev)**  | Dev Cloud Run service deployed, dev secrets created, dev Firebase Hosting deployed            |
| **Phase 4: Application (Prod)** | Prod Cloud Run service deployed, prod secrets created, prod Firebase Hosting deployed         |
| **Phase 5: CI/CD**              | Cloud Build triggers created, automated deployments working                                   |
| **Phase 6: Cost Guardrails**    | Budget created, quotas set, unused APIs disabled                                              |

### 6.2 End-to-End Validation

**Final Validation Checklist:**

- [ ] Dev environment fully functional:
  - [ ] Main app accessible via Firebase Hosting
  - [ ] Auth app accessible via Firebase Hosting
  - [ ] Cloud Run API endpoint (`/api/validate`) accessible
  - [ ] Token validation working end-to-end
- [ ] Prod environment fully functional:
  - [ ] Main app accessible via Firebase Hosting
  - [ ] Auth app accessible via Firebase Hosting
  - [ ] Cloud Run API endpoint accessible
  - [ ] Token validation working end-to-end
- [ ] Cost guardrails active:
  - [ ] Budget alerts configured and tested
  - [ ] Quotas set to free tier limits
  - [ ] Cloud Run max_instances=2 enforced
  - [ ] Artifact Registry lifecycle policy active
- [ ] Security verified:
  - [ ] Service accounts have correct IAM roles
  - [ ] IAM conditions enforce environment isolation
  - [ ] Secrets accessible only by authorized service accounts
  - [ ] Cloud Run uses dedicated service accounts (not default)

---

## 7. Document Governance

**Change Process:**

1. This document is the **formal gate** between architecture and implementation
2. Any changes to execution sequence require approval from Technical Delivery Lead
3. Blocking issues must be resolved before Terraform code is written
4. Success criteria must be met before proceeding to next phase

**Review Cycle:**

- This document is **locked** for Terraform implementation phase
- Post-implementation review: Validate execution plan accuracy
- Update document if execution reveals gaps or improvements

---

## 8. Summary

**Verdict: ✅ GO FOR DEVELOPMENT**

**Rationale:**

- All architectural decisions are complete and locked
- All service selections are specified
- IAM model is fully defined
- Terraform architecture is clear
- Execution sequence is defined
- All ambiguities are non-blocking
- Prerequisites are clearly identified

**Next Action:** Begin Phase 0 (Pre-Flight Validation), then proceed to Phase 1 (Bootstrap Layer).

**Estimated Timeline:** 12-22 hours total implementation time (depending on CI/CD inclusion).

---

**Document End**

This implementation plan represents the formal gate between architecture and implementation. The project is **READY FOR DEVELOPMENT**. Proceed with Terraform code implementation following the sequential execution plan defined herein.
