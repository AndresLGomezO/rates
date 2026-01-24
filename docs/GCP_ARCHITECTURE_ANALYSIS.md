# GCP Deployment Architecture Analysis

## Professional Cloud Architect (PCA) Assessment

**Document Version:** 1.0  
**Date:** 2026  
**Project:** Rates Monorepo  
**Analysis Scope:** Complete GCP service discovery, dependency mapping, and deployment architecture

---

## Executive Summary

This document provides a comprehensive GCP architecture analysis for the **Rates** monorepo, a Firebase-backed financial accounts management system. The analysis identifies **all required GCP services** (direct, indirect, and transitive), classifies them by application and purpose, maps dependencies, and proposes a production-ready deployment architecture aligned with Google Cloud Architecture Framework principles.

### Key Findings

- **Application Type:** Two React SPAs (main app + auth app) with Firebase backend
- **Primary GCP Services:** Firebase (Auth, Firestore, Storage), Cloud Run (for auth-app server-side), Cloud Storage/CDN (for static hosting)
- **Architecture Pattern:** Serverless-first, static frontends with managed backend services
- **Estimated Monthly Cost:** $0-50 (primarily within Free Tier for small-scale usage)
- **Deployment Complexity:** Low to Medium (standard Firebase + Cloud Run pattern)

### Critical Architecture Decisions

1. **Auth-App Server Runtime:** The auth-app requires server-side execution for `/api/validate` endpoint (Firebase Admin SDK). **Cloud Run** is the recommended serverless container platform.
2. **Static Hosting:** Both apps can be served via **Firebase Hosting** or **Cloud Storage + Cloud CDN** for optimal cost and performance.
3. **Single GCP Project:** Recommended for simplicity; multi-project structure can be added for production isolation if needed.
4. **Secret Management:** **Secret Manager** required for service account credentials and nonce secrets.

---

## 1. Repository Analysis Results

### 1.1 Application Discovery

#### Application 1: Main App (`apps/app`)

**Type:** React 18 SPA (Single Page Application)  
**Build Tool:** Vite 6.0.5  
**Entry Point:** `apps/app/src/main.tsx`  
**Build Output:** `apps/app/dist/` (static assets)

**Key Characteristics:**

- Pure client-side React application
- No server-side rendering (SSR)
- Direct Firebase client SDK integration
- Communicates with auth-app via HTTP fetch for token validation
- Uses React Router v7 for client-side routing

**Dependencies:**

- `@rates/firebase-client` (workspace package)
- `firebase` ^11.1.0 (client SDK)
- `react`, `react-dom`, `react-router`
- `recharts` (data visualization)

