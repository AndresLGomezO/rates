# AI Processor Application Specification

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

The AI Processor is a **background job execution application** designed to handle long-running AI operations that exceed the synchronous timeout limits of the AI Service. It consumes tasks from a message queue, executes Vertex AI operations, and persists results for later retrieval.

### 1.2 Problem Statement

Synchronous AI operations have practical constraints:

- Cloud Run service timeout: 300 seconds maximum
- User experience degrades for operations > 10 seconds
- Complex AI tasks require extended processing time (minutes to hours)
- Batch operations need to process many items sequentially

The AI Processor solves this by:

- Processing tasks asynchronously (decoupled from HTTP lifecycle)
- Supporting extended timeouts (up to 60 minutes)
- Providing checkpointing for resumable processing
- Handling retries and failures gracefully
- Storing results for later retrieval via AI Service

### 1.3 Execution Model

| Aspect             | Specification                          |
| ------------------ | -------------------------------------- |
| **Runtime Type**   | Cloud Run Job (not a service)          |
| **Trigger**        | Pub/Sub message via Eventarc           |
| **Lifecycle**      | Starts → Processes single task → Exits |
| **Concurrency**    | One task per execution                 |
| **Max Duration**   | 30 minutes (dev) / 60 minutes (prod)   |
| **Retry Behavior** | Automatic retry via Pub/Sub redelivery |

### 1.4 Key Characteristics

| Characteristic     | Description                                    |
| ------------------ | ---------------------------------------------- |
| **Ephemeral**      | Starts on trigger, terminates after processing |
| **Single-Task**    | Processes exactly one task per execution       |
| **Idempotent**     | Safe to retry; handles duplicate delivery      |
| **Checkpointed**   | Saves progress for long-running tasks          |
| **No HTTP Server** | Not a web service; CLI-style execution         |

### 1.5 Comparison with AI Service

| Aspect       | AI Service        | AI Processor         |
| ------------ | ----------------- | -------------------- |
| Type         | Cloud Run Service | Cloud Run Job        |
| Trigger      | HTTP requests     | Pub/Sub messages     |
| Lifecycle    | Long-running      | Ephemeral            |
| Operations   | Sync (< 5 min)    | Async (< 60 min)     |
| Scaling      | Request-based     | Message-based        |
| Has HTTP API | Yes               | No                   |
| Framework    | Fastify           | None (plain Node.js) |

---

## 2. Functional Requirements

### 2.1 Core Capabilities

#### 2.1.1 Message Consumption

The application must:

- Receive task definition from Pub/Sub (via environment/stdin)
- Parse and validate message payload against schema
- Handle malformed messages gracefully
- Support message acknowledgment semantics via exit codes

#### 2.1.2 Task Processing

The application must process these task types:

| Task Type              | Description                     | Typical Duration | Max Duration |
| ---------------------- | ------------------------------- | ---------------- | ------------ |
| `TEXT_GENERATION`      | Long-form content generation    | 1-5 min          | 15 min       |
| `SUMMARIZATION`        | Document summarization          | 2-10 min         | 30 min       |
| `BATCH_EMBEDDING`      | Embeddings for multiple items   | 5-30 min         | 45 min       |
| `DOCUMENT_QA`          | Question answering on documents | 2-15 min         | 30 min       |
| `BATCH_CLASSIFICATION` | Classify multiple items         | 5-20 min         | 45 min       |
| `MULTI_STEP_PIPELINE`  | Chained AI operations           | 10-45 min        | 60 min       |

#### 2.1.3 State Management

The application must:

- Update task status at each processing stage
- Implement checkpointing for tasks > 2 minutes
- Track token usage and processing metrics
- Handle duplicate message delivery (idempotency)
- Support resumption from last checkpoint

#### 2.1.4 Result Storage

The application must:

- Store successful results in Firestore
- Store detailed error information for failures
- Support large results via chunking if needed
- Record processing metrics (duration, tokens, cost)

