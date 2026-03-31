import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  BranchPolicySummary,
  BranchSummary,
  ConfigurationStatus,
  deactivateBranchPolicy,
  fetchBranchPolicies,
  fetchBranches,
  saveBranchPolicy,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import {
  ConfigurationAuditNotice,
  confirmDestructiveConfigurationAction,
  formatConfigurationError,
} from '../components/ConfigurationSupport';
import {
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

type BranchPolicyFormState = {
  branchId: string;
  policyKey: string;
  settingsPayloadJson: string;
  fallbackToAgencyDefault: boolean;
  displayOrder: string;
  effectiveFrom: string;
  effectiveTo: string;
};

const INITIAL_FORM: BranchPolicyFormState = {
  branchId: '',
  policyKey: '',
  settingsPayloadJson: '{\n  "value": null\n}',
  fallbackToAgencyDefault: false,
  displayOrder: '0',
  effectiveFrom: '',
  effectiveTo: '',
};

function mapPolicyToForm(item: BranchPolicySummary): BranchPolicyFormState {
  return {
    branchId: item.branchId ?? '',
    policyKey: item.policyKey,
    settingsPayloadJson: item.settingsPayloadJson ?? '',
    fallbackToAgencyDefault: item.fallbackToAgencyDefault,
    displayOrder: String(item.displayOrder),
    effectiveFrom: item.effectiveFrom ?? '',
    effectiveTo: item.effectiveTo ?? '',
  };
}

export function BranchPolicySetupPage() {
  const { state } = useAuth();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [branchFilter, setBranchFilter] = useState<string | 'ALL'>('ALL');
  const [status, setStatus] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [policyKeyFilter, setPolicyKeyFilter] = useState('');
  const [rows, setRows] = useState<BranchPolicySummary[]>([]);
  const [selected, setSelected] = useState<BranchPolicySummary | null>(null);
  const [form, setForm] = useState<BranchPolicyFormState>(INITIAL_FORM);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  async function loadRows(nextPage = page) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const [branchResponse, policyResponse] = await Promise.all([
        fetchBranches(authContext),
        fetchBranchPolicies({
          ...authContext,
          branchId: branchFilter,
          status,
          policyKey: policyKeyFilter,
          page: nextPage,
          size: 20,
        }),
      ]);
      setBranches(branchResponse);
      setRows(policyResponse.content);
      setPage(policyResponse.page);
      setTotalElements(policyResponse.totalElements);
      setTotalPages(policyResponse.totalPages);
      if (selected) {
        const refreshed = policyResponse.content.find((item) => item.id === selected.id);
        if (refreshed) {
          setSelected(refreshed);
          setForm(mapPolicyToForm(refreshed));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load branch policies.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }
    void loadRows(0);
  }, [authContext, state.status, branchFilter, status, policyKeyFilter]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-09"
          message="Only permitted admins can manage branch policies in the current agency."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Branch policy management is restricted."
        />
      </div>
    );
  }

  function branchLabel(id: string | null) {
    if (!id) {
      return 'No branch';
    }
    return branches.find((item) => item.id === id)?.name ?? 'Branch';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const wasInactive = selected?.status === 'INACTIVE';
      const saved = await saveBranchPolicy({
        ...authContext,
        branchPolicyId: selected?.id,
        branchId: form.branchId || undefined,
        policyKey: form.policyKey,
        settingsPayloadJson: form.settingsPayloadJson,
        fallbackToAgencyDefault: form.fallbackToAgencyDefault,
        displayOrder: Number(form.displayOrder || 0),
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo,
      });
      setSelected(saved);
      setForm(mapPolicyToForm(saved));
      setSuccessMessage(
        selected
          ? wasInactive
            ? `Branch policy ${saved.policyKey} reactivated and updated.`
            : `Branch policy ${saved.policyKey} updated.`
          : `Branch policy ${saved.policyKey} created.`,
      );
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save branch policy right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: BranchPolicySummary) {
    if (!confirmDestructiveConfigurationAction(`branch policy ${item.policyKey}`)) {
      return;
    }
    setDeactivatingId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateBranchPolicy({
        ...authContext,
        branchPolicyId: item.id,
      });
      setSuccessMessage(`Branch policy ${updated.policyKey} deactivated.`);
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to deactivate branch policy right now.'));
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <ConfigurationPageShell
      actions={
        <div className="button-row">
          <button
            className="button button-secondary"
            onClick={() => {
              setSelected(null);
              setForm(INITIAL_FORM);
            }}
            type="button"
          >
            New branch policy
          </button>
        </div>
      }
      description="Manage branch-specific operational policies and clearly surface when a record falls back to the agency default instead of using its own payload."
      eyebrow="Frontend Story FE2-09"
      title="Branch policies"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            <div className="directory-summary">
              <span>{totalElements} total</span>
              <span>Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}</span>
            </div>
          }
          description="Filter policies by branch or policy key and compare branch overrides with agency-default fallback behavior."
          title="Policy records"
        >
          <div className="toolbar-row">
            <div className="toolbar-grid">
              <label className="field field-light compact-field">
                <span>Branch filter</span>
                <select
                  className="input input-light"
                  onChange={(event) => setBranchFilter(event.target.value as string | 'ALL')}
                  value={branchFilter}
                >
                  <option value="ALL">All branches</option>
                  {branches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light compact-field">
                <span>Status</span>
                <select
                  className="input input-light"
                  onChange={(event) => setStatus(event.target.value as ConfigurationStatus | 'ALL')}
                  value={status}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
            </div>
            <label className="field field-light compact-field">
              <span>Policy key</span>
              <input
                className="input input-light"
                onChange={(event) => setPolicyKeyFilter(event.target.value)}
                placeholder="scheduling.window"
                type="search"
                value={policyKeyFilter}
              />
            </label>
          </div>

          {loading ? <p className="session-note">Loading branch policies...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Branch policies unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <div className="config-table">
            <div
              className="config-table-row config-table-row-header"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 0.9fr 0.8fr minmax(170px, auto)' }}
            >
              <span>Policy key</span>
              <span>Branch</span>
              <span>Fallback mode</span>
              <span>Effective payload</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {rows.length === 0 ? (
              <div className="empty-state-card">
                <strong>No branch policies found</strong>
                <p>Create the first policy or adjust the filters above.</p>
              </div>
            ) : (
              rows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1fr 1fr 1fr 0.9fr 0.8fr minmax(170px, auto)' }}
                >
                  <span>{item.policyKey}</span>
                  <span>{branchLabel(item.branchId)}</span>
                  <span>{item.fallbackToAgencyDefault ? 'Agency fallback' : 'Branch override'}</span>
                  <span>{item.usesAgencyDefault ? 'Using agency default' : 'Custom payload'}</span>
                  <span>{item.status}</span>
                  <div className="config-row-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => {
                        setSelected(item);
                        setForm(mapPolicyToForm(item));
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          aside={
            selected ? (
              <span className={`status-pill status-${selected.status.toLowerCase()}`}>{selected.status}</span>
            ) : null
          }
          description="Create branch overrides or configure a record to fall back to the agency default while keeping scope and effective-window behavior clear."
          title={selected ? `Edit ${selected.policyKey}` : 'Create branch policy'}
        >
          <ConfigurationAuditNotice subject="branch policy overrides" />
          <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
            <label className="field field-light">
              <span>Branch</span>
              <select
                className="input input-light"
                onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                required
                value={form.branchId}
              >
                <option value="">Select a branch</option>
                {branches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="split-grid">
              <label className="field field-light">
                <span>Policy key</span>
                <input
                  className="input input-light"
                  onChange={(event) => setForm((current) => ({ ...current, policyKey: event.target.value }))}
                  required
                  type="text"
                  value={form.policyKey}
                />
              </label>
              <label className="field field-light">
                <span>Display order</span>
                <input
                  className="input input-light"
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
                  step="1"
                  type="number"
                  value={form.displayOrder}
                />
              </label>
            </div>

            <label className="checkbox-card">
              <input
                checked={form.fallbackToAgencyDefault}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fallbackToAgencyDefault: event.target.checked }))
                }
                type="checkbox"
              />
              <div>
                <strong>Fallback to agency default</strong>
                <small>
                  When enabled, this branch record can omit its own payload and clearly show that it uses the
                  agency default instead.
                </small>
              </div>
            </label>

            <label className="field field-light">
              <span>Settings payload JSON</span>
              <textarea
                className="input input-light config-textarea"
                onChange={(event) =>
                  setForm((current) => ({ ...current, settingsPayloadJson: event.target.value }))
                }
                placeholder={form.fallbackToAgencyDefault ? 'Optional when fallback is enabled' : '{\n  "minutes": 30\n}'}
                value={form.settingsPayloadJson}
              />
            </label>

            <div className="split-grid">
              <label className="field field-light">
                <span>Effective from</span>
                <input
                  className="input input-light"
                  onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))}
                  placeholder="2026-04-01T00:00:00-05:00"
                  type="text"
                  value={form.effectiveFrom}
                />
              </label>
              <label className="field field-light">
                <span>Effective to</span>
                <input
                  className="input input-light"
                  onChange={(event) => setForm((current) => ({ ...current, effectiveTo: event.target.value }))}
                  placeholder="2026-12-31T23:59:59-06:00"
                  type="text"
                  value={form.effectiveTo}
                />
              </label>
            </div>

            <div className="button-row">
              <button className="button" disabled={saving} type="submit">
                {saving
                  ? 'Saving...'
                  : selected
                    ? selected.status === 'INACTIVE'
                      ? 'Reactivate and save'
                      : 'Save changes'
                    : 'Create policy'}
              </button>
              {selected?.status === 'ACTIVE' ? (
                <button
                  className="button button-secondary"
                  disabled={deactivatingId === selected.id}
                  onClick={() => void handleDeactivate(selected)}
                  type="button"
                >
                  {deactivatingId === selected.id ? 'Deactivating...' : 'Deactivate'}
                </button>
              ) : null}
            </div>
          </form>
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