**Environment Variables (Build-Time):**

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_AUTH_APP_URL` (URL of auth-app)
- `VITE_NONCE_SECRET` (shared secret for nonce validation)

**Deployment Requirements:**

- Static file hosting (HTML, JS, CSS)
- CDN for global distribution
- Environment variable injection at build time
- CORS configuration (if auth-app on different domain)

---

#### Application 2: Auth App (`apps/auth-app`)

**Type:** React 18 SPA with Server-Side API Endpoint  
**Build Tool:** Vite 6.0.5  
**Entry Point:** `apps/auth-app/src/main.tsx`  
**Build Output:** `apps/app/dist/` (static assets) + server middleware

**Key Characteristics:**

- Client-side React application (most routes)
- **Server-side API endpoint:** `/api/validate` (implemented via Vite plugin middleware)
- Uses Firebase Admin SDK for server-side token validation
- Requires Node.js runtime for `/api/validate` endpoint
- Supports Application Default Credentials (ADC) for GCP environments

**Dependencies:**

- `firebase` ^11.1.0 (client SDK)
- `firebase-admin` ^13.0.1 (server-side Admin SDK)
- `react`, `react-dom`, `react-router`

**Environment Variables:**

- **Client-side (Build-Time):** Same Firebase config as main app
- **Server-side (Runtime):**
  - `GOOGLE_APPLICATION_CREDENTIALS` (service account file path)
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (service account JSON string)
  - `FIREBASE_PROJECT_ID`
  - `VITE_NONCE_SECRET`

**Deployment Requirements:**

- **Hybrid deployment:**
  - Static file hosting for React routes (HTML, JS, CSS)
  - **Server runtime** for `/api/validate` endpoint (Node.js)
- Environment variable injection (build-time + runtime)
- Secret management for service account credentials

**Critical Constraint:** The `/api/validate` endpoint cannot be served as static files. It requires a server runtime capable of executing Node.js and accessing Firebase Admin SDK.

---

#### Application 3: Firebase Client Package (`packages/firebase-client`)

**Type:** Shared TypeScript library  
**Purpose:** Centralized Firebase initialization and utilities  
**Deployment:** Bundled into consuming applications (not deployed separately)

**Key Characteristics:**

- Wraps Firebase client SDK initialization
- Handles emulator/live mode switching
- Provides typed financial account schemas
- Exports service getters (Auth, Firestore, Storage, Functions)

**GCP Impact:** No direct GCP service requirements (library code only)

---

### 1.2 Technology Stack Mapping

#### Runtime Environments

| Component           | Runtime          | Version  | GCP Service Mapping                    |
| ------------------- | ---------------- | -------- | -------------------------------------- |
| Main App            | Browser (static) | N/A      | Firebase Hosting / Cloud Storage + CDN |
| Auth App (Client)   | Browser (static) | N/A      | Firebase Hosting / Cloud Storage + CDN |
| Auth App (API)      | Node.js          | >=18.0.0 | Cloud Run                              |
| Firebase Client SDK | Browser          | 11.1.0   | N/A (client library)                   |
| Firebase Admin SDK  | Node.js          | 13.0.1   | Cloud Run (via auth-app)               |

#### External Dependencies & Third-Party Integrations

| Dependency         | Type                 | GCP Service Required                                             |
| ------------------ | -------------------- | ---------------------------------------------------------------- |
| Firebase Auth      | Backend Service      | Firebase Authentication                                          |
| Firestore          | Database             | Cloud Firestore                                                  |
| Firebase Storage   | Object Storage       | Firebase Storage (Cloud Storage)                                 |
| Firebase Functions | Serverless Functions | Cloud Functions for Firebase (optional, configured but not used) |

**No external SaaS integrations** (Stripe, Auth0, etc.) detected.

#### Database Requirements

- **Primary Database:** Cloud Firestore (NoSQL document database)
- **Collections:**
  - `financialAccounts` (user-scoped)
  - `financialAccounts/{accountId}/paymentPeriods` (subcollection)
- **Indexes:** Composite indexes defined in `firebase/firestore.indexes.json`
- **Security Rules:** Defined in `firebase/firestore.rules`

#### Authentication/Authorization

- **Provider:** Firebase Authentication
- **Token Format:** Firebase ID tokens (JWT-like)
- **Validation:**
  - Client-side (format checks)
  - Server-side (Firebase Admin SDK via `/api/validate`)
- **Authorization:** Firestore security rules (user-scoped queries)

#### Message Queuing / Event Streaming

**None detected.** No background job processors, message queues, or event streaming systems.

---

### 1.3 Infrastructure Requirements Detection

#### Network Topology

**Minimal networking complexity required:**

- Public internet access for both SPAs
- No VPC requirements for Firebase services (managed services)
- Optional: Cloud Load Balancer for custom domains (if not using Firebase Hosting)

#### Storage Needs

| Storage Type    | Purpose                | GCP Service                       | Estimated Size       |
| --------------- | ---------------------- | --------------------------------- | -------------------- |
| Static Assets   | App bundles (JS/CSS)   | Cloud Storage / Firebase Hosting  | <50 MB per app       |
| Database        | Firestore documents    | Cloud Firestore                   | Variable (user data) |
| Object Storage  | File uploads (if used) | Firebase Storage                  | Variable             |
| Build Artifacts | CI/CD artifacts        | Cloud Storage / Artifact Registry | <100 MB              |

#### Compute Requirements

| Component         | CPU          | Memory        | Scaling Pattern            | GCP Service                      |
| ----------------- | ------------ | ------------- | -------------------------- | -------------------------------- |
| Main App          | N/A (static) | N/A           | CDN caching                | Firebase Hosting / Cloud Storage |
| Auth App (Client) | N/A (static) | N/A           | CDN caching                | Firebase Hosting / Cloud Storage |
| Auth App (API)    | 0.5-1 vCPU   | 512 MB - 1 GB | Request-based (serverless) | Cloud Run                        |

**Scaling Characteristics:**

- Static apps: CDN handles traffic spikes automatically
- API endpoint: Cloud Run scales to zero when idle, scales up based on request volume

#### Integration Points

- **Firebase Services:** Direct SDK integration (no API gateway needed)
- **Cross-App Communication:** HTTP fetch from main app to auth-app (`/api/validate`)
- **External APIs:** None

---

## 2. Complete GCP Service Inventory

### 2.1 Service Classification

#### Per-Application Services

| Service              | Application       | Purpose                            | Required             |
| -------------------- | ----------------- | ---------------------------------- | -------------------- |
| **Firebase Hosting** | Main App          | Static file hosting                | Yes (or alternative) |
| **Firebase Hosting** | Auth App (Client) | Static file hosting                | Yes (or alternative) |
| **Cloud Run**        | Auth App (API)    | Server runtime for `/api/validate` | Yes                  |

#### Shared / Global Services

| Service                     | Purpose                                    | Required                 |
| --------------------------- | ------------------------------------------ | ------------------------ |
| **Firebase Authentication** | User authentication                        | Yes                      |
| **Cloud Firestore**         | Primary database                           | Yes                      |
| **Firebase Storage**        | Object storage (if used)                   | Yes                      |
| **Secret Manager**          | Service account credentials, nonce secrets | Yes                      |
| **Cloud Build**             | CI/CD pipeline                             | Recommended              |
| **Artifact Registry**       | Container images (for Cloud Run)           | Yes (if using Cloud Run) |

#### Cross-Cutting Services

| Service                    | Purpose                     | Required                                 |
| -------------------------- | --------------------------- | ---------------------------------------- |
| **Cloud Logging**          | Application logs            | Yes (automatic)                          |
| **Cloud Monitoring**       | Metrics and alerting        | Recommended                              |
| **Cloud IAM**              | Access control              | Yes (automatic)                          |
| **Cloud Resource Manager** | Project organization        | Yes (automatic)                          |
| **Cloud Billing**          | Cost management             | Yes (automatic)                          |
| **Cloud DNS**              | Custom domain management    | Optional                                 |
| **Cloud CDN**              | Global content distribution | Optional (if not using Firebase Hosting) |

#### Operational Services

| Service                       | Purpose                   | Required                             |
| ----------------------------- | ------------------------- | ------------------------------------ |
| **Cloud Source Repositories** | Git repository mirroring  | Optional (GitHub/GitLab can be used) |
| **Cloud Scheduler**           | Scheduled tasks           | No (not used)                        |
| **Cloud Tasks**               | Background job processing | No (not used)                        |
| **Pub/Sub**                   | Event messaging           | No (not used)                        |

---

### 2.2 Complete Service List with Dependencies

#### Core Runtime Services

1. **Firebase Authentication**
   - **Dependencies:** None (managed service)
   - **Control Plane:** Firebase Console / Firebase CLI
   - **Data Plane:** Direct SDK calls from applications
   - **Free Tier:** 50,000 MAU (Monthly Active Users)

2. **Cloud Firestore**
   - **Dependencies:** None (managed service)
   - **Control Plane:** Firebase Console / Firebase CLI (`firebase deploy`)
   - **Data Plane:** Direct SDK calls from applications
   - **Free Tier:** 50,000 reads, 20,000 writes, 20,000 deletes per day
   - **Indexes:** Composite indexes deployed via `firebase deploy --only firestore:indexes`

3. **Firebase Storage** (Cloud Storage backend)
   - **Dependencies:** None (managed service)
   - **Control Plane:** Firebase Console / Firebase CLI
   - **Data Plane:** Direct SDK calls from applications
   - **Free Tier:** 5 GB storage, 1 GB/day downloads

4. **Firebase Hosting**
   - **Dependencies:** None (managed service)
   - **Control Plane:** Firebase CLI (`firebase deploy --only hosting`)
   - **Data Plane:** HTTP requests from browsers
   - **Free Tier:** 10 GB storage, 360 MB/day transfer
   - **Alternative:** Cloud Storage + Cloud CDN (more control, similar cost)

5. **Cloud Run** (for auth-app API endpoint)
   - **Dependencies:**
     - **Artifact Registry** (container image storage)
     - **Cloud Build** (container image building, optional)
     - **Secret Manager** (service account credentials)
     - **Cloud IAM** (service account permissions)
   - **Control Plane:** gcloud CLI / Terraform / Console
   - **Data Plane:** HTTP requests to `/api/validate`
   - **Free Tier:** 2 million requests/month, 360,000 GiB-seconds, 180,000 vCPU-seconds
   - **Scaling:** Automatic (0 to N instances)

#### Supporting Infrastructure Services

6. **Secret Manager**
   - **Dependencies:** Cloud IAM (for access control)
   - **Purpose:** Store service account JSON, nonce secrets
   - **Free Tier:** 6 secrets, 10,000 access operations/month
   - **Required Secrets:**
     - `firebase-service-account` (JSON string for Firebase Admin SDK)
     - `nonce-secret` (shared secret between apps)

7. **Artifact Registry**
   - **Dependencies:** Cloud IAM
   - **Purpose:** Store Cloud Run container images
   - **Free Tier:** 0.5 GB storage
   - **Repository Type:** Docker

8. **Cloud Build**
   - **Dependencies:**
     - **Cloud Source Repositories** (optional, can use GitHub/GitLab)
     - **Artifact Registry** (for pushing images)
     - **Secret Manager** (for build-time secrets)
   - **Purpose:** Build container images, run CI/CD pipelines
   - **Free Tier:** 120 build-minutes/day
   - **Alternative:** GitHub Actions / GitLab CI (external CI/CD)

9. **Cloud Logging**
   - **Dependencies:** None (automatic)
   - **Purpose:** Application logs from Cloud Run, Firebase services
   - **Free Tier:** 50 GB ingestion, 7-day retention

10. **Cloud Monitoring**
    - **Dependencies:** Cloud Logging (for log-based metrics)
    - **Purpose:** Metrics, dashboards, alerting
    - **Free Tier:** 150 MB ingestion, 10 custom metrics

11. **Cloud IAM**
    - **Dependencies:** None (automatic)
    - **Purpose:** Access control for all GCP resources
    - **Free Tier:** Included
    - **Required Roles:**
      - Service accounts for Cloud Run
      - Build service account for Cloud Build
      - Deployment service account for Firebase CLI

12. **Cloud Resource Manager**
    - **Dependencies:** None (automatic)
    - **Purpose:** Project organization, billing
    - **Free Tier:** Included

13. **Cloud Billing**
    - **Dependencies:** Cloud Resource Manager
    - **Purpose:** Cost tracking, budget alerts
    - **Free Tier:** Included (billing account required)

#### Optional Services

14. **Cloud DNS**
    - **Dependencies:** None
    - **Purpose:** Custom domain management (if not using Firebase Hosting custom domains)
    - **Free Tier:** None (paid service, ~$0.20/zone/month)

15. **Cloud CDN**
    - **Dependencies:** Cloud Storage or Load Balancer
    - **Purpose:** Global content distribution (if not using Firebase Hosting)
    - **Free Tier:** None (paid service, usage-based)

16. **Cloud Load Balancer**
    - **Dependencies:** Cloud DNS (for custom domains)
    - **Purpose:** Custom domain routing (if not using Firebase Hosting)
    - **Free Tier:** None (paid service, ~$18/month base + usage)

17. **Cloud Functions for Firebase**
    - **Dependencies:** None (configured but not actively used)
    - **Purpose:** Serverless functions (future use)
    - **Free Tier:** 2 million invocations/month, 400,000 GB-seconds, 200,000 GHz-seconds

---

## 3. Per-Application Service Mapping

### 3.1 Main App (`apps/app`)

#### Required GCP Services

| Service                     | Purpose                  | Deployment Method                          |
| --------------------------- | ------------------------ | ------------------------------------------ |
| **Firebase Hosting**        | Static file hosting      | `firebase deploy --only hosting`           |
| **Firebase Authentication** | User authentication      | SDK integration (no deployment)            |
| **Cloud Firestore**         | Database                 | SDK integration + rules/indexes deployment |
| **Firebase Storage**        | Object storage (if used) | SDK integration + rules deployment         |

#### Deployment Flow

1. **Build:** `pnpm build` → `apps/app/dist/`
2. **Deploy:** `firebase deploy --only hosting --project <project-id>`
3. **Environment Variables:** Injected at build time via Cloud Build or local build with secrets

#### Configuration Requirements

- Firebase project ID
- Firebase API keys (public, safe for client)
- Auth app URL (for token validation)
- Nonce secret (from Secret Manager, injected at build time)

---

### 3.2 Auth App (`apps/auth-app`)

#### Required GCP Services

| Service                     | Purpose                             | Deployment Method                    |
| --------------------------- | ----------------------------------- | ------------------------------------ |
| **Firebase Hosting**        | Static file hosting (client routes) | `firebase deploy --only hosting`     |
| **Cloud Run**               | Server runtime (`/api/validate`)    | Container deployment via Cloud Build |
| **Firebase Authentication** | User authentication                 | SDK integration                      |
| **Cloud Firestore**         | Database (if used)                  | SDK integration                      |
| **Secret Manager**          | Service account credentials         | Manual/automated secret creation     |

#### Deployment Flow

**Client Routes (Static):**

1. **Build:** `pnpm build:auth-app` → `apps/auth-app/dist/`
2. **Deploy:** `firebase deploy --only hosting --project <project-id>`

**API Endpoint (`/api/validate`):**

1. **Container Build:** Cloud Build creates Docker image from auth-app source
2. **Push to Artifact Registry:** Image stored in Artifact Registry
3. **Deploy to Cloud Run:** `gcloud run deploy` or Terraform
4. **Configure Routing:** Map `/api/validate` to Cloud Run service

**Critical Architecture Decision:** The auth-app requires a **hybrid deployment**:

- Static routes (React SPA) → Firebase Hosting
- API route (`/api/validate`) → Cloud Run

**Options for API Routing:**

- **Option A:** Deploy entire auth-app to Cloud Run (SSR-capable), serve both static and API
- **Option B:** Deploy static to Firebase Hosting, API to Cloud Run, use Firebase Hosting rewrites to proxy `/api/validate` to Cloud Run
- **Option C:** Use Cloud Load Balancer to route `/api/validate` to Cloud Run, all other routes to Firebase Hosting

**Recommended:** Option B (Firebase Hosting rewrites) for simplicity and cost efficiency.

#### Configuration Requirements

- Firebase project ID
- Firebase API keys (public)
- Service account credentials (from Secret Manager, injected at Cloud Run runtime)
- Nonce secret (from Secret Manager, injected at Cloud Run runtime)

---

## 4. Global / Shared Infrastructure Design

### 4.1 Single GCP Project Structure

```
GCP Project: rates-production
├── Firebase Services
│   ├── Authentication
│   ├── Firestore (database: (default))
│   ├── Storage (bucket: <project-id>.appspot.com)
│   └── Hosting (sites: main-app, auth-app)
├── Cloud Run
│   └── auth-app-api (service: auth-app-validate)
├── Secret Manager
│   ├── firebase-service-account
│   └── nonce-secret
├── Artifact Registry
│   └── rates-containers (repository: docker)
├── Cloud Build
│   └── Triggers (GitHub/GitLab webhooks)
└── IAM
    ├── Service Accounts
    │   ├── cloud-run-sa@rates-production.iam.gserviceaccount.com
    │   └── cloud-build-sa@rates-production.iam.gserviceaccount.com
    └── Roles & Permissions
