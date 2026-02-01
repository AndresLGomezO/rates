# AI Service Application Specification

## Document Information

| Field            | Value                |
| ---------------- | -------------------- |
| Version          | 1.0                  |
| Created          | 2026                 |
| Status           | Implementation Ready |
| Application Name | `ai-service`         |
| Location         | `apps/ai-service`    |
| Parent Project   | Rates Monorepo       |

---

## 1. Application Overview

### 1.1 Purpose

The AI Service is an **internal API gateway** for all AI operations within the Rates platform. It provides a secure, rate-limited interface between user-facing applications (Main App) and Google Cloud Vertex AI services. The service handles both synchronous AI requests and asynchronous task orchestration.

### 1.2 Problem Statement

Direct access to Vertex AI from client applications presents challenges:

- Security: API keys/credentials would be exposed
- Cost control: No centralized rate limiting or quota management
- Observability: Difficult to track usage per user
- Flexibility: Hard to add caching, retries, or fallbacks

The AI Service solves this by:

- Acting as a secure internal proxy (no public access)
- Enforcing per-user rate limits and quotas
- Providing response caching for cost optimization
- Centralizing observability and metrics
- Managing async task lifecycle

### 1.3 Execution Model

| Aspect            | Specification                                  |
| ----------------- | ---------------------------------------------- |
| **Runtime Type**  | Cloud Run Service (always-on, request-driven)  |
| **Ingress**       | Internal only (no public internet access)      |
| **Trigger**       | HTTP requests from Main App                    |
| **Lifecycle**     | Long-running service, scales to zero when idle |
| **Concurrency**   | 10 concurrent requests per instance            |
| **Max Instances** | 2 (aligned with cost guardrails)               |

### 1.4 Key Characteristics

| Characteristic    | Description                                                       |
| ----------------- | ----------------------------------------------------------------- |
| **Stateless**     | No local state; all persistence via Firestore                     |
| **Internal Only** | Cannot be reached from public internet                            |
| **Authenticated** | Requires both IAM (service-to-service) and Firebase (user) tokens |
| **Rate Limited**  | Per-user request and token limits                                 |
| **Cached**        | Identical requests return cached responses                        |

---

## 2. Functional Requirements

### 2.1 Core Capabilities

#### 2.1.1 Synchronous AI Operations

The service must provide real-time AI operations:

| Operation             | Description                   | Target Latency |
| --------------------- | ----------------------------- | -------------- |
| Text Generation       | Generate text from prompts    | < 10s          |
| Embeddings            | Generate vector embeddings    | < 2s           |
| Classification        | Classify text into categories | < 3s           |
| Summarization (short) | Summarize short content       | < 15s          |

#### 2.1.2 Asynchronous Task Management

The service must manage async task lifecycle:

| Capability        | Description                                             |
| ----------------- | ------------------------------------------------------- |
| Task Creation     | Accept task request, publish to Pub/Sub, return task ID |
| Task Status       | Return current status of a task                         |
| Task Cancellation | Mark task as cancelled (if not yet processing)          |
| Task Result       | Return result for completed tasks                       |

#### 2.1.3 Rate Limiting

The service must enforce usage limits:

| Limit Type           | Scope    | Default |
| -------------------- | -------- | ------- |
| Requests per minute  | Per user | 10      |
| Tokens per day       | Per user | 10,000  |
| Concurrent requests  | Per user | 3       |
| Async tasks per hour | Per user | 5       |

#### 2.1.4 Response Caching

The service must cache responses:

| Aspect        | Specification                         |
| ------------- | ------------------------------------- |
| Cache Key     | Hash of (prompt + parameters + model) |
| Cache Storage | Firestore collection                  |
| Cache TTL     | 24 hours                              |
| Cache Bypass  | Optional header to skip cache         |

#### 2.1.5 Usage Tracking

The service must track usage:

| Metric               | Granularity                  | Storage   |
| -------------------- | ---------------------------- | --------- |
| Request count        | Per user, per day            | Firestore |
| Token usage (input)  | Per user, per day            | Firestore |
| Token usage (output) | Per user, per day            | Firestore |
| Model usage          | Per user, per model, per day | Firestore |

### 2.2 Request Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Service Request Flow                          │
└─────────────────────────────────────────────────────────────────────┘

1. REQUEST RECEIPT
   ├── Receive HTTPS request from Main App
   ├── Extract Authorization header (IAM ID token)
   └── Extract X-Forwarded-Authorization header (Firebase token)

