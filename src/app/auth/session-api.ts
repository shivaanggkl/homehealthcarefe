import { DevSessionCredentials } from './session-storage';

export type SessionSnapshot = {
  sessionId: string;
  userId: string;
  idleTimeoutAt: string;
  absoluteTimeoutAt: string;
  forcedLogoutAt: string;
  warningRequired: boolean;
  secondsUntilForcedLogout: number;
};

export type SessionBootstrapResult =
  | { kind: 'authenticated'; snapshot: SessionSnapshot; authSource: 'cookie' | 'storage' }
  | { kind: 'unauthenticated' };

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  userId: string;
  mfaRequired: boolean;
  loginChallengeToken: string | null;
  sessionId: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
};

export type MfaChallengeRequest = {
  challengeToken: string;
  totpCode?: string;
  recoveryCode?: string;
};

export type MfaChallengeResponse = {
  userId: string;
  sessionId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  recoveryCodeUsed: boolean;
};

export type LogoutRequest = {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  redirectTo?: string;
};

export type LogoutResponse = {
  redirectTo: string;
};

export type RefreshSessionRequest = {
  refreshToken?: string;
  sessionId?: string;
};

export type RefreshSessionResponse = {
  userId: string;
  sessionId: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type PasswordPolicyResponse = {
  minimumLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
  commonPasswordCheckEnabled: boolean;
  preventReuseCount: number;
  summary: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
  revokeExistingSessions: boolean;
};

export type ResetPasswordResponse = {
  message: string;
  revokedExistingSessions: boolean;
};

export type ChangePasswordRequest = {
  accessToken?: string;
  sessionId?: string;
  currentPassword: string;
  newPassword: string;
  invalidateOtherSessions: boolean;
};

export type ChangePasswordResponse = {
  message: string;
  invalidatedOtherSessions: boolean;
};

export type AuthenticatedRequestContext = {
  accessToken?: string;
  sessionId?: string;
};

export type MfaStatusResponse = {
  userId: string;
  mfaEnabled: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number;
};

export type MfaEnrollmentStartRequest = AuthenticatedRequestContext & {
  currentPassword: string;
};

export type MfaEnrollmentStartResponse = {
  enrollmentToken: string;
  manualEntryKey: string;
  otpauthUri: string;
  expiresAt: string;
  recoveryCodes: string[];
};

export type MfaEnrollmentConfirmRequest = {
  enrollmentToken: string;
  totpCode: string;
};

export type MfaEnrollmentConfirmResponse = {
  userId: string;
  mfaEnabled: boolean;
  recoveryCodesRemaining: number;
};

export type AgencyMfaPolicyMode = 'OFF' | 'ALL_USERS' | 'SELECTED_ROLES';

export type AgencyRole =
  | 'AGENCY_OWNER'
  | 'BRANCH_ADMIN'
  | 'SCHEDULER_COORDINATOR'
  | 'CAREGIVER'
  | 'QA_CLINICAL_REVIEWER'
  | 'BILLING_BACK_OFFICE'
  | 'READ_ONLY_AUDITOR';

export type UserStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'LOCKED'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type CurrentAccessResponse = {
  userId: string;
  agencyId: string;
  membershipId: string;
  role: AgencyRole;
  branchScope: 'AGENCY_WIDE' | 'AGENCY_WIDE_READ' | 'ASSIGNED_BRANCHES';
  assignedBranchIds: string[];
  permissions: string[];
};

export type BranchSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  address: string;
  timezone: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type SelfProfileResponse = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredLanguage: string | null;
  timeZone: string | null;
};

export type UpdateSelfProfileRequest = AuthenticatedRequestContext & {
  firstName: string;
  lastName: string;
  phone: string;
  preferredLanguage: string;
  timeZone: string;
};

export type UserStatusResponse = {
  userId: string;
  status: UserStatus;
  sessionRevocationTriggered: boolean;
};

export type ChangeUserStatusRequest = AuthenticatedRequestContext & {
  userId: string;
  status: UserStatus;
};

export type AuditEventOutcome = 'SUCCESS' | 'FAILURE';

export type AuditEventEntry = {
  id: string;
  occurredAt: string;
  actorType: string;
  actorId: string | null;
  actorEmail: string | null;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  agencyId: string | null;
  branchId: string | null;
  outcome: AuditEventOutcome;
  metadataJson: string | null;
};

export type AuditEventPage = {
  content: AuditEventEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AuditEventQuery = AuthenticatedRequestContext & {
  from?: string;
  to?: string;
  actorId?: string;
  actionType?: string;
  targetUserId?: string;
  page?: number;
  size?: number;
};

export type AgencySettingsResponse = {
  agencyId: string;
  name: string;
  slug: string;
  timezone: string;
  contactEmail: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type ConfigurationStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type ConfigurationPage<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AgencyProfileResponse = {
  id: string;
  agencyId: string;
  displayName: string | null;
  legalName: string | null;
  primaryPhone: string | null;
  primaryAddress: string | null;
  operationsContactName: string | null;
  operationsContactEmail: string | null;
  supportContactName: string | null;
  supportContactEmail: string | null;
  defaultTimezone: string;
  defaultLocale: string;
  status: ConfigurationStatus;
};

export type UpdateAgencyProfileRequest = AuthenticatedRequestContext & {
  displayName: string;
  legalName: string;
  primaryPhone: string;
  primaryAddress: string;
  operationsContactName: string;
  operationsContactEmail: string;
  supportContactName: string;
  supportContactEmail: string;
  defaultTimezone: string;
  defaultLocale: string;
};

export type ServiceLineSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  description: string | null;
  status: ConfigurationStatus;
  displayOrder: number;
};

export type ServiceLineQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  page?: number;
  size?: number;
};

