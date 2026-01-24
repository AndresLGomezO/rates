# GCP Service Selection & Decision Log

## Architecture Decision Records (ADRs)

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Status:** LOCKED - Source of Truth for Terraform Implementation  
**Governance:** Lead Google Cloud Architect & Technical Governance Officer

---

## Purpose

This document serves as the **immutable Source of Truth** for all GCP service selections and architectural decisions. It is derived from the validated architectural plan in `docs/GCP_ARCHITECTURE_DECISION.md` and is intended to prevent scope creep and configuration drift during the Terraform implementation phase.

**Usage:**

- DevOps engineers must reference this document when creating Terraform configurations
- Platform engineers must validate all infrastructure changes against these decisions
- No service selections may deviate from this log without formal ADR amendment

---

## ADR-001: Compute Strategy for API Service

**Decision:** Use Cloud Run (Gen 2)  
**Status:** ACCEPTED

**Context:**
The auth-app requires a server-side Node.js runtime to execute Firebase Admin SDK operations for token validation. The `/api/validate` endpoint is stateless, has intermittent traffic patterns, and requires no background processing or persistent local storage.

**Alternatives Rejected:**

- **Google Kubernetes Engine (GKE):** Rejected due to operational overhead, cost complexity, and massive overkill for a single API endpoint. No cluster management requirements exist.
- **App Engine Standard:** Rejected due to reduced flexibility, slower iteration cycles, and inferior free tier compared to Cloud Run.
- **Compute Engine (VM):** Rejected due to lack of scale-to-zero capability, ongoing maintenance requirements, and unnecessary overhead for stateless workloads.
- **Cloud Functions for Firebase:** Rejected due to reduced container control and no technical advantage over Cloud Run for this use case.

**Justification:**
Cloud Run provides a fully managed, scale-to-zero execution model with strong free-tier alignment (2 million requests/month, 360,000 GiB-seconds, 180,000 vCPU-seconds). It offers automatic HTTPS, container-based deployment for easy local testing, and minimal operational burden.

**Accepted Trade-offs:**

- Cold start latency after periods of inactivity (acceptable for intermittent traffic)
- Stateless execution model with no persistent local storage (not required for token validation)
- Default concurrency limit of 80 requests per instance (sufficient for MVP scale)
- Default timeout of 60 seconds (sufficient for token validation operations)

**Resource Configuration:**

- CPU: 1 vCPU
- Memory: 512 MiB
- Min Instances: 0 (scale to zero)
- Max Instances: 10 (default, sufficient for MVP)
- Concurrency: 80 requests per instance (default)
- Timeout: 60 seconds (default)

---

## ADR-002: Static Hosting for Main Application

**Decision:** Use Firebase Hosting  
**Status:** ACCEPTED

**Context:**
The main app (`apps/app`) is a pure static React SPA with no server-side rendering requirements. It requires CDN distribution, HTTPS enforcement, and custom domain support.

**Alternatives Rejected:**

- **Cloud Storage + Cloud CDN:** Rejected due to added complexity (separate services to configure), no free tier benefit over Firebase Hosting, and increased operational overhead.
- **Cloud Run (for static files):** Rejected due to unnecessary cost and complexity. Static files do not require containerized execution.

**Justification:**
Firebase Hosting provides CDN, HTTPS, and custom domain support out-of-the-box with a single deployment command. It offers a generous free tier (10 GB storage, 360 MB/day transfer) and unified deployment workflow with other Firebase services.

**Accepted Trade-offs:**

- Vendor lock-in to Firebase ecosystem (acceptable given existing Firebase Auth and Firestore usage)
- Limited to static file hosting (no server-side rendering, but not required)
- Shared quota with auth-app client routes (acceptable given low usage estimates)

**Resource Profile:**

- Storage: <50 MB (static assets)
- Transfer: <50 MB/day (estimated)
- CDN: Automatic (included)
- Free Tier Status: ✅ Fully within free tier

---

## ADR-003: Static Hosting for Auth Application Client Routes

**Decision:** Use Firebase Hosting  
**Status:** ACCEPTED

**Context:**
The auth-app client routes (Login, Signup, Session, etc.) are pure static React SPA files with no server-side requirements. They require the same hosting characteristics as the main app.

**Alternatives Rejected:**

