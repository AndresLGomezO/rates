import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import {
  clearAuthToken,
  getAuthToken,
  isValidTokenFormat,
} from '../utils/auth';
import { buildAuthAppUrl } from '../utils/nonce';

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  redirectToAuth: (
    path?: 'login' | 'signup' | 'session' | 'logout'
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_APP_URL =
  (import.meta.env as Record<string, string | undefined>).VITE_AUTH_APP_URL ??
  'http://localhost:5175';

// Store for token state that can be subscribed to
let tokenState: string | null = null;
const listeners: Set<() => void> = new Set();

function getTokenSnapshot(): string | null {
  // Synchronously get token from storage
  // getAuthToken(false) returns string | null
  const result = getAuthToken(false);
  const currentToken: string | null =
    typeof result === 'string' ? result : null;

  // Only set token if it has valid format
  if (currentToken && isValidTokenFormat(currentToken)) {
    if (tokenState !== currentToken) {
      tokenState = currentToken;
      // Notify listeners
      listeners.forEach((listener) => listener());
    }
    return currentToken;
  }

  // No token or invalid format
  if (tokenState !== null) {
    tokenState = null;
    listeners.forEach((listener) => listener());
  }
  return null;
}

function subscribeToken(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  // Use useSyncExternalStore to synchronously read token state
  const token = useSyncExternalStore(
    subscribeToken,
    getTokenSnapshot,
    getTokenSnapshot
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: token !== null && isValidTokenFormat(token),
      async redirectToAuth(path = 'login') {
        // Preserve the current URL (including path and query) as redirectTo
        // This ensures users return to the page they were trying to access
        const currentUrl = new URL(window.location.href);
        const redirectTo = currentUrl.toString();
        const authUrl = await buildAuthAppUrl(AUTH_APP_URL, redirectTo, path);
        window.location.href = authUrl;
      },
      async signOut() {
        // Clear local token state immediately
        clearAuthToken();
        tokenState = null;
        listeners.forEach((listener) => listener());

        // Redirect to auth-app logout flow
        // After logout, redirect back to home page
        const currentUrl = new URL(window.location.href);
        const redirectTo = new URL('/', currentUrl.origin).toString();
        const logoutUrl = await buildAuthAppUrl(
          AUTH_APP_URL,
          redirectTo,
          'logout'
        );
        window.location.href = logoutUrl;
      },
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
