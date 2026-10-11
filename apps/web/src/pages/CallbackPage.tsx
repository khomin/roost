// ─── OAuth2 Callback Page ─────────────────────────────────────────────────────
// Keycloak redirects here after the user logs in.
// We exchange the ?code= for tokens, then push to /live

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keycloakService } from '../auth/KeycloakService';

export default function CallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(`Keycloak returned an error: ${errorParam} – ${params.get('error_description') ?? ''}`);
      return;
    }

    if (!code || !returnedState) {
      setError('Missing code or state in callback URL.');
      return;
    }

    keycloakService
      .handleCallback(code, returnedState)
      .then(() => {
        // Tell AuthContext to re-read the tokens from sessionStorage
        const sync = (keycloakService as any).__syncAfterCallback;
        if (typeof sync === 'function') sync();
        navigate('/dashboard', { replace: true });
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-red-400">Authentication Failed</p>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="mt-6 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center">
        {/* Spinner */}
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="mt-4 text-gray-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
