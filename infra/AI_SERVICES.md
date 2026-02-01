# Technical Implementation Guide: Private Vertex AI Integration

## Document Information

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Version        | 2.0                                           |
| Created        | 2026                                          |
| Status         | Implementation Ready                          |
| Scope          | Vertex AI Private Integration                 |
| Parent Project | Rates Monorepo                                |
| GCP Project    | `rates-production`                            |
| Governance     | Technical Delivery Lead & Solutions Architect |

---

## 1. Executive Summary

### 1.1 Objective

Integrate Vertex AI generative capabilities into the existing Rates Monorepo infrastructure while maintaining zero public endpoint exposure for AI services. All AI operations will occur through private GCP networking, utilizing internal service-to-service communication patterns.

### 1.2 Integration Context

This document extends the existing Rates infrastructure defined in the **Implementation Readiness Checklist and Execution Plan**. All naming conventions, environment strategies, and Terraform patterns align with the established architecture.

**Existing Infrastructure (Assumed Working):**

- Main App (SSR) → Firebase Hosting + Cloud Run
- Auth App → Firebase Hosting + Cloud Run
- Firebase Authentication
- Cloud Firestore (Native mode)
- Secret Manager
- Artifact Registry (`rates-dev-containers`, `rates-prod-containers`)
- Single project: `rates-production`
- Namespace-based environment separation (dev/prod)

### 1.3 Approach Selected

**Hybrid Architecture** combining:

- **Synchronous Path**: Cloud Run → VPC Connector → Vertex AI (Private Google Access)
- **Asynchronous Path**: Pub/Sub + Cloud Run Jobs for long-running operations

### 1.4 Why Not Other Approaches

| Approach                       | Reason for Rejection                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Public API with API Key        | Exposes endpoint to internet; violates security requirements                             |
| Cloud Functions only           | Cold start latency; limited execution time; inconsistent with existing Cloud Run pattern |
| Firebase Extensions            | Limited customization; not all Vertex AI features available                              |
| API Gateway + Cloud Endpoints  | Adds unnecessary complexity; increases cost; still exposes public surface                |
| Direct Vertex AI from Main App | Exposes AI operations to client-side; security and cost control concerns                 |

### 1.5 Infrastructure Change Impact

**New Components Required:**
| Component | Justification | Cost Impact |
|-----------|---------------|-------------|
| VPC Network | Required for Private Google Access to Vertex AI | Minimal (network resources) |
| VPC Serverless Connector | Required for Cloud Run → VPC communication | ~$15-20/month |
| Cloud Run (AI Service) | Internal-only AI orchestration service | Included in existing limits |
| Cloud Run Jobs | Async processing for long-running tasks | Pay-per-use |
| Pub/Sub | Message queue for async operations | Minimal (~$0.10/month) |

**Note:** This introduces VPC networking which was previously rejected for the base infrastructure. This is justified because:

1. Vertex AI private access requires VPC
2. AI services should not be publicly accessible
3. The VPC is scoped only to AI services, not the entire application

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              rates-production (GCP Project)                      │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          Public Access (Existing)                          │ │
│  │                                                                            │ │
│  │   ┌─────────────────┐         ┌─────────────────┐                         │ │
│  │   │  Main App       │         │  Auth App       │                         │ │
│  │   │  (Cloud Run)    │         │  (Cloud Run)    │                         │ │
│  │   │  rates-{env}-   │         │  rates-{env}-   │                         │ │
│  │   │  main-api-*     │         │  auth-api-*     │                         │ │
│  │   └────────┬────────┘         └─────────────────┘                         │ │
│  │            │                                                               │ │
│  └────────────┼───────────────────────────────────────────────────────────────┘ │
│               │ IAM + ID Token                                                   │
│  ┌────────────▼───────────────────────────────────────────────────────────────┐ │
│  │                          rates-ai-vpc (Private VPC)                        │ │
│  │                                                                            │ │
│  │   ┌─────────────────┐                                                     │ │
│  │   │  AI Service     │      ┌──────────────────┐                          │ │
│  │   │  (Cloud Run)    │─────▶│   Vertex AI      │                          │ │
│  │   │  Internal Only  │      │   (PGA Enabled)  │                          │ │
│  │   │  rates-{env}-   │      └──────────────────┘                          │ │
│  │   │  ai-service-*   │                                                     │ │
│  │   └────────┬────────┘                                                     │ │
│  │            │                                                               │ │
│  │   ┌────────▼────────┐      ┌──────────────────┐                          │ │
│  │   │   Pub/Sub       │─────▶│  Cloud Run Jobs  │                          │ │
│  │   │  rates-{env}-   │      │  rates-{env}-    │                          │ │
│  │   │  ai-tasks       │      │  ai-processor    │                          │ │
│  │   └─────────────────┘      └────────┬─────────┘                          │ │
│  │                                     │                                      │ │
│  └─────────────────────────────────────┼──────────────────────────────────────┘ │
│                                        │                                         │
│  ┌─────────────────────────────────────▼──────────────────────────────────────┐ │
│  │                          Shared Data Layer                                 │ │
│  │                                                                            │ │
│  │   ┌─────────────────┐         ┌─────────────────┐                         │ │
│  │   │   Firestore     │         │  Secret Manager │                         │ │
│  │   │   (Existing)    │         │   (Existing)    │                         │ │
│  │   └─────────────────┘         └─────────────────┘                         │ │
│  │                                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Communication Flow Matrix

| Source         | Destination    | Protocol   | Authentication        | Network Path             |
| -------------- | -------------- | ---------- | --------------------- | ------------------------ |
| Main App       | AI Service     | HTTPS      | IAM + ID Token        | VPC Connector (Internal) |
| AI Service     | Vertex AI      | gRPC/HTTPS | Service Account (ADC) | Private Google Access    |
| AI Service     | Pub/Sub        | HTTPS      | Service Account (ADC) | Private Google Access    |
| Pub/Sub        | Cloud Run Jobs | Push       | IAM                   | Internal VPC             |
| Cloud Run Jobs | Firestore      | HTTPS      | Service Account (ADC) | Private Google Access    |
| Cloud Run Jobs | Vertex AI      | gRPC/HTTPS | Service Account (ADC) | Private Google Access    |

### 2.3 Request Flow Types

#### Synchronous Flow (< 30 seconds operations)

```
User Request → Main App → AI Service → Vertex AI → Response
```

**Use Cases**: Text generation, quick summarization, embeddings, classification

#### Asynchronous Flow (> 30 seconds or batch operations)

```
User Request → Main App → AI Service → Pub/Sub → Acknowledgment
                                            ↓
                              Cloud Run Job → Vertex AI → Firestore
                                            ↓
                              User polls/subscribes for result
```

**Use Cases**: Large document processing, batch operations, multi-step pipelines

---

## 3. Resource Naming Convention

### 3.1 Naming Pattern