export type ManageServiceLineRequest = AuthenticatedRequestContext & {
  serviceLineId?: string;
  name: string;
  code: string;
  description: string;
  displayOrder: number;
};

export type VisitTypeSummary = {
  id: string;
  agencyId: string;
  serviceLineId: string | null;
  name: string;
  code: string;
  description: string | null;
  defaultDurationMinutes: number;
  billable: boolean;
  status: ConfigurationStatus;
  displayOrder: number;
};

export type VisitTypeQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  serviceLineId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type ManageVisitTypeRequest = AuthenticatedRequestContext & {
  visitTypeId?: string;
  serviceLineId?: string;
  name: string;
  code: string;
  description: string;
  defaultDurationMinutes: number;
  billable: boolean;
  displayOrder: number;
};

export type CaregiverSkillSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  description: string | null;
  status: ConfigurationStatus;
};

export type CaregiverCertificationSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  description: string | null;
  expirationRequired: boolean;
  status: ConfigurationStatus;
};

export type WorkforceCatalogQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  page?: number;
  size?: number;
};

export type ManageCaregiverSkillRequest = AuthenticatedRequestContext & {
  skillId?: string;
  name: string;
  code: string;
  description: string;
};

export type ManageCaregiverCertificationRequest = AuthenticatedRequestContext & {
  certificationId?: string;
  name: string;
  code: string;
  description: string;
  expirationRequired: boolean;
};

export type TaskTemplateCategory =
  | 'OPERATIONAL'
  | 'CLINICAL'
  | 'COMPLIANCE'
  | 'ADMINISTRATIVE';

export type DocumentationTemplateType =
  | 'VISIT_NOTE'
  | 'ASSESSMENT'
  | 'CARE_PLAN'
  | 'CUSTOM_FORM';

export type AlertRuleType =
  | 'MISSED_VISIT'
  | 'LATE_ARRIVAL'
  | 'DOCUMENTATION_OVERDUE'
  | 'CREDENTIAL_EXPIRING'
  | 'CUSTOM_THRESHOLD';

export type MileageReimbursementStrategy = 'NONE' | 'STANDARD_RATE' | 'CUSTOM_RATE';

export type TaskTemplateSummary = {
  id: string;
  agencyId: string;
  serviceLineId: string | null;
  visitTypeId: string | null;
  name: string;
  code: string;
  description: string | null;
  category: TaskTemplateCategory | null;
  status: ConfigurationStatus;
  displayOrder: number;
};

export type TaskTemplateQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  category?: TaskTemplateCategory | 'ALL';
  serviceLineId?: string | 'ALL';
  visitTypeId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type ManageTaskTemplateRequest = AuthenticatedRequestContext & {
  taskTemplateId?: string;
  serviceLineId?: string;
  visitTypeId?: string;
  name: string;
  code: string;
  description: string;
  category?: TaskTemplateCategory;
  displayOrder: number;
};

export type DocumentationTemplateSummary = {
  id: string;
  agencyId: string;
  name: string;
  code: string;
  templateType: DocumentationTemplateType | null;
  structuredDefinitionJson: string;
  version: number;
  status: ConfigurationStatus;
  displayOrder: number;
};

export type DocumentationTemplateQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  templateType?: DocumentationTemplateType | 'ALL';
  page?: number;
  size?: number;
};

export type ManageDocumentationTemplateRequest = AuthenticatedRequestContext & {
  templateId?: string;
  name: string;
  code: string;
  templateType?: DocumentationTemplateType;
  structuredDefinitionJson: string;
  displayOrder: number;
};

export type BranchPolicySummary = {
  id: string;
  agencyId: string;
  branchId: string | null;
  policyKey: string;
  settingsPayloadJson: string | null;
  effectiveSettingsPayloadJson: string | null;
  fallbackToAgencyDefault: boolean;
  usesAgencyDefault: boolean;
  status: ConfigurationStatus;
  displayOrder: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export type BranchPolicyQuery = AuthenticatedRequestContext & {
  branchId?: string | 'ALL';
  policyKey?: string;
  status?: ConfigurationStatus | 'ALL';
  page?: number;
  size?: number;
};

export type ManageBranchPolicyRequest = AuthenticatedRequestContext & {
  branchPolicyId?: string;
  branchId?: string;
  policyKey: string;
  settingsPayloadJson: string;
  fallbackToAgencyDefault: boolean;
  displayOrder: number;
  effectiveFrom: string;
  effectiveTo: string;
};

export type AlertRuleSummary = {
  id: string;
  agencyId: string;
  branchId: string | null;
  name: string;
  ruleType: AlertRuleType | null;
  configPayloadJson: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
  status: ConfigurationStatus;
  displayOrder: number;
  branchSpecific: boolean;
};

export type AlertRuleQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: ConfigurationStatus | 'ALL';
  branchId?: string | 'ALL';
  ruleType?: AlertRuleType | 'ALL';
  page?: number;
  size?: number;
};

export type ManageAlertRuleRequest = AuthenticatedRequestContext & {
  alertRuleId?: string;
  branchId?: string;
  name: string;
  ruleType?: AlertRuleType;
  configPayloadJson: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
  displayOrder: number;
};