```

### 4.2 Service Account Design

#### Cloud Run Service Account

**Name:** `cloud-run-sa@rates-production.iam.gserviceaccount.com`

**Required Roles:**

- `roles/secretmanager.secretAccessor` (read secrets)
- `roles/firebase.admin` (Firebase Admin SDK operations)

**Usage:** Attached to Cloud Run service for auth-app API endpoint

#### Cloud Build Service Account

**Name:** `cloud-build-sa@rates-production.iam.gserviceaccount.com`

**Required Roles:**

- `roles/artifactregistry.writer` (push images)
- `roles/run.admin` (deploy Cloud Run services)
- `roles/secretmanager.secretAccessor` (read build-time secrets)
- `roles/firebase.admin` (deploy Firebase resources)

**Usage:** Attached to Cloud Build for CI/CD pipelines

---

### 4.3 Networking Architecture

#### Minimal Networking (Recommended)

- **No VPC required** for Firebase services (managed services)
- **Public internet access** for both SPAs
- **Cloud Run** uses Google-managed networking (no VPC connector needed unless accessing private resources)

#### Optional: Custom Domain Setup

If using custom domains:

1. **Firebase Hosting:** Configure custom domains in Firebase Console
2. **Cloud Run:** Map custom domain via Cloud Run domain mapping
3. **DNS:** Point DNS records to Firebase/Cloud Run provided targets

**Alternative:** Use Cloud Load Balancer for advanced routing (adds cost and complexity).

---

### 4.4 Security Architecture

#### Zero-Trust Principles

1. **Firebase Authentication:** All user authentication via Firebase Auth (no custom auth)
2. **Firestore Security Rules:** User-scoped data access (enforced at database level)
3. **Secret Management:** All secrets in Secret Manager (no hardcoded credentials)
4. **IAM:** Least privilege service accounts with minimal required roles

#### Security Controls

| Control              | Implementation                           | GCP Service             |
| -------------------- | ---------------------------------------- | ----------------------- |
| **Authentication**   | Firebase Auth                            | Firebase Authentication |
| **Authorization**    | Firestore rules + IAM                    | Firestore, Cloud IAM    |
| **Secrets**          | Secret Manager                           | Secret Manager          |
| **Network Security** | HTTPS only (Firebase Hosting, Cloud Run) | Automatic               |
| **Audit Logging**    | Cloud Logging                            | Cloud Logging           |
| **Access Control**   | IAM roles                                | Cloud IAM               |

#### Data Encryption

- **In Transit:** HTTPS (automatic for Firebase Hosting and Cloud Run)
- **At Rest:**
  - Firestore: Encrypted by default
  - Cloud Storage: Encrypted by default
  - Secret Manager: Encrypted by default

---

## 5. Service Dependency Matrix

### 5.1 Dependency Graph (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│                    GCP Project: rates-production            │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Firebase   │      │  Cloud Run   │      │   Secret     │
│   Services   │      │  (auth-app)  │      │   Manager    │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        │                     │                     │
        ├─ Auth               │                     │
        ├─ Firestore          │                     │
        ├─ Storage            │                     │
        └─ Hosting            │                     │
                              │                     │
                              ▼                     │
                    ┌─────────────────┐            │
                    │  Secret Manager  │◄───────────┘
                    │  (service acct)  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Cloud IAM       │
                    │  (permissions)  │
                    └─────────────────┘
```

