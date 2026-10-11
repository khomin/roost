// ─── Protected Route ──────────────────────────────────────────────────────────
// Wrap any route with this to ensure only authenticated users can access it.
// While auth is still initializing we show a full-screen spinner so there's
// no flash of the landing page for already-logged-in users.

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isInitialized, isAuthenticated } = useAuth();

  // Auth check not complete yet – show a neutral loading state
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
