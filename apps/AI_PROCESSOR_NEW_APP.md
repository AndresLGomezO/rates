# AI Async Processor Application Specification

## Document Information

| Field            | Value                |
| ---------------- | -------------------- |
| Version          | 1.0                  |
| Created          | 2026                 |
| Status           | Implementation Ready |
| Application Name | `ai-processor`       |
| Location         | `apps/ai-processor`  |
| Parent Project   | Rates Monorepo       |

---

## 1. Application Overview

### 1.1 Purpose

The AI Async Processor is a **background job execution application** designed to handle long-running AI operations that exceed the synchronous request timeout limits of the AI Service. It processes tasks from a message queue, executes Vertex AI operations, and stores results for later retrieval.

### 1.2 Problem Statement

Synchronous AI operations have practical limits:

- Cloud Run request timeout: 300 seconds maximum
- User experience degrades for operations > 10 seconds
- Complex AI tasks (batch processing, document analysis, multi-step pipelines) require minutes to hours

The AI Async Processor solves this by:

- Accepting tasks via message queue (decoupled from HTTP request lifecycle)
- Processing tasks independently with extended timeouts (up to 1 hour)
- Storing results in persistent storage for later retrieval
- Handling retries and failures gracefully

### 1.3 Execution Model

| Aspect             | Specification                               |
| ------------------ | ------------------------------------------- |
| **Runtime Type**   | Cloud Run Job (not a service)               |
| **Trigger**        | Pub/Sub message via Eventarc                |
| **Lifecycle**      | Starts on message, processes, terminates    |
| **Concurrency**    | Single task per execution (parallelism=1)   |
| **Max Duration**   | 30 minutes (dev) / 60 minutes (prod)        |
| **Retry Behavior** | Automatic retry on failure (max 3 attempts) |

---

## 2. Functional Requirements

### 2.1 Core Capabilities

#### 2.1.1 Message Consumption

The application must:

- Receive Pub/Sub messages containing task definitions
- Parse and validate message payload against defined schema
- Acknowledge successful processing or reject for retry
- Handle malformed messages gracefully (send to DLQ)

#### 2.1.2 Task Processing

The application must support these task types:

| Task Type              | Description                            | Typical Duration |
| ---------------------- | -------------------------------------- | ---------------- |
| `TEXT_GENERATION`      | Long-form content generation           | 30s - 5min       |
| `SUMMARIZATION`        | Document/text summarization            | 1min - 10min     |
| `BATCH_EMBEDDING`      | Generate embeddings for multiple items | 1min - 30min     |
| `DOCUMENT_QA`          | Question answering over documents      | 1min - 15min     |
| `BATCH_CLASSIFICATION` | Classify multiple items                | 1min - 20min     |
| `MULTI_STEP_PIPELINE`  | Chained AI operations                  | 5min - 60min     |

#### 2.1.3 State Management

The application must:

- Update task status in Firestore at each stage (PENDING → PROCESSING → COMPLETED/FAILED)
- Store partial progress for long-running tasks (checkpointing)
- Record token usage and processing metrics
- Handle duplicate message delivery (idempotency)

#### 2.1.4 Result Storage

The application must:

- Store successful results in Firestore
- Store error details for failed tasks
- Support large results (chunked storage if needed)
- Apply TTL for automatic result cleanup

### 2.2 Processing Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Processor Lifecycle                        │
└─────────────────────────────────────────────────────────────────────┘

1. STARTUP
   ├── Initialize configuration from environment/secrets
   ├── Establish Firestore connection
   ├── Initialize Vertex AI client
   └── Parse incoming Pub/Sub message from environment

2. VALIDATION
   ├── Validate message schema
   ├── Load task from Firestore (verify exists and status=PENDING)
   ├── Check for duplicate processing (idempotency)
   └── If invalid → Log error, exit with failure (triggers DLQ after retries)

3. PROCESSING
   ├── Update task status to PROCESSING
   ├── Route to appropriate handler based on task type
   ├── Execute Vertex AI operations
   ├── Update progress checkpoints (for long tasks)
   └── Collect token usage metrics

