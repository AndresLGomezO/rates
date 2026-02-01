# AI Processor

Asynchronous AI task processor for the Rates application. Handles long-running AI operations triggered via Pub/Sub.

## Architecture

- **Framework**: Node.js with TypeScript
- **AI Provider**: Google Vertex AI (via `@rates/vertex-ai-client`)
- **Trigger**: Cloud Pub/Sub push subscription
- **Deployment**: Cloud Run Job
- **Execution**: One-shot job per Pub/Sub message

## Environment Variables

### Required (Cloud Run Job)

| Variable                      | Description                      | Example            |
| ----------------------------- | -------------------------------- | ------------------ |
| `GCP_PROJECT_ID`              | GCP Project ID                   | `rates-production` |
| `VERTEX_AI_LOCATION`          | Vertex AI region                 | `us-central1`      |
| `FIRESTORE_COLLECTION_PREFIX` | Environment prefix for Firestore | `dev` or `prod`    |
| `ENV`                         | Environment name                 | `dev` or `prod`    |

### Local Development Only

| Variable                      | Description            | Example          |
| ----------------------------- | ---------------------- | ---------------- |
| `FIREBASE_AUTH_EMULATOR_HOST` | Firebase Auth emulator | `localhost:9099` |
| `FIRESTORE_EMULATOR_HOST`     | Firestore emulator     | `localhost:8080` |

> **Note**: Emulator variables should NEVER be set in Cloud Run. They are for local development only.

## Local Development

### Prerequisites

- Node.js 20+
- pnpm
- Firebase Emulators running

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start Firebase emulators (from project root):

   ```bash
   cd firebase
   firebase emulators:start
   ```

3. Run the processor with a test message:
   ```bash
   MESSAGE_JSON='{"taskId":"test-123","type":"DOCUMENT_ANALYSIS","userId":"user-123","data":{}}' pnpm dev
   ```

### Testing Locally

The processor expects a Pub/Sub message in one of these formats:

**Via MESSAGE_JSON** (recommended for local testing):

```bash
MESSAGE_JSON='{"taskId":"test-123","type":"DOCUMENT_ANALYSIS","userId":"user-123","data":{}}' pnpm dev
```

**Via MESSAGE_DATA** (base64-encoded):

```bash
MESSAGE_DATA='eyJ0YXNrSWQiOiJ0ZXN0LTEyMyIsInR5cGUiOiJET0NVTUVOVF9BTkFMWVNJUyJ9' pnpm dev
```

## Deployment

### Build and Push

```bash
# Development
./infra/build-and-push.sh dev

# Production
./infra/build-and-push.sh prod
```

### Deploy

```bash
# Development
./infra/build-and-push.sh dev --deploy

# Production
./infra/build-and-push.sh prod --deploy
```

### Environment Configuration

Environment variables are configured in Terraform:

- **Dev**: `infra/environments/application/dev/ai-services.tf`
- **Prod**: `infra/environments/application/prod/ai-services.tf`

Changes to environment variables require:

1. Update Terraform configuration
2. Run `terraform apply`
3. Rebuild and redeploy the job

## Task Types

### `DOCUMENT_ANALYSIS`

Analyze uploaded documents and extract insights.

### `BATCH_EMBEDDING`

Generate embeddings for multiple text items.

### `REPORT_GENERATION`

Generate comprehensive financial reports.

## Message Schema

```typescript
interface AIMessage {
  taskId: string; // Unique task identifier
  type: TaskType; // Task type (see above)
  userId: string; // User ID for tracking
  data: Record<string, any>; // Task-specific data
  priority?: number; // Optional priority (1-10)
}
```

## Execution Flow

1. **Pub/Sub Trigger**: Message published to `rates-{env}-ai-tasks` topic
2. **Job Execution**: Cloud Run Job starts with message data
3. **Processing**: Task handler processes the request
4. **Vertex AI**: Calls Vertex AI APIs as needed
5. **Firestore Update**: Updates task status and results
6. **Exit**: Job exits with code 0 (success) or 1 (retry)

## Error Handling

- **Transient Errors**: Job exits with code 1, Pub/Sub retries
- **Permanent Errors**: Job exits with code 0, task marked as failed
- **Max Retries**: 3 attempts before moving to dead letter queue
- **Dead Letter Queue**: `rates-{env}-ai-dlq` topic

## Monitoring

### View Job Executions

```bash
gcloud run jobs executions list \
  --job=rates-dev-ai-processor \
  --region=us-central1
```

### View Logs

```bash
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=rates-dev-ai-processor" --limit 50
```

### Check Dead Letter Queue

```bash
gcloud pubsub subscriptions pull rates-dev-ai-dlq-sub --limit=10
```

## Troubleshooting

### Job Not Triggering

- Verify Pub/Sub subscription is active
- Check service account has `roles/run.invoker` permission
- Ensure push endpoint URL is correct

### Job Failing Immediately

- Check environment variables are set correctly
- Verify Firestore emulator is running (local)
- Review job logs for specific error messages

### Vertex AI Errors

- In production: Ensure Vertex AI API is enabled
- In local: Check `GCP_PROJECT_ID=demo-project` for mocked responses
- Verify service account has Vertex AI permissions

## Performance

- **Timeout**: 30 minutes (dev), 1 hour (prod)
- **Memory**: 1 GiB
- **CPU**: 1 vCPU
- **Concurrency**: 1 task per job execution
- **Max Retries**: 3 attempts

## Security

- **Service Account**: Runs with dedicated service account
- **VPC Access**: Connected to AI VPC for secure communication
- **Secrets**: Vertex AI config accessed via Secret Manager
- **Authentication**: Pub/Sub uses OIDC tokens for job invocation
