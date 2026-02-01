import { useState, useEffect, type PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DebugIndicator } from './DebugIndicator';
import { SearchBar } from './SearchBar';
import { AIAssistant } from './ai/AIAssistant';
import { SmartNotifications } from './ai/SmartNotifications';

interface Category {
  readonly type: string;
  readonly label: string;
  readonly icon: string;
  readonly subcategories: readonly {
    readonly type: string;
    readonly label: string;
    readonly icon: string;
  }[];
}

const ACCOUNT_CATEGORIES: readonly Category[] = [
  {
    type: 'installment_loan',
    label: 'Installment Loans',
    icon: '🏦',
    subcategories: [
      { type: 'mortgage', label: 'Mortgages', icon: '🏠' },
      { type: 'auto', label: 'Auto Loans', icon: '🚗' },
      { type: 'personal', label: 'Personal Loans', icon: '👤' },
      { type: 'student', label: 'Student Loans', icon: '🎓' },
      { type: 'other', label: 'Other', icon: '📋' },
    ],
  },
  {
    type: 'revolving_credit',
    label: 'Revolving Credit',
    icon: '💳',
    subcategories: [
      { type: 'credit_card', label: 'Credit Cards', icon: '💳' },
      { type: 'line_of_credit', label: 'Lines of Credit', icon: '💰' },
      { type: 'store_card', label: 'Store Cards', icon: '🏪' },
      { type: 'overdraft', label: 'Overdraft', icon: '🔄' },
      { type: 'other', label: 'Other', icon: '📋' },
    ],
  },
  {
    type: 'bill',
    label: 'Bills',
    icon: '📄',
    subcategories: [
      { type: 'subscription', label: 'Subscriptions', icon: '📱' },
      { type: 'utility', label: 'Utilities', icon: '💡' },
      { type: 'rent', label: 'Rent', icon: '🏘️' },
      { type: 'insurance', label: 'Insurance', icon: '🛡️' },
      { type: 'tax', label: 'Taxes', icon: '🧾' },
      { type: 'other', label: 'Other', icon: '📋' },
    ],
  },
  {
    type: 'other',
    label: 'Other Accounts',
    icon: '📋',
    subcategories: [],
  },
] as const;

