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
  const headers = new Headers();

  if (request.accessToken) {
    headers.set('Authorization', `Bearer ${request.accessToken}`);
  }

  if (request.sessionId) {
    headers.set('X-Session-Id', request.sessionId);
  }

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
