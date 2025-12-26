import { useState, useEffect, type PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './PrivateLayout.css';

const ACCOUNT_TYPES = [
  { type: 'loan', label: 'Loans', icon: '💰' },
  { type: 'credit_card', label: 'Credit Cards', icon: '💳' },
  { type: 'bill', label: 'Bills', icon: '📄' },
  { type: 'mortgage', label: 'Mortgages', icon: '🏠' },
  { type: 'personal_loan', label: 'Personal Loans', icon: '👤' },
  { type: 'auto_loan', label: 'Auto Loans', icon: '🚗' },
  { type: 'other', label: 'Other', icon: '📋' },
] as const;

export function PrivateLayout({ children }: PropsWithChildren) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { signOut } = useAuth();
  const location = useLocation();

  const isAccountsRoute = location.pathname.startsWith('/accounts/');
  const [accountsMenuOpen, setAccountsMenuOpen] = useState(isAccountsRoute);

  // Auto-open accounts menu when on accounts route
  useEffect(() => {
    if (isAccountsRoute) {
      setAccountsMenuOpen(true);
    }
  }, [isAccountsRoute]);

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const toggleAccountsMenu = () => {
    setAccountsMenuOpen(!accountsMenuOpen);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="private-layout">
      <aside
        className={`sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}
      >
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="toggle-icon">{sidebarExpanded ? '←' : '→'}</span>
          </button>
          {sidebarExpanded && <h1 className="sidebar-title">Rates</h1>}
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-list">
            <li>
              <Link
                to="/dashboard"
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                title="Dashboard"
              >
                <span className="nav-icon">📊</span>
                {sidebarExpanded && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <div className="nav-menu-item">
                <button
                  className={`nav-link nav-menu-toggle ${isAccountsRoute ? 'active' : ''}`}
                  onClick={toggleAccountsMenu}
                  title="Accounts"
                >
                  <span className="nav-icon">📁</span>
                  {sidebarExpanded && (
                    <>
                      <span>Accounts</span>
                      <span
                        className={`menu-arrow ${accountsMenuOpen ? 'open' : ''}`}
                      >
                        ▼
                      </span>
                    </>
                  )}
                </button>
                {sidebarExpanded && accountsMenuOpen && (
                  <ul className="nav-submenu">
                    {ACCOUNT_TYPES.map((accountType) => (
                      <li key={accountType.type}>
                        <Link
                          to={`/accounts/${accountType.type}`}
                          className={`nav-submenu-link ${isActive(`/accounts/${accountType.type}`) ? 'active' : ''}`}
                          title={accountType.label}
                        >
                          <span className="nav-icon">{accountType.icon}</span>
                          <span>{accountType.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          {sidebarExpanded && (
            <button className="sign-out-btn" onClick={() => void signOut()}>
              <span className="sign-out-icon">🚪</span>
              Sign Out
            </button>
          )}
          {!sidebarExpanded && (
            <button
              className="sign-out-btn-icon-only"
              onClick={() => void signOut()}
              title="Sign Out"
            >
              <span>🚪</span>
            </button>
          )}
        </div>
      </aside>
      <main className="main-content">
        <div className="main-content-scrollable">{children}</div>
      </main>
    </div>
  );
}
