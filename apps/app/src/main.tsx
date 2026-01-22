import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import './firebase'; // Initialize Firebase
// CI/CD trigger
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthRedirectHandler } from './components/AuthRedirectHandler';
import { PublicLayout } from './components/PublicLayout';
import { PrivateLayout } from './components/PrivateLayout';

// Lazy load pages for code-splitting
const Login = lazy(() => import('./pages/Login.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const AccountsByType = lazy(() => import('./pages/AccountsByType.tsx'));
const AccountDetail = lazy(() => import('./pages/AccountDetail.tsx'));
const MigrateAccounts = lazy(() => import('./pages/MigrateAccounts.tsx'));

// Loading fallback component
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-[50px] w-[50px] animate-spin rounded-full border-4 border-neutral-600/40 border-t-neutral-500/60"></div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        <AuthRedirectHandler />
        <Outlet />
      </>
    ),
    children: [
      {
        path: 'login',
        element: (
          <PublicLayout>
            <Suspense fallback={<PageLoader />}>
              <Login />
            </Suspense>
          </PublicLayout>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'accounts/:type',
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <Suspense fallback={<PageLoader />}>
                <AccountsByType />
              </Suspense>
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'account/:accountNumber',
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <Suspense fallback={<PageLoader />}>
                <AccountDetail />
              </Suspense>
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'migrate',
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <Suspense fallback={<PageLoader />}>
                <MigrateAccounts />
              </Suspense>
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
      {
        index: true,
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
