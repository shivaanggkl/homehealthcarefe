import { AgencyRole } from '../auth/session-api';
import { FrontendAccessOverride } from '../auth/session-storage';

export type FrontendPermission =
  | 'view_session_home'
  | 'manage_self_profile'
  | 'manage_self_password'
  | 'manage_self_mfa'
  | 'manage_self_sessions'
  | 'view_workforce_workspace'
  | 'manage_caregiver_profiles'
  | 'manage_caregiver_credentials'
  | 'manage_caregiver_availability'
  | 'manage_caregiver_unavailability'
  | 'view_caregiver_performance'
  | 'view_patient_workspace'
  | 'manage_patient_demographics'
  | 'manage_patient_contacts'
  | 'manage_patient_address'
  | 'manage_patient_eligibility'
  | 'manage_patient_diagnoses'
  | 'manage_patient_payer_links'
  | 'manage_patient_authorizations'
  | 'view_patient_attachments'
  | 'manage_patient_attachments'
  | 'view_setup_console'
  | 'manage_agency_profile_setup'
  | 'manage_service_line_setup'
  | 'manage_visit_type_setup'
  | 'manage_workforce_catalog_setup'
  | 'manage_task_template_setup'
  | 'manage_documentation_template_setup'
  | 'manage_branch_policy_setup'
  | 'manage_alert_rule_setup'
  | 'manage_mileage_pay_setup'
  | 'view_user_directory'
  | 'invite_users'
  | 'edit_user_accounts'
  | 'manage_user_status'
  | 'view_audit_log'
  | 'manage_agency_settings'
  | 'manage_branches'
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
  source: 'fallback' | 'override' | 'backend';
};

export type AppRouteDefinition = {
  path: string;
  navLabel: string;
  permission: FrontendPermission;
  description: string;
  navBehavior: 'visible' | 'disabled';
  section:
    | 'workspace'
    | 'workforce'
    | 'patients'
    | 'configuration'
    | 'people'
    | 'security'
    | 'personal';
  audience?: 'owner-only' | 'admin';
};

type RoleDefinition = Omit<FrontendAccessProfile, 'assignedBranchIds' | 'source'>;