All resources follow the established pattern: `rates-{env}-{component}-{region}`

Where:

- `{env}` = `dev` | `prod`
- `{component}` = Resource-specific identifier
- `{region}` = `us-central1` (abbreviated where needed)

### 3.2 AI-Specific Resource Names

| Resource Type                      | Dev Name                           | Prod Name                              |
| ---------------------------------- | ---------------------------------- | -------------------------------------- |
| **VPC Network**                    | `rates-ai-vpc`                     | `rates-ai-vpc` (shared)                |
| **Subnet**                         | `rates-ai-subnet-us-central1`      | `rates-ai-subnet-us-central1` (shared) |
| **VPC Connector**                  | `rates-dev-ai-connector`           | `rates-prod-ai-connector`              |
| **Cloud Run (AI Service)**         | `rates-dev-ai-service-us-central1` | `rates-prod-ai-service-us-central1`    |
| **Cloud Run Job**                  | `rates-dev-ai-processor`           | `rates-prod-ai-processor`              |
| **Service Account (AI Service)**   | `rates-dev-ai-service-sa`          | `rates-prod-ai-service-sa`             |
| **Service Account (AI Processor)** | `rates-dev-ai-processor-sa`        | `rates-prod-ai-processor-sa`           |
| **Pub/Sub Topic (Tasks)**          | `rates-dev-ai-tasks`               | `rates-prod-ai-tasks`                  |
| **Pub/Sub Topic (DLQ)**            | `rates-dev-ai-dlq`                 | `rates-prod-ai-dlq`                    |
| **Pub/Sub Subscription**           | `rates-dev-ai-tasks-processor`     | `rates-prod-ai-tasks-processor`        |
| **Secret (Vertex Config)**         | `rates-dev-vertex-ai-config`       | `rates-prod-vertex-ai-config`          |
| **Firestore Collection**           | `dev_ai_tasks`                     | `prod_ai_tasks`                        |
| **Firestore Collection**           | `dev_ai_usage`                     | `prod_ai_usage`                        |

### 3.3 Artifact Registry

Use existing repositories (no new repositories needed):

- Dev images: `rates-dev-containers`
- Prod images: `rates-prod-containers`

Image naming within registry:

- `rates-dev-containers/ai-service:latest`
- `rates-dev-containers/ai-processor:latest`
- `rates-prod-containers/ai-service:v1.0.0`
- `rates-prod-containers/ai-processor:v1.0.0`

---

## 4. Infrastructure Requirements

### 4.1 New GCP APIs to Enable

Add to Foundation layer API enablement:

```
aiplatform.googleapis.com          # Vertex AI
compute.googleapis.com             # VPC (required for serverless connector)
vpcaccess.googleapis.com           # Serverless VPC Access
pubsub.googleapis.com              # Pub/Sub messaging
```

**Note:** `compute.googleapis.com` was previously in the "disabled APIs" list in the cost guardrails. This must be enabled for VPC functionality but usage will be limited to VPC resources only (no Compute Engine VMs).

### 4.2 VPC Network Configuration

#### 4.2.1 VPC Network (Shared across environments)

| Property                | Value                                |
| ----------------------- | ------------------------------------ |
| Name                    | `rates-ai-vpc`                       |
| Description             | Private VPC for AI services with PGA |
| Auto Create Subnetworks | `false`                              |
| Routing Mode            | `REGIONAL`                           |

#### 4.2.2 Subnet

| Property              | Value                           |
| --------------------- | ------------------------------- |
| Name                  | `rates-ai-subnet-us-central1`   |
| Network               | `rates-ai-vpc`                  |
| Region                | `us-central1`                   |
| IP CIDR Range         | `10.0.0.0/24`                   |
| Private Google Access | `true` (critical for Vertex AI) |
| Purpose               | `PRIVATE`                       |

#### 4.2.3 VPC Serverless Connectors (Per Environment)

**Dev Connector:**
| Property | Value |
|----------|-------|
| Name | `rates-dev-ai-connector` |
| Network | `rates-ai-vpc` |
| Region | `us-central1` |
| IP CIDR Range | `10.8.0.0/28` |
| Min Instances | `2` |
| Max Instances | `3` |
| Machine Type | `e2-micro` |

**Prod Connector:**
| Property | Value |
|----------|-------|
| Name | `rates-prod-ai-connector` |
| Network | `rates-ai-vpc` |
| Region | `us-central1` |
| IP CIDR Range | `10.8.0.16/28` |
| Min Instances | `2` |
| Max Instances | `3` |
| Machine Type | `e2-micro` |

### 4.3 Cloud Run Service - AI Service

#### 4.3.1 Dev Environment

| Property        | Value                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| Service Name    | `rates-dev-ai-service-us-central1`                                                   |
| Region          | `us-central1`                                                                        |
| Ingress         | `internal` (critical - no public access)                                             |
| VPC Connector   | `rates-dev-ai-connector`                                                             |
| VPC Egress      | `all-traffic`                                                                        |
| Service Account | `rates-dev-ai-service-sa@rates-production.iam.gserviceaccount.com`                   |
| Min Instances   | `0`                                                                                  |
| Max Instances   | `2` (aligns with cost guardrails)                                                    |
| CPU             | `1`                                                                                  |
| Memory          | `512Mi` (aligns with existing limits)                                                |
| Timeout         | `300s`                                                                               |
| Concurrency     | `10`                                                                                 |
| Container Image | `us-central1-docker.pkg.dev/rates-production/rates-dev-containers/ai-service:latest` |

#### 4.3.2 Prod Environment

| Property        | Value                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| Service Name    | `rates-prod-ai-service-us-central1`                                                      |
| Region          | `us-central1`                                                                            |
| Ingress         | `internal`                                                                               |
| VPC Connector   | `rates-prod-ai-connector`                                                                |
| VPC Egress      | `all-traffic`                                                                            |
| Service Account | `rates-prod-ai-service-sa@rates-production.iam.gserviceaccount.com`                      |
| Min Instances   | `0`                                                                                      |
| Max Instances   | `2`                                                                                      |
| CPU             | `1`                                                                                      |
| Memory          | `512Mi`                                                                                  |
| Timeout         | `300s`                                                                                   |
| Concurrency     | `10`                                                                                     |
| Container Image | `us-central1-docker.pkg.dev/rates-production/rates-prod-containers/ai-service:{version}` |

### 4.4 Cloud Run Jobs - AI Async Processor

#### 4.4.1 Dev Environment