2. AUTHENTICATION
   ├── Cloud Run validates IAM token (automatic)
   ├── Service validates Firebase ID token
   ├── Extract user ID from Firebase token
   └── If invalid → Return 401 Unauthorized

3. RATE LIMIT CHECK
   ├── Load user's current usage from Firestore
   ├── Check against rate limits (requests/min, tokens/day)
   └── If exceeded → Return 429 Too Many Requests

4. REQUEST VALIDATION
   ├── Parse request body
   ├── Validate against schema (Zod)
   └── If invalid → Return 400 Bad Request

5. CACHE CHECK (for sync operations)
   ├── Generate cache key from request
   ├── Check Firestore cache collection
   └── If hit → Return cached response (skip to step 8)

6. PROCESSING
   ├── For sync: Call Vertex AI directly
   ├── For async: Publish to Pub/Sub, return task ID
   └── Handle Vertex AI errors with retries

7. RESPONSE HANDLING
   ├── Parse Vertex AI response
   ├── Store in cache (for sync operations)
   ├── Update usage tracking
   └── Format response

8. RESPONSE
   └── Return JSON response with appropriate status code
```

### 2.3 API Endpoints

#### 2.3.1 Health Endpoints

| Method | Path      | Purpose         | Auth Required |
| ------ | --------- | --------------- | ------------- |
| GET    | `/health` | Liveness probe  | No            |
| GET    | `/ready`  | Readiness probe | No            |

#### 2.3.2 Generation Endpoints

| Method | Path                  | Purpose                     | Auth Required |
| ------ | --------------------- | --------------------------- | ------------- |
| POST   | `/v1/generate`        | Synchronous text generation | Yes           |
| POST   | `/v1/generate/stream` | Streaming generation (SSE)  | Yes           |

#### 2.3.3 Embedding Endpoints

| Method | Path        | Purpose             | Auth Required |
| ------ | ----------- | ------------------- | ------------- |
| POST   | `/v1/embed` | Generate embeddings | Yes           |

#### 2.3.4 Task Endpoints

| Method | Path                | Purpose                | Auth Required |
| ------ | ------------------- | ---------------------- | ------------- |
| POST   | `/v1/tasks`         | Create async task      | Yes           |
| GET    | `/v1/tasks/:taskId` | Get task status/result | Yes           |
| DELETE | `/v1/tasks/:taskId` | Cancel task            | Yes           |

#### 2.3.5 Usage Endpoints

| Method | Path        | Purpose                        | Auth Required |
| ------ | ----------- | ------------------------------ | ------------- |
| GET    | `/v1/usage` | Get current user's usage stats | Yes           |

---

## 3. API Specifications

### 3.1 Common Headers

#### Request Headers

| Header                      | Required | Description                         |
| --------------------------- | -------- | ----------------------------------- |
| `Authorization`             | Yes      | `Bearer {google-id-token}` (IAM)    |
| `X-Forwarded-Authorization` | Yes      | `Bearer {firebase-id-token}` (User) |
| `X-Request-ID`              | Yes      | UUID for request tracing            |
| `Content-Type`              | Yes      | `application/json`                  |
| `X-Skip-Cache`              | No       | `true` to bypass cache              |

#### Response Headers

| Header                  | Description                   |
| ----------------------- | ----------------------------- |
| `X-Request-ID`          | Echo of request ID            |
| `X-Cache-Hit`           | `true` if response from cache |
| `X-RateLimit-Remaining` | Requests remaining in window  |
| `X-RateLimit-Reset`     | Timestamp when limit resets   |

### 3.2 POST /v1/generate

**Purpose:** Synchronous text generation

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | Yes | User prompt (max 32,000 chars) |
| systemContext | string | No | System instructions |
| model | string | No | Model override (default: gemini-2.0-flash) |
| parameters | object | No | Generation parameters |
| responseFormat | string | No | `text` (default), `json`, `markdown` |

**Parameters Object:**
| Field | Type | Default | Range |
|-------|------|---------|-------|
| temperature | number | 0.7 | 0.0 - 2.0 |
| topP | number | 0.95 | 0.0 - 1.0 |
| topK | number | 40 | 1 - 100 |
| maxOutputTokens | number | 1024 | 1 - 8192 |
| stopSequences | string[] | [] | Max 5 items |

**Success Response (200):**
| Field | Type | Description |
|-------|------|-------------|
| requestId | string | Request identifier |
| content | string | Generated text |
| model | string | Model used |
| finishReason | string | `STOP`, `MAX_TOKENS`, `SAFETY` |
| usage | object | Token usage |
| cached | boolean | Whether from cache |
| latencyMs | number | Processing time |

**Usage Object:**
| Field | Type | Description |
|-------|------|-------------|
| inputTokens | number | Tokens in prompt |
| outputTokens | number | Tokens generated |
| totalTokens | number | Sum of input + output |

### 3.3 POST /v1/embed

**Purpose:** Generate vector embeddings

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | Yes* | Single text to embed |
| texts | string[] | Yes* | Multiple texts (max 100) |
| model | string | No | Model override |

\*One of `text` or `texts` required

**Success Response (200):**
| Field | Type | Description |
|-------|------|-------------|
| requestId | string | Request identifier |
| embeddings | array | Array of embedding vectors |
| model | string | Model used |
| dimensions | number | Vector dimensions (768) |

**Embedding Object (within array):**
| Field | Type | Description |
|-------|------|-------------|
| index | number | Position in input array |
| vector | number[] | Embedding vector |

### 3.4 POST /v1/tasks

**Purpose:** Create asynchronous task

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Task type enum |
| payload | object | Yes | Task-specific payload |
| priority | string | No | `low`, `normal` (default), `high` |
| webhookUrl | string | No | Internal callback URL |

**Task Types:**

- `TEXT_GENERATION`
- `SUMMARIZATION`
- `BATCH_EMBEDDING`
- `DOCUMENT_QA`
- `BATCH_CLASSIFICATION`
- `MULTI_STEP_PIPELINE`

**Success Response (202):**
| Field | Type | Description |
|-------|------|-------------|
| taskId | string | Unique task identifier |
| status | string | `PENDING` |
| type | string | Task type |
| createdAt | string | ISO timestamp |
| estimatedDurationSeconds | number | Estimated processing time |
| statusUrl | string | URL to check status |

### 3.5 GET /v1/tasks/:taskId

**Purpose:** Get task status and result

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| taskId | string | Task identifier |

**Success Response (200) - Pending/Processing:**
| Field | Type | Description |
|-------|------|-------------|
| taskId | string | Task identifier |
| status | string | `PENDING` or `PROCESSING` |
| type | string | Task type |
| createdAt | string | Creation timestamp |
| progress | number | Progress percentage (0-100) |

**Success Response (200) - Completed:**
| Field | Type | Description |
|-------|------|-------------|
| taskId | string | Task identifier |
| status | string | `COMPLETED` |
| type | string | Task type |
| createdAt | string | Creation timestamp |
| completedAt | string | Completion timestamp |
| result | object | Task-specific result |
| usage | object | Token usage |

**Success Response (200) - Failed:**
| Field | Type | Description |
|-------|------|-------------|
| taskId | string | Task identifier |
| status | string | `FAILED` |
| type | string | Task type |
| createdAt | string | Creation timestamp |
| failedAt | string | Failure timestamp |
| error | object | Error details |

### 3.6 DELETE /v1/tasks/:taskId

**Purpose:** Cancel a pending task

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| taskId | string | Task identifier |

**Success Response (200):**
| Field | Type | Description |
|-------|------|-------------|
| taskId | string | Task identifier |
| status | string | `CANCELLED` |
| cancelledAt | string | Cancellation timestamp |

**Error Response (409) - Already Processing:**
| Field | Type | Description |
|-------|------|-------------|
| error.code | string | `TASK_ALREADY_PROCESSING` |
| error.message | string | Human-readable message |

### 3.7 GET /v1/usage

**Purpose:** Get current user's usage statistics

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | `today` (default), `week`, `month` |

**Success Response (200):**
| Field | Type | Description |
|-------|------|-------------|
| userId | string | User identifier |
| period | string | Requested period |
| usage | object | Usage statistics |
| limits | object | Current limits |
| quotaResetAt | string | When quotas reset |

**Usage Statistics Object:**
| Field | Type | Description |
|-------|------|-------------|
| requestCount | number | Total requests |
| tokenInput | number | Input tokens used |
| tokenOutput | number | Output tokens used |
| tasksCreated | number | Async tasks created |
| cacheHits | number | Requests served from cache |

### 3.8 Error Response Format

All errors follow consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "requestId": "req_xxxxx",
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request body |
| `VALIDATION_ERROR` | 400 | Schema validation failed |
| `CONTENT_FILTERED` | 400 | Content blocked by safety filters |
| `UNAUTHORIZED` | 401 | Invalid or missing auth token |
| `FORBIDDEN` | 403 | User lacks permission |
| `TASK_NOT_FOUND` | 404 | Task ID not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit hit |
| `QUOTA_EXCEEDED` | 429 | Daily quota exceeded |
| `MODEL_UNAVAILABLE` | 503 | Vertex AI temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric                     | Requirement  |
| -------------------------- | ------------ |
| Cold start                 | < 5 seconds  |
| Health check response      | < 100ms      |
| Request parsing/validation | < 50ms       |
| Cache lookup               | < 200ms      |
| Rate limit check           | < 100ms      |
| P95 latency (generate)     | < 15 seconds |
| P95 latency (embed)        | < 3 seconds  |
| P95 latency (task create)  | < 500ms      |

### 4.2 Reliability

| Aspect            | Requirement                                |
| ----------------- | ------------------------------------------ |
| Availability      | 99.5% (aligned with Cloud Run SLA)         |
| Error rate        | < 1% for valid requests                    |
| Timeout handling  | Graceful response before Cloud Run timeout |
| Vertex AI retries | 3 attempts with exponential backoff        |
| Firestore retries | 3 attempts with exponential backoff        |

### 4.3 Scalability

| Aspect         | Specification            |
| -------------- | ------------------------ |
| Min instances  | 0 (scale to zero)        |
| Max instances  | 2 (cost guardrail)       |
| Concurrency    | 10 requests per instance |
| Max throughput | ~20 requests/second      |

### 4.4 Security

| Aspect              | Requirement                            |
| ------------------- | -------------------------------------- |
| Transport           | TLS 1.3 (enforced by Cloud Run)        |
| Authentication      | Dual-layer (IAM + Firebase)            |
| Authorization       | User can only access own tasks         |
| Input validation    | Strict schema validation on all inputs |
| Output sanitization | No reflection of user input in errors  |
| Secrets             | Loaded from Secret Manager only        |
| Logging             | No PII, no tokens, no prompt content   |

---

## 5. Integration Points

### 5.1 Inbound Integrations

#### 5.1.1 Main App (Primary Consumer)

| Aspect             | Specification                    |
| ------------------ | -------------------------------- |
| **Protocol**       | HTTPS                            |
| **Authentication** | IAM ID token + Firebase ID token |
| **Network Path**   | Internal (via VPC connector)     |
| **Request Format** | JSON                             |

#### 5.1.2 Cloud Run IAM (Authentication)

| Aspect             | Specification                 |
| ------------------ | ----------------------------- |
| **Mechanism**      | Automatic ID token validation |
| **Required Role**  | `roles/run.invoker` on caller |
| **Token Audience** | AI Service URL                |

### 5.2 Outbound Integrations

#### 5.2.1 Vertex AI (AI Operations)

| Aspect             | Specification                                        |
| ------------------ | ---------------------------------------------------- |
| **Protocol**       | gRPC / HTTPS                                         |
| **Authentication** | Application Default Credentials                      |
| **Network Path**   | Private Google Access via VPC                        |
| **Models**         | gemini-2.0-flash, gemini-2.0-pro, text-embedding-005 |

**Operations Used:**
| Operation | Vertex AI Method |
|-----------|------------------|
| Text generation | `generateContent` |
| Streaming | `streamGenerateContent` |
| Embeddings | `embedContent` |

#### 5.2.2 Pub/Sub (Async Tasks)

| Aspect             | Specification                   |
| ------------------ | ------------------------------- |
| **Protocol**       | HTTPS                           |
| **Authentication** | Application Default Credentials |
| **Topic**          | `rates-{env}-ai-tasks`          |
| **Message Format** | JSON                            |

**Published Message Structure:**

```json
{
  "taskId": "uuid",
  "type": "TASK_TYPE",
  "userId": "firebase-uid",
  "payload": {},
  "priority": "normal",
  "createdAt": "ISO-timestamp",
  "attemptNumber": 1
}
```

#### 5.2.3 Firestore (Persistence)

| Aspect             | Specification                   |
| ------------------ | ------------------------------- |
| **Protocol**       | gRPC                            |
| **Authentication** | Application Default Credentials |
| **Network Path**   | Private Google Access via VPC   |

**Collections Accessed:**
| Collection | Operations | Purpose |
|------------|------------|---------|
| `{env}_ai_tasks` | Read, Write | Task management |
| `{env}_ai_usage` | Read, Write | Usage tracking |
| `{env}_ai_rate_limits` | Read, Write | Rate limit counters |
| `{env}_ai_cache` | Read, Write | Response cache |

#### 5.2.4 Secret Manager (Configuration)

| Aspect               | Specification                   |
| -------------------- | ------------------------------- |
| **Protocol**         | HTTPS                           |
| **Authentication**   | Application Default Credentials |
| **Secrets Accessed** | `rates-{env}-vertex-ai-config`  |

#### 5.2.5 Cloud Logging (Observability)

| Aspect              | Specification                     |
| ------------------- | --------------------------------- |
| **Protocol**        | Automatic (Cloud Run integration) |
| **Format**          | Structured JSON                   |
| **Severity Levels** | DEBUG, INFO, WARNING, ERROR       |

---

## 6. Runtime Environment

### 6.1 Execution Platform

| Aspect            | Specification                          |
| ----------------- | -------------------------------------- |
| **Platform**      | Google Cloud Run (Gen 2)               |
| **Service Type**  | Service (HTTP-triggered, long-running) |
| **Region**        | us-central1                            |
| **Ingress**       | Internal only                          |
| **VPC Connector** | `rates-{env}-ai-connector`             |
| **VPC Egress**    | All traffic                            |

### 6.2 Resource Allocation

| Resource      | Dev    | Prod   |
| ------------- | ------ | ------ |
| CPU           | 1 vCPU | 1 vCPU |
| Memory        | 512 Mi | 512 Mi |
| Min Instances | 0      | 0      |
| Max Instances | 2      | 2      |
| Timeout       | 300s   | 300s   |
| Concurrency   | 10     | 10     |

### 6.3 Runtime Requirements

| Requirement       | Specification                       |
| ----------------- | ----------------------------------- |
| **Language**      | TypeScript (compiled to JavaScript) |
| **Runtime**       | Node.js 20.x LTS                    |
| **Module System** | ESM (ES Modules)                    |
| **Port**          | 8080 (Cloud Run default)            |

### 6.4 Framework Requirements

| Capability            | Requirement            | Rationale                                               |
| --------------------- | ---------------------- | ------------------------------------------------------- |
| **HTTP Framework**    | Fastify                | High performance, TypeScript support, schema validation |
| **No React**          | Pure API service       | No UI, no SSR needed                                    |
| **No React Router**   | Server-side routing    | Fastify handles routing natively                        |
| **Schema Validation** | Zod or Fastify schemas | Input validation                                        |
| **Async Support**     | Full async/await       | AI operations are async                                 |

### 6.5 Environment Variables

| Variable                      | Description        | Source                 |
| ----------------------------- | ------------------ | ---------------------- |
| `PORT`                        | Server port        | Cloud Run (auto: 8080) |
| `K_SERVICE`                   | Service name       | Cloud Run (auto)       |
| `K_REVISION`                  | Revision name      | Cloud Run (auto)       |
| `ENV`                         | Environment        | Terraform              |
| `GCP_PROJECT_ID`              | Project ID         | Terraform              |
| `VERTEX_AI_LOCATION`          | Vertex AI region   | Terraform              |
| `FIRESTORE_COLLECTION_PREFIX` | Collection prefix  | Terraform              |
| `DEFAULT_MODEL`               | Default AI model   | Terraform              |
| `RATE_LIMIT_REQUESTS_PER_MIN` | Rate limit config  | Terraform              |
| `RATE_LIMIT_TOKENS_PER_DAY`   | Token quota config | Terraform              |

---

## 7. Application Structure

### 7.1 Directory Structure

```
apps/ai-service/
├── src/
│   ├── index.ts                    # Entry point
│   ├── server.ts                   # Fastify server setup
│   │
│   ├── routes/
│   │   ├── index.ts                # Route registration
│   │   ├── health.routes.ts        # Health endpoints
│   │   ├── generate.routes.ts      # Generation endpoints
│   │   ├── embed.routes.ts         # Embedding endpoints
│   │   ├── tasks.routes.ts         # Task management endpoints
│   │   └── usage.routes.ts         # Usage endpoints
│   │
│   ├── controllers/
│   │   ├── generate.controller.ts
│   │   ├── embed.controller.ts
│   │   ├── tasks.controller.ts
│   │   └── usage.controller.ts
│   │
│   ├── services/
│   │   ├── vertex-ai.service.ts    # Vertex AI operations
│   │   ├── pubsub.service.ts       # Pub/Sub publishing
│   │   ├── rate-limit.service.ts   # Rate limiting logic
│   │   ├── cache.service.ts        # Response caching
│   │   ├── usage.service.ts        # Usage tracking
│   │   └── auth.service.ts         # Firebase token validation
│   │
│   ├── repositories/
│   │   ├── task.repository.ts      # Firestore task operations
│   │   ├── usage.repository.ts     # Firestore usage operations
│   │   ├── rate-limit.repository.ts
│   │   └── cache.repository.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Firebase token validation
│   │   ├── rate-limit.middleware.ts
│   │   ├── request-id.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── schemas/
│   │   ├── generate.schema.ts      # Request/response schemas
│   │   ├── embed.schema.ts
│   │   ├── task.schema.ts
│   │   └── common.schema.ts
│   │
│   ├── config/
│   │   ├── index.ts                # Configuration loader
│   │   ├── models.config.ts        # AI model configurations
│   │   └── limits.config.ts        # Rate limit configurations
│   │
│   ├── utils/
│   │   ├── logger.ts               # Structured logging
│   │   ├── errors.ts               # Custom error classes
│   │   ├── hash.ts                 # Cache key hashing
│   │   └── token-counter.ts        # Token estimation
│   │
│   └── types/
│       ├── request.types.ts
│       ├── response.types.ts
│       └── vertex-ai.types.ts
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### 7.2 Key Component Responsibilities