const COMMON_SELF_SERVICE_PERMISSIONS: FrontendPermission[] = [
  'view_session_home',
  'manage_self_profile',
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
      'view_workforce_workspace',
      'manage_caregiver_profiles',
      'manage_caregiver_credentials',
      'manage_caregiver_availability',
      'manage_caregiver_unavailability',
      'view_caregiver_performance',
      'view_patient_workspace',
      'manage_patient_demographics',
      'manage_patient_contacts',
      'manage_patient_address',
      'manage_patient_eligibility',
      'manage_patient_diagnoses',
      'manage_patient_payer_links',
      'manage_patient_authorizations',
      'view_patient_attachments',
      'manage_patient_attachments',
      'view_setup_console',
      'manage_agency_profile_setup',
      'manage_service_line_setup',
      'manage_visit_type_setup',
      'manage_workforce_catalog_setup',
      'manage_task_template_setup',
      'manage_documentation_template_setup',
      'manage_branch_policy_setup',
      'manage_alert_rule_setup',
      'manage_mileage_pay_setup',
      'view_user_directory',
      'invite_users',
      'edit_user_accounts',
      'manage_user_status',
      'view_audit_log',
      'manage_agency_settings',
      'manage_branches',
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
      'view_workforce_workspace',
      'manage_caregiver_profiles',
      'manage_caregiver_credentials',
      'manage_caregiver_availability',
      'manage_caregiver_unavailability',
      'view_caregiver_performance',
      'view_patient_workspace',
      'manage_patient_demographics',
      'manage_patient_contacts',
      'manage_patient_address',
      'manage_patient_eligibility',
      'manage_patient_diagnoses',
      'manage_patient_payer_links',
      'manage_patient_authorizations',
      'view_patient_attachments',
      'manage_patient_attachments',
      'view_setup_console',
      'manage_agency_profile_setup',
      'manage_service_line_setup',
      'manage_visit_type_setup',
      'manage_workforce_catalog_setup',
      'manage_task_template_setup',
      'manage_documentation_template_setup',
      'manage_branch_policy_setup',
      'manage_alert_rule_setup',
      'manage_mileage_pay_setup',
      'view_user_directory',
      'invite_users',
      'edit_user_accounts',
      'manage_user_status',
      'view_audit_log',
      'manage_branches',
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
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'view_workforce_workspace',
      'manage_caregiver_profiles',
      'manage_caregiver_credentials',
      'manage_caregiver_availability',
      'manage_caregiver_unavailability',
      'view_caregiver_performance',
    ],
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
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'view_patient_workspace',
      'manage_patient_eligibility',
      'manage_patient_diagnoses',
      'view_patient_attachments',
    ],
    defaultRoute: '/app/home',
  },
  BILLING_BACK_OFFICE: {
    role: 'BILLING_BACK_OFFICE',
    roleLabel: 'Billing Back Office',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'view_patient_workspace',
      'manage_patient_payer_links',
      'manage_patient_authorizations',
      'view_patient_attachments',
      'view_audit_log',
    ],
    defaultRoute: '/app/home',
  },
  READ_ONLY_AUDITOR: {
    role: 'READ_ONLY_AUDITOR',
    roleLabel: 'Read Only Auditor',
    branchScope: 'agency-wide-read',
    branchScopeLabel: 'Agency-wide read scope',
    permissions: [...COMMON_SELF_SERVICE_PERMISSIONS, 'view_audit_log'],
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
    section: 'workspace',
  },
  {
    path: '/app/workforce',
    navLabel: 'Workforce Workspace',
    permission: 'view_workforce_workspace',
    description: 'Epic 4 caregiver workforce landing area and record workspace entry point.',
    navBehavior: 'visible',
    section: 'workforce',
  },
  {
    path: '/app/workforce/new/profile',
    navLabel: 'New Caregiver',
    permission: 'manage_caregiver_profiles',
    description: 'Create a new caregiver workforce profile with the shared workforce form shell.',
    navBehavior: 'disabled',
    section: 'workforce',
    audience: 'admin',
  },
  {
    path: '/app/patients',
    navLabel: 'Patient Workspace',
    permission: 'view_patient_workspace',
    description: 'Epic 3 patient management landing area and record workspace entry point.',
    navBehavior: 'visible',
    section: 'patients',
  },
  {
    path: '/app/setup',
    navLabel: 'Agency Setup',
    permission: 'view_setup_console',
    description: 'Epic 2 configuration overview and setup information architecture.',
    navBehavior: 'visible',
    section: 'configuration',
  },
  {
    path: '/app/setup/profile',
    navLabel: 'Agency Profile',
    permission: 'manage_agency_profile_setup',
    description: 'Manage agency-level operational profile defaults.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'owner-only',
  },
  {
    path: '/app/setup/catalog/service-lines',
    navLabel: 'Service Lines',
    permission: 'manage_service_line_setup',
    description: 'Manage the agency service line catalog.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/catalog/visit-types',
    navLabel: 'Visit Types',
    permission: 'manage_visit_type_setup',
    description: 'Manage visit classifications and defaults.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/workforce/catalogs',
    navLabel: 'Workforce Catalogs',
    permission: 'manage_workforce_catalog_setup',
    description: 'Manage caregiver skills and certifications.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/templates/tasks',
    navLabel: 'Task Templates',
    permission: 'manage_task_template_setup',
    description: 'Manage reusable task templates.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/templates/documentation',
    navLabel: 'Documentation Templates',
    permission: 'manage_documentation_template_setup',
    description: 'Manage reusable documentation templates and versions.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/policies/branches',
    navLabel: 'Branch Policies',
    permission: 'manage_branch_policy_setup',
    description: 'Manage branch-level policy overrides.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/policies/alerts',
    navLabel: 'Alert Rules',
    permission: 'manage_alert_rule_setup',
    description: 'Manage agency-wide and branch-specific alert rules.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/compensation/mileage-pay',
    navLabel: 'Mileage & Pay',
    permission: 'manage_mileage_pay_setup',
    description: 'Manage mileage reimbursement and pay defaults.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'owner-only',
  },
  {
    path: '/app/settings/password',
    navLabel: 'Change Password',
    permission: 'manage_self_password',
    description: 'Authenticated password change settings.',
    navBehavior: 'visible',
    section: 'personal',
  },
  {
    path: '/app/settings/mfa',
    navLabel: 'MFA Settings',
    permission: 'manage_self_mfa',
    description: 'Self-service MFA enrollment and status.',
    navBehavior: 'visible',
    section: 'personal',
  },
  {
    path: '/app/settings/profile',
    navLabel: 'My Profile',
    permission: 'manage_self_profile',
    description: 'Update your own profile details and preferences.',
    navBehavior: 'visible',
    section: 'personal',
  },
  {
    path: '/app/admin/users',
    navLabel: 'User Directory',
    permission: 'view_user_directory',
    description: 'Admin directory, invite flow, and staff assignment editing.',
    navBehavior: 'visible',
    section: 'people',
    audience: 'admin',
  },
  {
    path: '/app/admin/audit',
    navLabel: 'Audit Log',
    permission: 'view_audit_log',
    description: 'Review sensitive events and export the audit trail.',
    navBehavior: 'visible',
    section: 'people',
    audience: 'admin',
  },
  {
    path: '/app/admin/branches',
    navLabel: 'Branch Management',
    permission: 'manage_branches',
    description: 'Search, create, edit, and deactivate branches.',
    navBehavior: 'disabled',
    section: 'people',
    audience: 'admin',
  },
  {
    path: '/app/settings/agency',
    navLabel: 'Agency Settings',
    permission: 'manage_agency_settings',
    description: 'Owner-only agency profile settings.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'owner-only',
  },
  {
    path: '/app/settings/security',
    navLabel: 'Security Settings',
    permission: 'manage_security_settings',
    description: 'Owner-facing consolidated security settings.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'owner-only',
  },
  {
    path: '/app/settings/admin-mfa-policy',
    navLabel: 'Agency MFA Policy',
    permission: 'manage_agency_mfa_policy',
    description: 'Admin-only agency MFA enforcement settings.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'admin',
  },
  {
    path: '/app/settings/admin-notifications',
    navLabel: 'Admin Notifications',
    permission: 'manage_admin_notifications',
    description: 'Admin-only critical account notification preferences.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'admin',
  },
  {
    path: '/app/settings/sessions',
    navLabel: 'Active Sessions',
    permission: 'manage_self_sessions',
    description: 'Review and revoke your active sessions.',
    navBehavior: 'visible',
    section: 'personal',
  },
];

