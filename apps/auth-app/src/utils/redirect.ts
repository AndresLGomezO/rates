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
    const targetOrigin = targetUrl.origin;

    // DEBUG: Log validation attempt
    console.log('[DEBUG] isAllowed check:', {
      target,
      targetOrigin,
      allowedOrigins,
      normalizedOrigins: allowedOrigins.map(normalize),
    });

    const result = allowedOrigins.some((origin) => {
      const normalizedOrigin = normalize(origin);
      const matches =
        normalizedOrigin.length > 0 && targetOrigin === normalizedOrigin;

      // DEBUG: Log each comparison
      console.log('[DEBUG] Comparing:', {
        normalizedOrigin,
        targetOrigin,
        matches,
      });

      return matches;
    });

    console.log('[DEBUG] isAllowed result:', result);
    return result;
  } catch (error) {
    console.error('[DEBUG] isAllowed error:', error);
    return false;
  }
}

export function resolveRedirect(
  requested: string | null,
  allowed: string[],
  fallback: string
) {
  // DEBUG: Log function call
  console.log('[DEBUG] resolveRedirect called:', {
    requested,
    allowed,
    fallback,
  });

  // If requested URL is allowed, extract its origin to redirect to the main app
  // The full path will be preserved in redirectTo query param
  if (requested && isAllowed(requested, allowed)) {
    try {
      const requestedUrl = new URL(requested);
      const origin = requestedUrl.origin;
      console.log('[DEBUG] resolveRedirect: Using requested origin:', origin);
      return origin;
    } catch (error) {
      console.error(
        '[DEBUG] resolveRedirect: Error parsing requested URL:',
        error
      );
      // Invalid URL, fall through to fallback
    }
  }

  // Use fallback (defaultReturnUrl) which should be the main app's origin
  const normalizedFallback = normalize(fallback);
  if (normalizedFallback) {
    try {
      // Ensure fallback is treated as origin (remove path if present)
      const fallbackUrl = new URL(normalizedFallback);
      const origin = fallbackUrl.origin;
      console.log('[DEBUG] resolveRedirect: Using fallback origin:', origin);
      return origin;
    } catch (error) {
      console.error(
        '[DEBUG] resolveRedirect: Error parsing fallback URL:',
        error
      );
      // If fallback is not a valid URL, return as-is (might be just origin)
      console.log(
        '[DEBUG] resolveRedirect: Returning normalized fallback as-is:',
        normalizedFallback
      );
      return normalizedFallback;
    }
  }

  // Last resort: use current origin (shouldn't happen if config is correct)
  const currentOrigin = window.location.origin;
  console.warn(
    '[DEBUG] resolveRedirect: Using current origin as last resort:',
    currentOrigin
  );
  return currentOrigin;
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
  console.log('[DEBUG] completeAuthRedirect called with config:', {
    redirectTo: config.redirectTo,
    allowedRedirects: config.allowedRedirects,
    defaultReturnUrl: config.defaultReturnUrl,
  });

  const idToken = await user.getIdToken();
  const expiresIn = config.cookieMaxAgeSeconds;
  const originalRedirectTo = config.redirectTo ?? null;
  const target = resolveRedirect(
    originalRedirectTo,
    config.allowedRedirects,
    config.defaultReturnUrl
  );

  console.log('[DEBUG] completeAuthRedirect: Resolved target:', target);

  setAuthCookie(idToken, config);

  // Build redirect URL with token params and preserve original redirectTo
  // The originalRedirectTo is the URL the user was originally trying to access
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

  console.log('[DEBUG] completeAuthRedirect: Final redirect URL:', url);
  window.location.replace(url);
}