export function PrivateLayout({ children }: PropsWithChildren) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const location = useLocation();

  const isAccountsRoute = location.pathname.startsWith('/accounts/');
  const [accountsMenuOpen, setAccountsMenuOpen] = useState(isAccountsRoute);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  // Auto-open accounts menu when on accounts route
  useEffect(() => {
    if (isAccountsRoute) {
      setAccountsMenuOpen(true);
    }
  }, [isAccountsRoute]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleAccountsMenu = () => {
    setAccountsMenuOpen(!accountsMenuOpen);
  };

  const toggleCategory = (categoryType: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryType]: !prev[categoryType],
    }));
  };

  const isActive = (path: string) => location.pathname === path;

  // Handle link click on mobile - close menu
  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="relative flex h-screen max-h-screen min-h-screen w-full animate-gradient-shift overflow-hidden bg-[linear-gradient(135deg,#1e40af_0%,#334155_25%,#1e3a8a_50%,#475569_75%,#0f172a_100%)] bg-[length:400%_400%] before:pointer-events-none before:fixed before:inset-0 before:z-0 before:bg-[radial-gradient(circle_at_20%_50%,rgba(30,58,138,0.3)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(217,119,6,0.2)_0%,transparent_50%),radial-gradient(circle_at_40%_20%,rgba(37,99,235,0.25)_0%,transparent_50%)] before:content-['']">
      {/* Mobile backdrop overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
      <aside
        className={`duration-400 glass-sidebar fixed left-0 top-0 z-sidebar flex h-screen max-h-screen flex-col overflow-hidden text-white transition-all ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isMobileMenuOpen
            ? 'w-[280px] translate-x-0'
            : '-translate-x-full md:translate-x-0'
        } ${
          sidebarExpanded
            ? 'md:w-[280px] lg:w-[280px]'
            : 'md:w-[80px] lg:w-[80px]'
        } md:w-[240px]`}
      >
        <div className="relative flex items-center gap-4 border-b border-neutral-700/30 px-6 pb-8 pt-8 after:absolute after:bottom-0 after:left-6 after:right-6 after:h-px after:bg-gradient-to-r after:from-transparent after:via-neutral-600/40 after:to-transparent after:content-['']">
          <button
            className="hidden h-11 min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-neutral-600/40 bg-white/10 p-2.5 text-xl text-white shadow-[0_4px_12px_rgba(10,14,26,0.3)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:border-neutral-500/50 hover:bg-white/20 hover:shadow-[0_6px_20px_rgba(10,14,26,0.4)] active:scale-95 md:flex"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="ease flex items-center justify-center transition-transform duration-300 hover:scale-110">
              {sidebarExpanded ? '←' : '→'}
            </span>
          </button>
          {(sidebarExpanded || isMobileMenuOpen) && (
            <h1 className="m-0 overflow-hidden whitespace-nowrap bg-gradient-to-br from-white to-white/80 bg-clip-text text-[1.75rem] font-bold tracking-[-0.5px] text-transparent">
              Rates
            </h1>
          )}
        </div>
        <nav className="sidebar-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-6">
          <ul className="m-0 list-none p-0">
            <li
              className={`my-2 ${sidebarExpanded || isMobileMenuOpen ? 'px-4' : 'px-3'}`}
            >
              <Link
                to="/dashboard"
                onClick={handleMobileLinkClick}
                className={`before:ease relative flex items-center gap-4 overflow-hidden rounded-lg text-[0.95rem] font-medium text-white/85 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:translate-x-1 hover:text-white hover:shadow-[0_4px_12px_rgba(10,14,26,0.3)] hover:before:opacity-100 ${
                  sidebarExpanded || isMobileMenuOpen
                    ? 'justify-start px-5 py-4'
                    : 'justify-center p-4'
                } ${
                  isActive('/dashboard')
                    ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(10,14,26,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] before:opacity-100'
                    : ''
                }`}
                title="Dashboard"
              >
                <span className="flex min-w-6 items-center justify-center text-xl">
                  📊
                </span>
                {(sidebarExpanded || isMobileMenuOpen) && (
                  <span>Dashboard</span>
                )}
              </Link>
            </li>
            <li
              className={`relative my-2 ${sidebarExpanded || isMobileMenuOpen ? 'px-4' : 'px-3'}`}
            >
              <div>
                <button
                  className={`before:ease relative flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-lg border-0 bg-transparent text-left text-[0.95rem] font-medium text-white/85 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:translate-x-1 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:before:opacity-100 ${
                    sidebarExpanded || isMobileMenuOpen
                      ? 'justify-start px-5 py-4'
                      : 'justify-center p-4'
                  } ${
                    isAccountsRoute
                      ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(10,14,26,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] before:opacity-100'
                      : ''
                  }`}
                  onClick={toggleAccountsMenu}
                  title="Accounts"
                >
                  <span className="flex min-w-6 items-center justify-center text-xl">
                    📁
                  </span>
                  {(sidebarExpanded || isMobileMenuOpen) && (
                    <>
                      <span>Accounts</span>
                      <span
                        className={`ml-auto text-sm opacity-70 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                          accountsMenuOpen ? 'rotate-180' : ''
                        }`}
                      >
                        ▼
                      </span>
                    </>
                  )}
                </button>
                {(sidebarExpanded || isMobileMenuOpen) && accountsMenuOpen && (
                  <ul className="mt-2 animate-slideDown list-none p-0 pl-6">
                    {ACCOUNT_CATEGORIES.map((category) => (
                      <li key={category.type} className="my-1 p-0">
                        {category.subcategories.length > 0 ? (
                          <>
                            <div
                              className={`before:ease relative flex w-full items-center overflow-hidden rounded-md border-0 bg-transparent text-left text-sm font-medium text-white/70 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:inset-0 before:rounded-md before:bg-gradient-to-br before:from-white/10 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:translate-x-1 hover:text-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:before:opacity-100 ${
                                location.pathname.includes(
                                  `/accounts/${category.type}`
                                )
                                  ? 'bg-white/15 text-white shadow-[0_2px_8px_rgba(10,14,26,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] before:opacity-100'
                                  : ''
                              }`}
                              title={category.label}
                            >
                              <Link
                                to={`/accounts/${category.type}`}
                                onClick={handleMobileLinkClick}
                                className="relative z-10 flex flex-1 items-center gap-3 py-3 pl-4 text-inherit no-underline"
                              >
                                <span className="flex min-w-6 items-center justify-center text-base">
                                  {category.icon}
                                </span>
                                <span className="flex-1">{category.label}</span>
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleCategory(category.type);
                                }}
                                className="relative z-10 flex h-full cursor-pointer items-center justify-center px-4 py-3 hover:text-white"
                                aria-label="Toggle subcategories"
                              >
                                <span
                                  className={`text-sm opacity-70 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                                    expandedCategories[category.type]
                                      ? 'rotate-180'
                                      : ''
                                  }`}
                                >
                                  ▼
                                </span>
                              </button>
                            </div>
                            {expandedCategories[category.type] && (
                              <ul className="mt-1 animate-slideDown list-none p-0 pl-8">
                                {category.subcategories.map((subcat) => (
                                  <li key={subcat.type} className="my-1 p-0">
                                    <Link
                                      to={`/accounts/${category.type}/${subcat.type}`}
                                      onClick={handleMobileLinkClick}
                                      className={`before:ease relative flex items-center gap-3 overflow-hidden rounded-md px-4 py-2.5 text-xs font-medium text-white/60 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:inset-0 before:rounded-md before:bg-gradient-to-br before:from-white/10 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:translate-x-1 hover:text-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:before:opacity-100 ${
                                        isActive(
                                          `/accounts/${category.type}/${subcat.type}`
                                        )
                                          ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(10,14,26,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] before:opacity-100'
                                          : ''
                                      }`}
                                      title={subcat.label}
                                    >
                                      <span className="flex min-w-5 items-center justify-center text-sm">
                                        {subcat.icon}
                                      </span>
                                      <span>{subcat.label}</span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <Link
                            to={`/accounts/${category.type}`}
                            onClick={handleMobileLinkClick}
                            className={`before:ease relative flex items-center gap-3 overflow-hidden rounded-md px-4 py-3 text-sm font-medium text-white/70 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:inset-0 before:rounded-md before:bg-gradient-to-br before:from-white/10 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:translate-x-1 hover:text-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:before:opacity-100 ${
                              isActive(`/accounts/${category.type}`)
                                ? 'bg-white/15 text-white shadow-[0_2px_8px_rgba(10,14,26,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] before:opacity-100'
                                : ''
                            }`}
                            title={category.label}
                          >
                            <span className="flex min-w-6 items-center justify-center text-base">
                              {category.icon}
                            </span>
                            <span>{category.label}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
            <li
              className={`my-2 ${sidebarExpanded || isMobileMenuOpen ? 'px-4' : 'px-3'}`}
            >
              <Link
                to="/migrate"
                onClick={handleMobileLinkClick}
                className={`before:ease relative flex items-center gap-4 overflow-hidden rounded-lg text-[0.95rem] font-medium text-white/85 no-underline transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/15 before:to-white/5 before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] hover:translate-x-1 hover:text-white hover:shadow-[0_4px_12px_rgba(10,14,26,0.3)] hover:before:opacity-100 ${
                  sidebarExpanded || isMobileMenuOpen
                    ? 'justify-start px-5 py-4'
                    : 'justify-center p-4'
                } ${
                  isActive('/migrate')
                    ? 'bg-white/20 text-white shadow-[0_4px_16px_rgba(10,14,26,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] before:opacity-100'
                    : ''
                }`}
                title="Migrate Accounts"
              >
                <span className="flex min-w-6 items-center justify-center text-xl">
                  🔄
                </span>
                {(sidebarExpanded || isMobileMenuOpen) && (
                  <span>Migrate Accounts</span>
                )}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="relative border-t border-neutral-700/30 p-6 before:absolute before:left-6 before:right-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-neutral-600/40 before:to-transparent before:content-['']">
          {(sidebarExpanded || isMobileMenuOpen) && (
            <>
              <DebugIndicator position="inline" />
              <button
                className="before:duration-600 relative w-full cursor-pointer overflow-hidden rounded-lg border border-neutral-600/40 bg-white/15 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(10,14,26,0.3)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] before:absolute before:left-1/2 before:top-1/2 before:h-0 before:w-0 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-white/20 before:transition-[width,height] before:content-[''] hover:-translate-y-0.5 hover:border-neutral-500/50 hover:bg-white/25 hover:shadow-[0_6px_20px_rgba(10,14,26,0.4)] hover:before:h-[300px] hover:before:w-[300px] active:translate-y-0"
                onClick={() => {
                  void signOut();
                  closeMobileMenu();
                }}
              >
                <span className="mr-2 text-lg">🚪</span>
                Sign Out
              </button>
            </>
          )}
          {!(sidebarExpanded || isMobileMenuOpen) && (
            <button
              className="flex w-full cursor-pointer items-center justify-center rounded-lg border border-neutral-600/40 bg-white/15 p-3.5 text-xl text-white shadow-[0_4px_12px_rgba(10,14,26,0.3)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:border-neutral-500/50 hover:bg-white/25 hover:shadow-[0_6px_20px_rgba(10,14,26,0.4)]"
              onClick={() => {
                void signOut();
                closeMobileMenu();
              }}
              title="Sign Out"
            >
              <span>🚪</span>
            </button>
          )}
        </div>
      </aside>
      <main
        className={`duration-400 relative z-[1] flex h-screen max-h-screen min-h-screen min-w-0 flex-col overflow-hidden bg-transparent transition-[margin-left,width] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarExpanded
            ? 'ml-0 w-full md:ml-[280px] md:w-[calc(100%-280px)] lg:ml-[280px] lg:w-[calc(100%-280px)]'
            : 'ml-0 w-full md:ml-20 md:w-[calc(100%-80px)] lg:ml-20 lg:w-[calc(100%-80px)]'
        }`}
      >
        {/* Mobile header with hamburger and search */}
        <div className="sticky top-0 z-[80] md:hidden">
          <div className="flex items-center gap-3 border-b border-neutral-700/30 bg-white/5 px-4 py-3 backdrop-blur-[10px]">
            <button
              className="flex h-11 min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-neutral-600/40 bg-white/10 p-2.5 text-xl text-white shadow-[0_4px_12px_rgba(10,14,26,0.3)] backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:border-neutral-500/50 hover:bg-white/20 hover:shadow-[0_6px_20px_rgba(10,14,26,0.4)] active:scale-95"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="ease flex items-center justify-center transition-transform duration-300">
                {isMobileMenuOpen ? '✕' : '☰'}
              </span>
            </button>
            <h1 className="m-0 flex-1 overflow-hidden whitespace-nowrap bg-gradient-to-br from-white to-white/80 bg-clip-text text-xl font-bold tracking-[-0.5px] text-transparent">
              Rates
            </h1>
            <div className="flex flex-shrink-0 items-center gap-2">
              <SmartNotifications />
              <SearchBar showMobileCompact={true} />
            </div>
          </div>
        </div>
        {/* Desktop search bar */}
        <div className="hidden items-center justify-between pr-6 md:flex">
          <div className="flex-1">
            <SearchBar />
          </div>
          <SmartNotifications />
        </div>
        <div className="main-scrollbar mx-auto box-border min-h-0 w-full min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 md:p-6">
          {children}
        </div>
        <AIAssistant />
      </main>
    </div>
  );
}
