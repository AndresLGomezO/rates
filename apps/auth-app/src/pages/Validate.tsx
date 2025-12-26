import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFriendlyError } from '../utils/errors';
import {
  validateTokenAPI,
  type ValidationResponse,
} from '../utils/apiValidate';

/**
 * Token validation page
 * Validates Firebase ID tokens and can refresh or revoke them
 *
 * This page can be accessed via:
 * - GET /validate?token=<token> - Validate a token
 * - POST /validate - Validate token from request body
 */
export default function Validate() {
  const { user, loading, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [validationResult, setValidationResult] =
    useState<ValidationResponse | null>(null);
  const [isValidating, setValidating] = useState(false);

  useEffect(() => {
    // If token is provided in URL, validate it
    if (tokenParam && !isValidating && !validationResult) {
      void validateTokenFromParam(tokenParam);
    } else if (!tokenParam && user && !loading) {
      // If no token param but user is authenticated, validate current user's token
      void validateCurrentUserToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam, user, loading]);

  async function validateTokenFromParam(token: string) {
    setValidating(true);
    try {
      const result = await validateTokenAPI(token, user);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        error: getFriendlyError(error),
      });
    } finally {
      setValidating(false);
    }
  }

  async function validateCurrentUserToken() {
    if (!user) {
      setValidationResult({
        valid: false,
        error: 'No user authenticated',
      });
      return;
    }

    setValidating(true);
    try {
      const token = await user.getIdToken(false);
      const result = await validateTokenAPI(token, user);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        error: getFriendlyError(error),
      });
    } finally {
      setValidating(false);
    }
  }

  async function revokeToken() {
    if (!user) return;

    try {
      // Sign out the user (revokes token)
      // In production, you'd use Admin SDK to revoke specific tokens
      await signOut();
      setValidationResult({
        valid: false,
        error: 'Token revoked',
      });
    } catch (error) {
      setValidationResult({
        valid: false,
        error: getFriendlyError(error),
      });
    }
  }

  // Return JSON response for API calls (when format=json is in query)
  useEffect(() => {
    const isJsonRequest = searchParams.get('format') === 'json';

    if (validationResult && isJsonRequest) {
      // For JSON API requests, return JSON response
      const response = {
        valid: validationResult.valid,
        error: validationResult.error,
        refreshedToken: validationResult.refreshedToken,
        expiresAt: validationResult.expiresAt,
      };

      // Replace entire document with JSON response
      document.documentElement.innerHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Token Validation</title></head><body><pre>${JSON.stringify(response, null, 2)}</pre></body></html>`;
    }
  }, [validationResult, searchParams]);

  if (loading || isValidating) {
    return (
      <div className="grid">
        <div className="muted">Validating token...</div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="badge">Token Validation</div>
      <h2 className="title">Validate Firebase ID Token</h2>

      {validationResult ? (
        <div className="grid">
          {validationResult.valid ? (
            <>
              <div className="success">Token is valid</div>
              {validationResult.refreshedToken && (
                <div className="muted">
                  Token refreshed:{' '}
                  {validationResult.refreshedToken.substring(0, 20)}...
                </div>
              )}
              {validationResult.expiresAt && (
                <div className="muted">
                  Expires at:{' '}
                  {new Date(validationResult.expiresAt).toLocaleString()}
                </div>
              )}
              {user && (
                <div className="actions">
                  <button
                    className="button secondary"
                    onClick={() => void revokeToken()}
                  >
                    Revoke Token
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="error">
              Token is invalid: {validationResult.error}
            </div>
          )}
        </div>
      ) : (
        <div className="grid">
          <p className="muted">
            {tokenParam
              ? 'Validating token from URL...'
              : user
                ? 'Validating current user token...'
                : 'No token provided. Provide ?token=... in URL or authenticate first.'}
          </p>
        </div>
      )}
    </div>
  );
}