### 5.2 Dependency Table

| Service               | Depends On                                   | Dependency Type | Criticality |
| --------------------- | -------------------------------------------- | --------------- | ----------- |
| **Firebase Hosting**  | Firebase Project                             | Control Plane   | High        |
| **Cloud Run**         | Artifact Registry, Secret Manager, Cloud IAM | Control Plane   | High        |
| **Artifact Registry** | Cloud IAM                                    | Control Plane   | High        |
| **Cloud Build**       | Artifact Registry, Secret Manager, Cloud IAM | Control Plane   | Medium      |
| **Secret Manager**    | Cloud IAM                                    | Control Plane   | High        |
| **Firebase Auth**     | Firebase Project                             | Control Plane   | High        |
| **Cloud Firestore**   | Firebase Project                             | Control Plane   | High        |
| **Firebase Storage**  | Firebase Project                             | Control Plane   | Medium      |
| **Cloud Logging**     | None (automatic)                             | Automatic       | Low         |
| **Cloud Monitoring**  | Cloud Logging                                | Data Plane      | Low         |

### 5.3 Data Flow Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │────────▶│  Main App   │────────▶│  Auth App   │
│  (User)     │         │ (Firebase   │         │ (Firebase   │
│             │         │  Hosting)   │         │  Hosting)   │
└─────────────┘         └─────────────┘         └─────────────┘
       │                        │                        │
       │                        │                        │
       │                        ▼                        │
       │                 ┌─────────────┐                │
       │                 │ Firebase    │                │
       │                 │   Auth     │                │
       │                 └─────────────┘                │
       │                        │                        │
       │                        ▼                        │
       │                 ┌─────────────┐                │
       │                 │ Firestore   │                │
       │                 └─────────────┘                │
       │                                                │
       │                                                ▼
       │                                         ┌─────────────┐
       │                                         │ Cloud Run   │
       │                                         │ (/api/      │
       │                                         │  validate)  │
       └────────────────────────────────────────▶└─────────────┘
                                                 │
                                                 ▼
                                         ┌─────────────┐
                                         │ Secret      │
                                         │ Manager     │
                                         └─────────────┘
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