| Component        | Responsibility                                       |
| ---------------- | ---------------------------------------------------- |
| **Routes**       | HTTP endpoint definitions, request/response schemas  |
| **Controllers**  | Request handling, orchestration, response formatting |
| **Services**     | Business logic, external service interactions        |
| **Repositories** | Firestore data access layer                          |
| **Middleware**   | Cross-cutting concerns (auth, rate limiting, errors) |
| **Schemas**      | Input validation definitions                         |
| **Config**       | Environment-based configuration                      |

---

## 8. Middleware Pipeline

### 8.1 Request Pipeline Order

```
Request
    │
    ▼
┌─────────────────────┐
│  1. Request ID      │  Generate/extract X-Request-ID
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  2. Authentication  │  Validate Firebase token, extract userId
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  3. Rate Limiting   │  Check user limits, reject if exceeded
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  4. Schema Valid.   │  Validate request body (Fastify built-in)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  5. Controller      │  Business logic execution
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  6. Error Handler   │  Catch and format errors
└─────────┴───────────┘
          │
          ▼
      Response
```

### 8.2 Middleware Specifications

#### 8.2.1 Request ID Middleware

| Aspect      | Specification                      |
| ----------- | ---------------------------------- |
| Header      | `X-Request-ID`                     |
| Behavior    | Use provided ID or generate UUID   |
| Propagation | Add to all logs, pass to Vertex AI |

