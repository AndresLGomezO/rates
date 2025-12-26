import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getAuthToken,
  isValidTokenFormat,
  getRedirectToFromUrl,
} from '../utils/auth';
import { validateToken } from '../utils/tokenValidation';

/**
 * Component that handles redirect after authentication
 * Must be inside Router context to use useNavigate
 *
 * This component ensures that after authentication, users are redirected
 * to the original URL they were trying to access (from redirectTo parameter)
 * It also validates tokens via the auth-app API before allowing redirect
 */
export function AuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Extract redirectTo from URL FIRST, before getAuthToken cleans it
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = getRedirectToFromUrl(urlParams);

    // Get token (this will clean URL but we already have redirectTo)
    const result = getAuthToken(true);
    const token = typeof result === 'string' ? result : (result?.token ?? null);
    // Use redirectTo from URL params (extracted above) or from result as fallback
    const finalRedirectTo =
      redirectTo ??
      (typeof result === 'object' ? (result?.redirectTo ?? null) : null);

    // If we have token and redirectTo, validate token and navigate
    if (
      token &&
      isValidTokenFormat(token) &&
      finalRedirectTo &&
      !hasRedirected.current
    ) {
      // Validate token via API before redirecting
      void (async () => {
        try {
          const validationResult = await validateToken(token);

          if (!validationResult.isValid) {
            // Token is invalid, don't redirect - let AuthContext handle it
            console.warn(
              'Invalid token in redirect handler:',
              validationResult.error
            );
            hasRedirected.current = true;
            return;
          }

          // Token is valid, proceed with redirect
          const redirectUrl = new URL(finalRedirectTo);
          // Only redirect if it's the same origin (security check)
          if (redirectUrl.origin === window.location.origin) {
            // Extract pathname and search params (preserve original query params)
            const targetPath = redirectUrl.pathname;
            const targetSearch = new URLSearchParams(redirectUrl.search);
            // Remove auth-related query params from the target URL
            targetSearch.delete('token');
            targetSearch.delete('redirectTo');
            targetSearch.delete('provider');
            targetSearch.delete('expiresIn');
            targetSearch.delete('nonce');

            const finalPath =
              targetPath +
              (targetSearch.toString() ? `?${targetSearch.toString()}` : '');
            const currentPath = location.pathname + location.search;

            // Only navigate if it's different from current location
            if (finalPath !== currentPath) {
              hasRedirected.current = true;
              void navigate(finalPath, { replace: true });
            } else {
              // Already on the target path, just mark as redirected
              hasRedirected.current = true;
            }
          }
        } catch (error) {
          // Invalid URL or validation error, ignore
          console.warn('Error in redirect handler:', error);
          hasRedirected.current = true;
        }
      })();
    } else if (token && isValidTokenFormat(token)) {
      // Token is present but no redirectTo - validate it anyway
      void (async () => {
        const validationResult = await validateToken(token);
        if (!validationResult.isValid) {
          console.warn(
            'Token validation failed in redirect handler:',
            validationResult.error
          );
        }
        hasRedirected.current = true;
      })();
    }
  }, [navigate, location]);

  return null; // This component doesn't render anything
}