### 2.2 Processing Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI Processor Execution Lifecycle                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 1: INITIALIZATION                                              │
├──────────────────────────────────────────────────────────────────────┤
│  1. Process starts (triggered by Pub/Sub via Eventarc)               │
│  2. Load configuration from environment variables                     │
│  3. Load secrets from Secret Manager                                  │
│  4. Initialize Firestore client                                       │
│  5. Initialize Vertex AI client                                       │
│  6. Parse Pub/Sub message from CLOUD_RUN_TASK_* env vars             │
│  7. Register SIGTERM handler for graceful shutdown                    │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 2: VALIDATION                                                  │
├──────────────────────────────────────────────────────────────────────┤
│  1. Validate message schema (Zod)                                    │
│  2. Extract taskId, type, userId, payload                            │
│  3. Load task document from Firestore                                │
│  4. Verify task exists                                               │
│     └─ If not found → Log warning, exit SUCCESS (0)                  │
│  5. Verify task status is PENDING or PROCESSING (resume)             │
│     └─ If COMPLETED/FAILED/CANCELLED → Log info, exit SUCCESS (0)   │
│  6. Verify task belongs to claimed userId                            │
│     └─ If mismatch → Log error, exit SUCCESS (0) - no retry          │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 3: PROCESSING SETUP                                            │
├──────────────────────────────────────────────────────────────────────┤
│  1. Update task status to PROCESSING                                 │
│  2. Record processingStartedAt timestamp                             │
│  3. Record executionId (CLOUD_RUN_EXECUTION)                         │
│  4. Load checkpoint data if resuming                                 │
│  5. Select handler based on task type                                │
│  6. Initialize progress tracking                                     │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE 4: TASK EXECUTION                                              │
├──────────────────────────────────────────────────────────────────────┤
│  1. Handler processes task payload                                   │
│  2. Make Vertex AI API calls as needed                               │
│  3. Update progress percentage periodically                          │
│  4. Save checkpoints every 60 seconds (for tasks > 2 min)           │
│  5. Accumulate token usage metrics                                   │
│  6. Handle SIGTERM → Save checkpoint, exit FAILURE (1)              │
│  7. Handle Vertex AI errors with retry logic                         │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ PHASE 5A: SUCCESS           │   │ PHASE 5B: FAILURE           │
├─────────────────────────────┤   ├─────────────────────────────┤
│ 1. Store result in task doc │   │ 1. Determine if retryable   │
│ 2. Update status: COMPLETED │   │ 2. If retryable:            │
│ 3. Record completedAt       │   │    - Leave status PROCESSING│
│ 4. Record token usage       │   │    - Save checkpoint        │
│ 5. Record processing time   │   │    - Exit FAILURE (1)       │
│ 6. Clear checkpoint data    │   │ 3. If not retryable:        │
│ 7. Log completion           │   │    - Update status: FAILED  │
│ 8. Exit SUCCESS (0)         │   │    - Record error details   │
│                             │   │    - Exit SUCCESS (0)       │
└─────────────────────────────┘   └─────────────────────────────┘
```

### 2.3 Exit Code Semantics

| Exit Code   | Meaning                                       | Pub/Sub Behavior     |
| ----------- | --------------------------------------------- | -------------------- |
| 0 (Success) | Task processed (success or permanent failure) | Message acknowledged |
| 1 (Failure) | Transient failure, should retry               | Message redelivered  |

**Critical Design Decision:** Exit code 0 means "don't retry this message" regardless of task outcome. Use exit code 1 only for transient failures that should be retried.

### 2.4 Idempotency Handling

| Scenario                              | Detection                     | Action                                 |
| ------------------------------------- | ----------------------------- | -------------------------------------- |
| Task not found                        | Firestore lookup returns null | Exit 0 (no retry)                      |
| Task already completed                | Status is COMPLETED           | Exit 0 (no retry)                      |
| Task already failed                   | Status is FAILED              | Exit 0 (no retry)                      |
| Task cancelled                        | Status is CANCELLED           | Exit 0 (no retry)                      |
| Task processing (same execution)      | executionId matches           | Continue processing                    |
| Task processing (different execution) | executionId differs           | Check timestamp, potentially take over |

---

## 3. Task Type Specifications

### 3.1 TEXT_GENERATION

**Purpose:** Generate long-form text content exceeding sync timeout limits

**Input Payload Schema:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| prompt | string | Yes | Max 100,000 chars | Generation prompt |
| systemContext | string | No | Max 10,000 chars | System instructions |
| model | string | No | Valid model ID | Model override |
| parameters | object | No | See below | Generation params |
| maxOutputTokens | number | No | 1 - 32,768 | Output limit |

**Parameters Object:**
| Field | Type | Default | Range |
|-------|------|---------|-------|
| temperature | number | 0.7 | 0.0 - 2.0 |
| topP | number | 0.95 | 0.0 - 1.0 |
| topK | number | 40 | 1 - 100 |

**Output Result Schema:**
| Field | Type | Description |
|-------|------|-------------|
| content | string | Generated text |
| finishReason | string | STOP, MAX_TOKENS, SAFETY |
| tokenUsage.input | number | Input tokens consumed |
| tokenUsage.output | number | Output tokens generated |

**Processing Notes:**

- No checkpointing needed (single API call)
- Retry on transient Vertex AI errors
- Fail permanently on safety blocks

### 3.2 SUMMARIZATION

**Purpose:** Summarize long documents or multiple documents

**Input Payload Schema:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| content | string | Yes* | Max 500,000 chars | Text to summarize |
| contentRef | string | Yes* | Valid doc path | Firestore reference |
| summaryType | string | No | Enum | `brief`, `detailed`, `bullets` |
| maxLength | number | No | 100 - 10,000 | Target word count |
| language | string | No | ISO code | Output language |

\*One of `content` or `contentRef` required

**Output Result Schema:**
| Field | Type | Description |
|-------|------|-------------|
| summary | string | Generated summary |
| summaryType | string | Type used |
| originalLength | number | Original char count |
| summaryLength | number | Summary char count |
| compressionRatio | number | Reduction ratio |

**Processing Notes:**

- Large documents may require chunking
- Checkpoint after each chunk processed
- Combine chunk summaries at end

### 3.3 BATCH_EMBEDDING

**Purpose:** Generate embeddings for multiple text items

**Input Payload Schema:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| items | array | Yes | 1 - 1,000 items | Items to embed |
| items[].id | string | Yes | Unique | Item identifier |
| items[].text | string | Yes | Max 10,000 chars | Text to embed |
| model | string | No | Valid model | Model override |
| batchSize | number | No | 1 - 100 | API batch size |

**Output Result Schema:**
| Field | Type | Description |
|-------|------|-------------|
| embeddings | array | Embedding results |
| embeddings[].id | string | Item identifier |
| embeddings[].vector | number[] | Embedding vector |
| embeddings[].error | string | Error if failed |
| dimensions | number | Vector dimensions |
| successCount | number | Items succeeded |
| failureCount | number | Items failed |

**Processing Notes:**

- Process in batches (default: 50 items)
- Checkpoint after each batch
- Continue on individual item failures
- Resume from last successful batch

### 3.4 DOCUMENT_QA

**Purpose:** Answer questions about provided documents

**Input Payload Schema:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| question | string | Yes | Max 1,000 chars | Question to answer |
| documents | array | Yes* | 1 - 10 docs | Document contents |
| documents[].id | string | Yes | Unique | Document identifier |
| documents[].content | string | Yes | Max 100,000 chars | Document text |
| documentRefs | array | Yes* | 1 - 10 refs | Firestore references |
| includeReferences | boolean | No | - | Include source quotes |
| maxReferences | number | No | 1 - 10 | Max quotes to include |

\*One of `documents` or `documentRefs` required

**Output Result Schema:**
| Field | Type | Description |
|-------|------|-------------|
| answer | string | Generated answer |
| confidence | number | Confidence score (0-1) |
| references | array | Source references |
| references[].documentId | string | Source document |
| references[].quote | string | Relevant quote |
| references[].relevance | number | Relevance score |
| documentsUsed | number | Documents referenced |

**Processing Notes:**

- Load documents from refs if provided
- May require multiple Vertex AI calls
- Checkpoint after document loading phase

### 3.5 BATCH_CLASSIFICATION

**Purpose:** Classify multiple text items into categories

**Input Payload Schema:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| items | array | Yes | 1 - 500 items | Items to classify |
| items[].id | string | Yes | Unique | Item identifier |
| items[].text | string | Yes | Max 10,000 chars | Text to classify |
| categories | array | Yes | 2 - 50 | Category definitions |
| categories[].id | string | Yes | Unique | Category identifier |
| categories[].label | string | Yes | Max 100 chars | Category label |
| categories[].description | string | No | Max 500 chars | Category description |
| multiLabel | boolean | No | - | Allow multiple labels |
| minConfidence | number | No | 0.0 - 1.0 | Minimum confidence |

**Output Result Schema:**
| Field | Type | Description |
|-------|------|-------------|
| classifications | array | Classification results |
| classifications[].id | string | Item identifier |
| classifications[].labels | array | Assigned labels |
| classifications[].labels[].categoryId | string | Category ID |
| classifications[].labels[].confidence | number | Confidence score |
| classifications[].error | string | Error if failed |
| successCount | number | Items succeeded |
| failureCount | number | Items failed |

**Processing Notes:**

- Process in batches (default: 25 items)
- Checkpoint after each batch
- Include category descriptions in prompt
- Resume from last successful batch

### 3.6 MULTI_STEP_PIPELINE

**Purpose:** Execute a sequence of dependent AI operations

**Input Payload Schema:**
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| steps | array | Yes | 2 - 10 steps | Pipeline steps |
| steps[].id | string | Yes | Unique | Step identifier |
| steps[].type | string | Yes | Valid task type | Step operation type |
| steps[].config | object | Yes | Type-specific | Step configuration |
| steps[].inputMapping | object | No | - | Map previous outputs |
| initialInput | object | Yes | - | Input for first step |
| stopOnFailure | boolean | No | Default: true | Stop if step fails |

**Step Configuration:**
Each step's `config` follows the payload schema for that task type.

**Input Mapping:**

```json
{
  "inputMapping": {
    "content": "$.steps.step1.result.content",
    "metadata": "$.initialInput.metadata"
  }
}
```

**Output Result Schema:**
| Field | Type | Description |
|-------|------|-------------|
| finalOutput | object | Last step's output |
| stepResults | array | All step results |
| stepResults[].stepId | string | Step identifier |
| stepResults[].status | string | COMPLETED, FAILED, SKIPPED |
| stepResults[].result | object | Step output |
| stepResults[].error | string | Error if failed |
| stepResults[].durationMs | number | Step duration |
| completedSteps | number | Steps completed |
| totalSteps | number | Total steps |
| totalDurationMs | number | Total duration |

**Processing Notes:**

- Execute steps sequentially
- Checkpoint after each step
- Map outputs to next step inputs
- Resume from last completed step
- Support conditional step execution

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric          | Requirement  |
| --------------- | ------------ |
| Startup time    | < 10 seconds |
| Message parsing | < 100ms      |
| Firestore read  | < 500ms      |
| Firestore write | < 500ms      |
| Checkpoint save | < 1 second   |
| Shutdown grace  | < 10 seconds |

### 4.2 Reliability

| Aspect            | Requirement                                 |
| ----------------- | ------------------------------------------- |
| Idempotency       | Must handle duplicate messages safely       |
| Crash recovery    | Resume from checkpoint on restart           |
| Timeout awareness | Save state before Cloud Run kills process   |
| Error isolation   | Single task failure doesn't affect queue    |
| Data consistency  | Firestore transactions for critical updates |

### 4.3 Resource Efficiency

| Aspect               | Specification                         |
| -------------------- | ------------------------------------- |
| Memory usage         | Stay within 1Gi limit                 |
| CPU usage            | Efficient batch processing            |
| API calls            | Minimize Vertex AI calls via batching |
| Firestore operations | Batch writes where possible           |

### 4.4 Security

| Aspect         | Requirement                                     |
| -------------- | ----------------------------------------------- |
| Authentication | Service account only (no user creds in process) |
| Authorization  | Verify task ownership before processing         |
| Data handling  | No PII in logs                                  |
| Secrets        | Load from Secret Manager, never log             |
| Network        | All traffic via VPC (Private Google Access)     |

---

## 5. Integration Points

### 5.1 Inbound Integrations

#### 5.1.1 Pub/Sub via Eventarc (Trigger)

| Aspect             | Specification                          |
| ------------------ | -------------------------------------- |
| **Topic**          | `rates-{env}-ai-tasks`                 |
| **Trigger Type**   | Eventarc Pub/Sub trigger               |
| **Delivery**       | At-least-once (must handle duplicates) |
| **Message Access** | Via Cloud Run Job environment          |

**Message Reception:**
Cloud Run Jobs receive Pub/Sub messages via Eventarc. The message data is available through:

- Environment variables set by Eventarc
- Or via the Cloud Run Jobs execution environment

**Expected Message Structure:**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "BATCH_EMBEDDING",
  "userId": "firebase-uid-123",
  "payload": {
    "items": [...],
    "model": "text-embedding-005"
  },
  "priority": "normal",
  "createdAt": "2026-01-15T10:30:00Z",
  "attemptNumber": 1
}
```

