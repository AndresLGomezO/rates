import { useEffect, useMemo, useState } from 'react';
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

export default function Session() {
  const { user, loading, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const nonce = getNonceFromUrl(searchParams);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setRedirecting] = useState(false);
  const [isSigningOut, setSigningOut] = useState(false);
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
    void (async () => {
      if (user) {
        const token = await user.getIdToken();
        setTokenPreview(`${token.slice(0, 24)}…${token.slice(-12)}`);
      }
    })();
  }, [user]);

  async function handleContinue() {
    if (!user) return;
    setError(null);
    setRedirecting(true);
    try {
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
  }

  async function handleSignOut() {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setSigningOut(false);
    }
  }

  if (loading || !nonceValidated) {
    return (
      <div className="grid">
        <div className="muted">
          {loading ? 'Checking session…' : 'Validating request security…'}
        </div>
      </div>
    );
  }

  if (!nonceValidated && error) {
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

  if (!user) {
    const loginParams = new URLSearchParams();
    if (redirectTo) loginParams.set('redirectTo', redirectTo);
    if (nonce) loginParams.set('nonce', nonce);
    return (
      <div className="grid">
        <div className="error">No active session.</div>
        <div className="actions">
          <Link className="button" to={`/login?${loginParams.toString()}`}>
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid two">
      <div className="grid">
        <div className="badge">Session</div>
        <h2 className="title">Active session detected</h2>
        <p className="muted">
          Signed in as <strong>{user.email ?? user.uid}</strong>
        </p>
        <p className="muted">
          Redirect target:{' '}
          <strong>{redirectTo ?? authConfig.defaultReturnUrl}</strong>
        </p>
        <p className="muted">
          Cookie name: <strong>{authConfig.cookieName}</strong>
        </p>
        {tokenPreview && (
          <div className="token-box" aria-label="token-preview">
            {tokenPreview}
          </div>
        )}
      </div>

      <div className="grid">
        {error && <div className="error">{error}</div>}
        {isRedirecting && (
          <div className="success">Redirecting with your ID token…</div>
        )}
        <div className="actions">
          <button
            className="button"
            type="button"
            onClick={() => void handleContinue()}
            disabled={isRedirecting}
          >
            Continue to app
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}
