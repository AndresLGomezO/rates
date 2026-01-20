import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authConfig } from '../utils/config';
import { getFriendlyError } from '../utils/errors';
import { getNonceFromUrl, validateNonce } from '../utils/nonce';
import { resolveRedirect } from '../utils/redirect';

const deriveAllowedRedirects = () => {
  if (authConfig.allowedRedirects.length > 0)
    return authConfig.allowedRedirects;
  try {
    return [new URL(authConfig.defaultReturnUrl).origin];
  } catch {
    return [];
  }
};

/**
 * Logout page
 * Handles user logout and redirects back to the main app
 *
 * This page:
 * - Validates nonce for security
 * - Signs out from Firebase
 * - Clears auth cookies
 * - Redirects back to the main app (or specified redirectTo URL)
 */
export default function Logout() {
  const { user, loading, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const nonce = getNonceFromUrl(searchParams);

  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setLoggingOut] = useState(false);
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

  // Auto-logout when nonce is validated
  useEffect(() => {
    if (nonceValidated && !isLoggingOut && !error) {
      void handleLogout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonceValidated]);

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);

    try {
      // Sign out from Firebase
      if (user) {
        await signOut();
      }

      // Clear auth cookie
      const cookieName = authConfig.cookieName;
      const cookieDomain = authConfig.cookieDomain;
      const cookiePath = '/';

      // Clear cookie by setting it to expire in the past
      let cookieString = `${cookieName}=; Path=${cookiePath}; Max-Age=0; SameSite=${authConfig.cookieSameSite ?? 'Lax'}`;
      if (cookieDomain) {
        cookieString += `; Domain=${cookieDomain}`;
      }
      document.cookie = cookieString;

      // Determine redirect target
      const target = resolveRedirect(
        redirectTo,
        allowedRedirects,
        authConfig.defaultReturnUrl
      );

      // Redirect back to main app
      window.location.replace(target);
    } catch (err) {
      setError(getFriendlyError(err));
      setLoggingOut(false);
    }
  }

  if (loading || !nonceValidated || isLoggingOut) {
    return (
      <div className="grid">
        <div className="muted">
          {loading
            ? 'Checking session…'
            : !nonceValidated
              ? 'Validating request security…'
              : 'Signing out…'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid">
        <div className="error">{error}</div>
        <p className="muted">
          Logout failed. You can try again or close this window.
        </p>
        <div className="actions">
          <button
            className="button"
            type="button"
            onClick={() => void handleLogout()}
          >
            Retry logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="muted">Redirecting...</div>
    </div>
  );
}
