import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import './firebase'; // Initialize Firebase
import './index.css';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AccountsByType from './pages/AccountsByType.tsx';
import MigrateAccounts from './pages/MigrateAccounts.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthRedirectHandler } from './components/AuthRedirectHandler';
import { PublicLayout } from './components/PublicLayout';
import { PrivateLayout } from './components/PrivateLayout';

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
            <Login />
          </PublicLayout>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <Dashboard />
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'accounts/:type',
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <AccountsByType />
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'migrate',
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <MigrateAccounts />
            </PrivateLayout>
          </ProtectedRoute>
        ),
      },
      {
        index: true,
        element: (
          <ProtectedRoute>
            <PrivateLayout>
              <Dashboard />
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
