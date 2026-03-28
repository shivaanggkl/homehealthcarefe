import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencyRole,
  ApiError,
  BranchSummary,
  changeUserStatus,
  fetchBranches,
  fetchUserDirectory,
  UpdatedUserResponse,
  updateUser,
  UserDirectoryEntry,
  UserStatus,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  AGENCY_ROLE_OPTIONS,
  formatTimestamp,
  fullName,
  isRoleBranchScoped,
  mapBranchNamesToIds,
  roleLabel,
  USER_STATUS_OPTIONS,
} from '../user/admin-support';

const PAGE_SIZE = 10;

type DirectoryFilters = {
  search: string;
  status: UserStatus | 'ALL';
  role: AgencyRole | 'ALL';
  branchId: string | 'ALL';
  page: number;
};

type EditFormState = {
  userId: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: AgencyRole;
  branchIds: string[];
};

const INITIAL_FILTERS: DirectoryFilters = {
  search: '',
  status: 'ALL',
  role: 'ALL',
  branchId: 'ALL',
  page: 0,
};

function createEditFormState(
  entry: UserDirectoryEntry,
  branches: BranchSummary[],
): EditFormState {
  return {
    userId: entry.userId,
    membershipId: entry.membershipId,
    firstName: entry.firstName,
    lastName: entry.lastName,
    phone: entry.phone ?? '',
    role: entry.role,
    branchIds: mapBranchNamesToIds(entry.branchNames, branches),
  };
}

