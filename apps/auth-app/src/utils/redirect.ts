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
  if (requested && isAllowed(requested, allowed)) {
    return requested;
  }
  const normalizedFallback = normalize(fallback);
  if (normalizedFallback) {
    return normalizedFallback;
  }
  return window.location.origin;
}

export function buildRedirectUrl(target: string, payload: RedirectPayload) {
  const url = new URL(target);
  url.searchParams.set('token', payload.token);
  url.searchParams.set('provider', payload.provider);
  url.searchParams.set('expiresIn', String(payload.expiresIn));
  if (payload.nonce) {
    url.searchParams.set('nonce', payload.nonce);
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
  const target = resolveRedirect(
    config.redirectTo ?? null,
    config.allowedRedirects,
    config.defaultReturnUrl
  );

  setAuthCookie(idToken, config);

  const url = buildRedirectUrl(target, {
    token: idToken,
    provider: 'firebase',
    expiresIn,
    nonce: config.nonce,
  });

  window.location.replace(url);
}
