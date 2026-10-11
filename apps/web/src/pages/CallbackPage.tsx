// ─── OAuth2 Callback Page ─────────────────────────────────────────────────────
// Keycloak redirects here after the user logs in.
// We exchange the ?code= for tokens, then push to /live

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keycloakService } from '../auth/KeycloakService';

type CallbackParams =
  | { code: string; state: string; error?: undefined }
  | { error: string; code?: undefined; state?: undefined };

function readCallbackParams(): CallbackParams {
  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get('error');
  if (errorParam) {
    return {
      error: `Keycloak returned an error: ${errorParam} – ${params.get('error_description') ?? ''}`,
    };
  }
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) {
    return { error: 'Missing code or state in callback URL.' };
  }
  return { code, state };
}

export default function CallbackPage() {
  const navigate = useNavigate();
  const [callback] = useState<CallbackParams>(readCallbackParams);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (!callback.code || handled.current) return;
    handled.current = true;

    keycloakService
      .handleCallback(callback.code, callback.state)
      .then(() => {
        // Tell AuthContext to re-read the tokens from sessionStorage
        const sync = (keycloakService as unknown as Record<string, unknown>).__syncAfterCallback;
        if (typeof sync === 'function') sync();
        navigate('/live', { replace: true });
      })
      .catch((err: Error) => {
        setExchangeError(err.message);
      });
  }, [callback, navigate]);

  const error = callback.error ?? exchangeError;

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