| Property        | Value                                                                                  |
| --------------- | -------------------------------------------------------------------------------------- |
| Job Name        | `rates-dev-ai-processor`                                                               |
| Region          | `us-central1`                                                                          |
| VPC Connector   | `rates-dev-ai-connector`                                                               |
| VPC Egress      | `all-traffic`                                                                          |
| Service Account | `rates-dev-ai-processor-sa@rates-production.iam.gserviceaccount.com`                   |
| CPU             | `1`                                                                                    |
| Memory          | `1Gi`                                                                                  |
| Timeout         | `1800s` (30 minutes)                                                                   |
| Max Retries     | `3`                                                                                    |
| Parallelism     | `1`                                                                                    |
| Container Image | `us-central1-docker.pkg.dev/rates-production/rates-dev-containers/ai-processor:latest` |

#### 4.4.2 Prod Environment

| Property        | Value                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| Job Name        | `rates-prod-ai-processor`                                                                  |
| Region          | `us-central1`                                                                              |
| VPC Connector   | `rates-prod-ai-connector`                                                                  |
| VPC Egress      | `all-traffic`                                                                              |
| Service Account | `rates-prod-ai-processor-sa@rates-production.iam.gserviceaccount.com`                      |
| CPU             | `1`                                                                                        |
| Memory          | `1Gi`                                                                                      |
| Timeout         | `3600s` (1 hour)                                                                           |
| Max Retries     | `3`                                                                                        |
| Parallelism     | `1`                                                                                        |
| Container Image | `us-central1-docker.pkg.dev/rates-production/rates-prod-containers/ai-processor:{version}` |

### 4.5 Pub/Sub Resources

#### 4.5.1 Topics

**Dev Environment:**
| Topic Name | Purpose |
|------------|---------|
| `rates-dev-ai-tasks` | Incoming async AI requests |
| `rates-dev-ai-dlq` | Dead letter queue for failed messages |

**Prod Environment:**
| Topic Name | Purpose |
|------------|---------|
| `rates-prod-ai-tasks` | Incoming async AI requests |
| `rates-prod-ai-dlq` | Dead letter queue for failed messages |

#### 4.5.2 Subscriptions

**Dev Subscription - `rates-dev-ai-tasks-processor`:**
| Property | Value |
|----------|-------|
| Topic | `rates-dev-ai-tasks` |
| Delivery Type | `Push` |
| Push Endpoint | Cloud Run Job trigger URL (via Eventarc) |
| Ack Deadline | `600s` |
| Message Retention | `7 days` |
| Retry Policy Min Backoff | `10s` |
| Retry Policy Max Backoff | `600s` |
| Dead Letter Topic | `rates-dev-ai-dlq` |
| Max Delivery Attempts | `5` |

**Prod Subscription - `rates-prod-ai-tasks-processor`:**
| Property | Value |
|----------|-------|
| Topic | `rates-prod-ai-tasks` |
| Delivery Type | `Push` |
| Push Endpoint | Cloud Run Job trigger URL (via Eventarc) |
| Ack Deadline | `600s` |
| Message Retention | `7 days` |
| Retry Policy Min Backoff | `10s` |
| Retry Policy Max Backoff | `600s` |
| Dead Letter Topic | `rates-prod-ai-dlq` |
| Max Delivery Attempts | `5` |

### 4.6 Secret Manager Secrets

#### 4.6.1 New Secrets

| Secret Name                   | Environment | Purpose                           | Value Source    |
| ----------------------------- | ----------- | --------------------------------- | --------------- |
| `rates-dev-vertex-ai-config`  | Dev         | Vertex AI project/location config | Manual creation |
| `rates-prod-vertex-ai-config` | Prod        | Vertex AI project/location config | Manual creation |

**Secret Value Structure (JSON):**

```json
{
  "projectId": "rates-production",
  "location": "us-central1",
  "defaultModel": "gemini-2.0-flash",
  "quotaProject": "rates-production"
}
```

#### 4.6.2 Secret Creation Process

Following existing pattern from IAM Security Model:

1. Terraform creates secret **resources** (empty)
2. Human creates secret **values** via `gcloud`:

```bash
gcloud secrets versions add rates-dev-vertex-ai-config --data-file=vertex-config-dev.json
gcloud secrets versions add rates-prod-vertex-ai-config --data-file=vertex-config-prod.json
```

### 4.7 Vertex AI Configuration

#### 4.7.1 Model Access

| Model            | Model ID             | Use Case                                 | Cost Tier |
| ---------------- | -------------------- | ---------------------------------------- | --------- |
| Gemini 2.0 Flash | `gemini-2.0-flash`   | Fast responses, cost-effective (primary) | Low       |
| Gemini 2.0 Pro   | `gemini-2.0-pro`     | Complex reasoning (secondary)            | High      |
| Text Embeddings  | `text-embedding-005` | Semantic search, RAG                     | Low       |

**Cost Optimization:** Default to `gemini-2.0-flash` for all operations. Use `gemini-2.0-pro` only when explicitly requested.

#### 4.7.2 Quota Recommendations

| Quota                              | Dev Value | Prod Value |
| ---------------------------------- | --------- | ---------- |
| Requests per minute (Gemini Flash) | 10        | 60         |
| Requests per minute (Gemini Pro)   | 5         | 20         |
| Tokens per minute                  | 100,000   | 500,000    |

---

## 5. IAM & Security Model

### 5.1 New Service Accounts

Following existing pattern: `rates-{env}-{purpose}-sa`

#### 5.1.1 AI Service Runner (Per Environment)

**Dev: `rates-dev-ai-service-sa`**
| Property | Value |
|----------|-------|
| Account ID | `rates-dev-ai-service-sa` |
| Display Name | `Rates Dev AI Service Runner` |
| Description | Service account for dev AI service Cloud Run |

**Prod: `rates-prod-ai-service-sa`**
| Property | Value |
|----------|-------|
| Account ID | `rates-prod-ai-service-sa` |
| Display Name | `Rates Prod AI Service Runner` |
| Description | Service account for prod AI service Cloud Run |

#### 5.1.2 AI Async Processor (Per Environment)

**Dev: `rates-dev-ai-processor-sa`**
| Property | Value |
|----------|-------|
| Account ID | `rates-dev-ai-processor-sa` |
| Display Name | `Rates Dev AI Async Processor` |
| Description | Service account for dev AI processor Cloud Run Jobs |

**Prod: `rates-prod-ai-processor-sa`**
| Property | Value |
|----------|-------|
| Account ID | `rates-prod-ai-processor-sa` |
| Display Name | `Rates Prod AI Async Processor` |
| Description | Service account for prod AI processor Cloud Run Jobs |

### 5.2 IAM Role Bindings

#### 5.2.1 AI Service Runner Roles

| Role                                 | Purpose                      | Condition                                  |
| ------------------------------------ | ---------------------------- | ------------------------------------------ |
| `roles/aiplatform.user`              | Invoke Vertex AI predictions | None                                       |
| `roles/pubsub.publisher`             | Publish to Pub/Sub topics    | Resource name contains `{env}`             |
| `roles/datastore.user`               | Read/write Firestore         | None (collection-level security via rules) |
| `roles/secretmanager.secretAccessor` | Access secrets               | Resource name starts with `rates-{env}-`   |
| `roles/logging.logWriter`            | Write logs                   | None                                       |