4. COMPLETION (Success)
   ├── Store result in Firestore
   ├── Update task status to COMPLETED
   ├── Record final metrics (duration, tokens, cost estimate)
   └── Exit with success (code 0)

5. COMPLETION (Failure)
   ├── Store error details in Firestore
   ├── Update task status to FAILED (if max retries exceeded)
   ├── Or leave as PROCESSING (if retries remaining)
   └── Exit with failure (code 1) to trigger retry
```

### 2.3 Task Type Specifications

#### 2.3.1 TEXT_GENERATION

**Purpose:** Generate long-form text content that exceeds sync timeout

**Input Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | Yes | Generation prompt |
| systemContext | string | No | System instructions |
| parameters | object | No | Generation parameters |
| maxOutputTokens | number | No | Override default (up to 32K) |

**Output Result:**
| Field | Type | Description |
|-------|------|-------------|
| content | string | Generated text |
| tokenUsage | object | Input/output token counts |

#### 2.3.2 SUMMARIZATION

**Purpose:** Summarize long documents or multiple documents

**Input Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes* | Text to summarize |
| contentRef | string | Yes* | Firestore reference to content |
| summaryType | string | No | `brief`, `detailed`, `bullets` |
| maxLength | number | No | Target summary length |

\*One of `content` or `contentRef` required

**Output Result:**
| Field | Type | Description |
|-------|------|-------------|
| summary | string | Generated summary |
| originalLength | number | Original content length |
| summaryLength | number | Summary length |

#### 2.3.3 BATCH_EMBEDDING

**Purpose:** Generate embeddings for multiple text items

**Input Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| items | array | Yes | Array of {id, text} objects |
| model | string | No | Embedding model override |

**Output Result:**
| Field | Type | Description |
|-------|------|-------------|
| embeddings | array | Array of {id, vector} objects |
| dimensions | number | Vector dimensions |
| itemCount | number | Number of items processed |

#### 2.3.4 DOCUMENT_QA

**Purpose:** Answer questions about provided document(s)

**Input Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | string | Yes | Question to answer |
| documentContent | string | Yes* | Document text |
| documentRef | string | Yes* | Firestore reference |
| includeReferences | boolean | No | Include source quotes |

**Output Result:**
| Field | Type | Description |
|-------|------|-------------|
| answer | string | Generated answer |
| confidence | number | Confidence score (0-1) |
| references | array | Source quotes (if requested) |

#### 2.3.5 BATCH_CLASSIFICATION

**Purpose:** Classify multiple items into categories

**Input Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| items | array | Yes | Array of {id, text} objects |
| categories | array | Yes | Possible category labels |
| multiLabel | boolean | No | Allow multiple labels per item |

**Output Result:**
| Field | Type | Description |
|-------|------|-------------|
| classifications | array | Array of {id, labels, scores} |
| itemCount | number | Number of items processed |

#### 2.3.6 MULTI_STEP_PIPELINE

**Purpose:** Execute a sequence of AI operations

**Input Payload:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| steps | array | Yes | Array of step definitions |
| initialInput | object | Yes | Input for first step |

**Step Definition:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Task type for this step |
| config | object | No | Step-specific configuration |
| outputMapping | object | No | Map output to next step input |

**Output Result:**
| Field | Type | Description |
|-------|------|-------------|
| finalOutput | object | Output from last step |
| stepResults | array | Results from each step |
| totalDuration | number | Total processing time |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Metric               | Requirement                            |
| -------------------- | -------------------------------------- |
| Startup time         | < 10 seconds                           |
| Message parsing      | < 100ms                                |
| Firestore operations | < 500ms per operation                  |
| Checkpoint frequency | Every 60 seconds for tasks > 2 minutes |

### 3.2 Reliability

| Aspect           | Requirement                                   |
| ---------------- | --------------------------------------------- |
| Idempotency      | Must handle duplicate message delivery        |
| Crash recovery   | Checkpointed state allows resume              |
| Timeout handling | Graceful shutdown before Cloud Run terminates |
| Error isolation  | Single task failure doesn't affect queue      |

### 3.3 Observability

| Aspect             | Requirement                                   |
| ------------------ | --------------------------------------------- |
| Structured logging | JSON format for Cloud Logging                 |
| Request tracing    | Propagate trace ID from original request      |
| Metrics emission   | Token usage, duration, success/failure counts |
| Error reporting    | Full stack traces for failures                |

### 3.4 Security

| Aspect         | Requirement                                         |
| -------------- | --------------------------------------------------- |
| Authentication | Service account identity only (no user credentials) |
| Authorization  | Verify task belongs to claimed user                 |
| Data handling  | No PII in logs                                      |
| Secrets        | Load from Secret Manager, never log                 |

---

## 4. Integration Points

### 4.1 Inbound Integrations

#### 4.1.1 Pub/Sub (Message Source)

| Aspect             | Specification                             |
| ------------------ | ----------------------------------------- |
| **Topic**          | `rates-{env}-ai-tasks`                    |
| **Trigger Method** | Eventarc Pub/Sub trigger to Cloud Run Job |
| **Message Format** | JSON (base64 encoded in Pub/Sub)          |
| **Delivery**       | At-least-once (must handle duplicates)    |

**Expected Message Structure:**

```
{
  "taskId": "string (UUID)",
  "type": "AITaskType enum",
  "userId": "string (Firebase UID)",
  "payload": { ... task-specific ... },
  "priority": "low | normal | high",
  "createdAt": "ISO timestamp",
  "attemptNumber": number
}
```

#### 4.1.2 Environment Variables (Configuration)

| Variable                      | Description                  | Source    |
| ----------------------------- | ---------------------------- | --------- |
| `CLOUD_RUN_JOB`               | Job name (auto-injected)     | Cloud Run |
| `CLOUD_RUN_EXECUTION`         | Execution ID (auto-injected) | Cloud Run |
| `CLOUD_RUN_TASK_INDEX`        | Task index (auto-injected)   | Cloud Run |
| `CLOUD_RUN_TASK_COUNT`        | Task count (auto-injected)   | Cloud Run |
| `ENV`                         | Environment (dev/prod)       | Terraform |
| `GCP_PROJECT_ID`              | Project ID                   | Terraform |
| `VERTEX_AI_LOCATION`          | Vertex AI region             | Terraform |
| `FIRESTORE_COLLECTION_PREFIX` | Collection prefix            | Terraform |

#### 4.1.3 Secret Manager (Secrets)

| Secret                         | Purpose                 |
| ------------------------------ | ----------------------- |
| `rates-{env}-vertex-ai-config` | Vertex AI configuration |

### 4.2 Outbound Integrations

#### 4.2.1 Vertex AI (AI Operations)

| Aspect             | Specification                                                  |
| ------------------ | -------------------------------------------------------------- |
| **Connection**     | Private Google Access via VPC                                  |
| **Authentication** | Application Default Credentials                                |
| **Models Used**    | Gemini 2.0 Flash (default), Gemini 2.0 Pro, text-embedding-005 |
| **Operations**     | generateContent, embedContent                                  |

#### 4.2.2 Firestore (State & Results)

| Aspect             | Specification                      |
| ------------------ | ---------------------------------- |
| **Connection**     | Private Google Access via VPC      |
| **Authentication** | Application Default Credentials    |
| **Collections**    | `{env}_ai_tasks`, `{env}_ai_usage` |

**Task Document Updates:**
| Stage | Fields Updated |
|-------|----------------|
| Start processing | `status`, `processingStartedAt`, `processorExecutionId` |
| Checkpoint | `progress`, `checkpointData`, `updatedAt` |
| Success | `status`, `result`, `completedAt`, `tokenUsage`, `processingDuration` |
| Failure | `status`, `error`, `failedAt`, `attemptNumber` |

#### 4.2.3 Cloud Logging (Observability)

| Aspect              | Specification                |
| ------------------- | ---------------------------- |
| **Format**          | Structured JSON              |
| **Severity Levels** | DEBUG, INFO, WARNING, ERROR  |
| **Required Fields** | taskId, executionId, traceId |

---

## 5. Runtime Environment

### 5.1 Execution Platform

| Aspect       | Specification                            |
| ------------ | ---------------------------------------- |
| **Platform** | Google Cloud Run Jobs                    |
| **Trigger**  | Eventarc (Pub/Sub → Cloud Run Job)       |
| **Region**   | us-central1                              |
| **VPC**      | Connected via `rates-{env}-ai-connector` |
| **Egress**   | All traffic through VPC (for PGA)        |

### 5.2 Resource Allocation

| Resource    | Dev            | Prod           |
| ----------- | -------------- | -------------- |
| CPU         | 1 vCPU         | 1 vCPU         |
| Memory      | 1 Gi           | 1 Gi           |
| Timeout     | 1800s (30 min) | 3600s (60 min) |
| Max Retries | 3              | 3              |
| Parallelism | 1              | 1              |

### 5.3 Runtime Requirements

| Requirement       | Specification                       |
| ----------------- | ----------------------------------- |
| **Language**      | TypeScript (compiled to JavaScript) |
| **Runtime**       | Node.js 20.x LTS                    |
| **Module System** | ESM (ES Modules)                    |
| **Build Output**  | Single distributable bundle         |

### 5.4 Framework Requirements

| Capability            | Requirement                                   |
| --------------------- | --------------------------------------------- |
| **No HTTP Server**    | This is a job, not a service                  |
| **CLI Entry Point**   | Single entry point that processes one message |
| **Graceful Shutdown** | Handle SIGTERM for Cloud Run termination      |
| **Async/Await**       | Full async support for AI operations          |
| **Schema Validation** | Validate incoming message payloads            |

---

## 6. Error Handling

### 6.1 Error Categories

| Category                      | Behavior                              | Exit Code |
| ----------------------------- | ------------------------------------- | --------- |
| **Message Parse Error**       | Log, exit failure (DLQ after retries) | 1         |
| **Task Not Found**            | Log, exit success (no retry)          | 0         |
| **Task Already Processed**    | Log, exit success (idempotent)        | 0         |
| **Vertex AI Transient Error** | Retry within job, then exit failure   | 1         |
| **Vertex AI Permanent Error** | Mark task failed, exit success        | 0         |
| **Firestore Error**           | Retry within job, then exit failure   | 1         |
| **Timeout Approaching**       | Checkpoint, exit failure for resume   | 1         |
| **Unknown Error**             | Log full details, exit failure        | 1         |

### 6.2 Retry Strategy

**Internal Retries (within job execution):**

- Vertex AI calls: 3 retries with exponential backoff (1s, 2s, 4s)
- Firestore calls: 3 retries with exponential backoff (500ms, 1s, 2s)

**External Retries (Pub/Sub redelivery):**

- Controlled by Pub/Sub subscription configuration
- Max 5 delivery attempts before DLQ
- Exponential backoff: 10s to 600s

### 6.3 Dead Letter Queue Handling

Messages sent to DLQ (`rates-{env}-ai-dlq`) when:

- Max delivery attempts exceeded
- Permanent parsing/validation failures
- Task explicitly marked as non-retryable

**DLQ Message Enrichment:**
| Field | Description |
|-------|-------------|
| Original message | Full original payload |
| Failure reason | Last error message |
| Attempt count | Number of attempts made |
| Last attempt time | Timestamp of final attempt |

---

## 7. Monitoring & Alerting

### 7.1 Key Metrics to Track

| Metric                  | Description          | Alert Threshold |
| ----------------------- | -------------------- | --------------- |
| `job_executions_total`  | Total job executions | N/A (baseline)  |
| `job_success_rate`      | Success/total ratio  | < 95%           |
| `job_duration_seconds`  | Processing duration  | p95 > 1800s     |
| `task_processing_time`  | Per-task duration    | p95 > 600s      |
| `vertex_ai_tokens_used` | Token consumption    | > daily budget  |
| `dlq_message_count`     | Messages in DLQ      | > 10            |

### 7.2 Log-Based Alerts

| Alert Name       | Log Query Pattern                                                    | Trigger        |
| ---------------- | -------------------------------------------------------------------- | -------------- |
| Job Failures     | `severity=ERROR AND resource.labels.job_name="rates-*-ai-processor"` | > 5 in 10 min  |
| DLQ Accumulation | `jsonPayload.topic CONTAINS "ai-dlq"`                                | > 10 in 1 hour |
| Timeout Warnings | `jsonPayload.event="timeout_approaching"`                            | Any occurrence |

### 7.3 Required Log Events

| Event                | Severity | When                          |
| -------------------- | -------- | ----------------------------- |
| `job_started`        | INFO     | Job begins execution          |
| `message_received`   | INFO     | Pub/Sub message parsed        |
| `task_loaded`        | INFO     | Task retrieved from Firestore |
| `processing_started` | INFO     | Task processing begins        |
| `checkpoint_saved`   | DEBUG    | Progress checkpoint saved     |
| `vertex_ai_request`  | DEBUG    | Vertex AI API call made       |
| `vertex_ai_response` | DEBUG    | Vertex AI response received   |
| `task_completed`     | INFO     | Task successfully completed   |
| `task_failed`        | ERROR    | Task processing failed        |
| `job_completed`      | INFO     | Job execution finished        |

---

## 8. Development Considerations

### 8.1 Local Development

| Aspect                 | Approach                                               |
| ---------------------- | ------------------------------------------------------ |
| **Message Simulation** | CLI argument or environment variable with test message |
| **Firestore**          | Firebase Emulator                                      |
| **Vertex AI**          | Real API (dev project) or mock for unit tests          |
| **Secrets**            | Local `.env` file or Secret Manager                    |

### 8.2 Testing Strategy

| Test Type         | Coverage Target | Focus                                  |
| ----------------- | --------------- | -------------------------------------- |
| Unit Tests        | 80%             | Handlers, parsing, validation          |
| Integration Tests | Key paths       | Firestore operations, message handling |
| E2E Tests         | Happy paths     | Full flow with real Vertex AI          |

### 8.3 Build & Deployment

| Aspect         | Specification                         |
| -------------- | ------------------------------------- |
| **Build**      | TypeScript → JavaScript bundle        |
| **Container**  | Docker image                          |
| **Registry**   | `rates-{env}-containers/ai-processor` |
| **Deployment** | Terraform + Cloud Run Jobs API        |

---

## 9. Success Criteria

### 9.1 Functional Success

- [ ] Successfully processes all defined task types
- [ ] Correctly updates task status in Firestore
- [ ] Handles message acknowledgment/rejection properly
- [ ] Implements idempotency for duplicate messages
- [ ] Stores results accessible by AI Service

### 9.2 Operational Success

- [ ] Completes within timeout limits
- [ ] Checkpoints long-running tasks
- [ ] Logs structured events for all operations
- [ ] Handles graceful shutdown on SIGTERM
- [ ] DLQ receives only truly unprocessable messages

### 9.3 Integration Success

- [ ] Receives messages from Pub/Sub via Eventarc
- [ ] Connects to Vertex AI via Private Google Access
- [ ] Reads/writes Firestore successfully
- [ ] Uses correct service account permissions

---

## 10. Out of Scope

The following are explicitly **not** responsibilities of this application:

| Item                    | Responsible Component     |
| ----------------------- | ------------------------- |
| HTTP API endpoints      | AI Service                |
| User authentication     | AI Service / Main App     |
| Rate limiting           | AI Service                |
| Task creation           | AI Service                |
| Result retrieval API    | AI Service                |
| Real-time notifications | Future enhancement        |
| Task scheduling/delays  | Pub/Sub / Cloud Scheduler |

---

**Document End**

_This specification defines the AI Async Processor application independently. Implementation should follow this document for application behavior and the parent Technical Implementation Guide for infrastructure and integration details._
