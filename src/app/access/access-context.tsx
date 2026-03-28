import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AgencyRole } from '../auth/session-api';
import {
  clearFrontendAccessOverride,
  loadFrontendAccessOverride,
  saveFrontendAccessOverride,
} from '../auth/session-storage';
import { buildAccessProfile, FrontendAccessProfile } from './access-control';

type AccessContextValue = {
  profile: FrontendAccessProfile;
  setRoleOverride: (role: AgencyRole) => void;
  setAssignedBranches: (branchIds: string[]) => void;
  clearOverride: () => void;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: PropsWithChildren) {
  const [override, setOverride] = useState(() => loadFrontendAccessOverride());

  useEffect(() => {
    const handleStorage = () => {
      setOverride(loadFrontendAccessOverride());
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

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
      profile: buildAccessProfile(override),
      setRoleOverride,
      setAssignedBranches,
      clearOverride,
    }),
    [clearOverride, override, setAssignedBranches, setRoleOverride],
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