#### 5.1.2 Environment Variables (Configuration)

| Variable                      | Description            | Source           |
| ----------------------------- | ---------------------- | ---------------- |
| `CLOUD_RUN_JOB`               | Job name               | Cloud Run (auto) |
| `CLOUD_RUN_EXECUTION`         | Execution ID           | Cloud Run (auto) |
| `CLOUD_RUN_TASK_INDEX`        | Task index             | Cloud Run (auto) |
| `CLOUD_RUN_TASK_COUNT`        | Task count             | Cloud Run (auto) |
| `CLOUD_RUN_TASK_ATTEMPT`      | Attempt number         | Cloud Run (auto) |
| `ENV`                         | Environment (dev/prod) | Terraform        |
| `GCP_PROJECT_ID`              | Project ID             | Terraform        |
| `VERTEX_AI_LOCATION`          | Vertex AI region       | Terraform        |
| `FIRESTORE_COLLECTION_PREFIX` | Collection prefix      | Terraform        |
| `CHECKPOINT_INTERVAL_MS`      | Checkpoint frequency   | Terraform        |

#### 5.1.3 Secret Manager (Secrets)

| Secret                         | Purpose                 |
| ------------------------------ | ----------------------- |
| `rates-{env}-vertex-ai-config` | Vertex AI configuration |

