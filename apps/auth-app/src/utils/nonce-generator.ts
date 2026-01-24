/**
 * Nonce generator utility for consumer apps
 * Copy this logic to your main app to generate nonces before redirecting to auth-app
 *
 * Usage in your main app:
 * ```ts
 * import { generateNonce } from './utils/nonce-generator';
 *
 * async function redirectToAuth() {
 *   const nonce = await generateNonce();
 *   const authUrl = `http://localhost:5175/login?redirectTo=${encodeURIComponent(window.location.href)}&nonce=${encodeURIComponent(nonce)}`;
 *   window.location.href = authUrl;
 * }
 * ```
 */

/**
 * Get the shared secret from environment
 * This MUST match VITE_NONCE_SECRET in auth-app
 */
function getSecret(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const secret = env.VITE_NONCE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'VITE_NONCE_SECRET must be set and at least 16 characters for nonce generation'
    );
  }
  return secret;
}

/**
 * Generate HMAC-SHA256 signature
 */
async function generateHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a nonce for app-to-app communication
 * Format: base64(timestamp:random:hmac)
 */
export async function generateNonce(): Promise<string> {
  const secret = getSecret();
  const timestamp = Date.now();
  const random = crypto.randomUUID();
  const message = `${timestamp}:${random}`;
  const hmac = await generateHMAC(message, secret);

  const nonceData = { timestamp, random, hmac };
  const json = JSON.stringify(nonceData);
  return btoa(json);
}

/**
 * Build auth-app URL with nonce and redirect
 */
export async function buildAuthAppUrl(
  authAppBaseUrl: string,
  redirectTo: string,
  path: 'login' | 'signup' | 'session' = 'login'
): Promise<string> {
  const nonce = await generateNonce();
  const url = new URL(path, authAppBaseUrl);
  url.searchParams.set('redirectTo', redirectTo);
  url.searchParams.set('nonce', nonce);
  return url.toString();
}
