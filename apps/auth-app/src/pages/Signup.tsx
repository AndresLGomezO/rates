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
      <div className="grid gap-4">
        <div className="m-0 text-slate-600">Validating request security...</div>
      </div>
    );
  }

  if (!nonceValidated) {
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

  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
      <div className="grid gap-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">
          Sign up
        </div>
        <h2 className="text-2xl m-0 text-slate-900">Create an account</h2>
        <p className="m-0 text-slate-600">
          New accounts are created in Firebase Auth. After creation, we redirect
          with the new session token.
        </p>
        <p className="m-0 text-slate-600">
          Redirect target:{' '}
          <strong>{redirectTo ?? authConfig.defaultReturnUrl}</strong>
        </p>
      </div>

      <div className="grid gap-4">
        {error && (
          <div className="p-2.5 px-3 rounded-[10px] bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}
        <form
          className="grid gap-3"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="grid gap-1">
            <label className="font-semibold text-slate-900" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-[15px] bg-slate-50 focus:outline-2 focus:outline-cyan-400 focus:bg-white"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1">
            <label className="font-semibold text-slate-900" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-[15px] bg-slate-50 focus:outline-2 focus:outline-cyan-400 focus:bg-white"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="grid gap-1">
            <label className="font-semibold text-slate-900" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-[15px] bg-slate-50 focus:outline-2 focus:outline-cyan-400 focus:bg-white"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="flex justify-between gap-3 flex-wrap">
            <button
              className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-indigo-500 text-white shadow-[0_10px_30px_rgba(14,165,233,0.35)] transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px hover:shadow-[0_14px_34px_rgba(79,70,229,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_30px_rgba(14,165,233,0.35)]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create account'}
            </button>
            <Link
              className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-slate-200 text-slate-900 shadow-none transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px"
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
