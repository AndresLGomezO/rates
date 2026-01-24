import { Link, Outlet, useLocation } from 'react-router-dom';
import './index.css';

function Header() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="header">
      <div>
        <div className="badge">Auth Service</div>
        <h1 className="title">Rates Authentication</h1>
        <p className="muted">
          Centralized login & signup with redirect + optional auth cookie.
        </p>
      </div>
      <div className="actions">
        {path !== '/login' && (
          <Link className="button secondary" to="/login">
            Login
          </Link>
        )}
        {path !== '/signup' && (
          <Link className="button secondary" to="/signup">
            Create account
          </Link>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="page">
      <div className="card">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}