#### 8.2.2 Authentication Middleware

| Aspect      | Specification                        |
| ----------- | ------------------------------------ |
| Header      | `X-Forwarded-Authorization`          |
| Token Type  | Firebase ID Token                    |
| Validation  | Verify signature, expiration, issuer |
| Output      | Attach `userId` to request context   |
| Skip Routes | `/health`, `/ready`                  |

#### 8.2.3 Rate Limit Middleware

| Aspect      | Specification                           |
| ----------- | --------------------------------------- |
| Algorithm   | Sliding window counter                  |
| Storage     | Firestore (`{env}_ai_rate_limits`)      |
| Window      | 1 minute for requests, 1 day for tokens |
| Headers     | Set `X-RateLimit-*` response headers    |
| Skip Routes | `/health`, `/ready`, `/v1/usage`        |

---

## 9. Error Handling

### 9.1 Error Categories

| Category                    | HTTP Status | Retry             | Log Level |
| --------------------------- | ----------- | ----------------- | --------- |
| Validation Error            | 400         | No                | INFO      |
| Authentication Error        | 401         | No                | WARNING   |
| Authorization Error         | 403         | No                | WARNING   |
| Not Found                   | 404         | No                | INFO      |
| Rate Limit                  | 429         | Yes (after delay) | INFO      |
| Vertex AI Error (transient) | 503         | Yes               | WARNING   |
| Vertex AI Error (permanent) | 400/500     | No                | ERROR     |
| Internal Error              | 500         | No                | ERROR     |

