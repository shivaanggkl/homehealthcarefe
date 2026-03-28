import { AgencyRole } from '../auth/session-api';
import { FrontendAccessOverride } from '../auth/session-storage';

export type FrontendPermission =
  | 'view_session_home'
  | 'manage_self_password'
  | 'manage_self_mfa'
  | 'manage_self_sessions'
  | 'manage_security_settings'
  | 'manage_agency_mfa_policy'
  | 'manage_admin_notifications';

export type BranchScopeKind = 'agency-wide' | 'agency-wide-read' | 'branch-assigned';

export type FrontendAccessProfile = {
  role: AgencyRole;
  roleLabel: string;
  branchScope: BranchScopeKind;
  branchScopeLabel: string;
  assignedBranchIds: string[];
  permissions: FrontendPermission[];
  defaultRoute: string;
  source: 'fallback' | 'override';
};

export type AppRouteDefinition = {
  path: string;
  navLabel: string;
  permission: FrontendPermission;
  description: string;
  navBehavior: 'visible' | 'disabled';
};

type RoleDefinition = Omit<FrontendAccessProfile, 'assignedBranchIds' | 'source'>;

const COMMON_SELF_SERVICE_PERMISSIONS: FrontendPermission[] = [
  'view_session_home',
  'manage_self_password',
  'manage_self_mfa',
  'manage_self_sessions',
];

const ROLE_DEFINITIONS: Record<AgencyRole, RoleDefinition> = {
  AGENCY_OWNER: {
    role: 'AGENCY_OWNER',
    roleLabel: 'Agency Owner',
    branchScope: 'agency-wide',
    branchScopeLabel: 'Agency-wide branch access',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'manage_security_settings',
      'manage_agency_mfa_policy',
      'manage_admin_notifications',
    ],
    defaultRoute: '/app/settings/security',
  },
  BRANCH_ADMIN: {
    role: 'BRANCH_ADMIN',
    roleLabel: 'Branch Admin',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'manage_agency_mfa_policy',
      'manage_admin_notifications',
    ],
    defaultRoute: '/app/settings/admin-notifications',
  },
  SCHEDULER_COORDINATOR: {
    role: 'SCHEDULER_COORDINATOR',
    roleLabel: 'Scheduler Coordinator',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [...COMMON_SELF_SERVICE_PERMISSIONS],
    defaultRoute: '/app/home',
  },
  CAREGIVER: {
    role: 'CAREGIVER',
    roleLabel: 'Caregiver',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [...COMMON_SELF_SERVICE_PERMISSIONS],
    defaultRoute: '/app/settings/mfa',
  },
  QA_CLINICAL_REVIEWER: {
    role: 'QA_CLINICAL_REVIEWER',
    roleLabel: 'QA Clinical Reviewer',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [...COMMON_SELF_SERVICE_PERMISSIONS],
    defaultRoute: '/app/home',
  },
  BILLING_BACK_OFFICE: {
    role: 'BILLING_BACK_OFFICE',
    roleLabel: 'Billing Back Office',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [...COMMON_SELF_SERVICE_PERMISSIONS],
    defaultRoute: '/app/home',
  },
  READ_ONLY_AUDITOR: {
    role: 'READ_ONLY_AUDITOR',
    roleLabel: 'Read Only Auditor',
    branchScope: 'agency-wide-read',
    branchScopeLabel: 'Agency-wide read scope',
    permissions: [...COMMON_SELF_SERVICE_PERMISSIONS],
    defaultRoute: '/app/home',
  },
};

export const APP_ROUTES: AppRouteDefinition[] = [
  {
    path: '/app/home',
    navLabel: 'Session Home',
    permission: 'view_session_home',
    description: 'Authenticated session dashboard and backend session snapshot.',
    navBehavior: 'visible',
  },
  {
    path: '/app/settings/password',
    navLabel: 'Change Password',
    permission: 'manage_self_password',
    description: 'Authenticated password change settings.',
    navBehavior: 'visible',
  },
  {
    path: '/app/settings/mfa',
    navLabel: 'MFA Settings',
    permission: 'manage_self_mfa',
    description: 'Self-service MFA enrollment and status.',
    navBehavior: 'visible',
  },
  {
    path: '/app/settings/security',
    navLabel: 'Security Settings',
    permission: 'manage_security_settings',
    description: 'Owner-facing consolidated security settings.',
    navBehavior: 'disabled',
  },
  {
    path: '/app/settings/admin-mfa-policy',
    navLabel: 'Agency MFA Policy',
    permission: 'manage_agency_mfa_policy',
    description: 'Admin-only agency MFA enforcement settings.',
    navBehavior: 'disabled',
  },
  {
    path: '/app/settings/admin-notifications',
    navLabel: 'Admin Notifications',
    permission: 'manage_admin_notifications',
    description: 'Admin-only critical account notification preferences.',
    navBehavior: 'disabled',
  },
  {
    path: '/app/settings/sessions',
    navLabel: 'Active Sessions',
    permission: 'manage_self_sessions',
    description: 'Review and revoke your active sessions.',
    navBehavior: 'visible',
  },
];

function normalizeAssignedBranchIds(role: AgencyRole, branchIds?: string[]): string[] {
  const roleDefinition = ROLE_DEFINITIONS[role];
  if (roleDefinition.branchScope !== 'branch-assigned') {
    return [];
  }

  const normalized = (branchIds ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? [...new Set(normalized)] : ['branch-a'];
}

export function buildAccessProfile(
  override: FrontendAccessOverride | null,
): FrontendAccessProfile {
  const role = override?.role ?? 'CAREGIVER';
  const definition = ROLE_DEFINITIONS[role];

  return {
    ...definition,
    assignedBranchIds: normalizeAssignedBranchIds(role, override?.assignedBranchIds),
    source: override ? 'override' : 'fallback',
  };
}

export function canAccessPermission(
  profile: FrontendAccessProfile,
  permission: FrontendPermission,
): boolean {
  return profile.permissions.includes(permission);
}

export function routeForPath(pathname: string): AppRouteDefinition | undefined {
  return APP_ROUTES.find((route) => route.path === pathname);
}
