import { useState, useEffect, type PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SearchBar } from './SearchBar';

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
    <div className="relative flex min-h-screen h-screen max-h-screen w-full overflow-hidden bg-[linear-gradient(135deg,#667eea_0%,#764ba2_25%,#f093fb_50%,#4facfe_75%,#00f2fe_100%)] bg-[length:400%_400%] animate-gradient-shift before:content-[''] before:fixed before:inset-0 before:pointer-events-none before:z-0 before:bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.3)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,119,198,0.3)_0%,transparent_50%),radial-gradient(circle_at_40%_20%,rgba(120,219,255,0.3)_0%,transparent_50%)]">
      <aside
        className={`fixed top-0 left-0 h-screen max-h-screen z-sidebar flex flex-col overflow-hidden text-white transition-[width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] glass-sidebar md:w-[240px] xs:w-[200px] ${
          sidebarExpanded ? 'w-[280px]' : 'w-[80px] md:w-[80px] xs:w-[60px]'
        }`}
      >
        <div className="relative flex items-center gap-4 pb-8 pt-8 px-6 border-b border-white/10 after:content-[''] after:absolute after:bottom-0 after:left-6 after:right-6 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent">
          <button
            className="flex items-center justify-center min-w-[44px] h-11 p-2.5 bg-white/10 backdrop-blur-[10px] border border-white/20 text-white text-xl cursor-pointer rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:bg-white/20 hover:scale-105 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-95"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="flex items-center justify-center transition-transform duration-300 ease hover:scale-110">
              {sidebarExpanded ? '←' : '→'}
            </span>
          </button>
          {sidebarExpanded && (
            <h1 className="m-0 text-[1.75rem] font-bold whitespace-nowrap overflow-hidden bg-clip-text text-transparent bg-gradient-to-br from-white to-white/80 tracking-[-0.5px]">
              Rates
            </h1>
          )}
        </div>
        <nav className="flex-1 py-6 overflow-y-auto overflow-x-hidden sidebar-scrollbar">
          <ul className="list-none p-0 m-0">
            <li className={`my-2 ${sidebarExpanded ? 'px-4' : 'px-3'}`}>
              <Link
                to="/dashboard"
                className={`relative flex items-center gap-4 text-white/85 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[14px] font-medium text-[0.95rem] overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/15 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:ease before:rounded-[14px] hover:before:opacity-100 hover:text-white hover:translate-x-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${
                  sidebarExpanded
                    ? 'px-5 py-4 justify-start'
                    : 'p-4 justify-center'
                } ${
                  isActive('/dashboard')
                    ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] before:opacity-100'
                    : ''
                }`}
                title="Dashboard"
              >
                <span className="text-xl flex items-center justify-center min-w-6">
                  📊
                </span>
                {sidebarExpanded && <span>Dashboard</span>}
              </Link>
            </li>
            <li
              className={`relative my-2 ${sidebarExpanded ? 'px-4' : 'px-3'}`}
            >
              <div>
                <button
                  className={`relative flex items-center gap-4 w-full border-0 bg-transparent cursor-pointer text-left text-white/85 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[14px] font-medium text-[0.95rem] overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/15 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:ease before:rounded-[14px] hover:before:opacity-100 hover:text-white hover:translate-x-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${
                    sidebarExpanded
                      ? 'px-5 py-4 justify-start'
                      : 'p-4 justify-center'
                  } ${
                    isAccountsRoute
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] before:opacity-100'
                      : ''
                  }`}
                  onClick={toggleAccountsMenu}
                  title="Accounts"
                >
                  <span className="text-xl flex items-center justify-center min-w-6">
                    📁
                  </span>
                  {sidebarExpanded && (
                    <>
                      <span>Accounts</span>
                      <span
                        className={`ml-auto text-xs transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] opacity-70 ${
                          accountsMenuOpen ? 'rotate-180' : ''
                        }`}
                      >
                        ▼
                      </span>
                    </>
                  )}
                </button>
                {sidebarExpanded && accountsMenuOpen && (
                  <ul className="list-none p-0 mt-2 pl-10 animate-slideDown">
                    {ACCOUNT_TYPES.map((accountType) => (
                      <li key={accountType.type} className="my-1 p-0">
                        <Link
                          to={`/accounts/${accountType.type}`}
                          className={`relative flex items-center gap-3 px-4 py-3 text-white/70 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[10px] font-medium text-sm overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:ease before:rounded-[10px] hover:before:opacity-100 hover:text-white hover:translate-x-1 hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] ${
                            isActive(`/accounts/${accountType.type}`)
                              ? 'bg-white/15 text-white shadow-[0_2px_8px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] before:opacity-100'
                              : ''
                          }`}
                          title={accountType.label}
                        >
                          <span className="text-base flex items-center justify-center min-w-6">
                            {accountType.icon}
                          </span>
                          <span>{accountType.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
            <li className={`my-2 ${sidebarExpanded ? 'px-4' : 'px-3'}`}>
              <Link
                to="/migrate"
                className={`relative flex items-center gap-4 text-white/85 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[14px] font-medium text-[0.95rem] overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/15 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:ease before:rounded-[14px] hover:before:opacity-100 hover:text-white hover:translate-x-1 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] ${
                  sidebarExpanded
                    ? 'px-5 py-4 justify-start'
                    : 'p-4 justify-center'
                } ${
                  isActive('/migrate')
                    ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.3)] before:opacity-100'
                    : ''
                }`}
                title="Migrate Accounts"
              >
                <span className="text-xl flex items-center justify-center min-w-6">
                  🔄
                </span>
                {sidebarExpanded && <span>Migrate Accounts</span>}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="relative p-6 border-t border-white/10 before:content-[''] before:absolute before:top-0 before:left-6 before:right-6 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent">
          {sidebarExpanded && (
            <button
              className="relative w-full px-5 py-3.5 bg-white/15 backdrop-blur-[10px] text-white border border-white/25 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] overflow-hidden before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:w-0 before:h-0 before:rounded-full before:bg-white/20 before:-translate-x-1/2 before:-translate-y-1/2 before:transition-[width,height] before:duration-600 hover:before:w-[300px] hover:before:h-[300px] hover:bg-white/25 hover:border-white/40 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:translate-y-0"
              onClick={() => void signOut()}
            >
              <span className="mr-2 text-lg">🚪</span>
              Sign Out
            </button>
          )}
          {!sidebarExpanded && (
            <button
              className="w-full p-3.5 bg-white/15 backdrop-blur-[10px] text-white border border-white/25 rounded-xl cursor-pointer text-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center hover:bg-white/25 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
              onClick={() => void signOut()}
              title="Sign Out"
            >
              <span>🚪</span>
            </button>
          )}
        </div>
      </aside>
      <main
        className={`flex flex-col min-h-screen h-screen max-h-screen relative z-[1] overflow-hidden bg-transparent transition-[margin-left,width] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarExpanded
            ? 'ml-[280px] w-[calc(100%-280px)] md:ml-[240px] md:w-[calc(100%-240px)] xs:ml-[200px] xs:w-[calc(100%-200px)]'
            : 'ml-20 w-[calc(100%-80px)] md:ml-20 md:w-[calc(100%-80px)] xs:ml-[60px] xs:w-[calc(100%-60px)]'
        }`}
      >
        <SearchBar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-10 px-10 max-w-full w-full mx-auto box-border main-scrollbar md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