const BACKEND_PERMISSION_MAPPING: Record<string, FrontendPermission[]> = {
  VIEW_WORKFORCE_DIRECTORY: ['view_workforce_workspace'],
  MANAGE_CAREGIVER_PROFILES: ['view_workforce_workspace', 'manage_caregiver_profiles'],
  MANAGE_CAREGIVER_CREDENTIALS: ['view_workforce_workspace', 'manage_caregiver_credentials'],
  MANAGE_CAREGIVER_AVAILABILITY: ['view_workforce_workspace', 'manage_caregiver_availability'],
  MANAGE_CAREGIVER_UNAVAILABILITY: [
    'view_workforce_workspace',
    'manage_caregiver_unavailability',
  ],
  VIEW_CAREGIVER_PERFORMANCE: ['view_workforce_workspace', 'view_caregiver_performance'],
  VIEW_PATIENT_DIRECTORY: ['view_patient_workspace'],
  MANAGE_PATIENT_DEMOGRAPHICS: ['view_patient_workspace', 'manage_patient_demographics'],
  MANAGE_PATIENT_CONTACTS: ['view_patient_workspace', 'manage_patient_contacts'],
  MANAGE_PATIENT_ADDRESS: ['view_patient_workspace', 'manage_patient_address'],
  MANAGE_PATIENT_ELIGIBILITY: ['view_patient_workspace', 'manage_patient_eligibility'],
  MANAGE_PATIENT_DIAGNOSES: ['view_patient_workspace', 'manage_patient_diagnoses'],
  MANAGE_PATIENT_PAYER_LINKAGE: ['view_patient_workspace', 'manage_patient_payer_links'],
  MANAGE_PATIENT_AUTHORIZATIONS: ['view_patient_workspace', 'manage_patient_authorizations'],
  VIEW_PATIENT_ATTACHMENTS: ['view_patient_workspace', 'view_patient_attachments'],
  MANAGE_PATIENT_ATTACHMENTS: [
    'view_patient_workspace',
    'view_patient_attachments',
    'manage_patient_attachments',
  ],
  VIEW_USER_DIRECTORY: ['view_user_directory'],
  INVITE_USER: ['invite_users'],
  EDIT_USER_PROFILE: ['edit_user_accounts'],
  MANAGE_USER_STATUS: ['manage_user_status'],
  VIEW_AUDIT_LOG: ['view_audit_log'],
  MANAGE_AGENCY_SETTINGS: ['manage_agency_settings', 'manage_security_settings'],
  MANAGE_BRANCHES: ['manage_branches'],
  MANAGE_AGENCY_MFA_POLICY: ['manage_agency_mfa_policy'],
  MANAGE_ADMIN_NOTIFICATIONS: ['manage_admin_notifications'],
  VIEW_AGENCY_CONFIGURATION: [
    'view_setup_console',
    'manage_agency_profile_setup',
    'manage_service_line_setup',
    'manage_visit_type_setup',
  ],
  MANAGE_AGENCY_CONFIGURATION: [
    'view_setup_console',
    'manage_agency_profile_setup',
    'manage_service_line_setup',
    'manage_visit_type_setup',
  ],
  VIEW_WORKFORCE_CONFIGURATION: ['view_setup_console', 'manage_workforce_catalog_setup'],
  MANAGE_WORKFORCE_CONFIGURATION: ['view_setup_console', 'manage_workforce_catalog_setup'],
  VIEW_TEMPLATE_CONFIGURATION: [
    'view_setup_console',
    'manage_task_template_setup',
    'manage_documentation_template_setup',
  ],
  MANAGE_TEMPLATE_CONFIGURATION: [
    'view_setup_console',
    'manage_task_template_setup',
    'manage_documentation_template_setup',
  ],
  VIEW_BRANCH_POLICY: ['view_setup_console', 'manage_branch_policy_setup'],
  MANAGE_BRANCH_POLICY: ['view_setup_console', 'manage_branch_policy_setup'],
  VIEW_ALERT_RULE: ['view_setup_console', 'manage_alert_rule_setup'],
  MANAGE_ALERT_RULE: ['view_setup_console', 'manage_alert_rule_setup'],
  VIEW_COMPENSATION_SETTINGS: ['view_setup_console', 'manage_mileage_pay_setup'],
  MANAGE_COMPENSATION_SETTINGS: ['view_setup_console', 'manage_mileage_pay_setup'],
};

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

