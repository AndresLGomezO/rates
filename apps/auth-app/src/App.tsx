// Cloud Build trigger entry point
import { Link, Outlet, useLocation } from 'react-router-dom';
import { DebugIndicator } from './components/DebugIndicator';
import './index.css';

function Header() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="flex justify-between items-center gap-3 flex-wrap">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">
          Auth Service
        </div>
        <h1 className="text-2xl m-0 text-slate-900">Rates Authentication</h1>
        <p className="m-0 text-slate-600">
          Centralized login & signup with redirect + optional auth cookie.
        </p>
      </div>
      <div className="flex justify-between gap-3 flex-wrap">
        {path !== '/login' && (
          <Link
            className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-slate-200 text-slate-900 shadow-none transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px"
            to="/login"
          >
            Login
          </Link>
        )}
        {path !== '/signup' && (
          <Link
            className="px-4 py-2.5 rounded-[10px] border-0 font-bold cursor-pointer inline-flex items-center gap-2 bg-slate-200 text-slate-900 shadow-none transition-[transform,box-shadow] duration-150 ease hover:-translate-y-px"
            to="/signup"
          >
            Create account
          </Link>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-[min(960px,100%)] bg-white rounded-2xl shadow-[0_15px_40px_rgba(15,23,42,0.08)] p-6 grid gap-4">
        <Header />
        <Outlet />
      </div>
      <DebugIndicator />
    </div>
  );
}
