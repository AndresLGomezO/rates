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
    } catch (err: unknown) {
      setError(getFriendlyError(err));
      setLoggingOut(false);
    }
  }

  if (loading || !nonceValidated || isLoggingOut) {
    return (
      <div className="grid gap-4">
        <div className="m-0 text-slate-600">
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
      <div className="grid gap-4">
        <div className="p-2.5 px-3 rounded-[10px] bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
        <p className="m-0 text-slate-600">
          Logout failed. You can try again or close this window.
        </p>
        <div className="flex justify-between gap-3 flex-wrap">
          <button
            className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-[0_10px_30px_rgba(14,165,233,0.35)] transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px hover:shadow-[0_14px_34px_rgba(79,70,229,0.35)]"
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
    <div className="grid gap-4">
      <div className="m-0 text-slate-600">Redirecting...</div>
    </div>
  );
}
