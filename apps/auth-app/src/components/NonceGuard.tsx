import { useEffect, useState, type PropsWithChildren } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getNonceFromUrl, validateNonce } from '../utils/nonce';

type NonceGuardProps = PropsWithChildren<{
  redirectTo: string | null;
  onInvalid: (error: string) => void;
}>;

/**
 * Guard component that validates nonce before rendering children
 * Shows error if nonce is invalid or missing
 */
export function NonceGuard({
  children,
  redirectTo,
  onInvalid,
}: NonceGuardProps) {
  const [searchParams] = useSearchParams();
  const [isValidating, setValidating] = useState(true);
  const [isValid, setValid] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const nonce = getNonceFromUrl(searchParams);
        const result = await validateNonce(nonce);

        if (!result.isValid) {
          onInvalid(result.error ?? 'Invalid nonce');
          setValid(false);
        } else {
          setValid(true);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Nonce validation failed';
        onInvalid(message);
        setValid(false);
      } finally {
        setValidating(false);
      }
    })();
  }, [searchParams, redirectTo, onInvalid]);

  if (isValidating) {
    return (
      <div className="grid">
        <div className="muted">Validating request security...</div>
      </div>
    );
  }

  if (!isValid) {
    return null; // Error shown via onInvalid callback
  }

  return <>{children}</>;
}
