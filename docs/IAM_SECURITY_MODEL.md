# IAM and Security Model

## Least Privilege Security Specification for Rates Monorepo

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Status:** Final - Source of Truth for Terraform IAM Implementation  
**Governance:** Senior Google Cloud Security Architect

---

## Purpose

This document defines the Identity and Access Management (IAM) and security model for the Rates monorepo GCP deployment. It serves as the **specification sheet** for all IAM resources in Terraform, ensuring least-privilege access control and security best practices.

**Key Principles:**

- **No Default Service Accounts:** Explicitly forbid use of Default Compute Engine Service Account
- **Dedicated Service Accounts:** Every distinct application component has its own user-managed service account
- **Least Privilege:** Permissions scoped as narrowly as possible (resource-level over project-level)
- **Predefined Roles:** Prefer predefined GCP roles over custom roles (unless absolutely necessary)
- **Free Tier but Secure:** Balance security with cost constraints

---

## 1. Service Account Inventory

### 1.1 Machine Identities (Service Accounts)

#### 1.1.1 Cloud Run Service Accounts

**Dev Environment:**

- **Name:** `rates-dev-cloud-run-sa`
- **Full Email:** `rates-dev-cloud-run-sa@rates-production.iam.gserviceaccount.com`
- **Purpose:** Identity for Cloud Run service `rates-dev-api-us-central1` executing the auth-app API endpoint (`/api/validate`)
- **Associated Resource:** Cloud Run service `rates-dev-api-us-central1` in region `us-central1`
- **Usage:** Attached to Cloud Run service via `serviceAccount` field

**Prod Environment:**

- **Name:** `rates-prod-cloud-run-sa`
- **Full Email:** `rates-prod-cloud-run-sa@rates-production.iam.gserviceaccount.com`
- **Purpose:** Identity for Cloud Run service `rates-prod-api-us-central1` executing the auth-app API endpoint (`/api/validate`)
- **Associated Resource:** Cloud Run service `rates-prod-api-us-central1` in region `us-central1`
- **Usage:** Attached to Cloud Run service via `serviceAccount` field

#### 1.1.2 Cloud Build Service Accounts

**Dev Environment:**

- **Name:** `rates-dev-cloud-build-sa`
- **Full Email:** `rates-dev-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Purpose:** Identity for Cloud Build triggers deploying dev environment resources (Firebase Hosting, Cloud Run, Artifact Registry)
- **Associated Resource:** Cloud Build triggers targeting `develop` branch or `dev` environment
- **Usage:** Attached to Cloud Build triggers via `serviceAccount` field

**Prod Environment:**

- **Name:** `rates-prod-cloud-build-sa`
- **Full Email:** `rates-prod-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Purpose:** Identity for Cloud Build triggers deploying prod environment resources (Firebase Hosting, Cloud Run, Artifact Registry)
- **Associated Resource:** Cloud Build triggers targeting `main` branch or `prod` environment
- **Usage:** Attached to Cloud Build triggers via `serviceAccount` field

#### 1.1.3 Explicitly Forbidden Service Accounts

**Default Compute Engine Service Account:**

- **Email:** `{project-number}-compute@developer.gserviceaccount.com`
- **Status:** **FORBIDDEN** - Must never be used
- **Rationale:** Default service account has overly broad permissions (`roles/editor` on project). Violates least-privilege principle and "No Default SA" rule.

**Default App Engine Service Account:**

- **Email:** `{project-id}@appspot.gserviceaccount.com`
- **Status:** **FORBIDDEN** - Must never be used (App Engine not in architecture)
- **Rationale:** Not applicable (App Engine rejected per ADR-001), but explicitly forbidden to prevent accidental use.

---

## 2. Role Binding Matrix

### 2.1 Cloud Run Service Account Role Bindings

#### 2.1.1 Dev Environment: `rates-dev-cloud-run-sa`

**Binding 1: Secret Manager Access**

- **Identity:** `serviceAccount:rates-dev-cloud-run-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Secret Manager secrets with prefix `rates-dev-`
- **Role:** `roles/secretmanager.secretAccessor`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/secrets/rates-dev-')
    title: Limit to dev secrets
    description: Only allow access to dev environment secrets
  ```
- **Rationale:** Cloud Run service must read Firebase service account JSON and nonce secret from Secret Manager at runtime. Condition restricts access to dev secrets only, preventing cross-environment access.

**Binding 2: Firebase Admin Operations**

