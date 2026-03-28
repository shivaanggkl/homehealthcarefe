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
    credentials: 'include',
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