### 9.2 Vertex AI Error Mapping

| Vertex AI Error      | Mapped Response                     |
| -------------------- | ----------------------------------- |
| `INVALID_ARGUMENT`   | 400 `INVALID_REQUEST`               |
| `RESOURCE_EXHAUSTED` | 429 `QUOTA_EXCEEDED`                |
| `PERMISSION_DENIED`  | 500 `INTERNAL_ERROR` (config issue) |
| `UNAVAILABLE`        | 503 `MODEL_UNAVAILABLE`             |
| `DEADLINE_EXCEEDED`  | 504 `TIMEOUT`                       |
| Safety block         | 400 `CONTENT_FILTERED`              |

### 9.3 Error Response Enhancement

All errors include:

- Unique error code for client handling
- Human-readable message (safe for display)
- Request ID for support correlation
- Timestamp for debugging
- No stack traces in production
- No sensitive data reflection

---

## 10. Caching Strategy

### 10.1 Cache Design

| Aspect             | Specification                           |
| ------------------ | --------------------------------------- |
| **Storage**        | Firestore (`{env}_ai_cache`)            |
| **Key Generation** | SHA-256 hash of normalized request      |
| **TTL**            | 24 hours                                |
| **Invalidation**   | TTL-based only (no manual invalidation) |

### 10.2 Cache Key Components

