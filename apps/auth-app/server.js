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

// Handle /api/validate endpoint
async function handleValidateAPI(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
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
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
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
    const result = await validateTokenWithAdmin(token);

    res.writeHead(result.valid ? 200 : 401, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(result));
  } catch (error) {
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
  console.log(`Server running on port ${PORT}`);
});