### 5.2 Outbound Integrations

#### 5.2.1 Vertex AI (AI Operations)

| Aspect             | Specification                   |
| ------------------ | ------------------------------- |
| **Protocol**       | gRPC / HTTPS                    |
| **Authentication** | Application Default Credentials |
| **Network**        | Private Google Access via VPC   |
| **Timeout**        | 300 seconds per call            |

**Operations Used:**
| Operation | Method | Use Case |
|-----------|--------|----------|
| Text Generation | `generateContent` | TEXT_GENERATION, SUMMARIZATION, DOCUMENT_QA, BATCH_CLASSIFICATION |
| Embeddings | `embedContent` | BATCH_EMBEDDING |

**Retry Configuration:**
| Parameter | Value |
|-----------|-------|
| Max retries | 3 |
| Initial delay | 1 second |
| Max delay | 30 seconds |
| Backoff multiplier | 2 |
| Retryable errors | UNAVAILABLE, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED |

#### 5.2.2 Firestore (State & Results)

| Aspect             | Specification                   |
| ------------------ | ------------------------------- |
| **Protocol**       | gRPC                            |
| **Authentication** | Application Default Credentials |
| **Network**        | Private Google Access via VPC   |

**Collections Accessed:**
| Collection | Operations | Purpose |
|------------|------------|---------|
| `{env}_ai_tasks` | Read, Update | Task state management |
| `{env}_ai_usage` | Update | Usage metrics |