#### 5.2.2 AI Async Processor Roles

| Role                                 | Purpose                      | Condition                                |
| ------------------------------------ | ---------------------------- | ---------------------------------------- |
| `roles/aiplatform.user`              | Invoke Vertex AI predictions | None                                     |
| `roles/datastore.user`               | Read/write Firestore         | None                                     |
| `roles/secretmanager.secretAccessor` | Access secrets               | Resource name starts with `rates-{env}-` |
| `roles/logging.logWriter`            | Write logs                   | None                                     |

#### 5.2.3 Updates to Existing Service Accounts

**Main App Service Account (`rates-{env}-cloud-run-sa`):**

Additional role required:
| Role | Purpose |
|------|---------|
| `roles/run.invoker` | Invoke internal AI Service Cloud Run |

**IAM Binding with Condition:**

```
Member: serviceAccount:rates-{env}-cloud-run-sa@rates-production.iam.gserviceaccount.com
Role: roles/run.invoker
Condition:
  Title: "Invoke AI Service Only"
  Expression: resource.name.startsWith("projects/rates-production/locations/us-central1/services/rates-{env}-ai-service")
```

#### 5.2.4 Pub/Sub Service Agent

GCP-managed service account for Pub/Sub push:
| Property | Value |
|----------|-------|
| Account | `service-{project-number}@gcp-sa-pubsub.iam.gserviceaccount.com` |
| Required Role | `roles/run.invoker` on AI Processor Cloud Run Job |

### 5.3 Network Security

#### 5.3.1 Cloud Run Ingress Settings

| Service    | Ingress Setting | Rationale                                        |
| ---------- | --------------- | ------------------------------------------------ |
| Main App   | `all` (public)  | User-facing application                          |
| Auth App   | `all` (public)  | User-facing authentication                       |
| AI Service | `internal`      | **No public access - critical security control** |

#### 5.3.2 VPC Firewall Rules (Implicit)

Serverless VPC Access connector handles firewall rules automatically. No explicit firewall rules needed for:

- Cloud Run → VPC Connector → Private Google Access

### 5.4 Authentication Flow

#### 5.4.1 Main App → AI Service

```
1. Main App receives user request with Firebase ID Token
2. Main App validates Firebase ID Token (existing flow)
3. Main App fetches Google ID Token from metadata server:
   - Audience: AI Service URL
   - Source: Compute metadata server (automatic in Cloud Run)
4. Main App calls AI Service with:
   - Header: Authorization: Bearer {google-id-token}
   - Header: X-Forwarded-Authorization: Bearer {firebase-id-token}
5. AI Service validates:
   - Google ID Token (Cloud Run IAM - automatic)
   - Firebase ID Token (manual validation for user context)
6. AI Service processes request
```

#### 5.4.2 AI Service → Vertex AI

```
1. AI Service uses Application Default Credentials (ADC)
2. ADC automatically uses attached service account
3. No explicit token management required
4. IAM validates service account has roles/aiplatform.user
```

---

## 6. Terraform Integration

### 6.1 Layer Assignment

Following the established three-layer architecture:

| Layer           | AI Resources                                                               |
| --------------- | -------------------------------------------------------------------------- |
| **Bootstrap**   | None (no changes)                                                          |
| **Foundation**  | VPC, Subnet, APIs, Service Accounts, IAM Bindings, Pub/Sub Topics          |
| **Application** | VPC Connectors, Cloud Run Services, Cloud Run Jobs, Subscriptions, Secrets |

### 6.2 New Terraform Modules

#### 6.2.1 Module: `infra/modules/vpc/`

```
infra/modules/vpc/
├── main.tf           # VPC network, subnet, Private Google Access
├── variables.tf      # network_name, subnet_cidr, region
├── outputs.tf        # network_id, subnet_id, network_name
└── README.md
```

**Inputs:**
| Variable | Type | Description |
|----------|------|-------------|
| `network_name` | string | VPC network name |
| `subnet_name` | string | Subnet name |
| `subnet_cidr` | string | Subnet CIDR range |
| `region` | string | GCP region |
| `enable_private_google_access` | bool | Enable PGA (default: true) |

**Outputs:**
| Output | Description |
|--------|-------------|
| `network_id` | VPC network ID |
| `network_name` | VPC network name |
| `subnet_id` | Subnet ID |
| `subnet_self_link` | Subnet self link |

#### 6.2.2 Module: `infra/modules/vpc-connector/`

```
infra/modules/vpc-connector/
├── main.tf           # Serverless VPC Access connector
├── variables.tf      # connector_name, network, ip_range, etc.
├── outputs.tf        # connector_id, connector_name
└── README.md
```

**Inputs:**
| Variable | Type | Description |
|----------|------|-------------|
| `connector_name` | string | Connector name |
| `network` | string | VPC network name |
| `region` | string | GCP region |
| `ip_cidr_range` | string | Connector IP range (/28) |
| `min_instances` | number | Min instances (default: 2) |
| `max_instances` | number | Max instances (default: 3) |
| `machine_type` | string | Machine type (default: e2-micro) |

**Outputs:**
| Output | Description |
|--------|-------------|
| `connector_id` | Connector ID |
| `connector_name` | Connector name for Cloud Run reference |

#### 6.2.3 Module: `infra/modules/pubsub/`

```
infra/modules/pubsub/
├── main.tf           # Topics, subscriptions, DLQ
├── variables.tf      # topic_name, subscription_config, etc.
├── outputs.tf        # topic_id, subscription_id
└── README.md
```

#### 6.2.4 Updates to Existing Modules

**`infra/modules/cloud-run/`** - Add support for:

- `ingress` setting (internal vs all)
- `vpc_connector` reference
- `vpc_egress` setting

**`infra/modules/service-account/`** - No changes needed (existing module sufficient)

### 6.3 State File Organization

Following existing pattern with GCS backend and prefix separation:

| State File          | Prefix              | Resources                                        |
| ------------------- | ------------------- | ------------------------------------------------ |
| Foundation (shared) | `foundation/`       | VPC, Subnet, Service Accounts, APIs              |
| Application (dev)   | `application/dev/`  | Dev VPC Connector, Dev Cloud Run, Dev Pub/Sub    |
| Application (prod)  | `application/prod/` | Prod VPC Connector, Prod Cloud Run, Prod Pub/Sub |

### 6.4 Terraform Configuration Files

#### 6.4.1 Foundation Layer Updates

**File: `infra/environments/foundation/ai-infrastructure.tf`**

New resources to add:

- `google_project_service` for new APIs
- `google_compute_network` (VPC)
- `google_compute_subnetwork` (Subnet)
- `google_service_account` (4 new accounts)
- `google_project_iam_member` (IAM bindings)
- `google_pubsub_topic` (4 topics - 2 per env)

