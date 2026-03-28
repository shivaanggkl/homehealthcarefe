import type { AgencyRole } from './session-api';

export const DEV_SESSION_STORAGE_KEY = 'hhc_dev_auth';
export const PENDING_MFA_STORAGE_KEY = 'hhc_pending_mfa';
export const ACCESS_PROFILE_STORAGE_KEY = 'hhc_frontend_access_profile';

export type DevSessionCredentials = {
  accessToken: string;
  sessionId: string;
  refreshToken?: string;
};

export type PendingMfaChallenge = {
  email: string;
  userId: string;
  challengeToken: string;
  persistDevSession: boolean;
};

export type FrontendAccessOverride = {
  role: AgencyRole;
  assignedBranchIds?: string[];
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadDevSessionCredentials(): DevSessionCredentials | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(DEV_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DevSessionCredentials>;
    if (!parsed.accessToken || !parsed.sessionId) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      sessionId: parsed.sessionId,
      refreshToken: parsed.refreshToken,
    };
  } catch {
    return null;
  }
}

export function saveDevSessionCredentials(credentials: DevSessionCredentials): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(DEV_SESSION_STORAGE_KEY, JSON.stringify(credentials));
}

export function clearDevSessionCredentials(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(DEV_SESSION_STORAGE_KEY);
}

export function loadPendingMfaChallenge(): PendingMfaChallenge | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_MFA_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingMfaChallenge>;
    if (
      !parsed.email ||
      !parsed.userId ||
      !parsed.challengeToken ||
      typeof parsed.persistDevSession !== 'boolean'
    ) {
      return null;
    }
    return {
      email: parsed.email,
      userId: parsed.userId,
      challengeToken: parsed.challengeToken,
      persistDevSession: parsed.persistDevSession,
    };
  } catch {
    return null;
  }
}

export function savePendingMfaChallenge(challenge: PendingMfaChallenge): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(PENDING_MFA_STORAGE_KEY, JSON.stringify(challenge));
}

export function clearPendingMfaChallenge(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(PENDING_MFA_STORAGE_KEY);
}

export function loadFrontendAccessOverride(): FrontendAccessOverride | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(ACCESS_PROFILE_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FrontendAccessOverride>;
    if (!parsed.role) {
      return null;
    }
    return {
      role: parsed.role,
      assignedBranchIds: Array.isArray(parsed.assignedBranchIds)
        ? parsed.assignedBranchIds.filter((value): value is string => typeof value === 'string')
        : undefined,
    };
  } catch {
    return null;
  }
}

export function saveFrontendAccessOverride(override: FrontendAccessOverride): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(ACCESS_PROFILE_STORAGE_KEY, JSON.stringify(override));
}

export function clearFrontendAccessOverride(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_PROFILE_STORAGE_KEY);
}