- **Separate Cloud Run deployment:** Rejected due to unnecessary overhead for static files. No containerized execution required.
- **Separate Firebase Hosting site:** Rejected due to operational simplicity. Single Firebase Hosting deployment can host multiple apps via routing configuration.

**Justification:**
Firebase Hosting provides unified deployment with the main app, shared free tier quota, and automatic CDN distribution. Routing configuration allows `/api/validate` to be proxied to Cloud Run via rewrite rules.

**Accepted Trade-offs:**

- Shared Firebase Hosting quota with main app (acceptable given low usage estimates)
- Same vendor lock-in considerations as main app (acceptable given existing Firebase dependencies)

**Resource Profile:**

- Storage: <50 MB (static assets)
- Transfer: <50 MB/day (estimated)
- CDN: Automatic (included)
- Free Tier Status: ✅ Fully within free tier

---

## ADR-004: Database Selection

**Decision:** Use Cloud Firestore (Native Mode)  
**Status:** ACCEPTED

**Context:**
The application requires persistent storage for financial accounts and payment periods. The data model consists of user-scoped accounts with nested payment period subcollections, requiring a document-oriented database structure.

**Alternatives Rejected:**

- **Cloud SQL (PostgreSQL/MySQL):** Rejected due to lack of permanent free tier (only 30-day trial), no relational join requirements, and mismatch with document-oriented data model.
- **Cloud Spanner:** Rejected due to global scale database being unnecessary for MVP, high cost, and Firestore being sufficient for requirements.
- **Cloud Bigtable:** Rejected due to time-series database being unnecessary. Firestore handles financial account data adequately.
- **Firestore in Datastore Mode:** Rejected due to Native mode being simpler and better suited for new projects.

**Justification:**
Cloud Firestore provides a NoSQL document model that fits the financial accounts structure (nested payment periods as subcollections). It offers a permanent free tier (50,000 reads/day, 20,000 writes/day, 20,000 deletes/day) and is already integrated via Firebase SDK in the application codebase.

**Accepted Trade-offs:**

- NoSQL limitations (no complex relational joins, but not required)
- Single region deployment (sufficient for MVP, can be upgraded to multi-region later)
- Eventual consistency model (acceptable for financial account data at MVP scale)
- Query limitations requiring composite indexes (indexes defined in `firebase/firestore.indexes.json`)

**Resource Configuration:**

- Database Mode: Native mode (Firestore)
- Region: Single region (default, sufficient for MVP)
- Collections: `financialAccounts` (user-scoped), `financialAccounts/{accountId}/paymentPeriods` (subcollection)
- Indexes: Composite indexes (defined in `firebase/firestore.indexes.json`)

---

## ADR-005: Authentication Service

**Decision:** Use Firebase Authentication  
**Status:** ACCEPTED

**Context:**
The application requires user authentication with ID token issuance and validation. Users must be able to sign up and sign in via email/password, and the application must validate tokens server-side.

**Alternatives Rejected:**

- **Cloud Identity Platform:** Rejected due to added complexity. Firebase Authentication is simpler and sufficient for MVP requirements.

**Justification:**
Firebase Authentication is a managed service with built-in security, no custom auth server required, and strong free tier alignment (50,000 MAU). It is already integrated in the application codebase and provides JWT-like ID tokens suitable for client-side and server-side validation.

**Accepted Trade-offs:**

- Vendor lock-in to Firebase ecosystem (acceptable given existing Firestore and Hosting usage)
- Limited to Firebase-supported providers (email/password sufficient for MVP)
- Token validation requires Firebase Admin SDK (acceptable, already in use)

**Resource Configuration:**

- Providers: Email/Password (default)
- Token Format: Firebase ID tokens (JWT-like)
- Validation: Client-side (format checks) + Server-side (Cloud Run via Admin SDK)
- Free Tier Status: ✅ Fully within free tier (<1,000 MAU estimated)

---

## ADR-006: Secret Management

**Decision:** Use Secret Manager  
**Status:** ACCEPTED

**Context:**
The Cloud Run service requires access to Firebase service account credentials (JSON) and a shared nonce secret. These secrets cannot be hardcoded in container images or environment variables due to security requirements.

**Alternatives Rejected:**

- **Environment variables in Cloud Run:** Rejected due to reduced security (visible in Cloud Console), lack of rotation support, and no audit logging.
- **Cloud KMS:** Rejected due to overkill for simple secrets. Secret Manager provides encryption at rest and rotation support without the complexity of customer-managed encryption keys.