#### 6.4.2 Application Layer Updates

**File: `infra/environments/application/dev/ai-services.tf`**

New resources:

- `google_vpc_access_connector`
- `google_cloud_run_v2_service` (AI Service)
- `google_cloud_run_v2_job` (AI Processor)
- `google_pubsub_subscription`
- `google_secret_manager_secret`
- `google_secret_manager_secret_iam_member`

**File: `infra/environments/application/prod/ai-services.tf`**

Same structure as dev with prod-specific values.

### 6.5 Variable Definitions

**New variables for `variables.tf`:**

```hcl
# AI Service Configuration
variable "ai_service_max_instances" {
  description = "Maximum instances for AI service"
  type        = number
  default     = 2
}

variable "ai_service_memory" {
  description = "Memory allocation for AI service"
  type        = string
  default     = "512Mi"
}

variable "ai_processor_timeout" {
  description = "Timeout for AI processor jobs"
  type        = number
  default     = 1800
}

# VPC Configuration
variable "ai_vpc_subnet_cidr" {
  description = "CIDR range for AI VPC subnet"
  type        = string
  default     = "10.0.0.0/24"
}

variable "vpc_connector_cidr_dev" {
  description = "CIDR range for dev VPC connector"
  type        = string
  default     = "10.8.0.0/28"
}

variable "vpc_connector_cidr_prod" {
  description = "CIDR range for prod VPC connector"
  type        = string
  default     = "10.8.0.16/28"
}
```

---

## 7. New Package Specifications

### 7.1 Package: `@rates/vertex-ai-client`

#### 7.1.1 Package Overview

| Property     | Value                                              |
| ------------ | -------------------------------------------------- |
| Location     | `packages/vertex-ai-client`                        |
| Type         | Internal TypeScript library                        |
| Dependencies | `@google-cloud/aiplatform`, `@google-cloud/pubsub` |
| Consumers    | AI Service, AI Async Processor                     |

#### 7.1.2 Directory Structure

```
packages/vertex-ai-client/
├── src/
│   ├── index.ts                 # Public exports
│   ├── client/
│   │   ├── vertex-client.ts     # Main Vertex AI client wrapper
│   │   ├── prediction-client.ts # Prediction-specific operations
│   │   └── embedding-client.ts  # Embedding operations
│   ├── models/
│   │   ├── request.types.ts     # Request type definitions
│   │   ├── response.types.ts    # Response type definitions
│   │   └── config.types.ts      # Configuration types
│   ├── prompts/
│   │   ├── template-engine.ts   # Prompt template management
│   │   └── templates/           # Stored prompt templates
│   ├── utils/
│   │   ├── token-counter.ts     # Token counting utilities
│   │   ├── retry-handler.ts     # Retry logic with backoff
│   │   └── response-parser.ts   # Response parsing/validation
│   └── constants/
│       ├── models.ts            # Model IDs and configs
│       └── limits.ts            # Rate limits and quotas
├── package.json
├── tsconfig.json
└── README.md
```

#### 7.1.3 Core Interfaces

**VertexAIClientConfig:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| projectId | string | Yes | GCP Project ID (`rates-production`) |
| location | string | Yes | Vertex AI region (`us-central1`) |
| modelId | string | No | Default model (default: `gemini-2.0-flash`) |
| timeout | number | No | Request timeout in ms (default: 30000) |
| maxRetries | number | No | Max retry attempts (default: 3) |

**PredictionRequest:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | Yes | User prompt (max 32000 chars) |
| systemContext | string | No | System instructions |
| parameters | GenerationParameters | No | Generation parameters |
| userId | string | Yes | For audit and rate limiting |
| requestId | string | Yes | Idempotency key (UUID) |

**GenerationParameters:**
| Field | Type | Default | Range |
|-------|------|---------|-------|
| temperature | number | 0.7 | 0.0 - 2.0 |
| topP | number | 0.95 | 0.0 - 1.0 |
| topK | number | 40 | 1 - 100 |
| maxOutputTokens | number | 1024 | 1 - 8192 |

**PredictionResponse:**
| Field | Type | Description |
|-------|------|-------------|
| requestId | string | Original request ID |
| content | string | Generated content |
| finishReason | string | Why generation stopped |
| usage | UsageMetadata | Token counts |
| latencyMs | number | Processing time |

### 7.2 Package: `@rates/ai-shared`

#### 7.2.1 Package Overview

| Property  | Value                                    |
| --------- | ---------------------------------------- |
| Location  | `packages/ai-shared`                     |
| Type      | Shared types and utilities               |
| Consumers | Main App, AI Service, AI Async Processor |

#### 7.2.2 Directory Structure

```
packages/ai-shared/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── ai-task.types.ts     # Async task definitions
│   │   ├── ai-result.types.ts   # Result structures
│   │   └── ai-error.types.ts    # Error types
│   ├── schemas/
│   │   ├── task-schema.ts       # Zod schemas for validation
│   │   └── result-schema.ts
│   ├── constants/
│   │   ├── task-types.ts        # Task type enums
│   │   └── status-codes.ts      # Status enums
│   └── utils/
│       └── id-generator.ts      # Consistent ID generation
├── package.json
└── tsconfig.json
```

#### 7.2.3 Task Definitions

**AITaskType Enum:**
| Value | Description | Mode |
|-------|-------------|------|
| `TEXT_GENERATION` | General text generation | Sync/Async |
| `SUMMARIZATION` | Document summarization | Sync/Async |
| `EMBEDDING` | Generate embeddings | Sync |
| `CLASSIFICATION` | Content classification | Sync |
| `EXTRACTION` | Entity/data extraction | Async |
| `BATCH_PROCESSING` | Multiple items | Async only |

**AITaskStatus Enum:**
| Value | Description |
|-------|-------------|
| `PENDING` | Task created, awaiting processing |
| `PROCESSING` | Currently being processed |
| `COMPLETED` | Successfully completed |
| `FAILED` | Processing failed |
| `CANCELLED` | User cancelled |

---

## 8. Application Specifications

### 8.1 AI Service Application

#### 8.1.1 Overview

| Property  | Value                             |
| --------- | --------------------------------- |
| Location  | `apps/ai-service`                 |
| Runtime   | Node.js 20                        |
| Framework | Fastify                           |
| Port      | `8080`                            |
| Build     | Docker (follows auth-app pattern) |

#### 8.1.2 Directory Structure