**Task Document Fields Updated:**
| Field | When Updated | Description |
|-------|--------------|-------------|
| `status` | Start, Complete, Fail | Current status |
| `processingStartedAt` | Start | Processing begin time |
| `executionId` | Start | Cloud Run execution ID |
| `progress` | Periodically | Progress percentage |
| `checkpointData` | Periodically | Resume state |
| `result` | Success | Task output |
| `error` | Failure | Error details |
| `completedAt` | Success | Completion time |
| `failedAt` | Failure | Failure time |
| `tokenUsage` | Complete | Token consumption |
| `processingDurationMs` | Complete | Total processing time |

#### 5.2.3 Cloud Logging (Observability)

| Aspect          | Specification                           |
| --------------- | --------------------------------------- |
| **Protocol**    | Automatic (Cloud Run integration)       |
| **Format**      | Structured JSON to stdout               |
| **Correlation** | Include taskId, executionId in all logs |

---

## 6. Runtime Environment

### 6.1 Execution Platform

| Aspect            | Specification              |
| ----------------- | -------------------------- |
| **Platform**      | Google Cloud Run Jobs      |
| **Trigger**       | Eventarc (Pub/Sub)         |
| **Region**        | us-central1                |
| **VPC Connector** | `rates-{env}-ai-connector` |
| **VPC Egress**    | All traffic                |

### 6.2 Resource Allocation

| Resource    | Dev            | Prod           |
| ----------- | -------------- | -------------- |
| CPU         | 1 vCPU         | 1 vCPU         |
| Memory      | 1 Gi           | 1 Gi           |
| Timeout     | 1800s (30 min) | 3600s (60 min) |
| Max Retries | 3              | 3              |
| Parallelism | 1              | 1              |
| Task Count  | 1              | 1              |

### 6.3 Runtime Requirements

| Requirement       | Specification                       |
| ----------------- | ----------------------------------- |
| **Language**      | TypeScript (compiled to JavaScript) |
| **Runtime**       | Node.js 20.x LTS                    |
| **Module System** | ESM (ES Modules)                    |
| **Entry Point**   | Single main function                |

### 6.4 Framework Requirements

| Capability            | Requirement         | Rationale                   |
| --------------------- | ------------------- | --------------------------- |
| **No HTTP Server**    | CLI-style execution | Job, not service            |
| **No Web Framework**  | Plain Node.js       | No routing needed           |
| **Schema Validation** | Zod                 | Validate message payloads   |
| **Async/Await**       | Full support        | All operations are async    |
| **Graceful Shutdown** | SIGTERM handling    | Save checkpoint before exit |

---

## 7. Application Structure

### 7.1 Directory Structure

```
apps/ai-processor/
├── src/
│   ├── index.ts                      # Entry point
│   ├── processor.ts                  # Main orchestration
│   │
│   ├── handlers/
│   │   ├── index.ts                  # Handler registry
│   │   ├── base.handler.ts           # Abstract base handler
│   │   ├── text-generation.handler.ts
│   │   ├── summarization.handler.ts
│   │   ├── batch-embedding.handler.ts
│   │   ├── document-qa.handler.ts
│   │   ├── batch-classification.handler.ts
│   │   └── multi-step-pipeline.handler.ts
│   │
│   ├── services/
│   │   ├── vertex-ai.service.ts      # Vertex AI client wrapper
│   │   ├── firestore.service.ts      # Firestore operations
│   │   ├── checkpoint.service.ts     # Checkpoint management
│   │   └── secret.service.ts         # Secret Manager access
│   │
│   ├── repositories/
│   │   ├── task.repository.ts        # Task document operations
│   │   └── usage.repository.ts       # Usage tracking
│   │
│   ├── schemas/
│   │   ├── message.schema.ts         # Pub/Sub message schema
│   │   ├── task.schema.ts            # Task payload schemas
│   │   └── result.schema.ts          # Result schemas
│   │
│   ├── config/
│   │   ├── index.ts                  # Configuration loader
│   │   └── models.config.ts          # Model configurations
│   │
│   ├── utils/
│   │   ├── logger.ts                 # Structured logging
│   │   ├── errors.ts                 # Custom error classes
│   │   ├── retry.ts                  # Retry utilities
│   │   └── shutdown.ts               # Graceful shutdown
│   │
│   └── types/
│       ├── task.types.ts             # Task type definitions
│       ├── handler.types.ts          # Handler interfaces
│       └── vertex-ai.types.ts        # Vertex AI types
│
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### 7.2 Key Component Responsibilities

| Component         | Responsibility                                        |
| ----------------- | ----------------------------------------------------- |
| **index.ts**      | Entry point, initialization, top-level error handling |
| **processor.ts**  | Orchestrates validation, handler selection, execution |
| **handlers/**     | Task-type-specific processing logic                   |
| **services/**     | External service clients (Vertex AI, Firestore)       |
| **repositories/** | Data access layer for Firestore                       |
| **schemas/**      | Zod schemas for validation                            |
| **config/**       | Environment configuration                             |
| **utils/**        | Shared utilities                                      |

### 7.3 Handler Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Handler Architecture                          │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   BaseHandler       │
                    │   (Abstract)        │
                    ├─────────────────────┤
                    │ + process()         │
                    │ + checkpoint()      │
                    │ + updateProgress()  │
                    │ # vertexAI          │
                    │ # firestore         │
                    └──────────┬──────────┘
                               │
       ┌───────────┬───────────┼───────────┬───────────┐
       │           │           │           │           │
       ▼           ▼           ▼           ▼           ▼
┌───────────┐┌───────────┐┌───────────┐┌───────────┐┌───────────┐
│TextGen    ││Summarize  ││BatchEmbed ││DocQA      ││BatchClass │
│Handler    ││Handler    ││Handler    ││Handler    ││Handler    │
└───────────┘└───────────┘└───────────┘└───────────┘└───────────┘
```