export type MileagePaySettingScope = {
  id: string;
  agencyId: string;
  branchId: string | null;
  reimbursementStrategy: MileageReimbursementStrategy;
  mileageRate: number;
  travelPayEnabled: boolean;
  visitTypePayAdjustmentsJson: string | null;
  status: ConfigurationStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  effectiveAtRequestedTime: boolean;
  branchOverride: boolean;
};

export type MileagePaySettingsResponse = {
  agencyId: string;
  effectiveAt: string;
  agencyDefault: MileagePaySettingScope | null;
  branchOverrides: MileagePaySettingScope[];
};

export type ManageMileagePaySettingRequest = AuthenticatedRequestContext & {
  branchId?: string;
  reimbursementStrategy: MileageReimbursementStrategy;
  mileageRate: number;
  travelPayEnabled: boolean;
  visitTypePayAdjustmentsJson: string;
  displayOrder: number;
  effectiveFrom: string;
  effectiveTo: string;
};

export type UpdateAgencySettingsRequest = AuthenticatedRequestContext & {
  name: string;
  timezone: string;
  contactEmail: string;
};

export type CreateBranchRequest = AuthenticatedRequestContext & {
  agencyId: string;
  name: string;
  code: string;
  address: string;
  timezone: string;
};

export type UpdateBranchRequest = AuthenticatedRequestContext & {
  branchId: string;
  name: string;
  code: string;
  address: string;
  timezone: string;
};

export type UserDirectoryEntry = {
  userId: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  userStatus: UserStatus;
  role: AgencyRole;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
  branchNames: string[];
};

export type UserDirectoryPage = {
  content: UserDirectoryEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type UserDirectoryQuery = AuthenticatedRequestContext & {
  search?: string;
  status?: UserStatus | 'ALL';
  role?: AgencyRole | 'ALL';
  branchId?: string | 'ALL';
  page?: number;
  size?: number;
};

export type InviteUserRequest = AuthenticatedRequestContext & {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: AgencyRole;
  branchIds: string[];
};

export type InvitationResponse = {
  invitationId: string;
  agencyId: string;
  membershipId: string;
  userId: string;
  email: string;
  role: AgencyRole;
  expiresAt: string;
  branchIds: string[];
  branchNames: string[];
};

export type InvitationDetailsResponse = {
  invitationId: string;
  agencyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: AgencyRole;
  expiresAt: string;
  branchIds: string[];
  branchNames: string[];
};

export type AcceptInvitationRequest = {
  token: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
};

export type AcceptedInvitationResponse = {
  invitationId: string;
  userId: string;
  membershipId: string;
  agencyId: string;
};

export type UpdateUserRequest = AuthenticatedRequestContext & {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: AgencyRole;
  branchIds: string[];
};

export type UpdatedUserResponse = {
  userId: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: AgencyRole;
  branchIds: string[];
  branchNames: string[];
};

export type AgencyMfaPolicyResponse = {
  agencyId: string;
  mode: AgencyMfaPolicyMode;
  requiredRoles: AgencyRole[];
};

export type UpdateAgencyMfaPolicyRequest = AuthenticatedRequestContext & {
  mode: AgencyMfaPolicyMode;
  requiredRoles: AgencyRole[];
};

export type AdminNotificationPreferencesResponse = {
  membershipId: string;
  emailEnabled: boolean;
  failedLoginAlertsEnabled: boolean;
  lockedAccountAlertsEnabled: boolean;
  newAdminAlertsEnabled: boolean;
};

export type UpdateAdminNotificationPreferencesRequest = AuthenticatedRequestContext & {
  emailEnabled: boolean;
  failedLoginAlertsEnabled: boolean;
  lockedAccountAlertsEnabled: boolean;
  newAdminAlertsEnabled: boolean;
};

export type UserSessionSummary = {
  sessionId: string;
  current: boolean;
  active: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  absoluteExpiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
};

export type RevokeSessionResponse = {
  sessionId: string;
  revoked: boolean;
  revocationReason: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function apiUrl(path: string): string {
  const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  if (!configuredBase) {
    return path;
  }
  return `${configuredBase.replace(/\/$/, '')}${path}`;
}

function buildAuthenticatedHeaders(
  request: AuthenticatedRequestContext,
  contentType?: 'application/json',
): Headers {
  const headers = new Headers();

  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  return headers;
}

function appendOptionalSearchParams(
  url: URL,
  values: Record<string, string | number | null | undefined>,
) {
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });
}

