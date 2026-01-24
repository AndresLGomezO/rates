/**
 * Nonce generation and validation for secure app-to-app communication
 * Uses HMAC-SHA256 with a shared secret to prevent forgery
 */

type NonceData = {
  timestamp: number;
  random: string;
  hmac: string;
};

const NONCE_SEPARATOR = ':';
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes default

/**
 * Get the shared secret from environment or throw
 */
function getSecret(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const secret = env.VITE_NONCE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'VITE_NONCE_SECRET must be set and at least 16 characters for nonce validation'
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
 * Verify HMAC signature
 */
async function verifyHMAC(
  message: string,
  secret: string,
  signature: string
): Promise<boolean> {
  const expected = await generateHMAC(message, secret);
  return expected === signature;
}

/**
 * Generate a nonce for app-to-app communication
 * Format: base64(timestamp:random:hmac)
 */
export async function generateNonce(): Promise<string> {
  const secret = getSecret();
  const timestamp = Date.now();
  const random = crypto.randomUUID();
  const message = `${timestamp}${NONCE_SEPARATOR}${random}`;
  const hmac = await generateHMAC(message, secret);

  const nonceData: NonceData = { timestamp, random, hmac };
  const json = JSON.stringify(nonceData);
  return btoa(json);
}

/**
 * Validate a nonce
 * Returns validation result with error message if invalid
 */
export async function validateNonce(
  nonce: string | null
): Promise<{ isValid: boolean; error?: string }> {
  if (!nonce) {
    return {
      isValid: false,
      error: 'Nonce is required for secure authentication',
    };
  }

  try {
    const secret = getSecret();
    const json = atob(nonce);
    const data = JSON.parse(json) as NonceData;

    // Check timestamp expiration
    const now = Date.now();
    const age = now - data.timestamp;
    const env = import.meta.env as Record<string, string | undefined>;
    const maxAge = Number(env.VITE_NONCE_MAX_AGE_MS ?? NONCE_EXPIRY_MS);

    if (age > maxAge) {
      return {
        isValid: false,
        error:
          'Nonce has expired. Please initiate a new authentication request.',
      };
    }

    if (age < 0) {
      return {
        isValid: false,
        error: 'Invalid nonce timestamp',
      };
    }

    // Verify HMAC
    const message = `${data.timestamp}${NONCE_SEPARATOR}${data.random}`;
    const isValid = await verifyHMAC(message, secret, data.hmac);

    if (!isValid) {
      return {
        isValid: false,
        error: 'Invalid nonce signature. Request may be forged.',
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error
          ? `Nonce validation failed: ${error.message}`
          : 'Invalid nonce format',
    };
  }
}

/**
 * Extract nonce from URL search params
 */
export function getNonceFromUrl(searchParams: URLSearchParams): string | null {
  return searchParams.get('nonce');
}
