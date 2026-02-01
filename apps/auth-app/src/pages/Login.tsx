import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authConfig } from '../utils/config';
import { getFriendlyError } from '../utils/errors';
import { getNonceFromUrl, validateNonce } from '../utils/nonce';
import { completeAuthRedirect } from '../utils/redirect';

const deriveAllowedRedirects = () => {
  if (authConfig.allowedRedirects.length > 0)
    return authConfig.allowedRedirects;
  try {
    return [new URL(authConfig.defaultReturnUrl).origin];
  } catch {
    return [];
  }
};

export default function Login() {
  const { signIn, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const nonce = getNonceFromUrl(searchParams);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isRedirecting, setRedirecting] = useState(false);
  const [nonceValidated, setNonceValidated] = useState(false);

  const allowedRedirects = useMemo(deriveAllowedRedirects, []);

  // DEBUG: Log config on mount
  useEffect(() => {
    console.log('[DEBUG] Login page - Config:', {
      redirectTo,
      allowedRedirects,
      allowedRedirectsArray: Array.from(allowedRedirects),
      defaultReturnUrl: authConfig.defaultReturnUrl,
      authConfig,
      envVars: {
        VITE_ALLOWED_REDIRECTS: import.meta.env.VITE_ALLOWED_REDIRECTS,
        VITE_DEFAULT_RETURN_URL: import.meta.env.VITE_DEFAULT_RETURN_URL,
        VITE_FIREBASE_MODE: import.meta.env.VITE_FIREBASE_MODE,
        VITE_USE_FIREBASE_EMULATOR: import.meta.env.VITE_USE_FIREBASE_EMULATOR,
        PROD: import.meta.env.PROD,
      },
    });
  }, [redirectTo, allowedRedirects]);

  // Validate nonce on mount
  useEffect(() => {
    void (async () => {
      const result = await validateNonce(nonce);
      if (!result.isValid) {
        setError(result.error ?? 'Invalid nonce');
      } else {
        setNonceValidated(true);
      }
    })();
  }, [nonce]);

  useEffect(() => {
    if (!loading && user && !isRedirecting) {
      void (async () => {
        try {
          setRedirecting(true);
          await completeAuthRedirect(user, {
            redirectTo,
            allowedRedirects,
            defaultReturnUrl: authConfig.defaultReturnUrl,
            cookieName: authConfig.cookieName,
            cookieMaxAgeSeconds: authConfig.cookieMaxAgeSeconds,
            cookieDomain: authConfig.cookieDomain,
            cookieSameSite: authConfig.cookieSameSite,
            enableCookie: authConfig.enableCookie,
            nonce,
          });
        } catch (err: unknown) {
          setError(getFriendlyError(err));
          setRedirecting(false);
        }
      })();
    }
  }, [allowedRedirects, loading, redirectTo, isRedirecting, user, nonce]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedInUser = await signIn(email, password, remember);
      await completeAuthRedirect(signedInUser, {
        redirectTo,
        allowedRedirects,
        defaultReturnUrl: authConfig.defaultReturnUrl,
        cookieName: authConfig.cookieName,
        cookieMaxAgeSeconds: authConfig.cookieMaxAgeSeconds,
        cookieDomain: authConfig.cookieDomain,
        cookieSameSite: authConfig.cookieSameSite,
        enableCookie: authConfig.enableCookie,
        nonce,
      });
    } catch (err: unknown) {
      setError(getFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!nonceValidated && !error) {
    return (
      <div className="grid">
        <div className="muted">Validating request security...</div>
      </div>
    );
  }

  if (!nonceValidated) {
    return (
      <div className="grid">
        <div className="error">{error}</div>
        <p className="muted">
          This authentication request is invalid. Please initiate authentication
          from your application.
        </p>
      </div>
    );
  }

  return (
    <div className="grid two">
      <div className="grid">
        <div className="badge">Login</div>
        <h2 className="title">Authenticate with Firebase</h2>
        <p className="muted">
          On success we redirect with a Firebase ID token and optionally set a
          SameSite cookie for same-domain consumers.
        </p>
        <div className="grid">
          <p className="muted">
            Redirect target:{' '}
            <strong>{redirectTo ?? authConfig.defaultReturnUrl}</strong>
          </p>
          <p className="muted">
            Allowed origins:{' '}
            <strong>{allowedRedirects.join(', ') || 'not configured'}</strong>
          </p>
          <p className="muted">
            Cookie name: <strong>{authConfig.cookieName}</strong> · Max age:{' '}
            <strong>{authConfig.cookieMaxAgeSeconds}s</strong>
          </p>
        </div>
      </div>

      {/* DEBUG PANEL */}
      <div
        className="grid"
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f0f0f0',
          border: '2px solid #ff6b6b',
          borderRadius: '8px',
        }}
      >
        <div
          className="badge"
          style={{ backgroundColor: '#ff6b6b', color: 'white' }}
        >
          DEBUG INFO - Login Page
        </div>
        <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
          <div>
            <strong>Environment Variables (at build time):</strong>
          </div>
          <div>
            VITE_ALLOWED_REDIRECTS:{' '}
            {import.meta.env.VITE_ALLOWED_REDIRECTS ?? 'NOT SET (undefined)'}
          </div>
          <div>
            VITE_DEFAULT_RETURN_URL:{' '}
            {import.meta.env.VITE_DEFAULT_RETURN_URL ?? 'NOT SET (undefined)'}
          </div>
          <div>
            VITE_FIREBASE_MODE:{' '}
            {import.meta.env.VITE_FIREBASE_MODE ?? 'NOT SET (undefined)'}
          </div>
          <div>
            VITE_USE_FIREBASE_EMULATOR:{' '}
            {import.meta.env.VITE_USE_FIREBASE_EMULATOR ??
              'NOT SET (undefined)'}
          </div>
          <div>PROD: {String(import.meta.env.PROD)}</div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Parsed Config:</strong>
          </div>
          <div>defaultReturnUrl: {authConfig.defaultReturnUrl}</div>
          <div>
            allowedRedirects (from config):{' '}
            {JSON.stringify(authConfig.allowedRedirects)}
          </div>
          <div>
            allowedRedirects (derived):{' '}
            {JSON.stringify(Array.from(allowedRedirects))}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Current Request:</strong>
          </div>
          <div>redirectTo: {redirectTo ?? 'NOT PROVIDED'}</div>
          {redirectTo &&
            (() => {
              try {
                const redirectUrl = new URL(redirectTo);
                const redirectOrigin = redirectUrl.origin;
                const isAllowed = allowedRedirects.includes(redirectOrigin);
                return (
                  <>
                    <div>redirectTo origin: {redirectOrigin}</div>
                    <div>redirectTo path: {redirectUrl.pathname}</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <strong>Validation:</strong>
                    </div>
                    <div>
                      Allowed origins list:{' '}
                      {JSON.stringify(Array.from(allowedRedirects))}
                    </div>
                    <div>
                      {isAllowed ? (
                        <span style={{ color: 'green' }}>
                          ✓ redirectTo origin IS in allowedRedirects
                        </span>
                      ) : (
                        <span style={{ color: 'red' }}>
                          ✗ redirectTo origin NOT in allowedRedirects
                        </span>
                      )}
                    </div>
                  </>
                );
              } catch (e: unknown) {
                return (
                  <div style={{ color: 'red' }}>
                    ✗ redirectTo is not a valid URL:{' '}
                    {e instanceof Error ? e.message : 'Invalid URL'}
                  </div>
                );
              }
            })()}
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Check browser console for detailed logs</strong>
          </div>
        </div>
      </div>

      <div className="grid">
        {error && <div className="error">{error}</div>}
        {isRedirecting && (
          <div className="success">Authenticated. Redirecting…</div>
        )}
        <form className="form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember this device (local persistence)
          </label>
          <div className="actions">
            <button
              className="button"
              type="submit"
              disabled={isSubmitting || isRedirecting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
            <Link
              className="button secondary"
              to={`/signup${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}${nonce ? `&nonce=${encodeURIComponent(nonce)}` : ''}` : nonce ? `?nonce=${encodeURIComponent(nonce)}` : ''}`}
            >
              Need an account?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
