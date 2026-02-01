# AI Service

Internal API gateway for AI operations in the Rates application. Provides endpoints for text generation, embeddings, and AI-powered features.

## Architecture

- **Framework**: Fastify with TypeScript
- **AI Provider**: Google Vertex AI (via `@rates/vertex-ai-client`)
- **Authentication**: Firebase ID tokens
- **Rate Limiting**: In-memory with Firestore tracking
- **Caching**: Response caching for identical prompts
- **Deployment**: Cloud Run (internal ingress only)

## Environment Variables

### Required (Cloud Run)

| Variable                      | Description                         | Example                          |
| ----------------------------- | ----------------------------------- | -------------------------------- |
| `GCP_PROJECT_ID`              | GCP Project ID                      | `rates-production`               |
| `VERTEX_AI_LOCATION`          | Vertex AI region                    | `us-central1`                    |
| `FIRESTORE_COLLECTION_PREFIX` | Environment prefix for Firestore    | `dev` or `prod`                  |
| `ENV`                         | Environment name                    | `dev` or `prod`                  |
| `LOG_LEVEL`                   | Logging level                       | `info`, `debug`, `warn`, `error` |
| `PORT`                        | Server port (provided by Cloud Run) | `8080`                           |

### Optional (Cloud Run)

| Variable                      | Description                      | Default                          |
| ----------------------------- | -------------------------------- | -------------------------------- |
| `RATE_LIMIT_REQUESTS_PER_MIN` | Max requests per minute per user | `60` (dev), `100` (prod)         |
| `RATE_LIMIT_TOKENS_PER_DAY`   | Max tokens per day per user      | `100000` (dev), `1000000` (prod) |

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

3. Start the service:
   ```bash
   pnpm dev
   ```

The service will run on `http://localhost:5051` with:

- **Mocked Vertex AI responses** (no real API calls)
- **Firebase Auth Emulator** for authentication
- **Firestore Emulator** for data storage

### Testing Locally

The service automatically mocks Vertex AI responses when `GCP_PROJECT_ID=demo-project` or `ENV=dev`. This allows full local testing without GCP credentials or costs.

Example request:

```bash
curl -X POST http://localhost:5051/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-Authorization: Bearer <firebase-token>" \
  -d '{
    "prompt": "What are some tips for saving money?",
    "model": "gemini-2.0-flash-001"
  }'
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
3. Rebuild and redeploy the service

## API Endpoints

### `POST /v1/generate`

Generate text using Vertex AI.

**Request**:

```json
{
  "prompt": "Your prompt here",
  "systemContext": "Optional system context",
  "model": "gemini-2.0-flash-001",
  "parameters": {
    "temperature": 0.7,
    "maxOutputTokens": 1024
  }
}
```

**Response**:

```json
{
  "requestId": "uuid",
  "content": "Generated text",
  "model": "gemini-2.0-flash-001",
  "finishReason": "STOP",
  "usage": {
    "inputTokens": 10,
    "outputTokens": 50,
    "totalTokens": 60
  },
  "cached": false,
  "latencyMs": 1234
}
```

### `POST /v1/embed`

Generate embeddings for text.

### `GET /health`

Health check endpoint.

## Security

- **Internal Ingress Only**: Service is not publicly accessible
- **Authentication Required**: All requests must include valid Firebase ID token
- **Rate Limiting**: Per-user rate limits enforced
- **Service Account**: Runs with dedicated service account with minimal permissions

## Monitoring

Logs are available in Cloud Logging:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=rates-dev-ai-service-us-central1" --limit 50
```

## Troubleshooting

### 401 Unauthorized

- Verify Firebase Auth emulator is running (local)
- Check `FIREBASE_AUTH_EMULATOR_HOST` is set correctly (local)
- Ensure valid Firebase ID token in `X-Forwarded-Authorization` header

### 429 Rate Limit Exceeded

- Increase `RATE_LIMIT_REQUESTS_PER_MIN` in `.env` (local)
- Check user's rate limit status in Firestore

### 403 Vertex AI API Disabled

- In production: Ensure Vertex AI API is enabled in GCP project
- In local: Service automatically uses mocked responses (no real API calls)
