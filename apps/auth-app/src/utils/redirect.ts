import { User } from 'firebase/auth';

type RedirectConfig = {
  redirectTo?: string | null;
  allowedRedirects: string[];
  defaultReturnUrl: string;
  cookieName: string;
  cookieMaxAgeSeconds: number;
  cookieDomain?: string;
  cookieSameSite?: 'Lax' | 'None' | 'Strict';
  enableCookie: boolean;
  nonce?: string | null;
};

type RedirectPayload = {
  token: string;
  expiresIn: number;
  provider: 'firebase';
  nonce?: string | null;
};

const normalize = (value?: string | null) =>
  (value ?? '').trim().replace(/\/+$/, '');

function isAllowed(target: string, allowedOrigins: string[]) {
  try {
    const targetUrl = new URL(target);
    return allowedOrigins.some((origin) => {
      const normalizedOrigin = normalize(origin);
      return (
        normalizedOrigin.length > 0 && targetUrl.origin === normalizedOrigin
      );
    });
  } catch {
    return false;
  }
}

export function resolveRedirect(
  requested: string | null,
  allowed: string[],
  fallback: string
) {
  // If requested URL is allowed, extract its origin to redirect to the main app
  // The full path will be preserved in redirectTo query param
  if (requested && isAllowed(requested, allowed)) {
    try {
      const requestedUrl = new URL(requested);
      return requestedUrl.origin;
    } catch {
      // Invalid URL, fall through to fallback
    }
  }

  // Use fallback (defaultReturnUrl) which should be the main app's origin
  const normalizedFallback = normalize(fallback);
  if (normalizedFallback) {
    try {
      // Ensure fallback is treated as origin (remove path if present)
      const fallbackUrl = new URL(normalizedFallback);
      return fallbackUrl.origin;
    } catch {
      // If fallback is not a valid URL, return as-is (might be just origin)
      return normalizedFallback;
    }
  }

  // Last resort: use current origin (shouldn't happen if config is correct)
  return window.location.origin;
}

export function buildRedirectUrl(
  target: string,
  payload: RedirectPayload,
  originalRedirectTo?: string | null
) {
  const url = new URL(target);
  url.searchParams.set('token', payload.token);
  url.searchParams.set('provider', payload.provider);
  url.searchParams.set('expiresIn', String(payload.expiresIn));
  if (payload.nonce) {
    url.searchParams.set('nonce', payload.nonce);
  }
  // Preserve the original redirectTo URL so the app can navigate to it
  // This is the URL the user was originally trying to access
  if (originalRedirectTo) {
    url.searchParams.set('redirectTo', originalRedirectTo);
  }
  return url.toString();
}

export function setAuthCookie(token: string, config: RedirectConfig) {
  if (!config.enableCookie) return;
  const directives = [
    `${config.cookieName}=${encodeURIComponent(token)}`,
    `Max-Age=${config.cookieMaxAgeSeconds}`,
    'Path=/',
    `SameSite=${config.cookieSameSite ?? 'Lax'}`,
    'Secure',
  ];
  if (config.cookieDomain) {
    directives.push(`Domain=${config.cookieDomain}`);
  }
  document.cookie = directives.join('; ');
}

export async function completeAuthRedirect(user: User, config: RedirectConfig) {
  const idToken = await user.getIdToken();
  const expiresIn = config.cookieMaxAgeSeconds;
  const originalRedirectTo = config.redirectTo ?? null;
  const target = resolveRedirect(
    originalRedirectTo,
    config.allowedRedirects,
    config.defaultReturnUrl
  );

  setAuthCookie(idToken, config);

  // Build redirect URL with token params and preserve original redirectTo
  // The originalRedirectTo is the URL the user was trying to access
  const url = buildRedirectUrl(
    target,
    {
      token: idToken,
      provider: 'firebase',
      expiresIn,
      nonce: config.nonce,
    },
    originalRedirectTo
  );

  window.location.replace(url);
}