- **Identity:** `serviceAccount:rates-dev-cloud-run-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Firebase project `rates-production` (Firebase Admin SDK operations)
- **Role:** `roles/firebase.admin`
- **IAM Condition:** None (Firebase Admin SDK requires project-level access)
- **Rationale:** Cloud Run service uses Firebase Admin SDK to validate ID tokens via `admin.auth().verifyIdToken()`. This role grants necessary permissions for token validation operations. Note: Firebase Admin SDK operations are scoped to the Firebase project, not individual resources.

#### 2.1.2 Prod Environment: `rates-prod-cloud-run-sa`

**Binding 1: Secret Manager Access**

- **Identity:** `serviceAccount:rates-prod-cloud-run-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Secret Manager secrets with prefix `rates-prod-`
- **Role:** `roles/secretmanager.secretAccessor`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/secrets/rates-prod-')
    title: Limit to prod secrets
    description: Only allow access to prod environment secrets
  ```
- **Rationale:** Same as dev environment, but scoped to prod secrets only.

**Binding 2: Firebase Admin Operations**

- **Identity:** `serviceAccount:rates-prod-cloud-run-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Firebase project `rates-production` (Firebase Admin SDK operations)
- **Role:** `roles/firebase.admin`
- **IAM Condition:** None (Firebase Admin SDK requires project-level access)
- **Rationale:** Same as dev environment, for prod Cloud Run service.

### 2.2 Cloud Build Service Account Role Bindings

#### 2.2.1 Dev Environment: `rates-dev-cloud-build-sa`

**Binding 1: Artifact Registry Write Access**

- **Identity:** `serviceAccount:rates-dev-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Artifact Registry repository `rates-dev-containers` in region `us-central1`
- **Role:** `roles/artifactregistry.writer`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/repositories/rates-dev-containers')
    title: Limit to dev container repository
    description: Only allow push to dev environment container repository
  ```
- **Rationale:** Cloud Build must push container images to Artifact Registry after building. Condition restricts access to dev repository only, preventing accidental pushes to prod repository.

**Binding 2: Cloud Run Deployment Access**

- **Identity:** `serviceAccount:rates-dev-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Cloud Run services with prefix `rates-dev-` in region `us-central1`
- **Role:** `roles/run.admin`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/services/rates-dev-')
    title: Limit to dev Cloud Run services
    description: Only allow deployment to dev environment Cloud Run services
  ```
- **Rationale:** Cloud Build must deploy Cloud Run services after building and pushing container images. Condition restricts deployment to dev services only, preventing accidental prod deployments.

**Binding 3: Firebase Deployment Access**

- **Identity:** `serviceAccount:rates-dev-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Firebase Hosting sites with prefix `rates-dev-`
- **Role:** `roles/firebase.admin`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/sites/rates-dev-')
    title: Limit to dev Firebase Hosting sites
    description: Only allow deployment to dev environment Firebase Hosting sites
  ```
- **Rationale:** Cloud Build must deploy static assets to Firebase Hosting (main-app and auth-app client routes). Condition restricts deployment to dev sites only. Note: Firebase Admin role may require project-level access; condition provides additional guardrail.

#### 2.2.2 Prod Environment: `rates-prod-cloud-build-sa`

**Binding 1: Artifact Registry Write Access**

- **Identity:** `serviceAccount:rates-prod-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Artifact Registry repository `rates-prod-containers` in region `us-central1`
- **Role:** `roles/artifactregistry.writer`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/repositories/rates-prod-containers')
    title: Limit to prod container repository
    description: Only allow push to prod environment container repository
  ```
- **Rationale:** Same as dev environment, but scoped to prod repository only.

**Binding 2: Cloud Run Deployment Access**

- **Identity:** `serviceAccount:rates-prod-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Cloud Run services with prefix `rates-prod-` in region `us-central1`
- **Role:** `roles/run.admin`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/services/rates-prod-')
    title: Limit to prod Cloud Run services
    description: Only allow deployment to prod environment Cloud Run services
  ```
- **Rationale:** Same as dev environment, but scoped to prod services only.

**Binding 3: Firebase Deployment Access**