1. **User Login:** Auth-app → Firebase Auth → ID token issued
2. **Token Storage:** ID token stored in browser (cookie/localStorage)
3. **Token Validation:** Main app → Auth-app `/api/validate` → Cloud Run → Firebase Admin SDK
4. **Data Access:** Main app → Firestore (with ID token in request)

### 6.2 Authorization Model

#### Firestore Security Rules

```javascript
// User-scoped access
match /financialAccounts/{accountId} {
  allow read, write: if request.auth != null &&
                       request.auth.uid == resource.data.userId;
}
```

#### IAM Roles

- **Cloud Run Service Account:** Minimal permissions (Secret Manager reader, Firebase Admin)
- **Cloud Build Service Account:** Deployment permissions only
- **Human Users:** No direct GCP access (deployment via CI/CD)

### 6.3 Secret Management Strategy

| Secret                       | Storage        | Access Method        | Rotation Strategy                 |
| ---------------------------- | -------------- | -------------------- | --------------------------------- |
| **Firebase Service Account** | Secret Manager | Cloud Run (runtime)  | Manual rotation via Console/CLI   |
| **Nonce Secret**             | Secret Manager | Build-time injection | Manual rotation, update both apps |

### 6.4 Network Security

- **HTTPS Only:** Enforced by Firebase Hosting and Cloud Run
- **CORS:** Configured in auth-app API endpoint (`Access-Control-Allow-Origin`)
- **No Private Networking:** Public internet access (Firebase services are public by design)

