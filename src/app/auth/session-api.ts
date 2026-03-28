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

export type ForgotPasswordRequest = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
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