- **Identity:** `serviceAccount:rates-prod-cloud-build-sa@rates-production.iam.gserviceaccount.com`
- **Resource Scope:** Firebase Hosting sites with prefix `rates-prod-`
- **Role:** `roles/firebase.admin`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/sites/rates-prod-')
    title: Limit to prod Firebase Hosting sites
    description: Only allow deployment to prod environment Firebase Hosting sites
  ```
- **Rationale:** Same as dev environment, but scoped to prod sites only.

### 2.3 Service Account Key Management

**Policy:** Service account keys are **forbidden** for Cloud Run and Cloud Build service accounts.

**Rationale:**

- Cloud Run uses Workload Identity (automatic, no keys required)
- Cloud Build uses service account attached to trigger (no keys required)
- Keys introduce security risk (long-lived credentials, potential leakage)

**Exception:** None. All service accounts must use Workload Identity or attached service account model.

---

## 3. Human Access Model

### 3.1 Developer Group (Dev Environment Access)

**Group Name:** `rates-developers@<domain>` (or individual user emails)

**Roles and Permissions:**

**1. Project Viewer (Read-Only Access)**

- **Role:** `roles/viewer`
- **Resource Scope:** Project `rates-production`
- **Rationale:** Developers need read access to view resources, logs, and configuration for debugging and troubleshooting.

**2. Cloud Run Developer (Dev Services Only)**

- **Role:** `roles/run.developer`
- **Resource Scope:** Cloud Run services with prefix `rates-dev-` in region `us-central1`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/services/rates-dev-')
    title: Limit to dev Cloud Run services
    description: Only allow developer access to dev environment Cloud Run services
  ```
- **Rationale:** Developers need ability to view, update configuration, and view logs for dev Cloud Run services. This role allows configuration changes but not deletion or IAM changes.

**3. Artifact Registry Reader (Dev Repository Only)**

- **Role:** `roles/artifactregistry.reader`
- **Resource Scope:** Artifact Registry repository `rates-dev-containers` in region `us-central1`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/repositories/rates-dev-containers')
    title: Limit to dev container repository
    description: Only allow read access to dev environment container repository
  ```
- **Rationale:** Developers need to view container images in dev repository for debugging and verification.

**4. Secret Manager Secret Accessor (Dev Secrets Only)**

- **Role:** `roles/secretmanager.secretAccessor`
- **Resource Scope:** Secret Manager secrets with prefix `rates-dev-`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/secrets/rates-dev-')
    title: Limit to dev secrets
    description: Only allow access to dev environment secrets
  ```
- **Rationale:** Developers may need to access dev secrets for local development or debugging. Access is restricted to dev secrets only.

**5. Cloud Logging Logs Viewer (Project-Wide)**

- **Role:** `roles/logging.viewer`
- **Resource Scope:** Project `rates-production`
- **Rationale:** Developers need to view application logs for debugging. Logs can be filtered by resource name (environment prefix) for environment-specific viewing.

**Explicitly Forbidden:**

- `roles/owner` - Overly broad, violates least-privilege
- `roles/editor` - Too permissive, allows resource deletion
- Access to prod environment resources (enforced via IAM conditions)

### 3.2 Production Administrator Group

**Group Name:** `rates-prod-admins@<domain>` (or individual user emails)

**Roles and Permissions:**

**1. Project Editor (Project-Wide, with Restrictions)**

- **Role:** `roles/editor`
- **Resource Scope:** Project `rates-production`
- **Rationale:** Production administrators need ability to manage resources across the project. However, deployments should use service accounts (Cloud Build) rather than human credentials.

**2. Cloud Run Admin (Prod Services Only)**

- **Role:** `roles/run.admin`
- **Resource Scope:** Cloud Run services with prefix `rates-prod-` in region `us-central1`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/services/rates-prod-')
    title: Limit to prod Cloud Run services
    description: Only allow admin access to prod environment Cloud Run services
  ```
- **Rationale:** Production administrators need full control over prod Cloud Run services for emergency deployments or configuration changes. Condition restricts access to prod services only.

**3. Artifact Registry Writer (Prod Repository Only)**

- **Role:** `roles/artifactregistry.writer`
- **Resource Scope:** Artifact Registry repository `rates-prod-containers` in region `us-central1`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/locations/us-central1/repositories/rates-prod-containers')
    title: Limit to prod container repository
    description: Only allow write access to prod environment container repository
  ```
- **Rationale:** Production administrators may need to manually push container images in emergency scenarios. Access restricted to prod repository only.

**4. Secret Manager Secret Accessor (Prod Secrets Only)**