```
apps/ai-service/
├── src/
│   ├── index.ts                  # Entry point
│   ├── server.ts                 # Fastify server configuration
│   ├── routes/
│   │   ├── index.ts              # Route registration
│   │   ├── health.routes.ts      # Health check endpoints
│   │   ├── generation.routes.ts  # Text generation endpoints
│   │   ├── embedding.routes.ts   # Embedding endpoints
│   │   └── task.routes.ts        # Async task endpoints
│   ├── controllers/
│   │   ├── generation.controller.ts
│   │   ├── embedding.controller.ts
│   │   └── task.controller.ts
│   ├── services/
│   │   ├── vertex.service.ts     # Vertex AI orchestration
│   │   ├── pubsub.service.ts     # Pub/Sub operations
│   │   ├── rate-limit.service.ts # Rate limiting logic
│   │   └── cache.service.ts      # Response caching
│   ├── middleware/
│   │   ├── auth.middleware.ts    # Firebase token validation
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   ├── repositories/
│   │   ├── task.repository.ts    # Firestore task operations
│   │   └── usage.repository.ts   # Usage tracking
│   └── config/
│       └── index.ts              # Environment configuration
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

#### 8.1.3 Internal API Endpoints

**Base Path**: `https://rates-{env}-ai-service-us-central1-xxxxx.run.app` (internal only)

| Method | Path                | Purpose                | Timeout |
| ------ | ------------------- | ---------------------- | ------- |
| GET    | `/health`           | Liveness check         | 100ms   |
| GET    | `/ready`            | Readiness check        | 100ms   |
| POST   | `/v1/generate`      | Synchronous generation | 30s     |
| POST   | `/v1/embed`         | Generate embeddings    | 5s      |
| POST   | `/v1/tasks`         | Create async task      | 500ms   |
| GET    | `/v1/tasks/:taskId` | Get task status        | 200ms   |
| DELETE | `/v1/tasks/:taskId` | Cancel task            | 500ms   |

#### 8.1.4 Environment Variables

| Variable                      | Description             | Source             |
| ----------------------------- | ----------------------- | ------------------ |
| `PORT`                        | Server port             | Hardcoded: `8080`  |
| `ENV`                         | Environment             | `dev` or `prod`    |
| `GCP_PROJECT_ID`              | GCP project             | `rates-production` |
| `VERTEX_AI_LOCATION`          | Vertex AI region        | `us-central1`      |
| `VERTEX_AI_CONFIG`            | Config secret reference | Secret Manager     |
| `FIRESTORE_COLLECTION_PREFIX` | Collection prefix       | `dev_` or `prod_`  |

### 8.2 AI Async Processor Application

#### 8.2.1 Overview

| Property        | Value                                |
| --------------- | ------------------------------------ |
| Location        | `apps/ai-processor`                  |
| Runtime         | Node.js 20                           |
| Execution Model | Cloud Run Job (triggered by Pub/Sub) |
| Build           | Docker                               |

#### 8.2.2 Directory Structure

```
apps/ai-processor/
├── src/
│   ├── index.ts                    # Entry point
│   ├── processor.ts                # Main processing logic
│   ├── handlers/
│   │   ├── index.ts                # Handler registry
│   │   ├── text-generation.handler.ts
│   │   ├── summarization.handler.ts
│   │   └── batch-processing.handler.ts
│   ├── services/
│   │   ├── vertex.service.ts       # Vertex AI operations
│   │   └── storage.service.ts      # Result storage
│   └── config/
│       └── index.ts
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. Data Models (Firestore)

### 9.1 Collection Naming

Following environment isolation pattern:

| Collection     | Dev                  | Prod                  |
| -------------- | -------------------- | --------------------- |
| AI Tasks       | `dev_ai_tasks`       | `prod_ai_tasks`       |
| AI Usage       | `dev_ai_usage`       | `prod_ai_usage`       |
| AI Rate Limits | `dev_ai_rate_limits` | `prod_ai_rate_limits` |
| AI Cache       | `dev_ai_cache`       | `prod_ai_cache`       |

### 9.2 Collection: `{env}_ai_tasks`

| Field       | Type      | Indexed    | Description                    |
| ----------- | --------- | ---------- | ------------------------------ |
| id          | string    | Yes (auto) | Document ID                    |
| userId      | string    | Yes        | Requesting user (Firebase UID) |
| type        | string    | Yes        | Task type enum                 |
| status      | string    | Yes        | Current status                 |
| priority    | string    | No         | Priority level                 |
| payload     | map       | No         | Task input data                |
| result      | map       | No         | Task output (when complete)    |
| error       | map       | No         | Error details (if failed)      |
| tokenUsage  | map       | No         | Token consumption              |
| createdAt   | timestamp | Yes        | Creation time                  |
| updatedAt   | timestamp | No         | Last update time               |
| completedAt | timestamp | No         | Completion time                |

**Composite Indexes Required:**

- `userId` ASC + `status` ASC + `createdAt` DESC
- `status` ASC + `createdAt` ASC

### 9.3 Collection: `{env}_ai_usage`

| Field        | Type   | Indexed | Description          |
| ------------ | ------ | ------- | -------------------- |
| id           | string | Yes     | `{userId}_{date}`    |
| userId       | string | Yes     | User identifier      |
| date         | string | Yes     | Date (YYYY-MM-DD)    |
| requestCount | number | No      | Total requests today |
| tokenInput   | number | No      | Input tokens used    |
| tokenOutput  | number | No      | Output tokens used   |

### 9.4 Collection: `{env}_ai_rate_limits`

| Field        | Type      | Indexed | Description               |
| ------------ | --------- | ------- | ------------------------- |
| id           | string    | Yes     | `{userId}_{windowMinute}` |
| userId       | string    | Yes     | User identifier           |
| windowStart  | timestamp | No      | Window start time         |
| requestCount | number    | No      | Requests in window        |

---

## 10. Main App Integration

### 10.1 Updates to Existing Main App

#### 10.1.1 New Environment Variables

Add to `infra/environments/application/{env}/main.tf`:

| Variable             | Dev Value                                              | Prod Value                                              |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| `AI_SERVICE_URL`     | `https://rates-dev-ai-service-us-central1-xxx.run.app` | `https://rates-prod-ai-service-us-central1-xxx.run.app` |
| `AI_SERVICE_TIMEOUT` | `30000`                                                | `30000`                                                 |
| `ENABLE_AI_FEATURES` | `true`                                                 | `true`                                                  |

#### 10.1.2 New API Routes (Proxy)

Add to Main App:

| Route               | Method | Proxies To                 |
| ------------------- | ------ | -------------------------- |
| `/api/ai/generate`  | POST   | AI Service `/v1/generate`  |
| `/api/ai/embed`     | POST   | AI Service `/v1/embed`     |
| `/api/ai/tasks`     | POST   | AI Service `/v1/tasks`     |
| `/api/ai/tasks/:id` | GET    | AI Service `/v1/tasks/:id` |
| `/api/ai/tasks/:id` | DELETE | AI Service `/v1/tasks/:id` |

#### 10.1.3 Service-to-Service Client

Create internal client that:

1. Fetches ID token from metadata server with AI Service URL as audience
2. Forwards user's Firebase token in `X-Forwarded-Authorization` header
3. Adds `X-Request-ID` for tracing
4. Handles timeouts and retries

