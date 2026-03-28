import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '../auth/auth-context';
import { useAccess } from '../access/access-context';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { RouteAccessBoundary } from './RouteAccessBoundary';

export function ProtectedRoute({
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
  const { profile } = useAccess();
  const location = useLocation();

  if (state.status === 'bootstrapping') {
    return null;
  }

  if (state.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (requiredPermission && !canAccessPermission(profile, requiredPermission)) {
    return (
      <RouteAccessBoundary
        message={
          deniedMessage ??
          'Your current frontend access profile does not include the permission required for this route.'
        }
        permission={requiredPermission}
        title={deniedTitle ?? 'This route is not available for the current access profile.'}
      />
    );
  }

  return <>{children}</>;
}
