import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true,
  ignoreTrailingSlash: true,
});

const AI_SERVICE_URL =
  process.env.VITE_AI_SERVICE_URL || 'http://localhost:8080';
const STATIC_ROOT = path.join(__dirname, 'public');

/**
 * Fetch Google ID Token from Metadata Server
 */
async function getGoogleIdToken(audience) {
  // If running locally/outside Cloud Run, return mock or throw
  const metadataUrl = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${audience}`;

  try {
    const response = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    });

    if (!response.ok) {
      // Fallback for local dev or if metadata server unreachable
      console.warn(
        'Could not fetch ID token from metadata server. Using fallback/mock.'
      );
      return null;
    }

    return await response.text();
  } catch (err) {
    console.warn('Error fetching ID token:', err.message);
    return null;
  }
}

// API Routes (Register BEFORE static files)
fastify.post('/api/ai/generate', async (request, reply) => {
  try {
    const userAuthorization = request.headers['authorization'];
    const body = request.body;

    // 1. Get ID Token for Service-to-Service Auth
    const idToken = await getGoogleIdToken(AI_SERVICE_URL);

    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-Authorization': userAuthorization || '', // Pass user token for context
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    // 2. Proxy to AI Service
    console.log(`[Proxy] Sending request to ${AI_SERVICE_URL}/v1/generate`);
    const response = await fetch(`${AI_SERVICE_URL}/v1/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    console.log(`[Proxy] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Error: ${errorText}`);
      return reply.code(response.status).send(errorText);
    }

    const data = await response.json();
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
});

fastify.post('/api/ai/chat', async (request, reply) => {
  try {
    const userAuthorization = request.headers['authorization'];
    const body = request.body;

    // 1. Get ID Token for Service-to-Service Auth
    const idToken = await getGoogleIdToken(AI_SERVICE_URL);

    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-Authorization': userAuthorization || '',
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    // 2. Proxy to AI Service
    console.log(`[Proxy] Sending chat request to ${AI_SERVICE_URL}/v1/chat`);
    const response = await fetch(`${AI_SERVICE_URL}/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Chat Error: ${errorText}`);
      return reply.code(response.status).send(errorText);
    }

    const data = await response.json();
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
});

fastify.get('/api/ai/chat/sessions', async (request, reply) => {
  try {
    const userAuthorization = request.headers['authorization'];

    // 1. Get ID Token
    const idToken = await getGoogleIdToken(AI_SERVICE_URL);

    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-Authorization': userAuthorization || '',
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    // 2. Proxy to AI Service
    console.log(
      `[Proxy] Fetching sessions from ${AI_SERVICE_URL}/v1/chat/sessions`
    );
    const response = await fetch(`${AI_SERVICE_URL}/v1/chat/sessions`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Chat Sessions Error: ${errorText}`);
      return reply.code(response.status).send(errorText);
    }

    const data = await response.json();
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
});

fastify.get('/api/ai/chat/sessions/:sessionId', async (request, reply) => {
  try {
    const { sessionId } = request.params;
    const userAuthorization = request.headers['authorization'];

    // 1. Get ID Token
    const idToken = await getGoogleIdToken(AI_SERVICE_URL);

    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-Authorization': userAuthorization || '',
    };

    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    // 2. Proxy to AI Service
    console.log(
      `[Proxy] Fetching session details ${sessionId} from ${AI_SERVICE_URL}`
    );
    const response = await fetch(
      `${AI_SERVICE_URL}/v1/chat/sessions/${sessionId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Chat Session Details Error: ${errorText}`);
      return reply.code(response.status).send(errorText);
    }

    const data = await response.json();
    return reply.send(data);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
});

// GET Handler for debugging reachability
fastify.get('/api/ai/generate', async (request, reply) => {
  return { message: 'BFF Proxy is reachable. Use POST to generate content.' };
});

// Health Check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Register static file serving (AFTER API routes)
fastify.register(fastifyStatic, {
  root: STATIC_ROOT,
  wildcard: false, // Handle wildcard manually for SPA fallback
});

// SPA Fallback: Serve index.html for any unknown route
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api')) {
    console.warn(`[404] API Not Found: ${request.method} ${request.url}`);
    return reply.code(404).send({
      error: 'API endpoint not found',
      url: request.url,
      method: request.method,
    });
  }
  return reply.sendFile('index.html');
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT) || 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`BFF Server listening on ${port}`);
    console.log(`Proxying AI requests to: ${AI_SERVICE_URL}`);
    console.log('Registered Routes:\n', fastify.printRoutes());
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
