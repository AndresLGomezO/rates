# AI Service

Internal API gateway for AI operations within the Rates platform.

## Features

- Proxy to Vertex AI (Gemini 2.0, Embeddings)
- Async task management via Pub/Sub
- Rate limiting and usage tracking
- Response caching in Firestore
- Firebase Authentication

## Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

## Environment Variables

See `src/config/index.ts` for required environment variables.

- `GCP_PROJECT_ID`
- `VERTEX_AI_LOCATION`
- `FIRESTORE_COLLECTION_PREFIX`