---

## 7. Cost Analysis & Free-Tier Strategy

### 7.1 Free Tier Coverage

| Service               | Free Tier Limit           | Estimated Usage            | Within Free Tier? |
| --------------------- | ------------------------- | -------------------------- | ----------------- |
| **Firebase Auth**     | 50,000 MAU                | <1,000 MAU (small app)     | ✅ Yes            |
| **Cloud Firestore**   | 50K reads, 20K writes/day | <10K reads, <5K writes/day | ✅ Yes            |
| **Firebase Storage**  | 5 GB, 1 GB/day downloads  | <100 MB storage            | ✅ Yes            |
| **Firebase Hosting**  | 10 GB, 360 MB/day         | <100 MB, <50 MB/day        | ✅ Yes            |
| **Cloud Run**         | 2M requests, 360K GiB-sec | <100K requests/month       | ✅ Yes            |
| **Secret Manager**    | 6 secrets, 10K accesses   | 2 secrets, <1K accesses    | ✅ Yes            |
| **Artifact Registry** | 0.5 GB                    | <100 MB                    | ✅ Yes            |
| **Cloud Build**       | 120 build-min/day         | <10 builds/day             | ✅ Yes            |
| **Cloud Logging**     | 50 GB ingestion           | <1 GB/month                | ✅ Yes            |
| **Cloud Monitoring**  | 150 MB ingestion          | <10 MB/month               | ✅ Yes            |

