import cors from 'cors';
import express from 'express';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
// CI/CD trigger

type Env = Record<string, string | undefined>;

function parseList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllowedOrigins(env: Env): string[] {
  // Comma-separated list of origins (e.g. https://rates-app-dev-....a.run.app).
  return parseList(env.ALLOWED_ORIGINS);
}

function getProjectId(env: Env): string | undefined {
  // Priority: FIREBASE_PROJECT_ID > VITE_FIREBASE_PROJECT_ID > GOOGLE_CLOUD_PROJECT
  // With Identity Platform, all should use GCP project ID
  // GOOGLE_CLOUD_PROJECT is automatically set by Cloud Run to the GCP project ID
  const projectId =
    env.FIREBASE_PROJECT_ID ||
    env.VITE_FIREBASE_PROJECT_ID ||
    env.GOOGLE_CLOUD_PROJECT;

  // Log which source was used for debugging
  if (env.FIREBASE_PROJECT_ID) {
    // eslint-disable-next-line no-console
    console.log('[auth-api] Using FIREBASE_PROJECT_ID from environment');
  } else if (env.VITE_FIREBASE_PROJECT_ID) {
    // eslint-disable-next-line no-console
    console.log('[auth-api] Using VITE_FIREBASE_PROJECT_ID from environment');
  } else if (env.GOOGLE_CLOUD_PROJECT) {
    // eslint-disable-next-line no-console
    console.log(
      '[auth-api] Using GOOGLE_CLOUD_PROJECT (GCP project ID) - Identity Platform enabled'
    );
  }

  return projectId;
}

const env = process.env as Env;
const port = Number(env.PORT ?? 8080);
const allowedOrigins = getAllowedOrigins(env);
const projectId = getProjectId(env);

// Log environment variables for debugging (without exposing sensitive values)
// eslint-disable-next-line no-console
console.log('[auth-api] Environment check:', {
  hasFIREBASE_PROJECT_ID: !!env.FIREBASE_PROJECT_ID,
  hasVITE_FIREBASE_PROJECT_ID: !!env.VITE_FIREBASE_PROJECT_ID,
  hasGOOGLE_CLOUD_PROJECT: !!env.GOOGLE_CLOUD_PROJECT,
  selectedProjectId: projectId ?? 'none',
});

// Firebase Admin SDK (ADC in Cloud Run). Project ID helps Admin choose correct issuer/project.
// With Identity Platform, this should be the GCP project ID (same as client apps).
initializeApp(projectId ? { projectId } : undefined);
const adminAuth = getAuth();

const app = express();

// CORS: allow only known app origins (and allow non-browser tools if ALLOWED_ORIGINS is empty).
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      return callback(null, allowedOrigins.includes(origin));
    },
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/validate', async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ valid: false, error: 'Missing token' });
    return;
  }

  try {
    // Note: token revocation checks require additional permissions and can be slow.
    // For SPA-only deployments, we validate signature + expiry.
    await adminAuth.verifyIdToken(token, false);
    res.status(200).json({ valid: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Token validation failed';

    // Enhanced error logging for project ID mismatches
    if (
      error instanceof Error &&
      message.includes('aud') &&
      message.includes('claim')
    ) {
      // eslint-disable-next-line no-console
      console.error(
        `[auth-api] Project ID mismatch detected. Configured project: ${projectId ?? 'none'}. Error: ${message}`
      );
      // eslint-disable-next-line no-console
      console.error(
        '[auth-api] Ensure FIREBASE_PROJECT_ID environment variable matches the Firebase project ID used by client apps.'
      );
    }

    res.status(401).json({ valid: false, error: message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[auth-api] listening on :${port} projectId=${projectId ?? 'unknown'} allowedOrigins=${allowedOrigins.join(',')}`
  );
});