- **Role:** `roles/secretmanager.secretAccessor`
- **Resource Scope:** Secret Manager secrets with prefix `rates-prod-`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/secrets/rates-prod-')
    title: Limit to prod secrets
    description: Only allow access to prod environment secrets
  ```
- **Rationale:** Production administrators need access to prod secrets for rotation, verification, or emergency access.

**5. Secret Manager Secret Admin (Prod Secrets Only)**

- **Role:** `roles/secretmanager.admin`
- **Resource Scope:** Secret Manager secrets with prefix `rates-prod-`
- **IAM Condition:**
  ```yaml
  Condition:
    expression: resource.name.startsWith('projects/rates-production/secrets/rates-prod-')
    title: Limit to prod secrets
    description: Only allow admin access to prod environment secrets
  ```
- **Rationale:** Production administrators need ability to create, update, and rotate prod secrets. Access restricted to prod secrets only.

**6. Cloud Logging Logs Viewer (Project-Wide)**

- **Role:** `roles/logging.viewer`
- **Resource Scope:** Project `rates-production`
- **Rationale:** Production administrators need to view logs for troubleshooting and incident response.

**7. Cloud Logging Logs Writer (Project-Wide)**

- **Role:** `roles/logging.logWriter`
- **Resource Scope:** Project `rates-production`
- **Rationale:** Production administrators may need to write custom logs for audit or debugging purposes.

**Explicitly Forbidden:**

- `roles/owner` - Overly broad, violates least-privilege principle
- Access to dev environment resources via prod admin credentials (enforced via IAM conditions, but admins should use separate credentials for dev work)

### 3.3 Terraform Execution Identity

**Initial Setup:**

- **Identity:** Human user with `roles/owner` or `roles/editor` (temporary, for initial Terraform apply)
- **Purpose:** Create initial infrastructure (service accounts, IAM bindings, resources)
- **Rationale:** Terraform requires broad permissions for initial resource creation. After initial setup, Terraform should use service accounts.

**Ongoing Operations (Recommended):**

- **Identity:** Service account `rates-terraform-sa@rates-production.iam.gserviceaccount.com` (optional, for CI/CD-based Terraform)
- **Roles:**
  - `roles/editor` (project-wide, for resource management)
  - `roles/iam.serviceAccountAdmin` (for service account management)
  - `roles/resourcemanager.projectIamAdmin` (for IAM policy management)
- **Rationale:** If Terraform is executed via CI/CD, it should use a dedicated service account rather than human credentials.

**Note:** Terraform execution identity is **not** required for application runtime. This is only for infrastructure-as-code operations.

---

## 4. CI/CD Pipeline Permissions

### 4.1 Cloud Build Service Account

**Identity:** Environment-specific service account (`rates-dev-cloud-build-sa` or `rates-prod-cloud-build-sa`)

**Permissions:** See Section 2.2 (Cloud Build Service Account Role Bindings)

**Usage:**

- Cloud Build triggers are configured with `serviceAccount` field pointing to environment-specific service account
- Branch-based routing: `develop` branch → `rates-dev-cloud-build-sa`, `main` branch → `rates-prod-cloud-build-sa`

### 4.2 Privilege Escalation Prevention

**Mechanism 1: IAM Conditions**

- All Cloud Build service account role bindings include IAM conditions restricting access to environment-specific resources
- Dev service account cannot access prod resources (enforced at IAM level)
- Prod service account cannot access dev resources (enforced at IAM level)

**Mechanism 2: Branch Protection**

- `main` branch requires pull request approval before merge
- Cloud Build trigger for `main` branch requires manual approval step (optional, via Cloud Build approval workflow)
- Terraform state files are environment-specific (separate state files for dev/prod)

**Mechanism 3: Service Account Isolation**

- Dev and prod Cloud Build service accounts are separate identities
- No cross-environment service account impersonation allowed
- Service account keys are forbidden (no long-lived credentials)

### 4.3 Credential Security and Rotation

**Credential Type:** Service Account (no keys)

**Security:**

- Service accounts use Workload Identity (automatic, no keys)
- Cloud Build uses attached service account (no keys required)
- No service account keys are created or stored

**Rotation:**

- Service accounts themselves do not require rotation (they are identities, not credentials)
- If service account keys were used (they are not), rotation would require:
  1. Create new key
  2. Update Cloud Build trigger configuration
  3. Delete old key
- **Current Model:** No rotation required (no keys in use)

**Secret Rotation (Separate from Service Accounts):**

- Secret Manager secrets (Firebase service account JSON, nonce secret) can be rotated independently
- Rotation process:
  1. Create new secret version in Secret Manager
  2. Update Cloud Run service to reference new secret version
  3. Verify service functionality
  4. Delete old secret version (after verification period)

### 4.4 Alternative CI/CD: GitHub Actions

**If GitHub Actions is used instead of Cloud Build:**

**Identity:** GitHub Actions service account or Workload Identity Pool

**Required Permissions:**

- Same as Cloud Build service account (Section 2.2)
- Access via Workload Identity Federation (recommended) or service account key (not recommended)

**Workload Identity Federation Setup:**

1. Create Workload Identity Pool: `github-actions-pool`
2. Create Workload Identity Provider: `github-provider` (OIDC provider for GitHub)
3. Grant service account access to GitHub Actions via Workload Identity:
   - Principal: `principalSet://iam.googleapis.com/projects/{project-number}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/{github-org}/{github-repo}`
   - Role: `roles/iam.workloadIdentityUser` on service account