**BaseHandler Interface:**

```typescript
abstract class BaseHandler<TPayload, TResult> {
  abstract validate(payload: unknown): TPayload;
  abstract process(
    payload: TPayload,
    checkpoint?: CheckpointData
  ): Promise<TResult>;

  protected async saveCheckpoint(data: CheckpointData): Promise<void>;
  protected async updateProgress(percent: number): Promise<void>;
  protected async callVertexAI(request: VertexRequest): Promise<VertexResponse>;
}
```

---

## 8. Processing Logic

### 8.1 Main Entry Point

```
┌─────────────────────────────────────────────────────────────────────┐
│                         index.ts Flow                                │
└─────────────────────────────────────────────────────────────────────┘

1. Setup
   ├── Configure structured logging
   ├── Register SIGTERM handler
   └── Load environment variables

2. Initialize
   ├── Load secrets from Secret Manager
   ├── Initialize Firestore client
   ├── Initialize Vertex AI client
   └── Create Processor instance

3. Execute
   ├── Call processor.run()
   ├── Await completion
   └── Handle any unhandled errors

4. Exit
   ├── Log final status
   ├── Flush logs
   └── Exit with appropriate code (0 or 1)
```

### 8.2 Processor Orchestration

```
┌─────────────────────────────────────────────────────────────────────┐
│                       processor.ts Flow                              │
└─────────────────────────────────────────────────────────────────────┘

async run(): Promise<void> {

  1. Parse Message
     ├── Get message from environment/input
     ├── Decode base64 if needed
     ├── Parse JSON
     └── Validate against schema

  2. Load Task
     ├── Fetch task from Firestore by taskId
     ├── If not found → return (exit 0)
     ├── If already terminal state → return (exit 0)
     └── Verify userId matches

  3. Acquire Processing
     ├── Check current status
     ├── If PROCESSING by different execution → handle conflict
     ├── Update status to PROCESSING
     └── Record executionId, startTime

  4. Select Handler
     ├── Get handler for task.type
     ├── If no handler → throw PermanentError
     └── Initialize handler with services

  5. Load Checkpoint (if exists)
     ├── Check task.checkpointData
     └── Pass to handler if present

  6. Execute Handler
     ├── try: result = await handler.process(payload, checkpoint)
     ├── catch PermanentError → markFailed, return
     ├── catch TransientError → throw (exit 1)
     └── catch Unknown → determine type, handle appropriately

  7. Store Result
     ├── Update task with result
     ├── Set status = COMPLETED
     ├── Record completedAt, tokenUsage, duration
     └── Clear checkpointData

  8. Update Usage
     └── Increment user's usage counters
}
```

### 8.3 Checkpoint Strategy

**When to Checkpoint:**
| Task Type | Checkpoint Trigger |
|-----------|-------------------|
| TEXT_GENERATION | Not needed (single call) |
| SUMMARIZATION | After each document chunk |
| BATCH_EMBEDDING | After each batch of 50 |
| DOCUMENT_QA | After document loading phase |
| BATCH_CLASSIFICATION | After each batch of 25 |
| MULTI_STEP_PIPELINE | After each completed step |

**Checkpoint Data Structure:**

```typescript
interface CheckpointData {
  version: number; // Schema version
  savedAt: string; // ISO timestamp
  handlerState: {
    // Handler-specific state
    processedCount?: number;
    lastProcessedId?: string;
    intermediateResults?: any[];
    currentStep?: number;
  };
}
```

**Checkpoint Interval:**

- Time-based: Every 60 seconds
- Progress-based: After significant progress (e.g., batch completion)
- Always: Before responding to SIGTERM

### 8.4 Graceful Shutdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SIGTERM Handling                                 │
└─────────────────────────────────────────────────────────────────────┘