**Conclusion:** For a small application (<1,000 users), **all services are within Free Tier limits**.

### 7.2 Cost Breakdown (Beyond Free Tier)

| Service              | Cost Model                                         | Estimated Monthly Cost (if exceeded) |
| -------------------- | -------------------------------------------------- | ------------------------------------ |
| **Firebase Auth**    | $0.0055 per MAU above 50K                          | $0 (within free tier)                |
| **Cloud Firestore**  | $0.06 per 100K reads, $0.18 per 100K writes        | $0-5 (if moderate usage)             |
| **Cloud Run**        | $0.40 per million requests, $0.0000025 per GiB-sec | $0-10 (if high traffic)              |
| **Firebase Hosting** | $0.026 per GB storage, $0.15 per GB transfer       | $0-5 (if high traffic)               |

**Total Estimated Monthly Cost:** $0-50 for small to medium scale usage.

### 7.3 Cost Optimization Recommendations

1. **Use Firebase Hosting** (instead of Cloud Storage + CDN) for simplicity and free tier benefits
2. **Enable Cloud Run min instances = 0** (scale to zero) to minimize costs
3. **Monitor Firestore reads/writes** to avoid unnecessary queries
4. **Set up billing alerts** at $10, $50, $100 thresholds
5. **Use Cloud Build free tier** (120 minutes/day) for CI/CD

---

## 8. Risk Assessment & Mitigation

### 8.1 High-Priority Risks

| Risk                                 | Impact | Probability | Mitigation                                                        |
| ------------------------------------ | ------ | ----------- | ----------------------------------------------------------------- |
| **Service Account Key Exposure**     | High   | Low         | Use Secret Manager, never commit keys                             |
| **Firestore Rules Misconfiguration** | High   | Medium      | Test rules in emulator, review before deploy                      |
| **Cloud Run Cold Starts**            | Medium | Medium      | Set min instances = 1 (if latency critical) or accept cold starts |
| **Secret Rotation Failure**          | Medium | Low         | Document rotation process, test in staging                        |
| **CORS Misconfiguration**            | Medium | Low         | Validate CORS headers in auth-app API                             |

### 8.2 Medium-Priority Risks

| Risk                        | Impact | Probability | Mitigation                                                    |
| --------------------------- | ------ | ----------- | ------------------------------------------------------------- |
| **Firestore Index Missing** | Medium | Medium      | Deploy indexes via `firebase deploy --only firestore:indexes` |
| **Build Failure in CI/CD**  | Low    | Medium      | Test builds locally, use Cloud Build logs                     |
| **Cost Overrun**            | Low    | Low         | Set billing alerts, monitor usage                             |

### 8.3 Operational Risks

| Risk                                   | Impact | Probability | Mitigation                                                 |
| -------------------------------------- | ------ | ----------- | ---------------------------------------------------------- |
| **Single Point of Failure (Firebase)** | High   | Low         | Firebase has 99.95% SLA, consider multi-region if critical |
| **No Backup Strategy**                 | Medium | N/A         | Firestore has automatic backups (point-in-time recovery)   |
| **No Disaster Recovery Plan**          | Medium | N/A         | Document recovery procedures, test restore                 |

---

## 9. Deployment Readiness Checklist

### 9.1 Prerequisites

- [ ] GCP project created with billing enabled
- [ ] Firebase project linked to GCP project
- [ ] Firebase CLI installed and authenticated
- [ ] gcloud CLI installed and authenticated
- [ ] Service account created with required roles
- [ ] Secrets created in Secret Manager

### 9.2 Infrastructure Setup

- [ ] Firestore database created
- [ ] Firestore indexes deployed
- [ ] Firestore security rules deployed
- [ ] Firebase Storage bucket created (if used)
- [ ] Firebase Storage rules deployed
- [ ] Artifact Registry repository created
- [ ] Cloud Run service account created and configured

