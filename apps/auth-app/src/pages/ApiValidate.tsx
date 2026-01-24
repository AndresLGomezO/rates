import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  validateTokenAPI,
  type ValidationResponse,
} from '../utils/apiValidate';

/**
 * API endpoint for token validation
 *
 * Route: /api/validate
 * Method: GET
 * Query params:
 *   - token: Firebase ID token to validate (required)
 *
 * Returns JSON response:
 *   {
 *     valid: boolean,
 *     error?: string,
 *     refreshedToken?: string,
 *     expiresAt?: number
 *   }
 */
export default function ApiValidate() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    // This component only renders JSON, so we handle the response immediately
    const handleValidation = async () => {
      if (!token) {
        // Return error response
        const errorResponse: ValidationResponse = {
          valid: false,
          error: 'Token parameter is required',
        };
        document.documentElement.innerHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Token Validation API</title></head><body><pre>${JSON.stringify(errorResponse, null, 2)}</pre></body></html>`;
        return;
      }

      try {
        const result = await validateTokenAPI(token, user);

        // Return JSON response
        document.documentElement.innerHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Token Validation API</title></head><body><pre>${JSON.stringify(result, null, 2)}</pre></body></html>`;
      } catch (error) {
        const errorResponse: ValidationResponse = {
          valid: false,
          error: error instanceof Error ? error.message : 'Validation failed',
        };
        document.documentElement.innerHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Token Validation API</title></head><body><pre>${JSON.stringify(errorResponse, null, 2)}</pre></body></html>`;
      }
    };

    // Wait for auth state to be ready if loading
    if (!loading) {
      void handleValidation();
    }
  }, [token, user, loading]);

  // Show loading state while validating
  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="m-0 text-slate-600">Validating token...</div>
      </div>
    );
  }

  // This should not render normally as we replace the document
  return (
    <div className="grid gap-4">
      <div className="m-0 text-slate-600">Processing validation request...</div>
    </div>
  );
}
