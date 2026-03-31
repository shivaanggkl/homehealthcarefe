import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  BranchSummary,
  createBranch,
  deactivateBranch,
  fetchCurrentAccess,
  fetchBranches,
  updateBranch,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';

type BranchFormState = {
  name: string;
  code: string;
  address: string;
  timezone: string;
};

const INITIAL_FORM: BranchFormState = {
  name: '',
  code: '',
  address: '',
  timezone: 'America/Chicago',
};

export function BranchManagementPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [search, setSearch] = useState('');
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [agencyId, setAgencyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BranchFormState>(INITIAL_FORM);
  const [selectedBranch, setSelectedBranch] = useState<BranchSummary | null>(null);
  const [editForm, setEditForm] = useState<BranchFormState>(INITIAL_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  async function loadBranchList(searchValue = search) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const [accessResponse, response] = await Promise.all([
        fetchCurrentAccess(authContext),
        fetchBranches({
          ...authContext,
          search: searchValue,
        }),
      ]);
      setAgencyId(accessResponse.agencyId);
      setBranches(response);
      if (selectedBranch) {
        const refreshed = response.find((branch) => branch.id === selectedBranch.id);
        if (refreshed) {
          setSelectedBranch(refreshed);
          setEditForm({
            name: refreshed.name,
            code: refreshed.code,
            address: refreshed.address,
            timezone: refreshed.timezone,
          });
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load branches.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    void loadBranchList(search);
  }, [authContext, state.status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  function selectBranch(branch: BranchSummary) {
    setSelectedBranch(branch);
    setEditForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      timezone: branch.timezone,
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await createBranch({
        ...authContext,
        agencyId,
        name: form.name,
        code: form.code,
        address: form.address,
        timezone: form.timezone,
      });
      setSuccessMessage(`Branch ${created.name} created successfully.`);
      setForm(INITIAL_FORM);
      await loadBranchList(search);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to create branch right now.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBranch) {
      return;
    }

    setSavingEdit(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await updateBranch({
        ...authContext,
        branchId: selectedBranch.id,
        name: editForm.name,
        code: editForm.code,
        address: editForm.address,
        timezone: editForm.timezone,
      });
      setSuccessMessage(`Branch ${updated.name} updated successfully.`);
      setSelectedBranch(updated);
      await loadBranchList(search);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to update branch right now.');
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeactivate(branch: BranchSummary) {
    setDeactivatingId(branch.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateBranch({
        ...authContext,
        branchId: branch.id,
      });
      setSuccessMessage(`Branch ${updated.name} is now inactive.`);
      await loadBranchList(search);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to deactivate branch right now.');
      }
    } finally {
      setDeactivatingId(null);
    }
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <section className="hero-card">
          <span className="eyebrow">Frontend Story FE-23</span>
          <h2>Branch management is restricted.</h2>
          <p>
            The backend returned a controlled <code>403</code> response for branch management, so the UI is
            rendering a clear unauthorized state.
          </p>
        </section>
        <AccessDeniedPanel message="Only authorized admins can manage branches in the current agency." />
      </div>
    );
  }

  const canDeactivate = profile.role === 'AGENCY_OWNER';

  return (
    <div className="page-grid">
      <section className="hero-card panel-span-2">
        <span className="eyebrow">Frontend Story FE-23</span>
        <h2>Manage agency branches.</h2>
        <p>
          Search branches, create new ones, edit existing details, and surface restrictions clearly. Branch
          availability here also supports later assignment workflows.
        </p>
      </section>

      <section className="panel panel-span-2">
        <div className="panel-header">
          <h3>Search branches</h3>
          <p>Branch list is backed by <code>GET /api/branches</code>.</p>
        </div>

        <div className="toolbar-row">
          <div className="toolbar-grid">
            <label className="field field-light compact-field">
              <span>Search</span>
              <input
                className="input input-light"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or code"
                type="search"
                value={search}
              />
            </label>
          </div>
          <div className="button-row">
            <button className="button button-secondary" onClick={() => void loadBranchList(search)} type="button">
              Refresh
            </button>
          </div>
        </div>

        {successMessage ? <p className="success-note">{successMessage}</p> : null}
        {errorMessage ? (
          <p className="alert">
            <strong>Branch action failed.</strong> {errorMessage}
          </p>
        ) : null}

        {loading ? <p className="session-note">Loading branches...</p> : null}

        <div className="directory-table">
          <div className="directory-row directory-row-header branch-row">
            <span>Name</span>
            <span>Code</span>
            <span>Timezone</span>
            <span>Status</span>
            <span>Address</span>
            <span>Action</span>
          </div>

          {branches.map((branch) => (
            <div className="directory-row branch-row" key={branch.id}>
              <div>
                <strong>{branch.name}</strong>
                <small>{branch.id}</small>
              </div>
              <div>{branch.code}</div>
              <div>{branch.timezone}</div>
              <div>
                <span className={`status-pill ${branch.status === 'ACTIVE' ? 'status-active' : 'status-deactivated'}`}>
                  {branch.status}
                </span>
              </div>
              <div>{branch.address}</div>
              <div className="button-row">
                <button className="button button-secondary button-small" onClick={() => selectBranch(branch)} type="button">
                  Edit
                </button>
                <button
                  className="button button-secondary button-small"
                  disabled={!canDeactivate || branch.status !== 'ACTIVE' || deactivatingId === branch.id}
                  onClick={() => void handleDeactivate(branch)}
                  type="button"
                >
                  {deactivatingId === branch.id ? 'Disabling...' : 'Disable'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {!canDeactivate ? (
          <p className="session-note">
            Branch admins can list and edit branches, but branch deactivation remains restricted to the agency owner.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Create branch</h3>
          <p>Duplicate branch names or codes will return backend conflict errors.</p>
        </div>

        <form className="stack-form stack-form-light" onSubmit={handleCreate}>
          <label className="field field-light">
            <span>Name</span>
            <input className="input input-light" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required type="text" value={form.name} />
          </label>
          <label className="field field-light">
            <span>Code</span>
            <input className="input input-light" onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required type="text" value={form.code} />
          </label>
          <label className="field field-light">
            <span>Address</span>
            <input className="input input-light" onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} required type="text" value={form.address} />
          </label>
          <label className="field field-light">
            <span>Time zone</span>
            <input className="input input-light" onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} required type="text" value={form.timezone} />
          </label>
          <div className="button-row">
            <button className="button" disabled={creating || !agencyId} type="submit">
              {creating ? 'Creating branch...' : 'Create branch'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Edit selected branch</h3>
          <p>Select a branch from the list to edit it.</p>
        </div>

        {!selectedBranch ? (
          <p className="session-note">Choose a branch from the list above to edit its details.</p>
        ) : (
          <form className="stack-form stack-form-light" onSubmit={handleEdit}>
            <div className="callout-card">
              <strong>{selectedBranch.name}</strong>
              <p>Current status: {selectedBranch.status}</p>
            </div>
            <label className="field field-light">
              <span>Name</span>
              <input className="input input-light" onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} required type="text" value={editForm.name} />
            </label>
            <label className="field field-light">
              <span>Code</span>
              <input className="input input-light" onChange={(event) => setEditForm((current) => ({ ...current, code: event.target.value }))} required type="text" value={editForm.code} />
            </label>
            <label className="field field-light">
              <span>Address</span>
              <input className="input input-light" onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))} required type="text" value={editForm.address} />
            </label>
            <label className="field field-light">
              <span>Time zone</span>
              <input className="input input-light" onChange={(event) => setEditForm((current) => ({ ...current, timezone: event.target.value }))} required type="text" value={editForm.timezone} />
            </label>
            <div className="button-row">
              <button className="button" disabled={savingEdit} type="submit">
                {savingEdit ? 'Saving branch...' : 'Save branch changes'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