On SIGTERM:
  1. Set shutdownRequested = true
  2. Log "Shutdown signal received"
  3. Wait for current Vertex AI call to complete (max 30s)
  4. Save checkpoint with current state
  5. Update task progress in Firestore
  6. Log "Checkpoint saved, exiting"
  7. Exit with code 1 (triggers retry)

Handler Cooperation:
  - Handlers check shutdownRequested between operations
  - Handlers save checkpoint before throwing ShutdownError
  - ShutdownError triggers exit code 1
```

---

## 9. Error Handling

### 9.1 Error Classification

| Error Type     | Class             | Behavior                          | Exit Code |
| -------------- | ----------------- | --------------------------------- | --------- |
| **Permanent**  | `PermanentError`  | Mark task FAILED, don't retry     | 0         |
| **Transient**  | `TransientError`  | Preserve state, retry via Pub/Sub | 1         |
| **Shutdown**   | `ShutdownError`   | Save checkpoint, exit for retry   | 1         |
| **Validation** | `ValidationError` | Mark task FAILED (bad input)      | 0         |

### 9.2 Error Mapping

| Source    | Error Condition         | Classification                 |
| --------- | ----------------------- | ------------------------------ |
| Message   | Invalid JSON            | Permanent (log, exit 0)        |
| Message   | Missing required fields | Permanent                      |
| Firestore | Task not found          | Permanent (exit 0, no failure) |
| Firestore | Permission denied       | Permanent                      |
| Firestore | Temporary unavailable   | Transient                      |
| Vertex AI | Invalid request         | Permanent                      |
| Vertex AI | Safety block            | Permanent                      |
| Vertex AI | Quota exceeded          | Transient                      |
| Vertex AI | Timeout                 | Transient                      |
| Vertex AI | Service unavailable     | Transient                      |
| System    | SIGTERM received        | Shutdown                       |
| System    | Out of memory           | Transient (Cloud Run restarts) |

### 9.3 Retry Budget

| Level               | Max Retries | Scope                                    |
| ------------------- | ----------- | ---------------------------------------- |
| Vertex AI call      | 3           | Per API call                             |
| Firestore operation | 3           | Per operation                            |
| Task processing     | 3           | Via Pub/Sub (configured in subscription) |
| Total attempts      | 5           | Before DLQ                               |

### 9.4 Error Recording

**Error Document Structure (in task.error):**

```json
{
  "code": "VERTEX_AI_SAFETY_BLOCK",
  "message": "Content was blocked by safety filters",
  "category": "permanent",
  "timestamp": "2026-01-15T10:35:00Z",
  "attemptNumber": 1,
  "details": {
    "safetyRatings": [...],
    "blockedCategories": ["HARM_CATEGORY_DANGEROUS"]
  }
}
```

---

## 10. Observability

### 10.1 Structured Logging

**Log Entry Format:**

```json
{
  "severity": "INFO",
  "message": "Task processing completed",
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "executionId": "ai-processor-abc123",
  "taskType": "BATCH_EMBEDDING",
  "userId": "user_xxx",
  "durationMs": 45000,
  "itemsProcessed": 500,
  "tokenUsage": {
    "input": 25000,
    "output": 0
  },
  "checkpointsCreated": 10,
  "labels": {
    "service": "ai-processor",
    "env": "prod"
  }
}
```

### 10.2 Required Log Events

| Event                | Severity | When                | Key Fields                      |
| -------------------- | -------- | ------------------- | ------------------------------- |
| `job_started`        | INFO     | Execution begins    | executionId, attemptNumber      |
| `message_parsed`     | DEBUG    | Message validated   | taskId, taskType                |
| `task_loaded`        | DEBUG    | Task from Firestore | taskId, currentStatus           |
| `task_skipped`       | INFO     | Already processed   | taskId, reason                  |
| `processing_started` | INFO     | Handler begins      | taskId, taskType                |
| `checkpoint_saved`   | DEBUG    | Checkpoint written  | taskId, progress                |
| `progress_updated`   | DEBUG    | Progress changed    | taskId, progressPercent         |
| `vertex_ai_request`  | DEBUG    | API call made       | model, tokenEstimate            |
| `vertex_ai_response` | DEBUG    | API response        | latencyMs, tokenUsage           |
| `vertex_ai_error`    | WARNING  | API error           | errorCode, retryable            |
| `task_completed`     | INFO     | Success             | taskId, durationMs, tokenUsage  |
| `task_failed`        | ERROR    | Permanent failure   | taskId, errorCode, errorMessage |
| `shutdown_requested` | WARNING  | SIGTERM received    | taskId, progress                |
| `job_finished`       | INFO     | Execution ends      | exitCode, totalDurationMs       |

### 10.3 Metrics (via Logs)

Since Cloud Monitoring is not used, extract metrics from structured logs:

| Metric               | Log Field                              | Aggregation |
| -------------------- | -------------------------------------- | ----------- |
| Tasks processed      | `event=task_completed`                 | Count       |
| Tasks failed         | `event=task_failed`                    | Count       |
| Processing duration  | `durationMs`                           | Histogram   |
| Token usage          | `tokenUsage.input + tokenUsage.output` | Sum         |
| Retry rate           | `attemptNumber > 1`                    | Percentage  |
| Checkpoint frequency | `event=checkpoint_saved`               | Count       |

### 10.4 Sensitive Data Handling

**Never Log:**

- Full prompt/content text
- User personal information
- API keys or secrets
- Full Vertex AI responses
- Embedding vectors

**Safe to Log:**

- Task IDs and types
- User IDs (Firebase UID)
- Token counts
- Progress percentages
- Error codes and types
- Processing durations
- Item counts (for batch operations)

---

## 11. Testing Strategy

### 11.1 Unit Tests

| Component | Coverage Target | Focus Areas                           |
| --------- | --------------- | ------------------------------------- |
| Handlers  | 85%             | Processing logic, checkpoint/resume   |
| Services  | 80%             | Vertex AI calls, Firestore operations |
| Processor | 90%             | Orchestration, error handling         |
| Schemas   | 95%             | Validation edge cases                 |
| Utils     | 95%             | Retry logic, error classification     |

### 11.2 Integration Tests

| Test Suite           | Dependencies                        | Focus                |
| -------------------- | ----------------------------------- | -------------------- |
| Firestore Operations | Firebase Emulator                   | CRUD, transactions   |
| End-to-End Handler   | Firestore Emulator + Vertex AI Mock | Full processing flow |
| Checkpoint/Resume    | Firestore Emulator                  | State persistence    |

### 11.3 Test Scenarios

| Scenario                  | Setup                           | Expected Outcome          |
| ------------------------- | ------------------------------- | ------------------------- |
| Happy path                | Valid message, task exists      | COMPLETED, result stored  |
| Task not found            | Invalid taskId                  | Exit 0, no error          |
| Already completed         | Task status=COMPLETED           | Exit 0, no changes        |
| Validation failure        | Invalid payload                 | FAILED, validation error  |
| Vertex AI transient error | Mock 503 response               | Retry, eventually succeed |
| Vertex AI permanent error | Mock safety block               | FAILED, error recorded    |
| Checkpoint resume         | Task with checkpoint data       | Resume from checkpoint    |
| SIGTERM during processing | Send signal mid-process         | Checkpoint saved, exit 1  |
| Duplicate message         | Same taskId, already processing | Handled idempotently      |

### 11.4 Local Testing

```bash
# Run with test message
ENV=dev \
GCP_PROJECT_ID=rates-production \
FIRESTORE_COLLECTION_PREFIX=dev_ \
VERTEX_AI_LOCATION=us-central1 \
TEST_MESSAGE='{"taskId":"test-123","type":"TEXT_GENERATION",...}' \
node dist/index.js
```

---

## 12. Deployment

### 12.1 Container Image

| Aspect       | Specification                           |
| ------------ | --------------------------------------- |
| Base Image   | `node:20-alpine`                        |
| Build        | Multi-stage (build → runtime)           |
| Registry     | `rates-{env}-containers/ai-processor`   |
| Tag Strategy | `latest` (dev), semantic version (prod) |

### 12.2 Dockerfile Structure

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
USER appuser
CMD ["node", "dist/index.js"]
```

