/**
 * Auth token utilities
 * Handles token storage/retrieval from cookies and URL parameters
 */

const COOKIE_NAME = 'auth_app_token';

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts[1]?.split(';')[0] ?? '');
  }
  return null;
}

/**
 * Set a cookie
 */
function setCookie(
  name: string,
  value: string,
  maxAge?: number,
  domain?: string,
  sameSite: 'Lax' | 'None' | 'Strict' = 'Lax'
): void {
  const directives = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `SameSite=${sameSite}`,
    'Secure',
  ];

  if (maxAge !== undefined) {
    directives.push(`Max-Age=${maxAge}`);
  }

  if (domain) {
    directives.push(`Domain=${domain}`);
  }

  document.cookie = directives.join('; ');
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string, domain?: string): void {
  const directives = [
    `${name}=`,
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
    'Secure',
  ];

  if (domain) {
    directives.push(`Domain=${domain}`);
  }

  document.cookie = directives.join('; ');
}

/**
 * Get auth token from cookie or URL parameters
 * @param returnRedirectTo - If true, returns object with token and redirectTo. If false, returns just the token string.
 * @returns Token string (or null if not found) or object with token and redirectTo
 */
export function getAuthToken(
  returnRedirectTo = false
): string | null | { token: string | null; redirectTo: string | null } {
  // First, try to get token from cookie
  const cookieToken = getCookie(COOKIE_NAME);

  // Then, check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');

  // Prefer cookie token, fallback to URL token
  const token = cookieToken ?? urlToken ?? null;

  // Clean URL if token was in URL (to avoid exposing token in URL bar)
  if (urlToken && !cookieToken) {
    // Remove token and related params from URL without reloading
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('token');
    newUrl.searchParams.delete('provider');
    newUrl.searchParams.delete('expiresIn');
    newUrl.searchParams.delete('nonce');
    // Keep redirectTo for now - it will be handled by AuthRedirectHandler
    window.history.replaceState({}, '', newUrl.toString());

    // Store token in cookie if we got it from URL
    if (urlToken) {
      const expiresIn = urlParams.get('expiresIn');
      const maxAge = expiresIn ? parseInt(expiresIn, 10) : 3600; // Default 1 hour
      setCookie(COOKIE_NAME, urlToken, maxAge);
    }
  }

  if (returnRedirectTo) {
    const redirectTo = urlParams.get('redirectTo');
    return { token, redirectTo };
  }

  return token;
}

/**
 * Clear auth token from cookie and URL
 */
export function clearAuthToken(): void {
  // Delete cookie
  deleteCookie(COOKIE_NAME);

  // Clean URL if token is present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('token')) {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('token');
    newUrl.searchParams.delete('provider');
    newUrl.searchParams.delete('expiresIn');
    newUrl.searchParams.delete('nonce');
    window.history.replaceState({}, '', newUrl.toString());
  }
}

/**
 * Validate token format (basic JWT format check)
 * A JWT token should have 3 parts separated by dots
 */
export function isValidTokenFormat(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  return parts.length === 3;
}

/**
 * Get redirectTo from URL parameters
 */
export function getRedirectToFromUrl(
  urlParams: URLSearchParams
): string | null {
  return urlParams.get('redirectTo');
}