export function UserDirectoryPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [filters, setFilters] = useState<DirectoryFilters>(INITIAL_FILTERS);
  const [directory, setDirectory] = useState<UserDirectoryEntry[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDirectoryEntry | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [changingStatus, setChangingStatus] = useState<UserStatus | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  async function loadDirectory(targetFilters: DirectoryFilters = filters) {
    setLoading(true);
    setLoadError(null);
    setUnauthorized(false);

    try {
      const [branchResponse, directoryResponse] = await Promise.all([
        fetchBranches(authContext),
        fetchUserDirectory({
          ...authContext,
          search: targetFilters.search,
          status: targetFilters.status,
          role: targetFilters.role,
          branchId: targetFilters.branchId,
          page: targetFilters.page,
          size: PAGE_SIZE,
        }),
      ]);

      const activeBranches = branchResponse.filter((branch) => branch.status === 'ACTIVE');
      setBranches(activeBranches);
      setDirectory(directoryResponse.content);
      setTotalPages(directoryResponse.totalPages);
      setTotalElements(directoryResponse.totalElements);

      if (selectedUser) {
        const refreshedSelection = directoryResponse.content.find((entry) => entry.userId === selectedUser.userId);
        if (refreshedSelection) {
          setSelectedUser(refreshedSelection);
          setEditForm(createEditFormState(refreshedSelection, activeBranches));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setLoadError(error instanceof Error ? error.message : 'Unable to load the user directory.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    void loadDirectory(filters);
  }, [authContext, filters, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  function openEdit(entry: UserDirectoryEntry) {
    setSelectedUser(entry);
    setEditForm(createEditFormState(entry, branches));
    setEditError(null);
    setEditSuccess(null);
  }

  function toggleEditBranch(branchId: string) {
    setEditForm((current) =>
      current
        ? {
            ...current,
            branchIds: current.branchIds.includes(branchId)
              ? current.branchIds.filter((value) => value !== branchId)
              : [...current.branchIds, branchId],
          }
        : current,
    );
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) {
      return;
    }

    setEditError(null);
    setEditSuccess(null);

    if (editForm.role === 'AGENCY_OWNER' && profile.role !== 'AGENCY_OWNER') {
      setEditError('Only an Agency Owner can assign or edit the Agency Owner role.');
      return;
    }

    if (isRoleBranchScoped(editForm.role) && editForm.branchIds.length === 0) {
      setEditError('Choose at least one branch for branch-scoped roles.');
      return;
    }

    setSavingEdit(true);

    try {
      const response: UpdatedUserResponse = await updateUser({
        ...authContext,
        userId: editForm.userId,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        role: editForm.role,
        branchIds: isRoleBranchScoped(editForm.role) ? editForm.branchIds : [],
      });

      setEditSuccess('User details saved. Role and branch changes take effect immediately.');

      const nextSelected: UserDirectoryEntry = {
        userId: response.userId,
        membershipId: response.membershipId,
        firstName: response.firstName,
        lastName: response.lastName,
        email: selectedUser?.email ?? '',
        phone: response.phone,
        userStatus: selectedUser?.userStatus ?? 'ACTIVE',
        role: response.role,
        lastLoginAt: selectedUser?.lastLoginAt ?? null,
        mfaEnabled: selectedUser?.mfaEnabled ?? false,
        branchNames: response.branchNames,
      };
      setSelectedUser(nextSelected);
      setEditForm(createEditFormState(nextSelected, branches));
      await loadDirectory(filters);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setEditError(error.message);
      } else if (error instanceof ApiError && error.status === 404) {
        setEditError('The selected user is no longer available in the current agency scope.');
      } else if (error instanceof ApiError) {
        setEditError(error.message);
      } else {
        setEditError('Unable to save user changes right now.');
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleStatusChange(nextStatus: UserStatus) {
    if (!selectedUser) {
      return;
    }

    const requiresConfirmation = ['LOCKED', 'SUSPENDED', 'DEACTIVATED'].includes(nextStatus);
    if (requiresConfirmation) {
      const confirmed = window.confirm(
        nextStatus === 'SUSPENDED' || nextStatus === 'DEACTIVATED'
          ? `Set ${fullName(selectedUser)} to ${nextStatus}? This will revoke active sessions.`
          : `Set ${fullName(selectedUser)} to ${nextStatus}?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setChangingStatus(nextStatus);
    setEditError(null);
    setEditSuccess(null);

    try {
      const response = await changeUserStatus({
        ...authContext,
        userId: selectedUser.userId,
        status: nextStatus,
      });

      setSelectedUser((current) => (current ? { ...current, userStatus: response.status } : current));
      setDirectory((current) =>
        current.map((entry) =>
          entry.userId === selectedUser.userId ? { ...entry, userStatus: response.status } : entry,
        ),
      );
      setEditSuccess(
        response.sessionRevocationTriggered
          ? `User status changed to ${response.status}. Existing sessions were revoked by the backend.`
          : `User status changed to ${response.status}.`,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setEditError(error.message);
      } else {
        setEditError('Unable to change user status right now.');
      }
    } finally {
      setChangingStatus(null);
    }
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Frontend Story FE-15 / FE-18 / FE-19</span>
          <h2>User management is restricted.</h2>
          <p>
            The backend returned a controlled <code>403</code> response for the user directory API, so the
            frontend is showing an explicit unauthorized state.
          </p>
        </section>
        <AccessDeniedPanel message="Only permitted admins can search the directory or update user assignments in this agency." />
      </div>
    );
  }

  return (
    <div className="page-grid">
      <section className="hero-card panel-span-2">
        <span className="eyebrow">Frontend Stories FE-15, FE-18, and FE-19</span>
        <h2>Agency user directory and staff assignment editor.</h2>
        <p>
          Search, filter, and page through users with backend data from <code>GET /api/users</code>, then edit
          role and branch assignments using <code>PUT /api/users/{'{userId}'}</code>. Status changes are also
          available from the selected-user panel through <code>PUT /api/users/{'{userId}'}/status</code>.
        </p>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Directory filters</h3>
          <p>Filter by user status, role, branch, or free-text search. Pagination stays server-backed.</p>
        </div>

        <div className="toolbar-row">
          <div className="toolbar-grid">
            <label className="field field-light compact-field">
              <span>Search</span>
              <input
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value, page: 0 }))
                }
                placeholder="Name or email"
                type="search"
                value={filters.search}
              />
            </label>

            <label className="field field-light compact-field">
              <span>Status</span>
              <select
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as UserStatus | 'ALL',
                    page: 0,
                  }))
                }
                value={filters.status}
              >
                {USER_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-light compact-field">
              <span>Role</span>
              <select
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    role: event.target.value as AgencyRole | 'ALL',
                    page: 0,
                  }))
                }
                value={filters.role}
              >
                <option value="ALL">All roles</option>
                {AGENCY_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-light compact-field">
              <span>Branch</span>
              <select
                className="input input-light"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    branchId: event.target.value,
                    page: 0,
                  }))
                }
                value={filters.branchId}
              >
                <option value="ALL">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="button-row">
            <button className="button button-secondary" onClick={() => void loadDirectory(filters)} type="button">
              Refresh
            </button>
            <Link className="button" to="/app/admin/users/invite">
              Invite user
            </Link>
          </div>
        </div>

        {loadError ? (
          <p className="alert">
            <strong>Directory unavailable.</strong> {loadError}
          </p>
        ) : null}

        <div className="directory-summary">
          <span>{totalElements} matching users</span>
          <span>
            Page {filters.page + 1} of {Math.max(totalPages, 1)}
          </span>
        </div>

        {loading ? <p className="session-note">Loading directory...</p> : null}

        <div className="directory-table">
          <div className="directory-row directory-row-header">
            <span>User</span>
            <span>Status</span>
            <span>Role</span>
            <span>Branches</span>
            <span>Last login</span>
            <span>MFA</span>
            <span>Action</span>
          </div>

          {directory.map((entry) => (
            <div className="directory-row" key={entry.userId}>
              <div>
                <strong>{fullName(entry)}</strong>
                <small>{entry.email}</small>
              </div>
              <div>
                <span className={`status-pill status-${entry.userStatus.toLowerCase()}`}>{entry.userStatus}</span>
              </div>
              <div>{roleLabel(entry.role)}</div>
              <div>{entry.branchNames.length > 0 ? entry.branchNames.join(', ') : 'Agency-wide'}</div>
              <div>{formatTimestamp(entry.lastLoginAt)}</div>
              <div>{entry.mfaEnabled ? 'Enabled' : 'Disabled'}</div>
              <div>
                <button className="button button-secondary button-small" onClick={() => openEdit(entry)} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}

          {!loading && directory.length === 0 ? (
            <div className="empty-state-card">
              <strong>No users matched the current filters.</strong>
              <p>Try relaxing the search, role, status, or branch filters.</p>
            </div>
          ) : null}
        </div>

        <div className="pagination-row">
          <button
            className="button button-secondary"
            disabled={filters.page === 0 || loading}
            onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
            type="button"
          >
            Previous
          </button>
          <button
            className="button button-secondary"
            disabled={loading || totalPages === 0 || filters.page >= totalPages - 1}
            onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            type="button"
          >
            Next
          </button>
        </div>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Selected user editor</h3>
          <p>
            FE-18 and FE-19 are implemented directly from directory data. Role, branch, and status changes are
            protected and update immediately after save.
          </p>
        </div>

        {!editForm || !selectedUser ? (
          <p className="session-note">Choose a user from the directory to edit their details and assignments.</p>
        ) : (
          <form className="stack-form stack-form-light" onSubmit={handleEditSubmit}>
            {editSuccess ? <p className="success-note">{editSuccess}</p> : null}

            <div className="callout-card">
              <strong>{fullName(selectedUser)}</strong>
              <p>
                Email is protected and cannot be changed here. Current invite status is{' '}
                <strong>{selectedUser.userStatus}</strong>.
              </p>
            </div>

            <div className="split-grid">
              <label className="field field-light">
                <span>First name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setEditForm((current) => (current ? { ...current, firstName: event.target.value } : current))
                  }
                  required
                  type="text"
                  value={editForm.firstName}
                />
              </label>

              <label className="field field-light">
                <span>Last name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setEditForm((current) => (current ? { ...current, lastName: event.target.value } : current))
                  }
                  required
                  type="text"
                  value={editForm.lastName}
                />
              </label>
            </div>

            <div className="split-grid">
              <label className="field field-light">
                <span>Phone</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setEditForm((current) => (current ? { ...current, phone: event.target.value } : current))
                  }
                  type="tel"
                  value={editForm.phone}
                />
              </label>

              <label className="field field-light">
                <span>Role</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setEditForm((current) =>
                      current
                        ? {
                            ...current,
                            role: event.target.value as AgencyRole,
                            branchIds: isRoleBranchScoped(event.target.value as AgencyRole)
                              ? current.branchIds
                              : [],
                          }
                        : current,
                    )
                  }
                  value={editForm.role}
                >
                  {AGENCY_ROLE_OPTIONS.map((option) => (
                    <option
                      disabled={option.value === 'AGENCY_OWNER' && profile.role !== 'AGENCY_OWNER'}
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="callout-card">
              <strong>Restricted fields stay protected</strong>
              <p>
                Email, account status, password, and MFA are intentionally excluded from this form. If you change
                the role or branch list, that permission scope applies immediately after save.
              </p>
            </div>

            <div className="panel inset-panel">
              <div className="panel-header">
                <h4>Status actions</h4>
                <p>
                  Suspension and deactivation revoke active sessions. Destructive actions should be confirmed
                  before use in a production workflow.
                </p>
              </div>

              <div className="button-row">
                {(['ACTIVE', 'LOCKED', 'SUSPENDED', 'DEACTIVATED'] as UserStatus[]).map((statusOption) => (
                  <button
                    className="button button-secondary"
                    disabled={changingStatus === statusOption || selectedUser.userStatus === statusOption}
                    key={statusOption}
                    onClick={() => void handleStatusChange(statusOption)}
                    type="button"
                  >
                    {changingStatus === statusOption ? `Applying ${statusOption}...` : `Set ${statusOption}`}
                  </button>
                ))}
              </div>

              <p className="session-note">
                Current status: <strong>{selectedUser.userStatus}</strong>
              </p>
            </div>

            <div className="panel inset-panel">
              <div className="panel-header">
                <h4>Branch assignments</h4>
                <p>
                  {isRoleBranchScoped(editForm.role)
                    ? 'This role is branch-scoped. At least one assigned branch is required.'
                    : 'This role is agency-wide, so branch selection is cleared on save.'}
                </p>
              </div>

              <div className="selection-grid">
                {branches.map((branch) => (
                  <label className="checkbox-card" key={branch.id}>
                    <input
                      checked={editForm.branchIds.includes(branch.id)}
                      disabled={!isRoleBranchScoped(editForm.role)}
                      onChange={() => toggleEditBranch(branch.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{branch.name}</strong>
                      <small>{branch.code}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="button-row">
              <button className="button" disabled={savingEdit} type="submit">
                {savingEdit ? 'Saving user...' : 'Save user changes'}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setSelectedUser(null);
                  setEditForm(null);
                  setEditError(null);
                  setEditSuccess(null);
                }}
                type="button"
              >
                Clear selection
              </button>
            </div>

            {editError ? (
              <p className="alert">
                <strong>Update failed.</strong> {editError}
              </p>
            ) : null}
          </form>
        )}
      </section>
    </div>
  );
}
