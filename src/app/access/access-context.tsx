import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../auth/auth-context';
import { AgencyRole, CurrentAccessResponse, fetchCurrentAccess } from '../auth/session-api';
import {
  clearFrontendAccessOverride,
  loadDevSessionCredentials,
  loadFrontendAccessOverride,
  saveFrontendAccessOverride,
} from '../auth/session-storage';
import {
  buildAccessProfile,
  buildAccessProfileForRole,
  FrontendAccessProfile,
} from './access-control';

type AccessContextValue = {
  profile: FrontendAccessProfile;
  loading: boolean;
  setRoleOverride: (role: AgencyRole) => void;
  setAssignedBranches: (branchIds: string[]) => void;
  clearOverride: () => void;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: PropsWithChildren) {
  const { state } = useAuth();
  const [override, setOverride] = useState(() => loadFrontendAccessOverride());
  const [backendAccess, setBackendAccess] = useState<CurrentAccessResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      setOverride(loadFrontendAccessOverride());
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      setBackendAccess(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const devSession = loadDevSessionCredentials();

    setLoading(true);
    void fetchCurrentAccess({
      accessToken: devSession?.accessToken,
      sessionId: devSession?.sessionId ?? state.session.sessionId,
    })
      .then((response) => {
        if (!cancelled) {
          setBackendAccess(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendAccess(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state]);

  const setRoleOverride = useCallback((role: AgencyRole) => {
    const currentOverride = loadFrontendAccessOverride();
    const nextOverride = {
      role,
      assignedBranchIds: currentOverride?.assignedBranchIds,
    };
    saveFrontendAccessOverride(nextOverride);
    setOverride(nextOverride);
  }, []);

  const setAssignedBranches = useCallback((branchIds: string[]) => {
    const currentOverride = loadFrontendAccessOverride();
    const nextOverride = {
      role: currentOverride?.role ?? 'CAREGIVER',
      assignedBranchIds: branchIds,
    };
    saveFrontendAccessOverride(nextOverride);
    setOverride(nextOverride);
  }, []);

  const clearOverride = useCallback(() => {
    clearFrontendAccessOverride();
    setOverride(null);
  }, []);

  const value = useMemo<AccessContextValue>(
    () => ({
      profile:
        override
          ? buildAccessProfile(override)
          : backendAccess
            ? buildAccessProfileForRole(
                backendAccess.role,
                backendAccess.assignedBranchIds,
                'backend',
              )
            : buildAccessProfile(null),
      loading,
      setRoleOverride,
      setAssignedBranches,
      clearOverride,
    }),
    [backendAccess, clearOverride, loading, override, setAssignedBranches, setRoleOverride],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessContextValue {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return context;
}
