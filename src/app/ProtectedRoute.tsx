import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="auth-page">
        <span className="loading-label">Carregando…</span>
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
