import { Link, useSearchParams } from 'react-router-dom';
import { authConfig } from '../utils/config';

export default function Landing() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

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
          <ol className="muted" style={{ paddingLeft: 16, margin: 0 }}>
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
    </div>
  );
}