### 9.3 Application Deployment

- [ ] Main app built and deployed to Firebase Hosting
- [ ] Auth app (client) built and deployed to Firebase Hosting
- [ ] Auth app (API) container built and deployed to Cloud Run
- [ ] Environment variables configured (build-time and runtime)
- [ ] Custom domains configured (if applicable)
- [ ] CORS configured correctly

### 9.4 Monitoring & Operations

- [ ] Cloud Logging enabled
- [ ] Cloud Monitoring dashboards created
- [ ] Billing alerts configured
- [ ] Deployment documentation created
- [ ] Runbook for common operations created

---

## 10. Architecture Diagrams

### 10.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet Users                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │      Firebase Hosting (CDN)         │
        │  ┌─────────────┐  ┌─────────────┐   │
        │  │  Main App  │  │  Auth App   │   │
        │  │  (Static)  │  │  (Static)   │   │
        │  └─────────────┘  └─────────────┘   │
        └─────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Firebase    │      │  Cloud Run    │      │  Firebase    │
│  Auth        │      │  (/api/       │      │  Firestore   │
│              │      │   validate)   │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
                              │
                              ▼
                    ┌──────────────┐
                    │  Secret      │
                    │  Manager     │
                    └──────────────┘
```

### 10.2 Deployment Pipeline

```
┌─────────────┐
│   GitHub    │
│  (Source)   │
└─────────────┘
      │
      ▼ (Webhook)
┌─────────────┐
│ Cloud Build │
│  (CI/CD)    │
└─────────────┘
      │
      ├─▶ Build Main App → Firebase Hosting
      ├─▶ Build Auth App → Firebase Hosting
      └─▶ Build Container → Artifact Registry → Cloud Run
```

---

## 11. Next Steps & Recommendations

### 11.1 Immediate Actions

1. **Create GCP Project:** Set up project with billing enabled
2. **Enable Firebase:** Link Firebase to GCP project
3. **Create Service Accounts:** Set up Cloud Run and Cloud Build service accounts
4. **Create Secrets:** Store service account JSON and nonce secret in Secret Manager
5. **Deploy Firestore Rules:** Deploy security rules and indexes

### 11.2 Short-Term (1-2 weeks)

1. **Set Up CI/CD:** Configure Cloud Build triggers for automated deployment
2. **Deploy Applications:** Deploy main app and auth app to Firebase Hosting
3. **Deploy Cloud Run:** Deploy auth-app API endpoint to Cloud Run
4. **Configure Monitoring:** Set up Cloud Monitoring dashboards and alerts
5. **Test End-to-End:** Verify authentication, token validation, and data access

### 11.3 Medium-Term (1-3 months)

1. **Custom Domains:** Configure custom domains for production
2. **Performance Optimization:** Optimize Firestore queries, enable CDN caching
3. **Security Hardening:** Review IAM roles, enable audit logging
4. **Cost Optimization:** Monitor usage, optimize Cloud Run scaling
5. **Documentation:** Create operational runbooks and disaster recovery procedures

### 11.4 Long-Term Considerations

1. **Multi-Environment:** Consider separate GCP projects for dev/staging/prod
2. **Disaster Recovery:** Implement backup and restore procedures
3. **Scaling:** Plan for horizontal scaling if user base grows
4. **Advanced Monitoring:** Implement APM tools (if needed)
5. **Compliance:** Review compliance requirements (GDPR, SOC 2, etc.)

---

## 12. Appendix: Service Reference

### 12.1 Firebase Services

- **Firebase Authentication:** https://firebase.google.com/docs/auth
- **Cloud Firestore:** https://firebase.google.com/docs/firestore
- **Firebase Storage:** https://firebase.google.com/docs/storage
- **Firebase Hosting:** https://firebase.google.com/docs/hosting

### 12.2 GCP Services

- **Cloud Run:** https://cloud.google.com/run/docs
- **Secret Manager:** https://cloud.google.com/secret-manager/docs
- **Artifact Registry:** https://cloud.google.com/artifact-registry/docs
- **Cloud Build:** https://cloud.google.com/build/docs
- **Cloud Logging:** https://cloud.google.com/logging/docs
- **Cloud Monitoring:** https://cloud.google.com/monitoring/docs

### 12.3 Architecture Framework

- **Google Cloud Architecture Framework:** https://cloud.google.com/architecture/framework
- **Well-Architected Framework:** https://cloud.google.com/architecture/framework/well-architected-framework

---

**Document End**

This architecture analysis provides a complete foundation for deploying the Rates monorepo to Google Cloud Platform. All identified services, dependencies, and deployment patterns are based on the actual codebase analysis and follow Google Cloud best practices.
