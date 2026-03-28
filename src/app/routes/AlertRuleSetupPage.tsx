import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AlertRuleSummary,
  AlertRuleType,
  ApiError,
  BranchSummary,
  ConfigurationStatus,
  deactivateAlertRule,
  fetchAlertRules,
  fetchBranches,
  saveAlertRule,
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

type AlertRuleFormState = {
  branchId: string;
  name: string;
  ruleType: AlertRuleType;
  configPayloadJson: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
  displayOrder: string;
};

const ALERT_RULE_TYPES: AlertRuleType[] = [
  'MISSED_VISIT',
  'LATE_ARRIVAL',
  'DOCUMENTATION_OVERDUE',
  'CREDENTIAL_EXPIRING',
  'CUSTOM_THRESHOLD',
];

const INITIAL_FORM: AlertRuleFormState = {
  branchId: '',
  name: '',
  ruleType: 'MISSED_VISIT',
  configPayloadJson: '{\n  "threshold": 10\n}',
  notifyEmail: true,
  notifySms: false,
  notifyInApp: true,
  displayOrder: '0',
};

function mapRuleToForm(item: AlertRuleSummary): AlertRuleFormState {
  return {
    branchId: item.branchId ?? '',
    name: item.name,
    ruleType: item.ruleType ?? 'MISSED_VISIT',
    configPayloadJson: item.configPayloadJson,
    notifyEmail: item.notifyEmail,
    notifySms: item.notifySms,
    notifyInApp: item.notifyInApp,
    displayOrder: String(item.displayOrder),
  };
}