4. GitHub Actions workflow uses `google-github-actions/auth@v1` action with Workload Identity

**Security Benefits:**

- No long-lived credentials (service account keys)
- Automatic credential rotation
- Repository-scoped access (GitHub Actions can only assume identity for specific repository)

---

## 5. Network Security & Ingress

### 5.1 Cloud Run Ingress Policy

**Dev Environment: `rates-dev-api-us-central1`**

- **Ingress:** `all` (public internet access)
- **Rationale:** Auth-app API endpoint must be accessible from Firebase Hosting (public) and user browsers. No private networking requirements per ADR-012.

**Prod Environment: `rates-prod-api-us-central1`**

- **Ingress:** `all` (public internet access)
- **Rationale:** Same as dev environment. Public internet access is required for web application.

**Alternative (Not Selected):**

- `internal` ingress would restrict access to VPC resources only, but architecture uses public internet access (no VPC per ADR-012).

### 5.2 Service-to-Service Authentication

**Firebase Hosting → Cloud Run:**

- **Authentication Method:** IAM-based authentication (Cloud Run Invoker role)
- **Implementation:**
  1. Firebase Hosting rewrite rule proxies `/api/validate` to Cloud Run service URL
  2. Cloud Run service requires `roles/run.invoker` for unauthenticated requests, OR
  3. Cloud Run service allows unauthenticated invocations (public endpoint)
- **Selected Approach:** Allow unauthenticated invocations (public endpoint)
- **Rationale:**
  - Firebase Hosting cannot authenticate as a service account when proxying requests
  - API endpoint is public-facing (user browsers call it directly)
  - Application-level authentication (Firebase ID token validation) provides security
  - CORS is handled in Cloud Run service code

**If IAM-Based Authentication Were Required:**

- **Role Binding:** Grant `roles/run.invoker` to `allUsers` (public access)
- **Alternative:** Grant `roles/run.invoker` to Firebase Hosting service account (if such identity exists, but Firebase Hosting does not use service accounts for rewrites)

**Cloud Run → Secret Manager:**

- **Authentication Method:** Service account attached to Cloud Run service
- **Implementation:** Cloud Run service uses attached service account (`rates-{env}-cloud-run-sa`) to authenticate to Secret Manager
- **Rationale:** Automatic authentication via Workload Identity. No explicit authentication code required.

**Cloud Run → Firebase Admin SDK:**

- **Authentication Method:** Service account credentials from Secret Manager
- **Implementation:**
  1. Cloud Run service reads Firebase service account JSON from Secret Manager
  2. Initializes Firebase Admin SDK with service account credentials
  3. Uses Admin SDK to validate ID tokens
- **Rationale:** Firebase Admin SDK requires service account credentials for server-side operations.

### 5.3 CORS and API Security

**CORS Configuration:**

- Handled in Cloud Run service code (application-level)
- Allowed origins: Firebase Hosting domains and custom domains (if configured)
- **Rationale:** CORS is application logic, not IAM. Cloud Run does not enforce CORS at infrastructure level.

**API Security:**

- **Authentication:** Firebase ID token validation (application-level, via Firebase Admin SDK)
- **Authorization:** User-scoped data access (enforced in Firestore security rules)
- **Rate Limiting:** Not implemented at infrastructure level (can be added via Cloud Armor if needed, but rejected for MVP per ADR-012)

---

## 6. Secrets Strategy

### 6.1 Decision: Secret Manager

**Selected Solution:** Secret Manager (per ADR-006)

**Rationale:**

