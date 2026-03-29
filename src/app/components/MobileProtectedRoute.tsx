import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { RouteAccessBoundary } from './RouteAccessBoundary';

export function MobileProtectedRoute({
  children,
  requiredPermission,
  deniedTitle,
  deniedMessage,
}: PropsWithChildren<{
  requiredPermission?: FrontendPermission;
  deniedTitle?: string;
  deniedMessage?: string;
}>) {
  const { state } = useAuth();
  const { profile, loading } = useAccess();
  const location = useLocation();

  if (state.status === 'bootstrapping') {
    return null;
  }

  if (state.status !== 'authenticated') {
    return (
      <Navigate
        replace
        state={{ from: `${location.pathname}${location.search}` }}
        to="/mobile/login"
      />
    );
  }

  if (loading) {
    return null;
  }

  if (requiredPermission && !canAccessPermission(profile, requiredPermission)) {
    return (
      <RouteAccessBoundary
        message={
          deniedMessage ??
          'Your current access profile does not include the permission required for this mobile route.'
        }
        permission={requiredPermission}
        title={deniedTitle ?? 'This mobile route is not available for the current access profile.'}
      />
    );
  }

  return <>{children}</>;
}
