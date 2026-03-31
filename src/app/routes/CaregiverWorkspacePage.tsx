import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  BranchSummary,
  CaregiverDirectoryPage,
  fetchCaregivers,
  fetchBranches,
  WorkforceLifecycleStatus,
} from '../auth/session-api';
import {
  WorkforcePanel,
  WorkforceWorkspaceGrid,
  WorkforceWorkspaceShell,
} from '../components/WorkforceWorkspaceFoundation';

const PAGE_SIZE = 8;

export function CaregiverWorkspacePage() {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [directory, setDirectory] = useState<CaregiverDirectoryPage | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkforceLifecycleStatus | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [branches, setBranches] = useState<BranchSummary[]>([]);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchCaregivers({
      ...authContext,
      search,
      status: statusFilter,
      branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      page,
      size: PAGE_SIZE,
    })
      .then((response) => {
        if (!cancelled) {
          setDirectory(response);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : 'Unable to load the caregiver workspace right now.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    void fetchCaregivers({
      ...authContext,
      status: 'ACTIVE',
      page: 0,
      size: 1,
    })
      .then((response) => {
        if (!cancelled) {
          setActiveCount(response.totalElements);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActiveCount(null);
        }
      });

    void fetchBranches(authContext)
      .then((response) => {
        if (!cancelled) {
          setBranches(response.filter((branch) => branch.status === 'ACTIVE'));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranches([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, branchFilter, page, search, state.status, statusFilter]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  return (
    <WorkforceWorkspaceShell
      eyebrow="Epic 4 workforce workspace"
      title="Caregiver workforce workspace"
      description="Epic 4 now has a dedicated workforce area with backend-backed caregiver search, summary cards, and direct routes into a reusable caregiver record shell."
    >
      <WorkforceWorkspaceGrid>
        <WorkforcePanel
          title="Workforce overview and quick entry"
          description="FE4-01 anchors caregiver administration in one navigation section while FE4-13 and FE4-14 establish the reusable record and form patterns that later workforce modules reuse."
        >
          <div className="workforce-summary-cards">
            <article className="workforce-summary-card">
              <span className="eyebrow">Active caregivers</span>
              <strong>{activeCount ?? 'Unavailable'}</strong>
              <p>Live count from the active caregiver directory query.</p>
            </article>
            <article className="workforce-summary-card">
              <span className="eyebrow">Filtered results</span>
              <strong>{directory?.totalElements ?? 0}</strong>
              <p>Records matching the current search and lifecycle filter.</p>
            </article>
            <article className="workforce-summary-card">
              <span className="eyebrow">Quick entry</span>
              <strong>Create and complete</strong>
              <p>Start the shared profile form shell, then continue into geography, shifts, availability, PTO, credentials, and performance modules.</p>
            </article>
            <article className="workforce-summary-card">
              <span className="eyebrow">Schedulability inputs</span>
              <strong>Phase C live</strong>
              <p>Preferred geography, shift patterns, availability, and blocked time are now maintained from each caregiver record.</p>
            </article>
          </div>
          <div className="button-row">
            <button
              className="button"
              onClick={() => navigate('/app/workforce/new/profile')}
              type="button"
            >
              New caregiver
            </button>
            <button
              className="button button-secondary"
              onClick={() => navigate('/app/workforce')}
              type="button"
            >
              Refresh workspace
            </button>
          </div>
        </WorkforcePanel>

        <WorkforcePanel
          title="Directory controls"
          description="The Phase A workspace already uses the live caregiver directory API so later Epic 4 modules build on real identity and permission context instead of local mock data."
        >
          <form className="stack-form-light workforce-toolbar" onSubmit={handleSearchSubmit}>
            <label className="field field-light">
              <span>Search caregivers</span>
              <input
                className="input input-light"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by display name, caregiver code, email, phone, or branch"
                value={searchInput}
              />
            </label>
            <label className="field field-light">
              <span>Status</span>
              <select
                className="input input-light"
                onChange={(event) => {
                  setStatusFilter(event.target.value as WorkforceLifecycleStatus | 'ALL');
                  setPage(0);
                }}
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="UNSCHEDULABLE">Unschedulable</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="field field-light">
              <span>Branch</span>
              <select
                className="input input-light"
                onChange={(event) => {
                  setBranchFilter(event.target.value);
                  setPage(0);
                }}
                value={branchFilter}
              >
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="workforce-toolbar-actions">
              <button className="button" type="submit">
                Search
              </button>
              <button
                className="button button-secondary"
                onClick={() => navigate('/app/workforce/new/profile')}
                type="button"
              >
                Add caregiver
              </button>
            </div>
          </form>
          {error ? <p className="alert">{error}</p> : null}
        </WorkforcePanel>

        <WorkforcePanel
          title="Caregiver preview"
          description="Phase A keeps the global sidebar small and uses this backend-backed preview to route into the secondary caregiver record navigation."
        >
          {loading ? <p>Loading caregiver workspace...</p> : null}
          {!loading && directory && directory.content.length === 0 ? (
            <div className="workforce-module-state workforce-module-state-empty">
              <strong>No caregiver records match the current filters.</strong>
              <p>
                Adjust the search or lifecycle filter, or create a new caregiver profile to begin
                the Epic 4 workforce workflow.
              </p>
            </div>
          ) : null}
          {directory?.content.length ? (
            <>
              <div className="workforce-directory-table">
                <div className="workforce-directory-head">
                  <span>Caregiver</span>
                  <span>Branch</span>
                  <span>Contact</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {directory.content.map((caregiver) => (
                  <div key={caregiver.id} className="workforce-directory-row">
                    <div>
                      <strong>{caregiver.displayName}</strong>
                      <p>{caregiver.caregiverCode ?? 'No caregiver code'}</p>
                    </div>
                    <div>{caregiver.branchName ?? 'No primary branch'}</div>
                    <div>
                      <p>{caregiver.userEmail ?? 'No email'}</p>
                      <p>{caregiver.userPhone ?? 'No phone'}</p>
                    </div>
                    <div>
                      <span className={`status-pill status-${caregiver.status.toLowerCase()}`}>
                        {caregiver.status}
                      </span>
                    </div>
                    <div className="workforce-directory-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => navigate(`/app/workforce/${caregiver.id}`)}
                        type="button"
                      >
                        Open workspace
                      </button>
                      <button
                        className="button button-ghost"
                        onClick={() => navigate(`/app/workforce/${caregiver.id}/profile`)}
                        type="button"
                      >
                        Open profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="workforce-pagination">
                <span>
                  Showing page {directory.page + 1} of {Math.max(directory.totalPages, 1)} with{' '}
                  {directory.totalElements} total caregiver records.
                </span>
                <div className="button-row">
                  <button
                    className="button button-secondary"
                    disabled={directory.page === 0}
                    onClick={() => setPage((current) => Math.max(current - 1, 0))}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={directory.page >= directory.totalPages - 1}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </WorkforcePanel>
      </WorkforceWorkspaceGrid>
    </WorkforceWorkspaceShell>
  );
}
