import { type PropsWithChildren } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, redirectToAuth } = useAuth();

  // Synchronously check authentication and redirect immediately if not authenticated
  if (!isAuthenticated) {
    // Redirect immediately without using useEffect
    void redirectToAuth('login');
    // Return null while redirecting
    return null;
  }

  return <>{children}</>;
}