**Justification:**
Secret Manager provides encryption at rest, audit logging, rotation support, and IAM-based access control. It offers a generous free tier (6 secrets, 10,000 access operations/month) and native integration with Cloud Run service accounts.

**Accepted Trade-offs:**

- Additional API calls to retrieve secrets (acceptable given low access frequency)
- IAM configuration required for service account access (standard GCP practice)
- Secrets must be created manually or via Terraform (no automatic provisioning)

**Resource Configuration:**

- Secrets:
  - `firebase-service-account` (JSON string for Firebase Admin SDK)
  - `nonce-secret` (shared secret between apps)
- Access: Cloud Run service account via IAM role `roles/secretmanager.secretAccessor`
- Free Tier Status: ✅ Fully within free tier (2 secrets, <1,000 accesses/month estimated)

---

## ADR-007: Container Registry

**Decision:** Use Artifact Registry  
**Status:** ACCEPTED

**Context:**
Cloud Run requires container images to be stored in a GCP-compatible registry. The auth-app API must be containerized and deployed to Cloud Run.

**Alternatives Rejected:**

- **Container Registry:** Rejected due to deprecation. Artifact Registry is the modern replacement and recommended by Google.
- **Docker Hub:** Rejected due to reduced GCP integration, potential rate limiting, and lack of native IAM integration.

**Justification:**
Artifact Registry is the modern, recommended container registry for GCP. It provides native IAM integration, VPC integration (if needed later), and a free tier (0.5 GB storage). It offers better GCP integration than external registries.

**Accepted Trade-offs:**

- Vendor lock-in to GCP (acceptable given entire stack is GCP-native)
- Storage costs if exceeding free tier (unlikely given single image requirement)

**Resource Configuration:**

- Repository Type: Docker
- Format: Docker images
- Storage: <100 MB (single container image)
- Free Tier Status: ✅ Fully within free tier (0.5 GB free tier)

---

## ADR-008: CI/CD Pipeline

**Decision:** Use Cloud Build (Optional but Recommended)  
**Status:** ACCEPTED

**Context:**
The application requires automated builds and deployments for main app, auth app client routes, and auth app API endpoint. Manual deployment adds operational burden and risk of human error.

**Alternatives Rejected:**

- **GitHub Actions:** Rejected due to Cloud Build providing simpler GCP-native integration, unified service account management, and free tier benefits.
- **Manual deployment:** Rejected due to operational burden, risk of inconsistent deployments, and lack of automation.

**Justification:**
Cloud Build provides native GCP integration, unified service account management for deployments, and a generous free tier (120 build-minutes/day). It supports GitHub webhook triggers and can execute all deployment steps (Firebase Hosting and Cloud Run) in a single pipeline.

**Accepted Trade-offs:**

- Optional service (can be rejected if manual deployment is preferred, but recommended)
- Build configuration must be maintained in repository (`cloudbuild.yaml`)
- Free tier may be exceeded with frequent builds (unlikely given estimated usage)

**Resource Configuration:**

- Builds: Automated on Git push (webhook trigger)
- Build Steps:
  1. Build main app → Deploy to Firebase Hosting
  2. Build auth app → Deploy to Firebase Hosting
  3. Build container → Push to Artifact Registry → Deploy to Cloud Run
- Free Tier Status: ✅ Fully within free tier (<50 build-minutes/day estimated)

**Note:** This service is **optional**. If rejected, deployments can be done manually via CLI.

---

## ADR-009: Observability Strategy

**Decision:** Use Cloud Logging Only (Reject Cloud Monitoring for MVP)  
**Status:** ACCEPTED

**Context:**
The application requires basic observability for debugging and troubleshooting. MVP scale does not require advanced monitoring, alerting, or performance profiling.

**Alternatives Rejected:**

- **Cloud Monitoring:** Rejected due to added complexity, limited free tier (150 MB ingestion, 10 custom metrics), and Cloud Logging being sufficient for MVP debugging requirements.
- **Cloud Trace:** Rejected due to distributed tracing being unnecessary for MVP. Application has simple request flow (browser → Firebase Hosting → Cloud Run).
- **Cloud Profiler:** Rejected due to performance profiling being unnecessary for MVP. Can be added later if performance issues arise.
- **Third-party APM tools:** Rejected due to unnecessary cost and complexity for MVP scale.