### 12.3 Deployment Process

1. Build TypeScript → JavaScript
2. Build Docker image
3. Push to Artifact Registry
4. Terraform updates Cloud Run Job configuration
5. Eventarc trigger connects Pub/Sub to Job

---

## 13. Success Criteria

### 13.1 Functional Success

- [ ] Receives and parses Pub/Sub messages correctly
- [ ] Processes all defined task types
- [ ] Updates task status accurately in Firestore
- [ ] Stores results for successful tasks
- [ ] Records errors for failed tasks
- [ ] Handles duplicate messages idempotently
- [ ] Saves and resumes from checkpoints
- [ ] Responds to SIGTERM gracefully

### 13.2 Reliability Success

- [ ] Transient errors trigger retries
- [ ] Permanent errors don't retry
- [ ] Checkpoints enable resume after restart
- [ ] No data loss on unexpected termination
- [ ] DLQ receives only unprocessable messages

### 13.3 Operational Success

- [ ] Structured logs in Cloud Logging
- [ ] All log events include taskId and executionId
- [ ] No sensitive data in logs
- [ ] Processing completes within timeout limits
- [ ] Memory usage stays within limits

---

## 14. Out of Scope

| Item                             | Responsible Component    |
| -------------------------------- | ------------------------ |
| HTTP API                         | AI Service               |
| User authentication              | AI Service / Main App    |
| Rate limiting                    | AI Service               |
| Task creation                    | AI Service               |
| Result retrieval API             | AI Service               |
| Real-time progress notifications | Future enhancement       |
| Scheduled/delayed tasks          | Cloud Scheduler (future) |
| Priority queue processing        | Future enhancement       |
| Parallel task execution          | Future enhancement       |

---

**Document End**

_This specification defines the AI Processor application independently. Implementation should follow this document for application behavior and the parent Technical Implementation Guide for infrastructure and integration details._
