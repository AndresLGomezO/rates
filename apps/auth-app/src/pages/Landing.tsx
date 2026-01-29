import { Link, useSearchParams } from 'react-router-dom';
import { authConfig } from '../utils/config';

export default function Landing() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  // Debug: Extract origin from redirectTo if present
  let redirectToOrigin = null;
  if (redirectTo) {
    try {
      redirectToOrigin = new URL(redirectTo).origin;
    } catch {
      redirectToOrigin = 'Invalid URL';
    }
  }

  return (
    <div className="grid two">
      <div className="grid">
        <h2 className="title">Single place for authentication</h2>
        <p className="muted">
          This app authenticates users, issues a Firebase ID token, optionally
          sets a cookie, then redirects back to your consumer app.
        </p>
        <div className="grid">
          <div className="badge">How it works</div>
          <ol className="muted pl-4 m-0">
            <li>Caller sends users here with ?redirectTo=&lt;app-url&gt;.</li>
            <li>User logs in or signs up.</li>
            <li>We fetch an ID token and redirect with it as a query param.</li>
            <li>
              Optionally set a SameSite cookie (non-HttpOnly) for same-domain
              callers.
            </li>
          </ol>
        </div>
        <div className="grid">
          <div className="badge">Security</div>
          <p className="muted">
            Redirect targets must be allow-listed via VITE_ALLOWED_REDIRECTS.
            Tokens are never stored in localStorage.
          </p>
        </div>
      </div>

      <div className="grid">
        <div className="badge">Get started</div>
        <p className="muted">
          Default return URL:{' '}
          <strong>{authConfig.defaultReturnUrl ?? 'not set'}</strong>
        </p>
        {redirectTo ? (
          <p className="muted">
            Requested redirect:{' '}
            <strong data-testid="redirect-target">{redirectTo}</strong>
          </p>
        ) : (
          <p className="muted">
            Provide ?redirectTo=https://app.example.com when linking here.
          </p>
        )}
        <div className="actions">
          <Link
            className="button"
            to={`/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
          >
            Continue to login
          </Link>
          <Link
            className="button secondary"
            to={`/signup${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`}
          >
            Create account
          </Link>
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
          DEBUG INFO
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
          <div>MODE: {import.meta.env.MODE ?? 'NOT SET'}</div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Parsed Config:</strong>
          </div>
          <div>defaultReturnUrl: {authConfig.defaultReturnUrl}</div>
          <div>
            allowedRedirects (count): {authConfig.allowedRedirects.length}
          </div>
          <div>
            allowedRedirects (values):{' '}
            {authConfig.allowedRedirects.length > 0
              ? JSON.stringify(authConfig.allowedRedirects)
              : 'EMPTY ARRAY'}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Current Request:</strong>
          </div>
          <div>redirectTo (full): {redirectTo ?? 'NOT PROVIDED'}</div>
          <div>redirectTo (origin): {redirectToOrigin ?? 'N/A'}</div>
          <div>Current origin: {window.location.origin}</div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Validation Check:</strong>
          </div>
          {redirectTo && redirectToOrigin ? (
            <div>
              Allowed origins: {JSON.stringify(authConfig.allowedRedirects)}
              <br />
              {authConfig.allowedRedirects.includes(redirectToOrigin) ? (
                <span style={{ color: 'green' }}>
                  ✓ redirectTo origin IS in allowedRedirects
                </span>
              ) : (
                <span style={{ color: 'red' }}>
                  ✗ redirectTo origin NOT in allowedRedirects
                </span>
              )}
            </div>
          ) : (
            <div style={{ color: 'orange' }}>⚠ No redirectTo to validate</div>
          )}
        </div>
      </div>
    </div>
  );
}
