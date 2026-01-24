/**
 * API handler for token validation endpoint
 * Handles /api/validate requests and returns JSON responses
 */

import { validateTokenAPI } from './apiValidate';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Handle API validation request
 * This can be called from a service worker or API route handler
 */
export async function handleValidateAPI(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(
      JSON.stringify({
        valid: false,
        error: 'Token parameter is required',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get current user if authenticated
  return new Promise((resolve) => {
    onAuthStateChanged(
      auth,
      (user) => {
        void (async () => {
          const result = await validateTokenAPI(token, user);
          resolve(
            new Response(JSON.stringify(result), {
              status: result.valid ? 200 : 401,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        })();
      },
      () => {
        // No user authenticated
        void validateTokenAPI(token, null).then((result) => {
          resolve(
            new Response(JSON.stringify(result), {
              status: result.valid ? 200 : 401,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        });
      }
    );
  });
}