**Justification:**
Cloud Logging provides automatic log collection from Cloud Run (stdout/stderr) and Firebase services with no configuration required. It offers a generous free tier (50 GB ingestion, 7-day retention) and is sufficient for MVP debugging and troubleshooting.

**Accepted Trade-offs:**

- No dashboards or alerting (acceptable for MVP, can be added later)
- 7-day log retention (sufficient for debugging, can be extended if needed)
- No custom metrics or performance monitoring (acceptable for MVP scale)
- Manual log analysis required (no automated alerting)

**Resource Configuration:**

- Log Sources:
  - Cloud Run application logs (stdout/stderr)
  - Firebase service logs (automatic)
- Retention: 7 days (free tier)
- Free Tier Status: ✅ Fully within free tier (<1 GB/month estimated)

---

## ADR-010: IAM and Service Account Design

**Decision:** Use Cloud IAM with Dedicated Service Accounts  
**Status:** ACCEPTED

**Context:**
GCP resources require IAM-based access control. Service accounts must be created with minimal required permissions following the principle of least privilege.

**Alternatives Rejected:**

- **Default Compute Engine service account:** Rejected due to overly broad permissions and security risk.
- **Single shared service account for all services:** Rejected due to violation of least privilege principle and reduced auditability.

**Justification:**
Cloud IAM is the required control plane service for GCP operations. Dedicated service accounts with minimal required roles provide better security, auditability, and adherence to least privilege principles.

**Accepted Trade-offs:**

- Multiple service accounts to manage (acceptable given security benefits)
- IAM role configuration required (standard GCP practice)
- Service account key management if needed (prefer workload identity where possible)

**Service Account Configuration:**

**Cloud Run Service Account:**

- Name: `cloud-run-sa@<project-id>.iam.gserviceaccount.com`
- Roles:
  - `roles/secretmanager.secretAccessor` (read secrets from Secret Manager)
  - `roles/firebase.admin` (Firebase Admin SDK operations)
- Usage: Attached to Cloud Run service

**Cloud Build Service Account (if using Cloud Build):**

- Name: `cloud-build-sa@<project-id>.iam.gserviceaccount.com`
- Roles:
  - `roles/artifactregistry.writer` (push images to Artifact Registry)
  - `roles/run.admin` (deploy Cloud Run services)
  - `roles/firebase.admin` (deploy Firebase resources)
- Usage: Attached to Cloud Build triggers

**Control Plane Services (Automatic, No Explicit Deployment):**

- Cloud IAM: Access control for all GCP resources
- Cloud Resource Manager: Project organization, billing
- Cloud Billing: Cost tracking, budget alerts

---

## ADR-011: Environment Strategy

**Decision:** Single Production Environment (No Multi-Project Structure)  
**Status:** ACCEPTED

**Context:**
The MVP requires a single deployment environment. No requirement exists for separate dev/staging/production environments at this stage.

**Alternatives Rejected:**

- **Multi-project structure (dev/staging/prod):** Rejected due to YAGNI principle, increased billing complexity, and no requirement for environment separation at MVP stage.

**Justification:**
Single production environment reduces billing complexity, simplifies management and deployment, and aligns with MVP requirements. Multi-project structure can be added later if needed.

**Accepted Trade-offs:**

- No environment isolation (acceptable for MVP, can be added later)
- Manual testing required before production deployment (acceptable for MVP scale)
- Shared resources across all deployments (acceptable given low usage estimates)

**Resource Configuration:**

- GCP Project: Single project (`rates-production`)
- Environment: Production only
- Future Consideration: Multi-project structure can be added post-MVP if requirements arise

---

## ADR-012: Networking Strategy

**Decision:** Public Internet Access (No VPC Required)  
**Status:** ACCEPTED

**Context:**
All services (Firebase Hosting, Cloud Run, Firestore, Firebase Auth) are designed for public internet access. No private networking, on-premises connectivity, or multi-project peering requirements exist.

**Alternatives Rejected:**

- **VPC with private networking:** Rejected due to no requirement for private IPs, added complexity, and Firebase services being public by design.
- **Cloud Load Balancer:** Rejected due to Firebase Hosting providing CDN and routing. Firebase Hosting rewrites can proxy `/api/validate` to Cloud Run. Load Balancer adds $18/month base cost.
- **Cloud CDN:** Rejected due to Firebase Hosting including CDN automatically.
- **Cloud NAT:** Rejected due to no private networking requirements.
- **VPC Peering:** Rejected due to no multi-project or on-premises connectivity required.
- **Cloud Armor:** Rejected due to DDoS protection being unnecessary for MVP scale. Firebase Hosting and Cloud Run provide basic protection.