**Required Headers:**
| Header | Value | Purpose |
|--------|-------|---------|
| `Authorization` | `Bearer {google-id-token}` | Cloud Run IAM authentication |
| `X-Forwarded-Authorization` | `Bearer {firebase-id-token}` | User identity |
| `X-Request-ID` | UUID | Request tracing |

---

## 11. Cost Management

### 11.1 Cost Alignment with Guardrails

Aligning with existing $10/month budget target:

| Service                              | Monthly Estimate  | Control Mechanism             |
| ------------------------------------ | ----------------- | ----------------------------- |
| VPC Connector (2 instances × 2 envs) | ~$30-40           | **Exceeds budget - see note** |
| Cloud Run (AI Service)               | ~$5-10            | max_instances=2               |
| Cloud Run Jobs                       | ~$2-5             | Pay per execution             |
| Vertex AI (Gemini Flash)             | ~$1-3             | Rate limiting + quotas        |
| Pub/Sub                              | ~$0.10            | Minimal usage                 |
| **Total Estimated**                  | **~$40-60/month** |                               |

**Budget Impact Note:** VPC Connector is the primary cost driver (~$15-20/month per connector). Options to reduce:

1. **Shared Connector** (Recommended for small scale):
   - Use single VPC connector for both dev and prod
   - Trade-off: Less isolation between environments
   - Savings: ~$15-20/month

2. **Dev-Only Initially**:
   - Deploy AI features to dev only initially
   - Add prod when budget allows or revenue justifies
   - Savings: ~$20-30/month

3. **Accept Higher Budget**:
   - Increase budget to $50-75/month for AI capabilities
   - Justified by AI feature value

### 11.2 Cost Optimization Strategies

| Strategy                   | Impact                | Implementation             |
| -------------------------- | --------------------- | -------------------------- |
| Use Gemini Flash (not Pro) | 10x cost reduction    | Default model selection    |
| Response caching           | 30-50% reduction      | Cache common queries       |
| Aggressive rate limiting   | Budget protection     | Per-user limits            |
| min_instances=0            | Reduced idle cost     | Accept cold starts         |
| Shared VPC connector       | ~$15-20/month savings | Single connector both envs |

### 11.3 Updated Budget Alert Thresholds

Update `infra/environments/foundation/cost-guardrails.tf`:

| Threshold | Amount | Action                         |
| --------- | ------ | ------------------------------ |
| 50%       | $25    | Email notification             |
| 80%       | $40    | Email + Slack notification     |
| 100%      | $50    | Email + Slack + Review trigger |
| 120%      | $60    | Emergency review               |

---

## 12. Deployment Pipeline Integration

### 12.1 New Build Jobs

Add to existing CI/CD pipeline:

| Job Name             | Trigger                                                              | Output                           |
| -------------------- | -------------------------------------------------------------------- | -------------------------------- |
| `build-ai-service`   | Changes in `apps/ai-service/**`                                      | Docker image → Artifact Registry |
| `build-ai-processor` | Changes in `apps/ai-processor/**`                                    | Docker image → Artifact Registry |
| `build-ai-packages`  | Changes in `packages/vertex-ai-client/**` or `packages/ai-shared/**` | Package build validation         |

### 12.2 Deployment Sequence

**Phase 7: AI Infrastructure (New Phase)**

Insert after Phase 4 (Application - Prod) in existing plan:

```
Phase 7A: AI Foundation (add to existing Foundation layer)
├── Enable new APIs
├── Create VPC and Subnet
├── Create AI Service Accounts
├── Create IAM Bindings
└── Create Pub/Sub Topics

Phase 7B: AI Application - Dev
├── Create VPC Connector (dev)
├── Build and push AI Service image
├── Deploy AI Service Cloud Run
├── Build and push AI Processor image
├── Deploy AI Processor Cloud Run Job
├── Create Pub/Sub Subscriptions
├── Create Secrets (resources)
├── [Manual] Add secret values
└── Test AI endpoints

Phase 7C: AI Application - Prod
├── Create VPC Connector (prod)
├── Build and push AI Service image (prod)
├── Deploy AI Service Cloud Run
├── Deploy AI Processor Cloud Run Job
├── Create Pub/Sub Subscriptions
├── Create Secrets (resources)
├── [Manual] Add secret values
├── [Manual Approval Gate]
└── Test AI endpoints

Phase 7D: Main App Integration
├── Update Main App with AI proxy routes
├── Update Main App environment variables
├── Rebuild and deploy Main App (dev)
├── Test end-to-end AI flow (dev)
├── [Manual Approval Gate]
├── Rebuild and deploy Main App (prod)
└── Test end-to-end AI flow (prod)
```

### 12.3 Terraform Execution Order

```bash
# Phase 7A: Foundation updates
cd infra/environments/foundation
terraform plan -target=module.ai_vpc -target=module.ai_service_accounts
terraform apply

# Phase 7B: Dev AI services
cd infra/environments/application/dev
terraform plan -target=module.ai_services
terraform apply

# [Manual] Create secret values
gcloud secrets versions add rates-dev-vertex-ai-config --data-file=vertex-config.json

# Phase 7C: Prod AI services (with approval)
cd infra/environments/application/prod
terraform plan -target=module.ai_services
# [Manual Approval]
terraform apply

# [Manual] Create secret values
gcloud secrets versions add rates-prod-vertex-ai-config --data-file=vertex-config.json
```

---

## 13. Testing Strategy

### 13.1 Unit Tests

| Component                 | Coverage Target | Focus Areas                 |
| ------------------------- | --------------- | --------------------------- |
| `@rates/vertex-ai-client` | 90%             | Client methods, retry logic |
| `@rates/ai-shared`        | 95%             | Type validation, schemas    |
| AI Service controllers    | 85%             | Request handling            |
| AI Service services       | 80%             | Business logic              |

### 13.2 Integration Tests

| Test Suite            | Environment       |
| --------------------- | ----------------- |
| Vertex AI Integration | GCP dev project   |
| Pub/Sub Flow          | GCP dev project   |
| Firestore Operations  | Firebase Emulator |

### 13.3 End-to-End Tests

| Scenario        | Validation                      |
| --------------- | ------------------------------- |
| Sync Generation | Response content, latency < 30s |
| Async Task      | Task completion within timeout  |
| Rate Limiting   | 429 after limit exceeded        |
| Auth Flow       | 401 for invalid tokens          |

---

## 14. Monitoring & Observability

### 14.1 Logging

Following existing Cloud Logging-only approach (Cloud Monitoring rejected in cost guardrails):