export async function fetchSessionSnapshot(
  devSession: DevSessionCredentials | null,
): Promise<SessionBootstrapResult> {
  const headers = new Headers();

  if (devSession?.accessToken) {
    headers.set('Authorization', `Bearer ${devSession.accessToken}`);
  }

  if (devSession?.sessionId) {
    headers.set('X-Session-Id', devSession.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/session'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  if (response.status === 401) {
    return { kind: 'unauthenticated' };
  }

  if (!response.ok) {
    throw new Error(`Session bootstrap failed with status ${response.status}`);
  }

  const snapshot = (await response.json()) as SessionSnapshot;
  return {
    kind: 'authenticated',
    snapshot,
    authSource: devSession ? 'storage' : 'cookie',
  };
}

export async function loginWithPassword(request: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | LoginResponse | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Login failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as LoginResponse;
}

export async function completeMfaChallenge(
  request: MfaChallengeRequest,
): Promise<MfaChallengeResponse> {
  const response = await fetch(apiUrl('/api/auth/login/mfa'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaChallengeResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA challenge failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaChallengeResponse;
}

export async function logoutCurrentSession(request: LogoutRequest): Promise<LogoutResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.refreshToken) {
    headers.set('X-Refresh-Token', request.refreshToken);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const logoutUrl = new URL(apiUrl('/api/auth/logout'), window.location.origin);
  if (request.redirectTo) {
    logoutUrl.searchParams.set('redirectTo', request.redirectTo);
  }

  const response = await fetch(logoutUrl.toString(), {
    method: 'POST',
    credentials: 'include',
    headers,
    redirect: 'manual',
  });

  if (response.status === 401) {
    return {
      redirectTo: request.redirectTo ?? '/login',
    };
  }

  if (response.status === 0 || response.status === 302) {
    return {
      redirectTo: response.headers.get('Location') ?? request.redirectTo ?? '/login',
    };
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(
      response.status,
      payload?.message ?? `Logout failed with status ${response.status}`,
    );
  }

  return {
    redirectTo: response.headers.get('Location') ?? request.redirectTo ?? '/login',
  };
}

export async function refreshAuthenticatedSession(
  request: RefreshSessionRequest,
): Promise<RefreshSessionResponse> {
  const headers = new Headers();

  if (request.refreshToken) {
    headers.set('X-Refresh-Token', request.refreshToken);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | RefreshSessionResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Session refresh failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as RefreshSessionResponse;
}

export async function requestPasswordReset(
  request: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  const response = await fetch(apiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ForgotPasswordResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Forgot password request failed with status ${response.status}`,
    );
  }

  return payload as ForgotPasswordResponse;
}

export async function fetchPasswordPolicy(): Promise<PasswordPolicyResponse> {
  const response = await fetch(apiUrl('/api/auth/password-policy'), {
    method: 'GET',
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | PasswordPolicyResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Password policy request failed with status ${response.status}`;
    throw new ApiError(
      response.status,
      message,
    );
  }

  return payload as PasswordPolicyResponse;
}

export async function resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  const response = await fetch(apiUrl('/api/auth/reset-password'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ResetPasswordResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Reset password failed with status ${response.status}`,
    );
  }

  return payload as ResetPasswordResponse;
}

export async function changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/change-password'), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      currentPassword: request.currentPassword,
      newPassword: request.newPassword,
      invalidateOtherSessions: request.invalidateOtherSessions,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ChangePasswordResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Change password failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as ChangePasswordResponse;
}

export async function fetchMfaStatus(
  request: AuthenticatedRequestContext,
): Promise<MfaStatusResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/mfa/status'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaStatusResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA status request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaStatusResponse;
}

export async function startMfaEnrollment(
  request: MfaEnrollmentStartRequest,
): Promise<MfaEnrollmentStartResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/mfa/enrollment/start'), {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      currentPassword: request.currentPassword,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaEnrollmentStartResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA enrollment start failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaEnrollmentStartResponse;
}

export async function confirmMfaEnrollment(
  request: MfaEnrollmentConfirmRequest,
): Promise<MfaEnrollmentConfirmResponse> {
  const response = await fetch(apiUrl('/api/auth/mfa/enrollment/confirm'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MfaEnrollmentConfirmResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `MFA enrollment confirmation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as MfaEnrollmentConfirmResponse;
}

export async function fetchAgencyMfaPolicy(
  request: AuthenticatedRequestContext,
): Promise<AgencyMfaPolicyResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/mfa-policy'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyMfaPolicyResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency MFA policy request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencyMfaPolicyResponse;
}

export async function updateAgencyMfaPolicy(
  request: UpdateAgencyMfaPolicyRequest,
): Promise<AgencyMfaPolicyResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/mfa-policy'), {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      mode: request.mode,
      requiredRoles: request.requiredRoles,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyMfaPolicyResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency MFA policy update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencyMfaPolicyResponse;
}

export async function fetchAdminNotificationPreferences(
  request: AuthenticatedRequestContext,
): Promise<AdminNotificationPreferencesResponse> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/admin-notifications'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AdminNotificationPreferencesResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Admin notification preferences request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AdminNotificationPreferencesResponse;
}

export async function updateAdminNotificationPreferences(
  request: UpdateAdminNotificationPreferencesRequest,
): Promise<AdminNotificationPreferencesResponse> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/security/admin-notifications'), {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      emailEnabled: request.emailEnabled,
      failedLoginAlertsEnabled: request.failedLoginAlertsEnabled,
      lockedAccountAlertsEnabled: request.lockedAccountAlertsEnabled,
      newAdminAlertsEnabled: request.newAdminAlertsEnabled,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AdminNotificationPreferencesResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Admin notification preferences update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AdminNotificationPreferencesResponse;
}