**Justification:**
Public internet access is the default and simplest networking model for Firebase services and Cloud Run. It requires no VPC configuration, reduces complexity, and aligns with the serverless architecture.

**Accepted Trade-offs:**

- No network isolation (acceptable for public web application)
- No private IP addresses (not required for public services)
- Basic DDoS protection only (sufficient for MVP scale)

**Resource Configuration:**

- Networking: Public internet access
- HTTPS: Enforced by Firebase Hosting and Cloud Run (automatic)
- Routing: Firebase Hosting rewrite rules proxy `/api/validate` to Cloud Run service URL
- CORS: Handled in Cloud Run service code

---

## Summary of Rejected Services

The following services were analyzed but **explicitly rejected** for the final architecture. They must not be included in Terraform configurations unless a formal ADR amendment is approved.

### Compute Services

- Google Kubernetes Engine (GKE)
- App Engine
- Compute Engine (VMs)
- Cloud Functions for Firebase

### Database Services

- Cloud SQL
- Cloud Spanner
- Cloud Bigtable

### Networking Services

- Cloud Load Balancer
- Cloud CDN
- Cloud NAT
- VPC Peering
- Cloud Armor

### Storage Services

- Cloud Storage (for static hosting)
- Firebase Storage (Cloud Storage backend)

### Observability Services

- Cloud Monitoring
- Cloud Trace
- Cloud Profiler

### Messaging & Event Services

- Pub/Sub
- Cloud Tasks
- Cloud Scheduler

### Development & Operations Services

- Cloud Source Repositories
- Cloud DNS
- Cloud Endpoints
- Apigee

### Security Services

- Cloud KMS
- Cloud Identity-Aware Proxy (IAP)
- Cloud Security Command Center

---

## Free Tier Compliance Summary

| Service           | Free Tier Limit           | Estimated Usage            | Status          |
| ----------------- | ------------------------- | -------------------------- | --------------- |
| Firebase Auth     | 50,000 MAU                | <1,000 MAU                 | ✅ Within limit |
| Cloud Firestore   | 50K reads, 20K writes/day | <10K reads, <5K writes/day | ✅ Within limit |
| Firebase Hosting  | 10 GB, 360 MB/day         | <100 MB, <50 MB/day        | ✅ Within limit |
| Cloud Run         | 2M requests, 360K GiB-sec | <100K requests/month       | ✅ Within limit |
| Secret Manager    | 6 secrets, 10K accesses   | 2 secrets, <1K accesses    | ✅ Within limit |
| Artifact Registry | 0.5 GB                    | <100 MB                    | ✅ Within limit |
| Cloud Build       | 120 build-min/day         | <50 build-min/day          | ✅ Within limit |
| Cloud Logging     | 50 GB ingestion           | <1 GB/month                | ✅ Within limit |

**Conclusion:** All selected services are **fully within GCP Free Tier limits** for MVP scale.

---

## Cost Guidance

**Free Tier Coverage:** $0/month (all services within free tier)

**Potential Costs (if usage exceeds free tier):**

- Cloud Firestore: $0-5/month (if moderate usage)
- Cloud Run: $0-10/month (if high traffic)
- Firebase Hosting: $0-5/month (if high traffic)

**Total Estimated Monthly Cost:** $0-20 for small to medium scale usage.

**Note:** This document provides qualitative cost guidance only. Actual costs depend on usage patterns and should be monitored via Cloud Billing.

---

## Document Governance

**Change Process:**

1. Any deviation from these decisions requires a formal ADR amendment
2. ADR amendments must be approved by Lead Google Cloud Architect
3. Terraform configurations must reference specific ADR numbers
4. All changes must be documented with rationale and trade-offs

**Review Cycle:**

- This document is locked for Terraform implementation phase
- Post-MVP review may consider additional services or architectural changes
- All amendments must maintain free tier compliance unless explicitly approved

---

**Document End**

This architectural decision log represents the final, locked service selections for the Rates monorepo GCP deployment. All decisions prioritize simplicity, free tier utilization, and operational ease over enterprise patterns that add cost and complexity without MVP value.