| Component       | Normalization              |
| --------------- | -------------------------- |
| Prompt          | Trim whitespace, lowercase |
| System Context  | Trim whitespace, lowercase |
| Model           | Exact match                |
| Temperature     | Round to 1 decimal         |
| MaxOutputTokens | Exact match                |

### 10.3 Cache Bypass

| Method     | Description                       |
| ---------- | --------------------------------- |
| Header     | `X-Skip-Cache: true`              |
| Streaming  | Never cached                      |
| Embeddings | Cached (deterministic)            |
| Tasks      | Never cached (unique per request) |

### 10.4 Cache Document Structure

| Field       | Type      | Description                |
| ----------- | --------- | -------------------------- |
| id          | string    | SHA-256 hash (document ID) |
| requestHash | string    | Full hash for verification |
| response    | object    | Cached response            |
| model       | string    | Model used                 |
| createdAt   | timestamp | Cache entry time           |
| expiresAt   | timestamp | TTL expiration             |
| hitCount    | number    | Access counter             |

---

## 11. Rate Limiting Strategy

### 11.1 Rate Limit Tiers

| Tier     | Requests/Min | Tokens/Day | Concurrent | Tasks/Hour |
| -------- | ------------ | ---------- | ---------- | ---------- |
| Default  | 10           | 10,000     | 3          | 5          |
| Elevated | 30           | 50,000     | 5          | 20         |