export function AlertRuleSetupPage() {
  const { state } = useAuth();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string | 'ALL'>('ALL');
  const [ruleTypeFilter, setRuleTypeFilter] = useState<AlertRuleType | 'ALL'>('ALL');
  const [rows, setRows] = useState<AlertRuleSummary[]>([]);
  const [selected, setSelected] = useState<AlertRuleSummary | null>(null);
  const [form, setForm] = useState<AlertRuleFormState>(INITIAL_FORM);
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
  }, [state]);

  async function loadRows(nextPage = page) {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const [branchResponse, ruleResponse] = await Promise.all([
        fetchBranches(authContext),
        fetchAlertRules({
          ...authContext,
          search,
          status,
          branchId: branchFilter,
          ruleType: ruleTypeFilter,
          page: nextPage,
          size: 20,
        }),
      ]);
      setBranches(branchResponse);
      setRows(ruleResponse.content);
      setPage(ruleResponse.page);
      setTotalElements(ruleResponse.totalElements);
      setTotalPages(ruleResponse.totalPages);
      if (selected) {
        const refreshed = ruleResponse.content.find((item) => item.id === selected.id);
        if (refreshed) {
          setSelected(refreshed);
          setForm(mapRuleToForm(refreshed));
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load alert rules.');
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
  }, [authContext, state.status, search, status, branchFilter, ruleTypeFilter]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-10"
          message="Only permitted admins can manage alert rules."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Alert rule management is restricted."
        />
      </div>
    );
  }

  function branchLabel(id: string | null) {
    if (!id) {
      return 'Agency-wide';
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
      const saved = await saveAlertRule({
        ...authContext,
        alertRuleId: selected?.id,
        branchId: form.branchId || undefined,
        name: form.name,
        ruleType: form.ruleType,
        configPayloadJson: form.configPayloadJson,
        notifyEmail: form.notifyEmail,
        notifySms: form.notifySms,
        notifyInApp: form.notifyInApp,
        displayOrder: Number(form.displayOrder || 0),
      });
      setSelected(saved);
      setForm(mapRuleToForm(saved));
      setSuccessMessage(
        selected
          ? wasInactive
            ? `Alert rule ${saved.name} reactivated and updated.`
            : `Alert rule ${saved.name} updated.`
          : `Alert rule ${saved.name} created.`,
      );
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save alert rule right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item: AlertRuleSummary) {
    if (!confirmDestructiveConfigurationAction(`alert rule ${item.name}`)) {
      return;
    }
    setDeactivatingId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateAlertRule({
        ...authContext,
        alertRuleId: item.id,
      });
      setSuccessMessage(`Alert rule ${updated.name} deactivated.`);
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to deactivate alert rule right now.'));
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
            New alert rule
          </button>
        </div>
      }
      description="Configure agency-wide or branch-specific alert rules with clear scope visibility, payload validation feedback, and delivery-mode toggles."
      eyebrow="Frontend Story FE2-10"
      title="Alert rules"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            <div className="directory-summary">
              <span>{totalElements} total</span>
              <span>Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}</span>
            </div>
          }
          description="Search alert rules and filter by scope or alert type."
          title="Alert rule library"
        >
          <div className="toolbar-row">
            <div className="toolbar-grid">
              <label className="field field-light compact-field">
                <span>Search</span>
                <input
                  className="input input-light"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Alert rule name"
                  type="search"
                  value={search}
                />
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
            <div className="toolbar-grid">
              <label className="field field-light compact-field">
                <span>Scope</span>
                <select
                  className="input input-light"
                  onChange={(event) => setBranchFilter(event.target.value as string | 'ALL')}
                  value={branchFilter}
                >
                  <option value="ALL">All scopes</option>
                  <option value="">Agency-wide only</option>
                  {branches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light compact-field">
                <span>Rule type</span>
                <select
                  className="input input-light"
                  onChange={(event) => setRuleTypeFilter(event.target.value as AlertRuleType | 'ALL')}
                  value={ruleTypeFilter}
                >
                  <option value="ALL">All types</option>
                  {ALERT_RULE_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? <p className="session-note">Loading alert rules...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Alert rules unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <div className="config-table">
            <div
              className="config-table-row config-table-row-header"
              style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 0.8fr minmax(170px, auto)' }}
            >
              <span>Name</span>
              <span>Scope</span>
              <span>Rule type</span>
              <span>Delivery</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {rows.length === 0 ? (
              <div className="empty-state-card">
                <strong>No alert rules found</strong>
                <p>Create an alert rule or widen the filters above.</p>
              </div>
            ) : (
              rows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 0.8fr minmax(170px, auto)' }}
                >
                  <span>{item.name}</span>
                  <span>{item.branchSpecific ? branchLabel(item.branchId) : 'Agency-wide'}</span>
                  <span>{item.ruleType ?? 'Unspecified'}</span>
                  <span>
                    {[item.notifyEmail && 'Email', item.notifySms && 'SMS', item.notifyInApp && 'In-app']
                      .filter(Boolean)
                      .join(', ') || 'None'}
                  </span>
                  <span>{item.status}</span>
                  <div className="config-row-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => {
                        setSelected(item);
                        setForm(mapRuleToForm(item));
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
          description="Configure scope, payload JSON, and delivery channels in one place so later integrations can attach to the same rule model."
          title={selected ? `Edit ${selected.name}` : 'Create alert rule'}
        >
          <ConfigurationAuditNotice subject="alert rule configuration" />
          <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
            <div className="split-grid">
              <label className="field field-light">
                <span>Scope</span>
                <select
                  className="input input-light"
                  onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                  value={form.branchId}
                >
                  <option value="">Agency-wide</option>
                  {branches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-light">
                <span>Rule type</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ruleType: event.target.value as AlertRuleType }))
                  }
                  value={form.ruleType}
                >
                  {ALERT_RULE_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="split-grid">
              <label className="field field-light">
                <span>Name</span>
                <input
                  className="input input-light"
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  type="text"
                  value={form.name}
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

            <label className="field field-light">
              <span>Configuration payload JSON</span>
              <textarea
                className="input input-light config-textarea"
                onChange={(event) =>
                  setForm((current) => ({ ...current, configPayloadJson: event.target.value }))
                }
                required
                value={form.configPayloadJson}
              />
            </label>

            <div className="selection-grid">
              <label className="checkbox-card">
                <input
                  checked={form.notifyEmail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notifyEmail: event.target.checked }))
                  }
                  type="checkbox"
                />
                <div>
                  <strong>Email delivery</strong>
                  <small>Send alert notifications by email.</small>
                </div>
              </label>
              <label className="checkbox-card">
                <input
                  checked={form.notifySms}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notifySms: event.target.checked }))
                  }
                  type="checkbox"
                />
                <div>
                  <strong>SMS delivery</strong>
                  <small>Send alert notifications by SMS.</small>
                </div>
              </label>
              <label className="checkbox-card">
                <input
                  checked={form.notifyInApp}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notifyInApp: event.target.checked }))
                  }
                  type="checkbox"
                />
                <div>
                  <strong>In-app delivery</strong>
                  <small>Raise the alert inside the product UI.</small>
                </div>
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
                    : 'Create rule'}
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
