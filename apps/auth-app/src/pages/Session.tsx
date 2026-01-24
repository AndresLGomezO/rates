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
      <div className="grid gap-4">
        <div className="m-0 text-slate-600">
          {loading ? 'Checking session…' : 'Validating request security…'}
        </div>
      </div>
    );
  }

  if (!nonceValidated && error) {
    return (
      <div className="grid gap-4">
        <div className="p-2.5 px-3 rounded-[10px] bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
        <p className="m-0 text-slate-600">
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
      <div className="grid gap-4">
        <div className="p-2.5 px-3 rounded-[10px] bg-red-50 text-red-700 border border-red-200">
          No active session.
        </div>
        <div className="flex justify-between gap-3 flex-wrap">
          <Link
            className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-[0_10px_30px_rgba(14,165,233,0.35)] transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px hover:shadow-[0_14px_34px_rgba(79,70,229,0.35)]"
            to={`/login?${loginParams.toString()}`}
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
      <div className="grid gap-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">
          Session
        </div>
        <h2 className="text-2xl m-0 text-slate-900">Active session detected</h2>
        <p className="m-0 text-slate-600">
          Signed in as <strong>{user.email ?? user.uid}</strong>
        </p>
        <p className="m-0 text-slate-600">
          Redirect target:{' '}
          <strong>{redirectTo ?? authConfig.defaultReturnUrl}</strong>
        </p>
        <p className="m-0 text-slate-600">
          Cookie name: <strong>{authConfig.cookieName}</strong>
        </p>
        {tokenPreview && (
          <div
            className="font-mono text-xs bg-slate-900 text-slate-200 p-3 rounded-[10px] break-all"
            aria-label="token-preview"
          >
            {tokenPreview}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {error && (
          <div className="p-2.5 px-3 rounded-[10px] bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}
        {isRedirecting && (
          <div className="p-2.5 px-3 rounded-[10px] bg-green-50 text-green-700 border border-green-200">
            Redirecting with your ID token…
          </div>
        )}
        <div className="flex justify-between gap-3 flex-wrap">
          <button
            className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-[0_10px_30px_rgba(14,165,233,0.35)] transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px hover:shadow-[0_14px_34px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_30px_rgba(14,165,233,0.35)]"
            type="button"
            onClick={() => void handleContinue()}
            disabled={isRedirecting}
          >
            Continue to app
          </button>
          <button
            className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-slate-200 text-slate-900 shadow-none transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
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