### 11.2 Implementation

| Aspect          | Specification                       |
| --------------- | ----------------------------------- |
| **Algorithm**   | Sliding window log                  |
| **Storage**     | Firestore (`{env}_ai_rate_limits`)  |
| **Key Format**  | `{userId}_{limitType}_{windowId}`   |
| **Window Size** | 1 minute (requests), 1 day (tokens) |

### 11.3 Rate Limit Document Structure

| Field       | Type      | Description             |
| ----------- | --------- | ----------------------- |
| id          | string    | Composite key           |
| userId      | string    | User identifier         |
| windowStart | timestamp | Window start time       |
| count       | number    | Current count in window |
| updatedAt   | timestamp | Last update time        |

### 11.4 Rate Limit Response Headers

| Header                  | Description                    |
| ----------------------- | ------------------------------ |
| `X-RateLimit-Limit`     | Maximum allowed in window      |
| `X-RateLimit-Remaining` | Remaining in current window    |
| `X-RateLimit-Reset`     | Unix timestamp of window reset |
| `Retry-After`           | Seconds until retry (on 429)   |

---

## 12. Observability

### 12.1 Structured Logging

**Log Entry Format:**

```json
{
  "severity": "INFO",
  "message": "Request processed",
  "requestId": "req_xxx",
  "userId": "user_xxx",
  "method": "POST",
  "path": "/v1/generate",
  "statusCode": 200,
  "latencyMs": 1250,
  "model": "gemini-2.0-flash",
  "tokenInput": 150,
  "tokenOutput": 500,
  "cached": false,
  "labels": {
    "service": "ai-service",
    "env": "dev"
  }
}
```

### 12.2 Required Log Events