- **Security:** Encryption at rest, audit logging, IAM-based access control
- **Rotation Support:** Versioned secrets enable rotation without service downtime
- **Free Tier:** 6 secrets, 10,000 access operations/month (within free tier for MVP)
- **Integration:** Native integration with Cloud Run (automatic authentication via service account)

**Rejected Alternatives:**

- **Environment Variables in Cloud Run:** Rejected due to reduced security (visible in Cloud Console), lack of rotation support, no audit logging
- **Cloud KMS:** Rejected due to overkill for simple secrets (Secret Manager provides encryption without customer-managed keys)

### 6.2 Secret Inventory

**Dev Environment Secrets:**

1. **Secret Name:** `rates-dev-firebase-sa`
   - **Content:** Firebase service account JSON (string)
   - **Purpose:** Firebase Admin SDK initialization in Cloud Run service
   - **Access:** `rates-dev-cloud-run-sa` (via `roles/secretmanager.secretAccessor` with IAM condition)
   - **Rotation:** Manual (create new version, update Cloud Run service reference)

2. **Secret Name:** `rates-dev-nonce-secret`
   - **Content:** Shared nonce secret (string)
   - **Purpose:** Shared secret between main-app and auth-app for nonce validation
   - **Access:** `rates-dev-cloud-run-sa` (via `roles/secretmanager.secretAccessor` with IAM condition)
   - **Rotation:** Manual (create new version, update Cloud Run service reference, update client applications)

**Prod Environment Secrets:**

1. **Secret Name:** `rates-prod-firebase-sa`
   - **Content:** Firebase service account JSON (string)
   - **Purpose:** Firebase Admin SDK initialization in Cloud Run service
   - **Access:** `rates-prod-cloud-run-sa` (via `roles/secretmanager.secretAccessor` with IAM condition)
   - **Rotation:** Manual (create new version, update Cloud Run service reference)

2. **Secret Name:** `rates-prod-nonce-secret`
   - **Content:** Shared nonce secret (string)
   - **Purpose:** Shared nonce secret between main-app and auth-app for nonce validation
   - **Access:** `rates-prod-cloud-run-sa` (via `roles/secretmanager.secretAccessor` with IAM condition)
   - **Rotation:** Manual (create new version, update Cloud Run service reference, update client applications)

### 6.3 Secret Access Implementation

**Cloud Run Service Access:**

1. Cloud Run service is configured with environment variable pointing to secret:
   - `FIREBASE_SERVICE_ACCOUNT_SECRET=rates-{env}-firebase-sa`
   - `NONCE_SECRET=rates-{env}-nonce-secret`
2. Cloud Run service uses Secret Manager client library to read secrets at runtime
3. Authentication is automatic (via attached service account `rates-{env}-cloud-run-sa`)
4. No explicit authentication code required (Workload Identity handles authentication)

**Example (Node.js):**

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient(); // Automatic authentication

