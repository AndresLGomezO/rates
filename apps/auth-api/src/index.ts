import cors from 'cors';
import express from 'express';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

type Env = Record<string, string | undefined>;

function parseList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllowedOrigins(env: Env): string[] {
  // Comma-separated list of origins (e.g. https://rates-app-dev-....a.run.app)
  return parseList(env.ALLOWED_ORIGINS);
}

function getProjectId(env: Env): string | undefined {
  return (
    env.FIREBASE_PROJECT_ID ||
    env.VITE_FIREBASE_PROJECT_ID ||
    env.GOOGLE_CLOUD_PROJECT
  );
}

const env = process.env as Env;
const port = Number(env.PORT ?? 8080);
const allowedOrigins = getAllowedOrigins(env);
const projectId = getProjectId(env);

// Firebase Admin SDK (ADC in Cloud Run). Project ID helps Admin choose correct issuer/project.
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
    res.status(401).json({ valid: false, error: message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[auth-api] listening on :${port} projectId=${projectId ?? 'unknown'} allowedOrigins=${allowedOrigins.join(',')}`
  );
});