| Event                 | Severity      | When                      |
| --------------------- | ------------- | ------------------------- |
| `request_received`    | DEBUG         | Request enters middleware |
| `auth_success`        | DEBUG         | Token validated           |
| `auth_failure`        | WARNING       | Invalid token             |
| `rate_limit_check`    | DEBUG         | Rate limit evaluated      |
| `rate_limit_exceeded` | INFO          | Request rejected          |
| `cache_hit`           | DEBUG         | Response from cache       |
| `cache_miss`          | DEBUG         | Cache lookup failed       |
| `vertex_ai_request`   | DEBUG         | Calling Vertex AI         |
| `vertex_ai_response`  | DEBUG         | Response received         |
| `vertex_ai_error`     | WARNING/ERROR | Vertex AI failed          |
| `task_created`        | INFO          | Async task published      |
| `request_completed`   | INFO          | Response sent             |
| `request_error`       | ERROR         | Unhandled error           |

### 12.3 Sensitive Data Handling

**Never Log:**

- Full prompt content
- Firebase tokens
- User personal information
- Full response content

**Acceptable to Log:**

- User ID (anonymized if needed)
- Request ID
- Token counts
- Model names
- Latency metrics
- Error codes (not full messages with user input)

---

## 13. Testing Strategy

### 13.1 Unit Tests

| Component    | Coverage Target | Focus                                 |
| ------------ | --------------- | ------------------------------------- |
| Controllers  | 85%             | Request handling, response formatting |
| Services     | 90%             | Business logic, error handling        |
| Middleware   | 90%             | Auth validation, rate limiting        |
| Repositories | 80%             | Firestore operations                  |
| Utils        | 95%             | Pure functions                        |

### 13.2 Integration Tests

| Test Suite | Dependencies        | Focus             |
| ---------- | ------------------- | ----------------- |
| API Routes | Fastify test client | Endpoint behavior |
| Firestore  | Firebase Emulator   | Data persistence  |
| Vertex AI  | Mock/Real (dev)     | AI operations     |

### 13.3 Test Scenarios

| Scenario                 | Expected Behavior          |
| ------------------------ | -------------------------- |
| Valid generation request | 200 with content           |
| Invalid token            | 401 Unauthorized           |
| Rate limit exceeded      | 429 with Retry-After       |
| Vertex AI timeout        | Retry then 503             |
| Cache hit                | 200 with X-Cache-Hit: true |
| Create async task        | 202 with taskId            |
| Get own task             | 200 with status            |
| Get other user's task    | 404 Not Found              |

---

## 14. Deployment

### 14.1 Container Image

| Aspect       | Specification                           |
| ------------ | --------------------------------------- |
| Base Image   | `node:20-alpine`                        |
| Build        | Multi-stage (build → runtime)           |
| Registry     | `rates-{env}-containers/ai-service`     |
| Tag Strategy | `latest` (dev), semantic version (prod) |

### 14.2 Dockerfile Considerations

- Multi-stage build for smaller image
- Non-root user for security
- Health check instruction
- Proper signal handling (SIGTERM)

### 14.3 Deployment Process

1. Build TypeScript → JavaScript
2. Build Docker image
3. Push to Artifact Registry
4. Terraform applies Cloud Run configuration
5. Cloud Run pulls and deploys image
6. Health checks pass → traffic shifted

---

## 15. Success Criteria

### 15.1 Functional Success

- [ ] All API endpoints operational
- [ ] Firebase token validation working
- [ ] Rate limiting enforced correctly
- [ ] Caching returns cached responses
- [ ] Async tasks published to Pub/Sub
- [ ] Task status correctly retrieved
- [ ] Usage tracking accurate

### 15.2 Non-Functional Success

- [ ] Cold start < 5 seconds
- [ ] P95 latency within targets
- [ ] Error rate < 1%
- [ ] Structured logs in Cloud Logging
- [ ] No public internet access possible

### 15.3 Security Success

- [ ] Internal-only ingress verified
- [ ] Invalid tokens rejected with 401
- [ ] Users cannot access other users' tasks
- [ ] No sensitive data in logs
- [ ] Rate limits prevent abuse

---

## 16. Out of Scope

| Item                       | Responsible Component    |
| -------------------------- | ------------------------ |
| Long-running AI operations | AI Processor             |
| User interface             | Main App                 |
| User authentication        | Main App / Auth App      |
| Task execution             | AI Processor             |
| Real-time notifications    | Future enhancement       |
| Model fine-tuning          | Out of scope             |
| Image generation           | Out of scope (text only) |

---

**Document End**

_This specification defines the AI Service application independently. Implementation should follow this document for application behavior and the parent Technical Implementation Guide for infrastructure and integration details._
