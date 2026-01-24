# GCP Architecture Decision Record

## Professional Cloud Architect (PCA) - Final Selection

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Decision Type:** Architecture Rationalization & Service Selection  
**Status:** Final

---

## Executive Summary

This document represents the **final architecture decision** for deploying the Rates monorepo to Google Cloud Platform. It applies ruthless YAGNI (You Ain't Gonna Need It) principles to select the minimal viable stack that meets functional requirements while staying within GCP Free Tier constraints.

**Decision Philosophy:**

- **Default to serverless** (Cloud Run) for compute
- **Default to Firestore** for database (no Cloud SQL)
- **Default to Firebase Hosting** for static assets (no Cloud Storage + CDN)
- **Reject enterprise patterns** that add cost/complexity without MVP value
- **Single production environment** (no multi-project overhead)

---

## 1. The "Golden Path" Architecture

### 1.1 Core Stack Summary

**Compute:**

- **Cloud Run (v2)** - Single service for auth-app API endpoint (`/api/validate`)
- **Firebase Hosting** - Static file hosting for both React SPAs (main-app and auth-app client routes)

**Database:**

- **Cloud Firestore** - Primary NoSQL database for financial accounts and payment periods

**Authentication:**

- **Firebase Authentication** - User authentication and ID token issuance

**Infrastructure:**

- **Secret Manager** - Service account credentials and nonce secrets
- **Artifact Registry** - Container image storage for Cloud Run
- **Cloud Build** - CI/CD pipeline (optional but recommended for automation)

**Observability:**

- **Cloud Logging** - Automatic log collection (no configuration required)
- **Cloud Monitoring** - Rejected for MVP (Cloud Logging sufficient for debugging)

### 1.2 Architecture Flow Description

```
User Browser
    │
    ├─▶ HTTPS Request
    │
    ├─▶ Firebase Hosting (CDN)
    │   ├─▶ Main App (Static SPA) ──┐
    │   └─▶ Auth App (Static SPA) ──┤
    │                                │
    │                                ├─▶ Firebase Authentication (ID tokens)
    │                                │
    │                                └─▶ Cloud Firestore (user data)
    │
    └─▶ /api/validate Request
        │
        └─▶ Cloud Run Service (auth-app-api)
            │
            ├─▶ Secret Manager (service account credentials)
            │
            └─▶ Firebase Admin SDK (token validation)
```

**Key Characteristics:**

- **Public internet access** for all services (no VPC required)
- **HTTPS-only** (enforced by Firebase Hosting and Cloud Run)
- **Scale-to-zero** for Cloud Run (min instances = 0)
- **CDN caching** for static assets (automatic via Firebase Hosting)

---

## 2. Service Selection & Definition

### 2.1 Main App (`apps/app`)

**Selected GCP Service:** Firebase Hosting

**Resource Profile:**

- **Storage:** <50 MB (static assets)
- **Transfer:** <50 MB/day (estimated)
- **CDN:** Automatic (included in Firebase Hosting)

**Selection Rationale:**

- Pure static React SPA with no server-side requirements
- Firebase Hosting provides CDN, HTTPS, and custom domain support out-of-the-box
- **Chosen over:** Cloud Storage + Cloud CDN (adds complexity, no free tier benefit)
- **Chosen over:** Cloud Run (unnecessary for static files, adds cost)

**Free Tier Strategy:**

- Within free tier: 10 GB storage, 360 MB/day transfer
- Estimated usage: <100 MB storage, <50 MB/day transfer
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Build: `pnpm build` → `apps/app/dist/`
- Deploy: `firebase deploy --only hosting --project <project-id>`
- Environment variables: Injected at build time (via Cloud Build or local build)

---

### 2.2 Auth App - Client Routes (`apps/auth-app`)

**Selected GCP Service:** Firebase Hosting

**Resource Profile:**

- **Storage:** <50 MB (static assets)
- **Transfer:** <50 MB/day (estimated)
- **CDN:** Automatic (included in Firebase Hosting)

**Selection Rationale:**

- React SPA routes (Login, Signup, Session, etc.) are pure static files
- Firebase Hosting provides unified deployment with main app
- **Chosen over:** Separate Cloud Run deployment (unnecessary overhead)

**Free Tier Strategy:**

- Same as main app (shared Firebase Hosting quota)
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Build: `pnpm build:auth-app` → `apps/auth-app/dist/`
- Deploy: `firebase deploy --only hosting --project <project-id>`
- Routing: Firebase Hosting rewrites `/api/validate` to Cloud Run (see below)

---

### 2.3 Auth App - API Endpoint (`/api/validate`)

**Selected GCP Service:** Cloud Run (v2)

**Resource Profile:**

- **CPU:** 1 vCPU
- **Memory:** 512 MiB
- **Min Instances:** 0 (scale to zero)
- **Max Instances:** 10 (default, sufficient for MVP)
- **Concurrency:** 80 requests per instance (default)
- **Timeout:** 60 seconds (default)

**Selection Rationale:**

- **Required:** Server-side Node.js runtime for Firebase Admin SDK
- Cloud Run provides scale-to-zero, automatic HTTPS, and generous free tier
- **Chosen over:** App Engine (Cloud Run is more modern, better free tier)
- **Chosen over:** Compute Engine (unnecessary overhead, no scale-to-zero)
- **Chosen over:** Cloud Functions (Cloud Run provides better container control)

**Free Tier Strategy:**

- Free tier: 2 million requests/month, 360,000 GiB-seconds, 180,000 vCPU-seconds
- Estimated usage: <100K requests/month (small app)
- With scale-to-zero: ~50K GiB-seconds/month (idle time = 0 cost)
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Container build: Cloud Build or local `docker build`
- Push to Artifact Registry: `gcloud artifacts docker push`
- Deploy: `gcloud run deploy auth-app-api --image <image-url>`
- Environment variables: Injected at runtime from Secret Manager

**API Routing:**

- Firebase Hosting rewrite rule: `/api/validate` → Cloud Run service URL
- CORS: Handled in Cloud Run service code (already implemented)

---

### 2.4 Database

**Selected GCP Service:** Cloud Firestore

**Resource Profile:**

- **Database Mode:** Native mode (Firestore)
- **Region:** Single region (default, sufficient for MVP)
- **Collections:**
  - `financialAccounts` (user-scoped)
  - `financialAccounts/{accountId}/paymentPeriods` (subcollection)
- **Indexes:** Composite indexes (defined in `firebase/firestore.indexes.json`)

**Selection Rationale:**

- **Required:** Application uses Firestore SDK directly
- NoSQL document model fits financial accounts structure (nested payment periods)
- **Chosen over:** Cloud SQL (no relational joins required, Cloud SQL has no permanent free tier)
- **Chosen over:** Firestore in Datastore mode (Native mode is simpler, better for new projects)

**Free Tier Strategy:**

- Free tier: 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day
- Estimated usage: <10K reads/day, <5K writes/day (small app)
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Rules: `firebase deploy --only firestore:rules`
- Indexes: `firebase deploy --only firestore:indexes`
- Data: Created via application SDK calls

---

### 2.5 Authentication

**Selected GCP Service:** Firebase Authentication

**Resource Profile:**

- **Providers:** Email/Password (default)
- **Token Format:** Firebase ID tokens (JWT-like)
- **Validation:** Client-side (format checks) + Server-side (Cloud Run via Admin SDK)

**Selection Rationale:**

- **Required:** Application uses Firebase Auth SDK
- Managed service with built-in security (no custom auth server needed)
- **Chosen over:** Cloud Identity Platform (Firebase Auth is simpler, sufficient for MVP)

**Free Tier Strategy:**

- Free tier: 50,000 MAU (Monthly Active Users)
- Estimated usage: <1,000 MAU (small app)
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Configuration: Firebase Console (enable Email/Password provider)
- No deployment required (managed service)

---

### 2.6 Secret Management

**Selected GCP Service:** Secret Manager

**Resource Profile:**

- **Secrets:**
  - `firebase-service-account` (JSON string for Firebase Admin SDK)
  - `nonce-secret` (shared secret between apps)
- **Access:** Cloud Run service account (via IAM)

**Selection Rationale:**

- **Required:** Service account credentials cannot be hardcoded
- Secret Manager provides encryption at rest, audit logging, and rotation support
- **Chosen over:** Environment variables in Cloud Run (less secure, no rotation)
- **Chosen over:** Cloud KMS (overkill for simple secrets, adds cost)

**Free Tier Strategy:**

- Free tier: 6 secrets, 10,000 access operations/month
- Estimated usage: 2 secrets, <1,000 accesses/month
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Create secrets: `gcloud secrets create <secret-name> --data-file=-`
- Grant access: IAM role `roles/secretmanager.secretAccessor` to Cloud Run service account

---

### 2.7 Container Registry

**Selected GCP Service:** Artifact Registry

**Resource Profile:**

- **Repository Type:** Docker
- **Format:** Docker images
- **Storage:** <100 MB (single container image)

**Selection Rationale:**

- **Required:** Cloud Run requires container images from a registry
- Artifact Registry is the modern replacement for Container Registry
- **Chosen over:** Container Registry (deprecated, Artifact Registry is recommended)
- **Chosen over:** Docker Hub (Artifact Registry provides better GCP integration)

**Free Tier Strategy:**

- Free tier: 0.5 GB storage
- Estimated usage: <100 MB (single image, versioned)
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Create repository: `gcloud artifacts repositories create rates-containers --repository-format=docker`
- Push image: `gcloud artifacts docker push <region>-docker.pkg.dev/<project>/rates-containers/auth-app-api:latest`

---

### 2.8 CI/CD Pipeline

**Selected GCP Service:** Cloud Build

**Resource Profile:**

- **Builds:** Automated on Git push (webhook trigger)
- **Build Steps:**
  1. Build main app → Deploy to Firebase Hosting
  2. Build auth app → Deploy to Firebase Hosting
  3. Build container → Push to Artifact Registry → Deploy to Cloud Run

**Selection Rationale:**

- **Recommended but optional:** Can use GitHub Actions or local builds
- Cloud Build provides native GCP integration and free tier
- **Chosen over:** GitHub Actions (Cloud Build is simpler for GCP-native deployments)
- **Chosen over:** Manual deployment (adds operational burden)

**Free Tier Strategy:**

- Free tier: 120 build-minutes/day
- Estimated usage: <10 builds/day × 5 minutes = 50 minutes/day
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Create trigger: `gcloud builds triggers create` (GitHub webhook)
- Build config: `cloudbuild.yaml` in repository root

**Note:** This service is **optional**. If rejected, deployments can be done manually via CLI.

---

### 2.9 Observability

**Selected GCP Service:** Cloud Logging (only)

**Resource Profile:**

- **Log Sources:**
  - Cloud Run application logs (stdout/stderr)
  - Firebase service logs (automatic)
- **Retention:** 7 days (free tier)

**Selection Rationale:**

- **Required:** Automatic log collection (no configuration needed)
- Sufficient for MVP debugging and troubleshooting
- **Chosen over:** Cloud Monitoring (adds complexity, Cloud Logging sufficient for MVP)
- **Chosen over:** Third-party APM tools (unnecessary for MVP scale)

**Free Tier Strategy:**

- Free tier: 50 GB ingestion, 7-day retention
- Estimated usage: <1 GB/month (small app, low traffic)
- **Status:** ✅ Fully within free tier

**Deployment Method:**

- Automatic (no configuration required)
- Logs accessible via Cloud Console or `gcloud logging read`

---

## 3. Shared Infrastructure (Simplified)

### 3.1 Required Control Plane Services

These services are **automatic** (no explicit deployment required) but are essential for GCP operations:

1. **Cloud IAM**
   - Purpose: Access control for all GCP resources
   - Required Roles:
     - Cloud Run service account: `roles/secretmanager.secretAccessor`, `roles/firebase.admin`
     - Cloud Build service account: `roles/artifactregistry.writer`, `roles/run.admin`, `roles/firebase.admin`
   - Free tier: Included

2. **Cloud Resource Manager**
   - Purpose: Project organization, billing
   - Free tier: Included

3. **Cloud Billing**
   - Purpose: Cost tracking, budget alerts
   - Free tier: Included (billing account required)

### 3.2 Service Account Design

**Cloud Run Service Account:**

- Name: `cloud-run-sa@<project-id>.iam.gserviceaccount.com`
- Roles:
  - `roles/secretmanager.secretAccessor` (read secrets)
  - `roles/firebase.admin` (Firebase Admin SDK operations)
- Usage: Attached to Cloud Run service

**Cloud Build Service Account (if using Cloud Build):**

- Name: `cloud-build-sa@<project-id>.iam.gserviceaccount.com`
- Roles:
  - `roles/artifactregistry.writer` (push images)
  - `roles/run.admin` (deploy Cloud Run services)
  - `roles/firebase.admin` (deploy Firebase resources)
- Usage: Attached to Cloud Build triggers

---

## 4. The "Cut List" (Rejections)

Services that were analyzed in `GCP_ARCHITECTURE_ANALYSIS.md` but **rejected** for the final architecture:

### 4.1 Compute Services

**Rejected Cloud Functions for Firebase:**

- **Reason:** Configured but not used. Application uses Cloud Run for server-side logic. No need for additional serverless functions.

**Rejected App Engine:**

- **Reason:** Cloud Run is more modern, provides better container control, and has a superior free tier. No technical requirement for App Engine.

**Rejected Compute Engine:**

- **Reason:** Unnecessary overhead for stateless API endpoint. Cloud Run provides scale-to-zero and automatic management. No persistent VM requirements.

**Rejected GKE (Google Kubernetes Engine):**

- **Reason:** Massive overkill for a single API endpoint. Adds operational complexity, cost, and no MVP benefit.

### 4.2 Database Services

**Rejected Cloud SQL:**

- **Reason:** No relational joins required. Firestore NoSQL model fits the data structure. Cloud SQL has no permanent free tier (only 30-day trial).

**Rejected Cloud Spanner:**

- **Reason:** Global scale database unnecessary for MVP. Firestore is sufficient and has a free tier.

**Rejected Bigtable:**

- **Reason:** Time-series database unnecessary. Firestore handles financial account data adequately.

### 4.3 Networking Services

**Rejected Cloud Load Balancer:**

- **Reason:** Firebase Hosting provides CDN and routing. Can use Firebase Hosting rewrites to proxy `/api/validate` to Cloud Run. Load Balancer adds $18/month base cost.

**Rejected Cloud CDN:**

- **Reason:** Firebase Hosting includes CDN automatically. No need for separate CDN service.

**Rejected Cloud NAT:**

- **Reason:** No private networking requirements. All services are public (Firebase services are public by design).

**Rejected VPC Peering:**

- **Reason:** No multi-project or on-premises connectivity required. Single project architecture.

**Rejected Cloud Armor:**

- **Reason:** DDoS protection unnecessary for MVP scale. Firebase Hosting and Cloud Run provide basic protection.

### 4.4 Storage Services

**Rejected Cloud Storage (for static hosting):**

- **Reason:** Firebase Hosting provides static hosting with CDN. Cloud Storage + CDN adds complexity without free tier benefit.

**Rejected Firebase Storage (Cloud Storage backend):**

- **Reason:** Configured in codebase but not actively used. Storage rules deny all access. Can be added later if file uploads are needed.

### 4.5 Observability Services

**Rejected Cloud Monitoring:**

- **Reason:** Cloud Logging is sufficient for MVP debugging. Monitoring adds dashboards and alerting that can be added later if needed. Free tier is limited (150 MB ingestion, 10 custom metrics).

**Rejected Cloud Trace:**

- **Reason:** Distributed tracing unnecessary for MVP. Application has simple request flow (browser → Firebase Hosting → Cloud Run).

**Rejected Cloud Profiler:**

- **Reason:** Performance profiling unnecessary for MVP. Can be added later if performance issues arise.

### 4.6 Messaging & Event Services

**Rejected Pub/Sub:**

- **Reason:** No event-driven architecture requirements. Application uses direct SDK calls and HTTP requests.

**Rejected Cloud Tasks:**

- **Reason:** No background job processing required. All operations are synchronous.

**Rejected Cloud Scheduler:**

- **Reason:** No scheduled tasks required. Application is user-driven only.

### 4.7 Development & Operations Services

**Rejected Cloud Source Repositories:**

- **Reason:** GitHub/GitLab can be used directly. Cloud Source Repositories adds no value if already using external Git hosting.

**Rejected Cloud DNS:**

- **Reason:** Custom domains can be configured via Firebase Hosting and Cloud Run domain mapping. Cloud DNS only needed for advanced DNS management (not required for MVP).

**Rejected Cloud Endpoints:**

- **Reason:** API gateway unnecessary. Single API endpoint (`/api/validate`) can be handled directly by Cloud Run.

**Rejected Apigee:**

- **Reason:** Enterprise API management platform unnecessary for MVP. Massive overkill.

### 4.8 Security Services

**Rejected Cloud KMS:**

- **Reason:** Secret Manager provides encryption at rest for secrets. Cloud KMS is for customer-managed encryption keys (unnecessary for MVP).

**Rejected Cloud Identity-Aware Proxy (IAP):**

- **Reason:** Application uses Firebase Authentication for user auth. IAP is for protecting GCP resources (not needed for public web app).

**Rejected Cloud Security Command Center:**

- **Reason:** Enterprise security monitoring unnecessary for MVP. Can be added later if compliance requirements arise.

---

## 5. Resource Configuration Summary

### 5.1 Free Tier Limits & Usage Estimates

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

### 5.2 Estimated Monthly Cost

**Free Tier Coverage:** $0/month (all services within free tier)

**Potential Costs (if usage exceeds free tier):**

- Cloud Firestore: $0-5/month (if moderate usage)
- Cloud Run: $0-10/month (if high traffic)
- Firebase Hosting: $0-5/month (if high traffic)

**Total Estimated Monthly Cost:** $0-20 for small to medium scale usage.

---

## 6. Architecture Decision Rationale

### 6.1 Why Cloud Run Over Alternatives?

- **Scale-to-zero:** No cost when idle (critical for free tier)
- **Container-based:** Modern deployment model, easy local testing
- **Automatic HTTPS:** No certificate management
- **Generous free tier:** 2M requests/month
- **Simpler than GKE:** No cluster management overhead

### 6.2 Why Firestore Over Cloud SQL?

- **NoSQL fits data model:** Financial accounts with nested payment periods
- **No relational joins:** Application doesn't require complex SQL queries
- **Free tier:** 50K reads, 20K writes/day (permanent)
- **Cloud SQL:** Only 30-day trial, then paid

### 6.3 Why Firebase Hosting Over Cloud Storage + CDN?

- **Simpler deployment:** Single `firebase deploy` command
- **Built-in CDN:** No separate CDN configuration
- **Custom domains:** Built-in support
- **Free tier:** 10 GB storage, 360 MB/day transfer
- **Cloud Storage + CDN:** More complex, no free tier benefit

### 6.4 Why Single Production Environment?

- **YAGNI:** No requirement for dev/staging separation at MVP
- **Cost:** Single project reduces billing complexity
- **Simplicity:** Easier to manage and deploy
- **Can add later:** Multi-project structure can be added if needed

---

## 7. Deployment Architecture

### 7.1 Single GCP Project Structure

```
GCP Project: rates-production
├── Firebase Services
│   ├── Authentication
│   ├── Firestore (database: (default))
│   └── Hosting (sites: main-app, auth-app)
├── Cloud Run
│   └── auth-app-api (service: auth-app-validate)
├── Secret Manager
│   ├── firebase-service-account
│   └── nonce-secret
├── Artifact Registry
│   └── rates-containers (repository: docker)
├── Cloud Build (optional)
│   └── Triggers (GitHub webhooks)
└── IAM
    ├── Service Accounts
    │   ├── cloud-run-sa@<project>.iam.gserviceaccount.com
    │   └── cloud-build-sa@<project>.iam.gserviceaccount.com
    └── Roles & Permissions
```

### 7.2 Deployment Flow

**Main App:**

1. Build: `pnpm build` → `apps/app/dist/`
2. Deploy: `firebase deploy --only hosting --project <project-id>`

**Auth App (Client):**

1. Build: `pnpm build:auth-app` → `apps/auth-app/dist/`
2. Deploy: `firebase deploy --only hosting --project <project-id>`

**Auth App (API):**

1. Build container: `docker build -t auth-app-api .`
2. Push: `gcloud artifacts docker push <region>-docker.pkg.dev/<project>/rates-containers/auth-app-api:latest`
3. Deploy: `gcloud run deploy auth-app-api --image <image-url> --service-account cloud-run-sa@<project>.iam.gserviceaccount.com`
4. Configure Firebase Hosting rewrite: Add rewrite rule in `firebase.json` to proxy `/api/validate` to Cloud Run URL

---

## 8. Next Steps

### 8.1 Immediate Actions

1. **Create GCP Project:** Set up project with billing enabled
2. **Enable Firebase:** Link Firebase to GCP project
3. **Create Service Accounts:** Set up Cloud Run and Cloud Build service accounts with minimal required roles
4. **Create Secrets:** Store service account JSON and nonce secret in Secret Manager
5. **Deploy Firestore Rules:** Deploy security rules and indexes via `firebase deploy --only firestore:rules,firestore:indexes`

### 8.2 Short-Term (1-2 weeks)

1. **Set Up CI/CD (Optional):** Configure Cloud Build triggers for automated deployment
2. **Deploy Applications:** Deploy main app and auth app to Firebase Hosting
3. **Deploy Cloud Run:** Deploy auth-app API endpoint to Cloud Run
4. **Configure Routing:** Set up Firebase Hosting rewrites to proxy `/api/validate` to Cloud Run
5. **Test End-to-End:** Verify authentication, token validation, and data access

### 8.3 Future Considerations (Post-MVP)

- **Cloud Monitoring:** Add if observability requirements grow
- **Firebase Storage:** Enable if file uploads are needed
- **Multi-Environment:** Consider separate GCP projects for dev/staging/prod
- **Custom Domains:** Configure via Firebase Hosting and Cloud Run domain mapping
- **Performance Optimization:** Monitor Firestore queries, optimize Cloud Run scaling

---

## 9. Decision Log

| Date | Decision                                           | Rationale                                  |
| ---- | -------------------------------------------------- | ------------------------------------------ |
| 2024 | Selected Cloud Run over App Engine                 | Modern, better free tier, container-based  |
| 2024 | Selected Firestore over Cloud SQL                  | NoSQL fits data model, permanent free tier |
| 2024 | Selected Firebase Hosting over Cloud Storage + CDN | Simpler, built-in CDN, free tier           |
| 2024 | Rejected Cloud Monitoring for MVP                  | Cloud Logging sufficient for debugging     |
| 2024 | Rejected Cloud Load Balancer                       | Firebase Hosting rewrites sufficient       |
| 2024 | Rejected Firebase Storage                          | Not actively used, can add later           |

---

**Document End**

This architecture decision record represents the final, opinionated selection of GCP services for the Rates monorepo deployment. All decisions prioritize simplicity, free tier utilization, and operational ease over enterprise patterns that add cost and complexity without MVP value.
