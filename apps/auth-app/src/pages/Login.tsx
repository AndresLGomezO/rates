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
        } catch (err) {
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
    } catch (err) {
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