export function buildAccessProfileForRole(
  role: AgencyRole,
  branchIds: string[] | undefined,
  source: FrontendAccessProfile['source'],
): FrontendAccessProfile {
  const definition = ROLE_DEFINITIONS[role];
  return {
    ...definition,
    assignedBranchIds: normalizeAssignedBranchIds(role, branchIds),
    source,
  };
}

export function buildAccessProfile(
  override: FrontendAccessOverride | null,
): FrontendAccessProfile {
  if (override) {
    return buildAccessProfileForRole(
      override.role,
      override.assignedBranchIds,
      'override',
    );
  }

  return {
    ...buildAccessProfileForRole('CAREGIVER', undefined, 'fallback'),
    defaultRoute: '/app/home',
  };
}

export function canAccessPermission(
  profile: FrontendAccessProfile,
  permission: FrontendPermission,
): boolean {
  return profile.permissions.includes(permission);
}

export function mapBackendPermissionsToFrontend(
  backendPermissions: string[],
  fallbackPermissions: FrontendPermission[],
): FrontendPermission[] {
  const resolved = new Set<FrontendPermission>(COMMON_SELF_SERVICE_PERMISSIONS);

  backendPermissions.forEach((permission) => {
    BACKEND_PERMISSION_MAPPING[permission]?.forEach((mapped) => resolved.add(mapped));
  });

  if (resolved.size === COMMON_SELF_SERVICE_PERMISSIONS.length) {
    fallbackPermissions.forEach((permission) => resolved.add(permission));
  }

  return Array.from(resolved);
}

export function routeForPath(pathname: string): AppRouteDefinition | undefined {
  return APP_ROUTES.find((route) => route.path === pathname);
}

export const NAV_SECTIONS: Array<{
  key: AppRouteDefinition['section'];
  label: string;
}> = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'workforce', label: 'Workforce' },
  { key: 'patients', label: 'Patients' },
  { key: 'configuration', label: 'Agency Setup' },
  { key: 'people', label: 'People & Audit' },
  { key: 'security', label: 'Security' },
  { key: 'personal', label: 'Personal' },
];
