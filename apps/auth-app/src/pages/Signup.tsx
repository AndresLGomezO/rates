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

export default function Signup() {
  const { signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const nonce = getNonceFromUrl(searchParams);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const newUser = await signUp(email, password);
      await completeAuthRedirect(newUser, {
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
        <div className="badge">Sign up</div>
        <h2 className="title">Create an account</h2>
        <p className="muted">
          New accounts are created in Firebase Auth. After creation, we redirect
          with the new session token.
        </p>
        <p className="muted">
          Redirect target:{' '}
          <strong>{redirectTo ?? authConfig.defaultReturnUrl}</strong>
        </p>
      </div>

      <div className="grid">
        {error && <div className="error">{error}</div>}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="actions">
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create account'}
            </button>
            <Link
              className="button secondary"
              to={`/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}${nonce ? `&nonce=${encodeURIComponent(nonce)}` : ''}` : nonce ? `?nonce=${encodeURIComponent(nonce)}` : ''}`}
            >
              Already have an account?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
