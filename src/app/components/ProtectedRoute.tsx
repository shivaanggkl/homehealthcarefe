import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '../auth/auth-context';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'bootstrapping') {
    return null;
  }

  if (state.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <>{children}</>;
}