**Log Entries to Capture:**
| Event | Severity | Fields |
|-------|----------|--------|
| Generation request | INFO | requestId, userId, model, tokenCount |
| Generation complete | INFO | requestId, latencyMs, tokenUsage |
| Generation error | ERROR | requestId, errorCode, errorMessage |
| Rate limit exceeded | WARNING | userId, limit, window |
| Task created | INFO | taskId, userId, type |
| Task completed | INFO | taskId, duration, tokenUsage |

### 14.2 Alerting (Log-Based)

Create log-based alerts in Cloud Logging:

| Alert            | Log Query                                               | Threshold         |
| ---------------- | ------------------------------------------------------- | ----------------- |
| High Error Rate  | `severity=ERROR AND resource.type="cloud_run_revision"` | > 10 errors/5 min |
| Rate Limit Spike | `jsonPayload.event="rate_limit_exceeded"`               | > 50/hour         |

---

## 15. Security Checklist

### 15.1 Pre-Deployment

- [ ] AI Service ingress set to `internal` only
- [ ] VPC connector properly configured with PGA
- [ ] Service accounts have minimal required permissions
- [ ] IAM conditions enforce environment isolation
- [ ] Secrets stored in Secret Manager (not env vars for sensitive data)
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] No PII logged

### 15.2 Post-Deployment

- [ ] Verify AI Service not accessible from public internet
- [ ] Verify Main App can reach AI Service (internal)
- [ ] Verify IAM authentication working
- [ ] Verify rate limits enforced
- [ ] Review Cloud Audit Logs
- [ ] Test with invalid tokens (should return 401)

---

## 16. Rollout Plan

### 16.1 Timeline

| Phase                          | Duration        | Dependencies      |
| ------------------------------ | --------------- | ----------------- |
| Phase 7A: AI Foundation        | 2-3 hours       | Phase 2 complete  |
| Phase 7B: AI Dev               | 4-6 hours       | Phase 7A complete |
| Phase 7C: AI Prod              | 2-3 hours       | Phase 7B tested   |
| Phase 7D: Main App Integration | 3-4 hours       | Phase 7C complete |
| **Total**                      | **11-16 hours** |                   |

### 16.2 Rollback Plan

| Scenario            | Action                                                       |
| ------------------- | ------------------------------------------------------------ |
| AI Service failures | Disable AI routes in Main App via feature flag               |
| Cost overrun        | Reduce max_instances, increase rate limiting                 |
| VPC issues          | Revert to non-AI infrastructure (Main App continues working) |

---

## 17. Human vs Terraform Responsibility Matrix

### 17.1 Terraform Responsibilities

| Task                         | Phase       | Resource                       |
| ---------------------------- | ----------- | ------------------------------ |
| Create VPC network           | Foundation  | `google_compute_network`       |
| Create subnet with PGA       | Foundation  | `google_compute_subnetwork`    |
| Create VPC connectors        | Application | `google_vpc_access_connector`  |
| Create service accounts      | Foundation  | `google_service_account`       |
| Create IAM bindings          | Foundation  | `google_project_iam_member`    |
| Create Pub/Sub topics        | Foundation  | `google_pubsub_topic`          |
| Create Pub/Sub subscriptions | Application | `google_pubsub_subscription`   |
| Create Cloud Run services    | Application | `google_cloud_run_v2_service`  |
| Create Cloud Run jobs        | Application | `google_cloud_run_v2_job`      |
| Create secret resources      | Application | `google_secret_manager_secret` |
| Enable APIs                  | Foundation  | `google_project_service`       |

### 17.2 Human Responsibilities

| Task                                 | Phase       | Action                        |
| ------------------------------------ | ----------- | ----------------------------- |
| Build AI Service container           | Application | Docker build + push           |
| Build AI Processor container         | Application | Docker build + push           |
| Create Vertex AI config secret value | Application | `gcloud secrets versions add` |
| Set Vertex AI quotas                 | Foundation  | GCP Console or `gcloud`       |
| Approve prod deployment              | Application | Manual gate                   |
| Test AI endpoints                    | Application | Manual testing                |
| Monitor costs                        | Ongoing     | Review billing                |

---

## 18. Appendix

### A. Naming Convention Reference

| Resource Type        | Pattern                            | Example (Dev)                      | Example (Prod)                      |
| -------------------- | ---------------------------------- | ---------------------------------- | ----------------------------------- |
| VPC Network          | `rates-ai-vpc`                     | `rates-ai-vpc`                     | `rates-ai-vpc`                      |
| Subnet               | `rates-ai-subnet-{region}`         | `rates-ai-subnet-us-central1`      | `rates-ai-subnet-us-central1`       |
| VPC Connector        | `rates-{env}-ai-connector`         | `rates-dev-ai-connector`           | `rates-prod-ai-connector`           |
| Cloud Run Service    | `rates-{env}-{component}-{region}` | `rates-dev-ai-service-us-central1` | `rates-prod-ai-service-us-central1` |
| Cloud Run Job        | `rates-{env}-{component}`          | `rates-dev-ai-processor`           | `rates-prod-ai-processor`           |
| Service Account      | `rates-{env}-{purpose}-sa`         | `rates-dev-ai-service-sa`          | `rates-prod-ai-service-sa`          |
| Pub/Sub Topic        | `rates-{env}-{purpose}`            | `rates-dev-ai-tasks`               | `rates-prod-ai-tasks`               |
| Secret               | `rates-{env}-{purpose}`            | `rates-dev-vertex-ai-config`       | `rates-prod-vertex-ai-config`       |
| Firestore Collection | `{env}_{collection}`               | `dev_ai_tasks`                     | `prod_ai_tasks`                     |

### B. API Enable List (Complete)

**Existing (from base infrastructure):**

```
run.googleapis.com
firebase.googleapis.com
firestore.googleapis.com
secretmanager.googleapis.com
artifactregistry.googleapis.com
iam.googleapis.com
serviceusage.googleapis.com
```

**New (for AI features):**

```
aiplatform.googleapis.com          # Vertex AI
compute.googleapis.com             # VPC (required)
vpcaccess.googleapis.com           # Serverless VPC Access
pubsub.googleapis.com              # Pub/Sub messaging
```

### C. Decision Log

| Decision                         | Options                       | Selection         | Rationale                                   |
| -------------------------------- | ----------------------------- | ----------------- | ------------------------------------------- |
| VPC vs No VPC                    | Use existing no-VPC, Add VPC  | Add VPC           | Required for private Vertex AI access       |
| Shared vs Separate VPC Connector | One per env, Shared           | Per env (default) | Better isolation; can share to reduce cost  |
| Sync vs Async                    | Sync only, Async only, Hybrid | Hybrid            | Different use cases need different patterns |
| Default Model                    | Gemini Pro, Gemini Flash      | Gemini Flash      | Cost optimization (10x cheaper)             |

---

**Document End**

_This document extends the existing Rates infrastructure implementation plan. All implementations must follow both this document and the parent Implementation Readiness Checklist. Any conflicts should be resolved in favor of the established conventions in the parent document._
