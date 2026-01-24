/**
 * Vite plugin to handle server-side API routes
 * This allows us to use Firebase Admin SDK for token validation
 */

import type { Plugin } from 'vite';
import { validateTokenWithAdmin } from './src/utils/adminValidate';

export function apiPlugin(): Plugin {
  return {
    name: 'api-plugin',
    configureServer(server) {
      // Handle /api/validate endpoint server-side
      server.middlewares.use('/api/validate', async (req, res, next) => {
        // Handle OPTIONS for CORS preflight
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
          next();
          return;
        }

        try {
          // Parse URL to get token parameter
          const url = new URL(req.url ?? '', `http://${req.headers.host}`);
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

          // Return JSON response
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
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal server error',
            })
          );
        }
      });
    },
  };
}
