import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchPatients,
  PatientDirectoryPage,
  PatientLifecycleStatus,
} from '../auth/session-api';
import {
  PatientPanel,
  PatientWorkspaceGrid,
  PatientWorkspaceShell,
} from '../components/PatientWorkspaceFoundation';

const PAGE_SIZE = 10;

export function PatientWorkspacePage() {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [directory, setDirectory] = useState<PatientDirectoryPage | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientLifecycleStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchPatients({
      ...authContext,
      search,
      status: statusFilter,
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
              : 'Unable to load the patient directory right now.',
          );
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
  }, [authContext, page, search, state.status, statusFilter]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  return (
    <PatientWorkspaceShell
      eyebrow="Epic 3 patient directory"
      title="Patient directory and search"
      description="Search, filter, and open patient records from one patient-management workspace. This screen now uses the live patient directory API and routes directly into the record workspace."
    >
      <PatientWorkspaceGrid>
        <PatientPanel
          title="Directory controls"
          description="Search and status filters are applied against `GET /api/patients`, with route entry points into the patient detail workspace and create demographics flow."
        >
          <form className="stack-form-light patient-toolbar" onSubmit={handleSearchSubmit}>
            <label className="field field-light">
              <span>Search patients</span>
              <input
                className="input input-light"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by patient name, preferred name, external reference, or email"
                value={searchInput}
              />
            </label>
            <label className="field field-light">
              <span>Status</span>
              <select
                className="input input-light"
                onChange={(event) => {
                  setStatusFilter(event.target.value as PatientLifecycleStatus | 'ALL');
                  setPage(0);
                }}
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <div className="patient-toolbar-actions">
              <button className="button" type="submit">
                Search
              </button>
              <button
                className="button button-secondary"
                onClick={() => navigate('/app/patients/new/demographics')}
                type="button"
              >
                Add patient
              </button>
            </div>
          </form>
          {error ? <p className="alert">{error}</p> : null}
        </PatientPanel>

        <PatientPanel
          title="Patient directory"
          description="Key identity fields remain visible at list level so staff can move into a record without opening every row first."
        >
          {loading ? <p>Loading patient directory...</p> : null}
          {!loading && directory && directory.content.length === 0 ? (
            <div className="patient-module-state patient-module-state-empty">
              <strong>No patient records match the current filters.</strong>
              <p>
                Adjust the search or status filter, or create a new patient record to begin the Epic 3
                demographics workflow.
              </p>
            </div>
          ) : null}
          {directory?.content.length ? (
            <>
              <div className="patient-directory-table">
                <div className="patient-directory-head">
                  <span>Patient</span>
                  <span>Reference</span>
                  <span>Contact</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {directory.content.map((patient) => (
                  <div key={patient.id} className="patient-directory-row">
                    <div>
                      <strong>{`${patient.firstName} ${patient.lastName}`}</strong>
                      <p>{patient.preferredName ? `Preferred: ${patient.preferredName}` : 'No preferred name'}</p>
                    </div>
                    <div>{patient.externalReference ?? 'Not set'}</div>
                    <div>
                      <p>{patient.primaryPhone ?? 'No phone'}</p>
                      <p>{patient.email ?? 'No email'}</p>
                    </div>
                    <div>
                      <span className={`status-pill status-${patient.status.toLowerCase()}`}>
                        {patient.status}
                      </span>
                    </div>
                    <div className="patient-directory-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => navigate(`/app/patients/${patient.id}`)}
                        type="button"
                      >
                        Open workspace
                      </button>
                      <button
                        className="button button-ghost"
                        onClick={() => navigate(`/app/patients/${patient.id}/demographics`)}
                        type="button"
                      >
                        Edit demographics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="patient-pagination">
                <span>
                  Showing page {directory.page + 1} of {Math.max(directory.totalPages, 1)} with{' '}
                  {directory.totalElements} total patient records.
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
        </PatientPanel>
      </PatientWorkspaceGrid>
    </PatientWorkspaceShell>
  );
}