async function getSecret(secretName) {
  const [version] = await client.accessSecretVersion({
    name: `projects/rates-production/secrets/${secretName}/versions/latest`,
  });
  return version.payload.data.toString();
}
```

### 6.4 Secret Rotation Process

**Rotation Steps:**

1. **Create New Secret Version:**
   - Use `gcloud secrets versions add` or Secret Manager API
   - New version is created with `latest` alias (after creation)

2. **Update Cloud Run Service:**
   - Cloud Run service automatically uses `latest` version (if configured)
   - OR: Update Cloud Run service to reference specific version number
   - Redeploy Cloud Run service (if configuration changed)

3. **Verify Service Functionality:**
   - Test API endpoint to ensure secret is accessible
   - Monitor Cloud Run logs for errors

4. **Delete Old Secret Version (After Verification Period):**
   - Use `gcloud secrets versions destroy` or Secret Manager API
   - Old version is permanently deleted (cannot be recovered)

**Rotation Frequency:**

- **Firebase Service Account:** Rotate if service account is regenerated or compromised
- **Nonce Secret:** Rotate periodically (e.g., quarterly) or if compromised

**Access Control During Rotation:**

- IAM conditions ensure dev service accounts cannot access prod secrets (and vice versa)
- Rotation is performed by production administrators (via `roles/secretmanager.admin` on prod secrets)

### 6.5 Secret Access Audit Logging

**Automatic Audit Logs:**

- Secret Manager automatically logs all secret access operations to Cloud Audit Logs
- Log entries include:
  - Identity (service account or user)
  - Secret name
  - Operation (access, create, update, delete)
  - Timestamp
- **Access:** Production administrators can view audit logs via `roles/logging.viewer`

**Audit Log Retention:**

- Cloud Audit Logs retention: 400 days (default, can be extended)
- **Access Control:** Only production administrators should have access to audit logs (sensitive security information)

---

## 7. Logging, Monitoring, and Audit Access

### 7.1 Log Writing Permissions

**Cloud Run Services:**

- **Identity:** Service account attached to Cloud Run service (`rates-{env}-cloud-run-sa`)
- **Permission:** Automatic (Cloud Run automatically writes stdout/stderr to Cloud Logging)
- **Role:** No explicit role required (Cloud Run service has implicit log writing permission)
- **Rationale:** Cloud Run automatically collects application logs. No explicit IAM role needed.

**Firebase Services:**

- **Identity:** Firebase services (Firebase Hosting, Firebase Auth, Firestore)
- **Permission:** Automatic (Firebase services automatically write logs to Cloud Logging)
- **Role:** No explicit role required (Firebase services have implicit log writing permission)
- **Rationale:** Firebase services are managed by Google and automatically write logs.

**Human Users (Optional):**

- **Identity:** Production administrators
- **Role:** `roles/logging.logWriter` (project-wide)
- **Rationale:** Production administrators may need to write custom logs for audit or debugging purposes.

### 7.2 Log Reading Permissions

**Developers:**

- **Identity:** `rates-developers@<domain>` group
- **Role:** `roles/logging.viewer` (project-wide)
- **Resource Scope:** Project `rates-production`
- **Rationale:** Developers need to view application logs for debugging. Logs can be filtered by resource name (environment prefix) for environment-specific viewing.

**Production Administrators:**

- **Identity:** `rates-prod-admins@<domain>` group
- **Role:** `roles/logging.viewer` (project-wide)
- **Resource Scope:** Project `rates-production`
- **Rationale:** Production administrators need to view logs for troubleshooting and incident response.

**Log Filtering:**

- Logs can be filtered by resource name to view environment-specific logs:
  - Dev logs: `resource.labels.service_name=rates-dev-api-us-central1`
  - Prod logs: `resource.labels.service_name=rates-prod-api-us-central1`

### 7.3 Audit Logging

**Automatic Audit Logs:**

- Cloud Audit Logs are enabled by default for all GCP services
- Audit logs capture:
  - Admin activity (resource creation, deletion, IAM changes)
  - Data access (secret access, Firestore reads/writes)
  - System events (service account usage)

**Audit Log Access:**

- **Identity:** Production administrators only
- **Role:** `roles/logging.viewer` (project-wide)
- **Resource Scope:** Project `rates-production`
- **Rationale:** Audit logs contain sensitive security information (secret access, IAM changes). Only production administrators should have access.

**Audit Log Protection:**

- **Modification Prevention:** Audit logs cannot be modified or deleted by users (immutable)
- **Retention:** 400 days (default, can be extended via log sinks to Cloud Storage or BigQuery)
- **Export (Optional):** Audit logs can be exported to Cloud Storage or BigQuery for long-term retention and analysis

**Audit Log Sinks (Optional, for Long-Term Retention):**

- **Destination:** Cloud Storage bucket or BigQuery dataset
- **Identity:** Service account with `roles/storage.objectCreator` (for Cloud Storage) or `roles/bigquery.dataEditor` (for BigQuery)
- **Rationale:** Export audit logs to long-term storage for compliance or analysis. Not required for MVP, but can be added later.

### 7.4 Monitoring Access (Future Consideration)

**Current Status:** Cloud Monitoring is rejected for MVP (per ADR-009). Cloud Logging is sufficient for debugging.

**If Cloud Monitoring is Added Later:**

- **Metrics Writing:** Automatic (Cloud Run and Firebase services automatically write metrics)
- **Metrics Reading:**
  - Developers: `roles/monitoring.viewer` (project-wide, for dev metrics only via filtering)
  - Production administrators: `roles/monitoring.viewer` (project-wide, for all metrics)

**Note:** Monitoring access is not defined in this document as it is not part of the MVP architecture.

---

## 8. Security Best Practices Summary

### 8.1 Least Privilege Enforcement

- ✅ **No Default Service Accounts:** All service accounts are user-managed and dedicated to specific components
- ✅ **Resource-Level Scoping:** IAM conditions restrict access to environment-specific resources
- ✅ **Predefined Roles:** Prefer predefined GCP roles over custom roles (no custom roles in this specification)
- ✅ **Human Access:** Developers have dev-only access; production administrators have prod-only access (via IAM conditions)

### 8.2 Credential Security

- ✅ **No Service Account Keys:** All service accounts use Workload Identity (automatic authentication)
- ✅ **Secret Manager:** Secrets stored in Secret Manager with encryption at rest and audit logging
- ✅ **Rotation Support:** Secrets can be rotated via versioning without service downtime

### 8.3 Network Security

- ✅ **HTTPS-Only:** All services enforce HTTPS (Firebase Hosting and Cloud Run automatic)
- ✅ **Public Ingress:** Cloud Run uses public ingress (required for web application, per ADR-012)
- ✅ **Application-Level Auth:** Firebase ID token validation provides API security

### 8.4 Audit and Compliance

- ✅ **Audit Logging:** Cloud Audit Logs enabled by default for all GCP services
- ✅ **Secret Access Logging:** Secret Manager logs all secret access operations
- ✅ **Log Retention:** 400 days (default, can be extended via log sinks)

### 8.5 Environment Isolation

- ✅ **IAM Conditions:** Environment-specific IAM conditions prevent cross-environment access
- ✅ **Resource Naming:** Environment prefix in resource names (`rates-dev-*` vs `rates-prod-*`)
- ✅ **Separate Service Accounts:** Dev and prod environments use separate service accounts

---

## 9. Terraform Implementation Notes

### 9.1 Service Account Creation

**Terraform Resource:** `google_service_account`

**Example (Dev Cloud Run Service Account):**

```hcl
resource "google_service_account" "dev_cloud_run" {
  account_id   = "rates-dev-cloud-run-sa"
  display_name = "Dev Cloud Run Service Account"
  description  = "Service account for dev environment Cloud Run service"
  project      = var.project_id
}
```

**Note:** Service account email is automatically generated as `{account_id}@{project}.iam.gserviceaccount.com`

### 9.2 IAM Role Binding with Conditions

**Terraform Resource:** `google_project_iam_member` with `condition` block

**Example (Dev Cloud Run Secret Access):**

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

### 9.3 Explicit Forbidden Resources

**Terraform Validation:** Add validation rules to prevent use of default service accounts:

```hcl
variable "forbidden_default_sa" {
  description = "Default Compute Engine service account (forbidden)"
  default     = "{project-number}-compute@developer.gserviceaccount.com"
}

