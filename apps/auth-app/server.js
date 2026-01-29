/**
 * Production server for auth-app
 * Serves static files and handles /api/validate endpoint
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { validateTokenWithAdmin } from './src/utils/adminValidate.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;
const DIST_DIR = join(__dirname, 'dist');

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Serve static files
function serveStaticFile(pathname, res) {
  // Default to index.html for SPA routes
  if (!extname(pathname) || pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = join(DIST_DIR, pathname);

  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// Helper function to safely log token info (first/last chars only)
function getTokenPreview(token) {
  if (!token) return 'null';
  if (token.length <= 20) return `${token.length} chars`;
  return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
}

// Handle /api/validate endpoint
async function handleValidateAPI(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();

  console.log(`[${requestId}] [DEBUG] /api/validate request received`, {
    method: req.method,
    url: req.url,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent'],
      origin: req.headers.origin,
    },
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] [DEBUG] CORS preflight request`);
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Only handle GET requests
  if (req.method !== 'GET') {
    console.log(`[${requestId}] [DEBUG] Method not allowed: ${req.method}`);
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    console.log(`[${requestId}] [DEBUG] Parsed request`, {
      pathname: url.pathname,
      hasToken: !!token,
      tokenLength: token?.length ?? 0,
      tokenPreview: getTokenPreview(token),
    });

    if (!token) {
      console.log(`[${requestId}] [DEBUG] Missing token parameter`);
      res.writeHead(400, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          valid: false,
          error: 'Token parameter is required',
        })
      );
      return;
    }

    // Validate token using Admin SDK
    console.log(`[${requestId}] [DEBUG] Starting token validation`);
    const result = await validateTokenWithAdmin(token, requestId);

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] [DEBUG] Validation complete`, {
      valid: result.valid,
      error: result.error,
      hasExpiresAt: !!result.expiresAt,
      durationMs: duration,
    });

    res.writeHead(result.valid ? 200 : 401, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(result));
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] [ERROR] Exception during validation`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
    });

    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        valid: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      })
    );
  }
}

// Health check endpoint
function handleHealthCheck(res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
}

// Main server
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Health check
  if (pathname === '/health') {
    handleHealthCheck(res);
    return;
  }

  // API endpoint
  if (pathname.startsWith('/api/validate')) {
    handleValidateAPI(req, res);
    return;
  }

  // Serve static files
  serveStaticFile(pathname, res);
});

server.listen(PORT, () => {
  console.log(`[STARTUP] Server running on port ${PORT}`);
  console.log('[STARTUP] Environment summary', {
    NODE_ENV: process.env.NODE_ENV,
    PORT,
    hasFIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    hasVITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
    hasGOOGLE_APPLICATION_CREDENTIALS:
      !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    hasFIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    FIREBASE_SERVICE_ACCOUNT_length:
      process.env.FIREBASE_SERVICE_ACCOUNT?.length ?? 0,
    hasFIREBASE_SERVICE_ACCOUNT_JSON:
      !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    FIREBASE_SERVICE_ACCOUNT_JSON_length:
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.length ?? 0,
    isEmulator:
      process.env.VITE_FIREBASE_MODE === 'emulator' ||
      process.env.FIREBASE_MODE === 'emulator' ||
      !!process.env.FIREBASE_AUTH_EMULATOR_HOST,
  });

  // Try to initialize Admin SDK on startup to catch initialization errors early
  // Note: This is async, so errors here won't block server startup
  void (async () => {
    try {
      // Import the admin module (already imported at top, but this ensures it's loaded)
      const { initializeAdmin } = await import('./src/utils/admin.ts');
      initializeAdmin();
      console.log('[STARTUP] Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error(
        '[STARTUP] [WARNING] Failed to initialize Firebase Admin SDK on startup',
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      );
      console.log(
        '[STARTUP] [INFO] Admin SDK will be initialized on first request'
      );
    }
  })();
});
