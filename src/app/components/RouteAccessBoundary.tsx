import { PropsWithChildren } from 'react';
import { useAccess } from '../access/access-context';
import { canAccessPermission, FrontendPermission } from '../access/access-control';
import { UnauthorizedRouteState } from './UnauthorizedRouteState';

export function RouteAccessBoundary({
  permission,
  title,
  message,
  children,
}: PropsWithChildren<{
  permission: FrontendPermission;
  title: string;
  message: string;
}>) {
  const { profile } = useAccess();

  if (canAccessPermission(profile, permission)) {
    return <>{children}</>;
  }

  return (
    <UnauthorizedRouteState
      message={message}
      permission={permission}
      profile={profile}
      title={title}
    />
  );
}
