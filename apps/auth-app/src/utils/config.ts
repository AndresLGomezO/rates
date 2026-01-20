type AuthConfig = {
  defaultReturnUrl: string;
  allowedRedirects: string[];
  enableCookie: boolean;
  cookieName: string;
  cookieMaxAgeSeconds: number;
  cookieDomain?: string;
  cookieSameSite: 'Lax' | 'None' | 'Strict';
};

const parseList = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const env = import.meta.env as Record<string, string | undefined>;

const cookieSameSite =
  (env.VITE_AUTH_COOKIE_SAMESITE as 'Lax' | 'None' | 'Strict' | undefined) ??
  'Lax';

export const authConfig: AuthConfig = {
  defaultReturnUrl: env.VITE_DEFAULT_RETURN_URL ?? window.location.origin,
  allowedRedirects: parseList(env.VITE_ALLOWED_REDIRECTS),
  enableCookie: env.VITE_ENABLE_AUTH_COOKIE !== 'false',
  cookieName: env.VITE_AUTH_COOKIE_NAME ?? 'auth_app_token',
  cookieMaxAgeSeconds: Number(env.VITE_AUTH_COOKIE_MAX_AGE ?? 3600),
  cookieDomain: env.VITE_AUTH_COOKIE_DOMAIN,
  cookieSameSite,
};