export async function fetchUserSessions(
  request: AuthenticatedRequestContext,
): Promise<UserSessionSummary[]> {
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

  const response = await fetch(apiUrl('/api/auth/sessions'), {
    method: 'GET',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UserSessionSummary[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Session list request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UserSessionSummary[];
}

export async function revokeUserSession(
  request: AuthenticatedRequestContext & { targetSessionId: string },
): Promise<RevokeSessionResponse> {
  const headers = buildAuthenticatedHeaders(request);

  const response = await fetch(apiUrl(`/api/auth/sessions/${request.targetSessionId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | RevokeSessionResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Session revocation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as RevokeSessionResponse;
}

export async function fetchCurrentAccess(
  request: AuthenticatedRequestContext,
): Promise<CurrentAccessResponse> {
  const response = await fetch(apiUrl('/api/me/access'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CurrentAccessResponse
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Current access request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as CurrentAccessResponse;
}

export async function fetchBranches(
  request: AuthenticatedRequestContext & { search?: string },
): Promise<BranchSummary[]> {
  const branchesUrl = new URL(apiUrl('/api/branches'), window.location.origin);
  if (request.search?.trim()) {
    branchesUrl.searchParams.set('search', request.search.trim());
  }

  const response = await fetch(branchesUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary[]
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `Branch list request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary[];
}

export async function fetchUserDirectory(
  request: UserDirectoryQuery,
): Promise<UserDirectoryPage> {
  const directoryUrl = new URL(apiUrl('/api/users'), window.location.origin);

  if (request.search?.trim()) {
    directoryUrl.searchParams.set('search', request.search.trim());
  }
  if (request.status && request.status !== 'ALL') {
    directoryUrl.searchParams.set('status', request.status);
  }
  if (request.role && request.role !== 'ALL') {
    directoryUrl.searchParams.set('role', request.role);
  }
  if (request.branchId && request.branchId !== 'ALL') {
    directoryUrl.searchParams.set('branchId', request.branchId);
  }
  directoryUrl.searchParams.set('page', String(request.page ?? 0));
  directoryUrl.searchParams.set('size', String(request.size ?? 20));

  const response = await fetch(directoryUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UserDirectoryPage
    | null;

  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && 'message' in payload && payload.message
        ? payload.message
        : `User directory request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UserDirectoryPage;
}

export async function inviteUser(
  request: InviteUserRequest,
): Promise<InvitationResponse> {
  const response = await fetch(apiUrl('/api/users/invitations'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      phone: request.phone || null,
      role: request.role,
      branchIds: request.branchIds,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | InvitationResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `User invitation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as InvitationResponse;
}

export async function fetchInvitationDetails(token: string): Promise<InvitationDetailsResponse> {
  const response = await fetch(apiUrl(`/api/invitations/${encodeURIComponent(token)}`), {
    method: 'GET',
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | InvitationDetailsResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Invitation lookup failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as InvitationDetailsResponse;
}

export async function acceptInvitation(
  request: AcceptInvitationRequest,
): Promise<AcceptedInvitationResponse> {
  const response = await fetch(apiUrl(`/api/invitations/${encodeURIComponent(request.token)}/accept`), {
    method: 'POST',
    credentials: 'include',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone || null,
      password: request.password,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AcceptedInvitationResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Invitation acceptance failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AcceptedInvitationResponse;
}

export async function updateUser(
  request: UpdateUserRequest,
): Promise<UpdatedUserResponse> {
  const response = await fetch(apiUrl(`/api/users/${request.userId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone || null,
      role: request.role,
      branchIds: request.branchIds,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UpdatedUserResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `User update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UpdatedUserResponse;
}

export async function changeUserStatus(
  request: ChangeUserStatusRequest,
): Promise<UserStatusResponse> {
  const response = await fetch(apiUrl(`/api/users/${request.userId}/status`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      status: request.status,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | UserStatusResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `User status change failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as UserStatusResponse;
}

export async function fetchSelfProfile(
  request: AuthenticatedRequestContext,
): Promise<SelfProfileResponse> {
  const response = await fetch(apiUrl('/api/me/profile'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | SelfProfileResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Self profile request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as SelfProfileResponse;
}

export async function updateSelfProfile(
  request: UpdateSelfProfileRequest,
): Promise<SelfProfileResponse> {
  const response = await fetch(apiUrl('/api/me/profile'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone || null,
      preferredLanguage: request.preferredLanguage || null,
      timeZone: request.timeZone || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | SelfProfileResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Self profile update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as SelfProfileResponse;
}

export async function fetchAuditEvents(
  request: AuditEventQuery,
): Promise<AuditEventPage> {
  const eventsUrl = new URL(apiUrl('/api/audit-events'), window.location.origin);
  if (request.from) {
    eventsUrl.searchParams.set('from', request.from);
  }
  if (request.to) {
    eventsUrl.searchParams.set('to', request.to);
  }
  if (request.actorId) {
    eventsUrl.searchParams.set('actorId', request.actorId);
  }
  if (request.actionType?.trim()) {
    eventsUrl.searchParams.set('actionType', request.actionType.trim());
  }
  if (request.targetUserId) {
    eventsUrl.searchParams.set('targetUserId', request.targetUserId);
  }
  eventsUrl.searchParams.set('page', String(request.page ?? 0));
  eventsUrl.searchParams.set('size', String(request.size ?? 20));

  const response = await fetch(eventsUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AuditEventPage
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Audit event request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AuditEventPage;
}

export async function exportAuditEvents(
  request: AuditEventQuery,
): Promise<string> {
  const exportUrl = new URL(apiUrl('/api/audit-events/export'), window.location.origin);
  if (request.from) {
    exportUrl.searchParams.set('from', request.from);
  }
  if (request.to) {
    exportUrl.searchParams.set('to', request.to);
  }
  if (request.actorId) {
    exportUrl.searchParams.set('actorId', request.actorId);
  }
  if (request.actionType?.trim()) {
    exportUrl.searchParams.set('actionType', request.actionType.trim());
  }
  if (request.targetUserId) {
    exportUrl.searchParams.set('targetUserId', request.targetUserId);
  }

  const response = await fetch(exportUrl.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  if (!response.ok) {
    const payload = (await response.text().catch(() => '')) || '';
    throw new ApiError(response.status, payload || `Audit export failed with status ${response.status}`);
  }

  return response.text();
}

export async function fetchAgencySettings(
  request: AuthenticatedRequestContext,
): Promise<AgencySettingsResponse> {
  const response = await fetch(apiUrl('/api/agency/settings'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencySettingsResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency settings request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencySettingsResponse;
}

export async function updateAgencySettings(
  request: UpdateAgencySettingsRequest,
): Promise<AgencySettingsResponse> {
  const response = await fetch(apiUrl('/api/agency/settings'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      timezone: request.timezone,
      contactEmail: request.contactEmail,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencySettingsResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency settings update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as AgencySettingsResponse;
}

export async function createBranch(
  request: CreateBranchRequest,
): Promise<BranchSummary> {
  const response = await fetch(apiUrl('/api/branches'), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      agencyId: request.agencyId,
      name: request.name,
      code: request.code,
      address: request.address,
      timezone: request.timezone,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch creation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary;
}

export async function updateBranch(
  request: UpdateBranchRequest,
): Promise<BranchSummary> {
  const response = await fetch(apiUrl(`/api/branches/${request.branchId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      address: request.address,
      timezone: request.timezone,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch update failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary;
}

export async function deactivateBranch(
  request: AuthenticatedRequestContext & { branchId: string },
): Promise<BranchSummary> {
  const response = await fetch(apiUrl(`/api/branches/${request.branchId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchSummary
    | null;

  if (!response.ok) {
    const message =
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch deactivation failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as BranchSummary;
}

export async function fetchAgencyProfile(
  request: AuthenticatedRequestContext,
): Promise<AgencyProfileResponse> {
  const response = await fetch(apiUrl('/api/agency/profile'), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyProfileResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency profile request failed with status ${response.status}`,
    );
  }

  return payload as AgencyProfileResponse;
}

export async function updateAgencyProfile(
  request: UpdateAgencyProfileRequest,
): Promise<AgencyProfileResponse> {
  const response = await fetch(apiUrl('/api/agency/profile'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      displayName: request.displayName || null,
      legalName: request.legalName || null,
      primaryPhone: request.primaryPhone || null,
      primaryAddress: request.primaryAddress || null,
      operationsContactName: request.operationsContactName || null,
      operationsContactEmail: request.operationsContactEmail || null,
      supportContactName: request.supportContactName || null,
      supportContactEmail: request.supportContactEmail || null,
      defaultTimezone: request.defaultTimezone,
      defaultLocale: request.defaultLocale,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AgencyProfileResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Agency profile update failed with status ${response.status}`,
    );
  }

  return payload as AgencyProfileResponse;
}

export async function fetchServiceLines(
  request: ServiceLineQuery,
): Promise<ConfigurationPage<ServiceLineSummary>> {
  const url = new URL(apiUrl('/api/service-lines'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<ServiceLineSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Service line request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<ServiceLineSummary>;
}

export async function saveServiceLine(
  request: ManageServiceLineRequest,
): Promise<ServiceLineSummary> {
  const method = request.serviceLineId ? 'PUT' : 'POST';
  const path = request.serviceLineId
    ? `/api/service-lines/${request.serviceLineId}`
    : '/api/service-lines';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      description: request.description || null,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ServiceLineSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Service line save failed with status ${response.status}`,
    );
  }

  return payload as ServiceLineSummary;
}

export async function deactivateServiceLine(
  request: AuthenticatedRequestContext & { serviceLineId: string },
): Promise<ServiceLineSummary> {
  const response = await fetch(apiUrl(`/api/service-lines/${request.serviceLineId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ServiceLineSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Service line deactivation failed with status ${response.status}`,
    );
  }

  return payload as ServiceLineSummary;
}

export async function fetchVisitTypes(
  request: VisitTypeQuery,
): Promise<ConfigurationPage<VisitTypeSummary>> {
  const url = new URL(apiUrl('/api/visit-types'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    serviceLineId:
      request.serviceLineId && request.serviceLineId !== 'ALL' ? request.serviceLineId : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<VisitTypeSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Visit type request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<VisitTypeSummary>;
}

export async function saveVisitType(
  request: ManageVisitTypeRequest,
): Promise<VisitTypeSummary> {
  const method = request.visitTypeId ? 'PUT' : 'POST';
  const path = request.visitTypeId
    ? `/api/visit-types/${request.visitTypeId}`
    : '/api/visit-types';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      serviceLineId: request.serviceLineId || null,
      name: request.name,
      code: request.code,
      description: request.description || null,
      defaultDurationMinutes: request.defaultDurationMinutes,
      billable: request.billable,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | VisitTypeSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Visit type save failed with status ${response.status}`,
    );
  }

  return payload as VisitTypeSummary;
}

export async function deactivateVisitType(
  request: AuthenticatedRequestContext & { visitTypeId: string },
): Promise<VisitTypeSummary> {
  const response = await fetch(apiUrl(`/api/visit-types/${request.visitTypeId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | VisitTypeSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Visit type deactivation failed with status ${response.status}`,
    );
  }

  return payload as VisitTypeSummary;
}

export async function fetchCaregiverSkills(
  request: WorkforceCatalogQuery,
): Promise<ConfigurationPage<CaregiverSkillSummary>> {
  const url = new URL(apiUrl('/api/caregiver-skills'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<CaregiverSkillSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<CaregiverSkillSummary>;
}

export async function saveCaregiverSkill(
  request: ManageCaregiverSkillRequest,
): Promise<CaregiverSkillSummary> {
  const method = request.skillId ? 'PUT' : 'POST';
  const path = request.skillId
    ? `/api/caregiver-skills/${request.skillId}`
    : '/api/caregiver-skills';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      description: request.description || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverSkillSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill save failed with status ${response.status}`,
    );
  }

  return payload as CaregiverSkillSummary;
}

export async function deactivateCaregiverSkill(
  request: AuthenticatedRequestContext & { skillId: string },
): Promise<CaregiverSkillSummary> {
  const response = await fetch(apiUrl(`/api/caregiver-skills/${request.skillId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverSkillSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver skill deactivation failed with status ${response.status}`,
    );
  }

  return payload as CaregiverSkillSummary;
}

export async function fetchCaregiverCertifications(
  request: WorkforceCatalogQuery,
): Promise<ConfigurationPage<CaregiverCertificationSummary>> {
  const url = new URL(apiUrl('/api/caregiver-certifications'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<CaregiverCertificationSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver certification request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<CaregiverCertificationSummary>;
}

export async function saveCaregiverCertification(
  request: ManageCaregiverCertificationRequest,
): Promise<CaregiverCertificationSummary> {
  const method = request.certificationId ? 'PUT' : 'POST';
  const path = request.certificationId
    ? `/api/caregiver-certifications/${request.certificationId}`
    : '/api/caregiver-certifications';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      description: request.description || null,
      expirationRequired: request.expirationRequired,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverCertificationSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver certification save failed with status ${response.status}`,
    );
  }

  return payload as CaregiverCertificationSummary;
}

export async function deactivateCaregiverCertification(
  request: AuthenticatedRequestContext & { certificationId: string },
): Promise<CaregiverCertificationSummary> {
  const response = await fetch(apiUrl(`/api/caregiver-certifications/${request.certificationId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | CaregiverCertificationSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Caregiver certification deactivation failed with status ${response.status}`,
    );
  }

  return payload as CaregiverCertificationSummary;
}

export async function fetchTaskTemplates(
  request: TaskTemplateQuery,
): Promise<ConfigurationPage<TaskTemplateSummary>> {
  const url = new URL(apiUrl('/api/task-templates'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    category: request.category && request.category !== 'ALL' ? request.category : undefined,
    serviceLineId:
      request.serviceLineId && request.serviceLineId !== 'ALL' ? request.serviceLineId : undefined,
    visitTypeId: request.visitTypeId && request.visitTypeId !== 'ALL' ? request.visitTypeId : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<TaskTemplateSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Task template request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<TaskTemplateSummary>;
}

export async function saveTaskTemplate(
  request: ManageTaskTemplateRequest,
): Promise<TaskTemplateSummary> {
  const method = request.taskTemplateId ? 'PUT' : 'POST';
  const path = request.taskTemplateId
    ? `/api/task-templates/${request.taskTemplateId}`
    : '/api/task-templates';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      serviceLineId: request.serviceLineId || null,
      visitTypeId: request.visitTypeId || null,
      name: request.name,
      code: request.code,
      description: request.description || null,
      category: request.category || null,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | TaskTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Task template save failed with status ${response.status}`,
    );
  }

  return payload as TaskTemplateSummary;
}

export async function deactivateTaskTemplate(
  request: AuthenticatedRequestContext & { taskTemplateId: string },
): Promise<TaskTemplateSummary> {
  const response = await fetch(apiUrl(`/api/task-templates/${request.taskTemplateId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | TaskTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Task template deactivation failed with status ${response.status}`,
    );
  }

  return payload as TaskTemplateSummary;
}

export async function fetchDocumentationTemplates(
  request: DocumentationTemplateQuery,
): Promise<ConfigurationPage<DocumentationTemplateSummary>> {
  const url = new URL(apiUrl('/api/documentation-templates'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    templateType:
      request.templateType && request.templateType !== 'ALL' ? request.templateType : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<DocumentationTemplateSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<DocumentationTemplateSummary>;
}

export async function saveDocumentationTemplate(
  request: ManageDocumentationTemplateRequest,
): Promise<DocumentationTemplateSummary> {
  const method = request.templateId ? 'PUT' : 'POST';
  const path = request.templateId
    ? `/api/documentation-templates/${request.templateId}`
    : '/api/documentation-templates';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      templateType: request.templateType || null,
      structuredDefinitionJson: request.structuredDefinitionJson,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | DocumentationTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template save failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateSummary;
}

export async function createDocumentationTemplateVersion(
  request: ManageDocumentationTemplateRequest & { templateId: string },
): Promise<DocumentationTemplateSummary> {
  const response = await fetch(apiUrl(`/api/documentation-templates/${request.templateId}/version`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      name: request.name,
      code: request.code,
      templateType: request.templateType || null,
      structuredDefinitionJson: request.structuredDefinitionJson,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | DocumentationTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template versioning failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateSummary;
}

export async function publishDocumentationTemplate(
  request: AuthenticatedRequestContext & { templateId: string },
): Promise<DocumentationTemplateSummary> {
  const response = await fetch(apiUrl(`/api/documentation-templates/${request.templateId}/publish`), {
    method: 'POST',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | DocumentationTemplateSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Documentation template publish failed with status ${response.status}`,
    );
  }

  return payload as DocumentationTemplateSummary;
}

export async function fetchBranchPolicies(
  request: BranchPolicyQuery,
): Promise<ConfigurationPage<BranchPolicySummary>> {
  const url = new URL(apiUrl('/api/branch-policies'), window.location.origin);
  appendOptionalSearchParams(url, {
    branchId: request.branchId && request.branchId !== 'ALL' ? request.branchId : undefined,
    policyKey: request.policyKey?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<BranchPolicySummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch policy request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<BranchPolicySummary>;
}

export async function saveBranchPolicy(
  request: ManageBranchPolicyRequest,
): Promise<BranchPolicySummary> {
  const method = request.branchPolicyId ? 'PUT' : 'POST';
  const path = request.branchPolicyId
    ? `/api/branch-policies/${request.branchPolicyId}`
    : '/api/branch-policies';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      branchId: request.branchId || null,
      policyKey: request.policyKey,
      settingsPayloadJson: request.settingsPayloadJson || null,
      fallbackToAgencyDefault: request.fallbackToAgencyDefault,
      displayOrder: request.displayOrder,
      effectiveFrom: request.effectiveFrom || null,
      effectiveTo: request.effectiveTo || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchPolicySummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch policy save failed with status ${response.status}`,
    );
  }

  return payload as BranchPolicySummary;
}

export async function deactivateBranchPolicy(
  request: AuthenticatedRequestContext & { branchPolicyId: string },
): Promise<BranchPolicySummary> {
  const response = await fetch(apiUrl(`/api/branch-policies/${request.branchPolicyId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | BranchPolicySummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Branch policy deactivation failed with status ${response.status}`,
    );
  }

  return payload as BranchPolicySummary;
}

export async function fetchAlertRules(
  request: AlertRuleQuery,
): Promise<ConfigurationPage<AlertRuleSummary>> {
  const url = new URL(apiUrl('/api/alert-rules'), window.location.origin);
  appendOptionalSearchParams(url, {
    search: request.search?.trim(),
    status: request.status && request.status !== 'ALL' ? request.status : undefined,
    branchId: request.branchId && request.branchId !== 'ALL' ? request.branchId : undefined,
    ruleType: request.ruleType && request.ruleType !== 'ALL' ? request.ruleType : undefined,
    page: request.page ?? 0,
    size: request.size ?? 20,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | ConfigurationPage<AlertRuleSummary>
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Alert rule request failed with status ${response.status}`,
    );
  }

  return payload as ConfigurationPage<AlertRuleSummary>;
}

export async function saveAlertRule(
  request: ManageAlertRuleRequest,
): Promise<AlertRuleSummary> {
  const method = request.alertRuleId ? 'PUT' : 'POST';
  const path = request.alertRuleId ? `/api/alert-rules/${request.alertRuleId}` : '/api/alert-rules';

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      branchId: request.branchId || null,
      name: request.name,
      ruleType: request.ruleType || null,
      configPayloadJson: request.configPayloadJson,
      notifyEmail: request.notifyEmail,
      notifySms: request.notifySms,
      notifyInApp: request.notifyInApp,
      displayOrder: request.displayOrder,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AlertRuleSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Alert rule save failed with status ${response.status}`,
    );
  }

  return payload as AlertRuleSummary;
}

export async function deactivateAlertRule(
  request: AuthenticatedRequestContext & { alertRuleId: string },
): Promise<AlertRuleSummary> {
  const response = await fetch(apiUrl(`/api/alert-rules/${request.alertRuleId}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | AlertRuleSummary
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Alert rule deactivation failed with status ${response.status}`,
    );
  }

  return payload as AlertRuleSummary;
}

export async function fetchMileagePaySettings(
  request: AuthenticatedRequestContext & { effectiveAt?: string },
): Promise<MileagePaySettingsResponse> {
  const url = new URL(apiUrl('/api/mileage-pay-settings'), window.location.origin);
  appendOptionalSearchParams(url, {
    effectiveAt: request.effectiveAt,
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MileagePaySettingsResponse
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mileage/pay settings request failed with status ${response.status}`,
    );
  }

  return payload as MileagePaySettingsResponse;
}

export async function saveMileagePayDefault(
  request: ManageMileagePaySettingRequest,
): Promise<MileagePaySettingScope> {
  const response = await fetch(apiUrl('/api/mileage-pay-settings/default'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      reimbursementStrategy: request.reimbursementStrategy,
      mileageRate: request.mileageRate,
      travelPayEnabled: request.travelPayEnabled,
      visitTypePayAdjustmentsJson: request.visitTypePayAdjustmentsJson || null,
      displayOrder: request.displayOrder,
      effectiveFrom: request.effectiveFrom || null,
      effectiveTo: request.effectiveTo || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MileagePaySettingScope
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mileage/pay default save failed with status ${response.status}`,
    );
  }

  return payload as MileagePaySettingScope;
}

export async function saveMileagePayBranchOverride(
  request: ManageMileagePaySettingRequest & { branchId: string },
): Promise<MileagePaySettingScope> {
  const response = await fetch(apiUrl(`/api/mileage-pay-settings/branches/${request.branchId}`), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAuthenticatedHeaders(request, 'application/json'),
    body: JSON.stringify({
      reimbursementStrategy: request.reimbursementStrategy,
      mileageRate: request.mileageRate,
      travelPayEnabled: request.travelPayEnabled,
      visitTypePayAdjustmentsJson: request.visitTypePayAdjustmentsJson || null,
      displayOrder: request.displayOrder,
      effectiveFrom: request.effectiveFrom || null,
      effectiveTo: request.effectiveTo || null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | MileagePaySettingScope
    | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload && 'message' in payload && payload.message
        ? payload.message
        : `Mileage/pay branch override save failed with status ${response.status}`,
    );
  }

  return payload as MileagePaySettingScope;
}