# Validation: Ensure Cloud Run service does not use default service account
resource "google_cloud_run_service" "dev_api" {
  # ... other configuration ...
  service_account = google_service_account.dev_cloud_run.email

  # Explicitly forbid default service account
  lifecycle {
    precondition {
      condition     = google_cloud_run_service.dev_api.service_account != var.forbidden_default_sa
      error_message = "Default Compute Engine service account is forbidden. Use dedicated service account."
    }
  }
}
```

---

## 10. Document Governance

**Change Process:**

1. Any deviation from this IAM model requires formal security review
2. Changes must be approved by Senior Google Cloud Security Architect
3. Terraform configurations must reference this document
4. All changes must maintain least-privilege principles

**Review Cycle:**

- This document is locked for Terraform implementation phase
- Post-MVP review may consider additional security controls (e.g., Cloud Armor, VPC)
- All amendments must maintain free tier compliance unless explicitly approved

---

## 11. Summary

**Service Accounts:**

- 4 service accounts total (2 per environment: Cloud Run + Cloud Build)
- All service accounts are user-managed (no default service accounts)
- All service accounts use Workload Identity (no keys)

**IAM Roles:**

- Predefined GCP roles only (no custom roles)
- Resource-level scoping via IAM conditions
- Environment isolation via IAM conditions

**Human Access:**

- Developers: Read-only + dev environment access only
- Production administrators: Editor + prod environment access only
- No `roles/owner` usage (least-privilege principle)

**Secrets:**

- Secret Manager (4 secrets total: 2 per environment)
- IAM-based access control with environment-specific conditions
- Rotation support via versioning

**Network Security:**

- Public ingress (required for web application)
- Application-level authentication (Firebase ID tokens)
- HTTPS-only (automatic)

**Audit and Compliance:**

- Cloud Audit Logs enabled by default
- Secret access logging
- 400-day log retention (default)

---

**Document End**

This IAM and Security Model document represents the final, locked specification for all IAM resources in Terraform. All implementations must adhere to the service account design, role bindings, and security practices defined herein.
