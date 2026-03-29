import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ApiError,
  completeMfaChallenge,
  fetchSessionSnapshot,
  loginWithPassword,
  logoutCurrentSession,
  refreshAuthenticatedSession,
  SessionSnapshot,
} from './session-api';
import {
  clearPendingMfaChallenge,
  clearDevSessionCredentials,
  DevSessionCredentials,
  loadDevSessionCredentials,
  PendingMfaChallenge,
  savePendingMfaChallenge,
  saveDevSessionCredentials,
} from './session-storage';

type AuthState =
  | {
      status: 'bootstrapping';
      session: null;
      authSource: null;
      error: null;
    }
  | {
      status: 'authenticated';
      session: SessionSnapshot;
      authSource: 'cookie' | 'storage';
      error: null;
    }
  | {
      status: 'unauthenticated';
      session: null;
      authSource: null;
      error: string | null;
    };

type AuthContextValue = {
  state: AuthState;
  refreshAuth: () => Promise<void>;
  extendSession: () => Promise<void>;
  clearLocalAuthState: () => void;
  storeDevSession: (credentials: DevSessionCredentials) => void;
  login: (command: {
    email: string;
    password: string;
    persistDevSession: boolean;
  }) => Promise<
    | { kind: 'authenticated' }
    | { kind: 'mfa-required'; challenge: PendingMfaChallenge }
  >;
  completeMfaLogin: (command: {
    challengeToken: string;
    totpCode?: string;
    recoveryCode?: string;
    persistDevSession: boolean;
  }) => Promise<{ kind: 'authenticated'; recoveryCodeUsed: boolean }>;
  logout: (command?: { redirectTo?: string }) => Promise<{ redirectTo: string }>;
  clearPendingMfa: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  status: 'bootstrapping',
  session: null,
  authSource: null,
  error: null,
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(initialState);
  const stateRef = useRef<AuthState>(initialState);
  const warningRequired = state.status === 'authenticated' ? state.session.warningRequired : false;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setAuthenticated = useCallback(
    (snapshot: SessionSnapshot, authSource: 'cookie' | 'storage') => {
      setState({
        status: 'authenticated',
        session: snapshot,
        authSource,
        error: null,
      });
    },
    [],
  );

  const setUnauthenticated = useCallback((error: string | null) => {
    clearDevSessionCredentials();
    clearPendingMfaChallenge();
    setState({
      status: 'unauthenticated',
      session: null,
      authSource: null,
      error,
    });
  }, []);

  const syncAuth = useCallback(
    async (mode: 'foreground' | 'background') => {
      const previousState = stateRef.current;

      if (mode === 'foreground' && previousState.status !== 'authenticated') {
        setState({
          status: 'bootstrapping',
          session: null,
          authSource: null,
          error: null,
        });
      }

      try {
        const storedSession = loadDevSessionCredentials();
        const result = await fetchSessionSnapshot(storedSession);

        if (result.kind === 'unauthenticated') {
          setUnauthenticated(null);
          return;
        }

        setAuthenticated(result.snapshot, result.authSource);
      } catch (error) {
        if (mode === 'background' && previousState.status === 'authenticated') {
          return;
        }

        setState({
          status: 'unauthenticated',
          session: null,
          authSource: null,
          error: error instanceof Error ? error.message : 'Unable to reach the backend session API.',
        });
      }
    },
    [setAuthenticated, setUnauthenticated],
  );

  const refreshAuth = useCallback(async () => {
    await syncAuth('foreground');
  }, [syncAuth]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    const pollEveryMs = warningRequired ? 5000 : 60000;
    const intervalId = window.setInterval(() => {
      void syncAuth('background');
    }, pollEveryMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.status, warningRequired, syncAuth]);

  const clearLocalAuthState = useCallback(() => {
    clearDevSessionCredentials();
    clearPendingMfaChallenge();
    setState({
      status: 'unauthenticated',
      session: null,
      authSource: null,
      error: null,
    });
  }, []);

  const storeDevSession = useCallback((credentials: DevSessionCredentials) => {
    saveDevSessionCredentials(credentials);
  }, []);

  const clearPendingMfa = useCallback(() => {
    clearPendingMfaChallenge();
  }, []);

  const extendSession = useCallback(async () => {
    const currentState = stateRef.current;
    const storedSession = loadDevSessionCredentials();
    const refreshedSession = await refreshAuthenticatedSession({
      refreshToken: storedSession?.refreshToken,
      sessionId:
        storedSession?.sessionId ??
        (currentState.status === 'authenticated' ? currentState.session.sessionId : undefined),
    });

    if (storedSession || currentState.authSource === 'storage') {
      saveDevSessionCredentials({
        accessToken: refreshedSession.accessToken,
        refreshToken: refreshedSession.refreshToken,
        sessionId: refreshedSession.sessionId,
      });
    }

    await syncAuth('background');
  }, [syncAuth]);

  const login = useCallback(
    async (command: { email: string; password: string; persistDevSession: boolean }) => {
      const response = await loginWithPassword({
        email: command.email,
        password: command.password,
      });

      if (response.mfaRequired) {
        if (!response.loginChallengeToken) {
          throw new Error('Login requires MFA, but the backend did not return a challenge token.');
        }

        const challenge: PendingMfaChallenge = {
          email: command.email,
          userId: response.userId,
          challengeToken: response.loginChallengeToken,
          persistDevSession: command.persistDevSession,
        };
        clearDevSessionCredentials();
        savePendingMfaChallenge(challenge);
        return { kind: 'mfa-required', challenge } as const;
      }

      clearPendingMfaChallenge();
      if (command.persistDevSession && response.accessToken && response.sessionId) {
        saveDevSessionCredentials({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? undefined,
          sessionId: response.sessionId,
        });
      } else if (!command.persistDevSession) {
        clearDevSessionCredentials();
      }

      await refreshAuth();
      return { kind: 'authenticated' } as const;
    },
    [refreshAuth],
  );

  const completeMfaLogin = useCallback(
    async (command: {
      challengeToken: string;
      totpCode?: string;
      recoveryCode?: string;
      persistDevSession: boolean;
    }) => {
      const response = await completeMfaChallenge({
        challengeToken: command.challengeToken,
        totpCode: command.totpCode,
        recoveryCode: command.recoveryCode,
      });

      clearPendingMfaChallenge();
      if (command.persistDevSession && response.accessToken && response.sessionId) {
        saveDevSessionCredentials({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? undefined,
          sessionId: response.sessionId,
        });
      } else if (!command.persistDevSession) {
        clearDevSessionCredentials();
      }

      await refreshAuth();
      return {
        kind: 'authenticated' as const,
        recoveryCodeUsed: response.recoveryCodeUsed,
      };
    },
    [refreshAuth],
  );

  const logout = useCallback(async (command?: { redirectTo?: string }) => {
    const storedSession = loadDevSessionCredentials();
    const currentState = stateRef.current;
    const redirectTo = command?.redirectTo ?? '/login?loggedOut=1';

    try {
      const result = await logoutCurrentSession({
        accessToken: storedSession?.accessToken,
        refreshToken: storedSession?.refreshToken,
        sessionId:
          storedSession?.sessionId ??
          (currentState.status === 'authenticated' ? currentState.session.sessionId : undefined),
        redirectTo,
      });

      setUnauthenticated(null);
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUnauthenticated(null);
        return { redirectTo };
      }
      throw error;
    }
  }, [setUnauthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      refreshAuth,
      extendSession,
      clearLocalAuthState,
      storeDevSession,
      login,
      completeMfaLogin,
      logout,
      clearPendingMfa,
    }),
    [
      clearLocalAuthState,
      clearPendingMfa,
      completeMfaLogin,
      extendSession,
      login,
      logout,
      refreshAuth,
      state,
      storeDevSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
