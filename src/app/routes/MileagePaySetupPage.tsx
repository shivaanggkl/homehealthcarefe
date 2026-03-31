import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  BranchSummary,
  MileagePaySettingScope,
  MileagePaySettingsResponse,
  MileageReimbursementStrategy,
  fetchBranches,
  fetchMileagePaySettings,
  saveMileagePayBranchOverride,
  saveMileagePayDefault,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import { ConfigurationAuditNotice, formatConfigurationError } from '../components/ConfigurationSupport';
import {
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

type MileagePayFormState = {
  reimbursementStrategy: MileageReimbursementStrategy;
  mileageRate: string;
  travelPayEnabled: boolean;
  visitTypePayAdjustmentsJson: string;
  displayOrder: string;
  effectiveFrom: string;
  effectiveTo: string;
};

const INITIAL_FORM: MileagePayFormState = {
  reimbursementStrategy: 'STANDARD_RATE',
  mileageRate: '0.6700',
  travelPayEnabled: true,
  visitTypePayAdjustmentsJson: '{\n  "STD": {\n    "perVisit": 5.00\n  }\n}',
  displayOrder: '0',
  effectiveFrom: '',
  effectiveTo: '',
};

function mapScopeToForm(item: MileagePaySettingScope | null): MileagePayFormState {
  if (!item) {
    return INITIAL_FORM;
  }
  return {
    reimbursementStrategy: item.reimbursementStrategy,
    mileageRate: String(item.mileageRate),
    travelPayEnabled: item.travelPayEnabled,
    visitTypePayAdjustmentsJson: item.visitTypePayAdjustmentsJson ?? '',
    displayOrder: '0',
    effectiveFrom: item.effectiveFrom ?? '',
    effectiveTo: item.effectiveTo ?? '',
  };
}

export function MileagePaySetupPage() {
  const { state } = useAuth();
  const { profile } = useAccess();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [settings, setSettings] = useState<MileagePaySettingsResponse | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [defaultForm, setDefaultForm] = useState<MileagePayFormState>(INITIAL_FORM);
  const [branchForm, setBranchForm] = useState<MileagePayFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  async function loadPage() {
    setLoading(true);
    setUnauthorized(false);
    setErrorMessage(null);

    try {
      const [branchResponse, settingResponse] = await Promise.all([
        fetchBranches(authContext),
        fetchMileagePaySettings(authContext),
      ]);
      setBranches(branchResponse);
      setSettings(settingResponse);
      setDefaultForm(mapScopeToForm(settingResponse.agencyDefault));
      const branchScope =
        settingResponse.branchOverrides.find((item) => item.branchId === selectedBranchId) ?? null;
      setBranchForm(mapScopeToForm(branchScope));
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load mileage and pay settings.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }
    void loadPage();
  }, [authContext, state.status]);

  useEffect(() => {
    if (!settings) {
      return;
    }
    const branchScope =
      settings.branchOverrides.find((item) => item.branchId === selectedBranchId) ?? null;
    setBranchForm(mapScopeToForm(branchScope));
  }, [selectedBranchId, settings]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (profile.role !== 'AGENCY_OWNER' || unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE2-11"
          message="Mileage and pay settings are currently exposed as an owner-only backend capability."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Mileage and pay settings are restricted."
        />
      </div>
    );
  }

  async function handleSaveDefault(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingDefault(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await saveMileagePayDefault({
        ...authContext,
        reimbursementStrategy: defaultForm.reimbursementStrategy,
        mileageRate: Number(defaultForm.mileageRate),
        travelPayEnabled: defaultForm.travelPayEnabled,
        visitTypePayAdjustmentsJson: defaultForm.visitTypePayAdjustmentsJson,
        displayOrder: Number(defaultForm.displayOrder || 0),
        effectiveFrom: defaultForm.effectiveFrom,
        effectiveTo: defaultForm.effectiveTo,
      });
      setSuccessMessage('Agency default mileage and pay settings saved.');
      await loadPage();
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save the agency default settings right now.'));
    } finally {
      setSavingDefault(false);
    }
  }

  async function handleSaveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBranchId) {
      setErrorMessage('Select a branch before saving a branch override.');
      return;
    }

    setSavingBranch(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await saveMileagePayBranchOverride({
        ...authContext,
        branchId: selectedBranchId,
        reimbursementStrategy: branchForm.reimbursementStrategy,
        mileageRate: Number(branchForm.mileageRate),
        travelPayEnabled: branchForm.travelPayEnabled,
        visitTypePayAdjustmentsJson: branchForm.visitTypePayAdjustmentsJson,
        displayOrder: Number(branchForm.displayOrder || 0),
        effectiveFrom: branchForm.effectiveFrom,
        effectiveTo: branchForm.effectiveTo,
      });
      setSuccessMessage('Branch override saved.');
      await loadPage();
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save the branch override right now.'));
    } finally {
      setSavingBranch(false);
    }
  }

  function branchLabel(id: string | null) {
    if (!id) {
      return 'Agency default';
    }
    return branches.find((item) => item.id === id)?.name ?? 'Branch';
  }

  return (
    <ConfigurationPageShell
      description="Review current effective reimbursement defaults, update the agency-wide baseline, and manage branch overrides with explicit messaging for audit-sensitive changes."
      eyebrow="Frontend Story FE2-11"
      title="Mileage and pay settings"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          description="This panel shows the currently effective values returned by the backend for the present point in time."
          title="Current effective settings"
        >
          {loading ? <p className="session-note">Loading mileage and pay settings...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Settings unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}
          {settings ? (
            <>
              <dl className="definition-list compact">
                <div>
                  <dt>Effective at</dt>
                  <dd>{settings.effectiveAt}</dd>
                </div>
                <div>
                  <dt>Agency default strategy</dt>
                  <dd>{settings.agencyDefault?.reimbursementStrategy ?? 'Not configured yet'}</dd>
                </div>
                <div>
                  <dt>Agency default mileage rate</dt>
                  <dd>{settings.agencyDefault ? settings.agencyDefault.mileageRate : 'Not configured yet'}</dd>
                </div>
              </dl>

              <div className="config-table">
                <div
                  className="config-table-row config-table-row-header"
                  style={{ gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.8fr' }}
                >
                  <span>Scope</span>
                  <span>Strategy</span>
                  <span>Rate</span>
                  <span>Travel pay</span>
                  <span>Effective now</span>
                </div>
                {settings.agencyDefault ? (
                  <div
                    className="config-table-row"
                    style={{ gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.8fr' }}
                  >
                    <span>Agency default</span>
                    <span>{settings.agencyDefault.reimbursementStrategy}</span>
                    <span>{settings.agencyDefault.mileageRate}</span>
                    <span>{settings.agencyDefault.travelPayEnabled ? 'Enabled' : 'Disabled'}</span>
                    <span>{settings.agencyDefault.effectiveAtRequestedTime ? 'Yes' : 'No'}</span>
                  </div>
                ) : null}
                {settings?.branchOverrides.map((item) => (
                  <div
                    className="config-table-row"
                    key={item.id}
                    style={{ gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.8fr' }}
                  >
                    <span>{branchLabel(item.branchId)}</span>
                    <span>{item.reimbursementStrategy}</span>
                    <span>{item.mileageRate}</span>
                    <span>{item.travelPayEnabled ? 'Enabled' : 'Disabled'}</span>
                    <span>{item.effectiveAtRequestedTime ? 'Yes' : 'No'}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="callout-card">
            <strong>Audit-sensitive setting</strong>
            <p>
              Mileage and pay changes affect reimbursement and operational expectations. Review scope and rate
              carefully before saving.
            </p>
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          description="Update the default reimbursement strategy and optional visit-type adjustments that apply agency-wide."
          title="Agency default"
        >
          <ConfigurationAuditNotice subject="agency mileage and pay defaults" />
          <form className="stack-form stack-form-light" onSubmit={handleSaveDefault}>
            <div className="split-grid">
              <label className="field field-light">
                <span>Reimbursement strategy</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setDefaultForm((current) => ({
                      ...current,
                      reimbursementStrategy: event.target.value as MileageReimbursementStrategy,
                    }))
                  }
                  value={defaultForm.reimbursementStrategy}
                >
                  <option value="NONE">None</option>
                  <option value="STANDARD_RATE">Standard rate</option>
                  <option value="CUSTOM_RATE">Custom rate</option>
                </select>
              </label>
              <label className="field field-light">
                <span>Mileage rate</span>
                <input
                  className="input input-light"
                  min="0"
                  onChange={(event) =>
                    setDefaultForm((current) => ({ ...current, mileageRate: event.target.value }))
                  }
                  step="0.0001"
                  type="number"
                  value={defaultForm.mileageRate}
                />
              </label>
            </div>

            <label className="checkbox-card">
              <input
                checked={defaultForm.travelPayEnabled}
                onChange={(event) =>
                  setDefaultForm((current) => ({ ...current, travelPayEnabled: event.target.checked }))
                }
                type="checkbox"
              />
              <div>
                <strong>Travel pay enabled</strong>
                <small>Enable this if travel pay should be part of the default compensation behavior.</small>
              </div>
            </label>

            <label className="field field-light">
              <span>Visit type adjustments JSON</span>
              <textarea
                className="input input-light config-textarea"
                onChange={(event) =>
                  setDefaultForm((current) => ({
                    ...current,
                    visitTypePayAdjustmentsJson: event.target.value,
                  }))
                }
                value={defaultForm.visitTypePayAdjustmentsJson}
              />
            </label>

            <div className="split-grid">
              <label className="field field-light">
                <span>Effective from</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setDefaultForm((current) => ({ ...current, effectiveFrom: event.target.value }))
                  }
                  placeholder="2026-04-01T00:00:00-05:00"
                  type="text"
                  value={defaultForm.effectiveFrom}
                />
              </label>
              <label className="field field-light">
                <span>Effective to</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setDefaultForm((current) => ({ ...current, effectiveTo: event.target.value }))
                  }
                  placeholder="2026-12-31T23:59:59-06:00"
                  type="text"
                  value={defaultForm.effectiveTo}
                />
              </label>
            </div>

            <div className="button-row">
              <button className="button" disabled={savingDefault} type="submit">
                {savingDefault ? 'Saving default...' : 'Save agency default'}
              </button>
            </div>
          </form>
        </ConfigurationPanel>

        <ConfigurationPanel
          description="Select a branch to create or update a branch-specific override that sits alongside the agency default."
          title="Branch override"
        >
          <ConfigurationAuditNotice subject="branch-level mileage and pay overrides" />
          <form className="stack-form stack-form-light" onSubmit={handleSaveBranch}>
            <label className="field field-light">
              <span>Branch</span>
              <select
                className="input input-light"
                onChange={(event) => setSelectedBranchId(event.target.value)}
                value={selectedBranchId}
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
                <span>Reimbursement strategy</span>
                <select
                  className="input input-light"
                  onChange={(event) =>
                    setBranchForm((current) => ({
                      ...current,
                      reimbursementStrategy: event.target.value as MileageReimbursementStrategy,
                    }))
                  }
                  value={branchForm.reimbursementStrategy}
                >
                  <option value="NONE">None</option>
                  <option value="STANDARD_RATE">Standard rate</option>
                  <option value="CUSTOM_RATE">Custom rate</option>
                </select>
              </label>
              <label className="field field-light">
                <span>Mileage rate</span>
                <input
                  className="input input-light"
                  min="0"
                  onChange={(event) =>
                    setBranchForm((current) => ({ ...current, mileageRate: event.target.value }))
                  }
                  step="0.0001"
                  type="number"
                  value={branchForm.mileageRate}
                />
              </label>
            </div>

            <label className="checkbox-card">
              <input
                checked={branchForm.travelPayEnabled}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, travelPayEnabled: event.target.checked }))
                }
                type="checkbox"
              />
              <div>
                <strong>Travel pay enabled</strong>
                <small>Toggle branch-specific travel pay behavior.</small>
              </div>
            </label>

            <label className="field field-light">
              <span>Visit type adjustments JSON</span>
              <textarea
                className="input input-light config-textarea"
                onChange={(event) =>
                  setBranchForm((current) => ({
                    ...current,
                    visitTypePayAdjustmentsJson: event.target.value,
                  }))
                }
                value={branchForm.visitTypePayAdjustmentsJson}
              />
            </label>

            <div className="split-grid">
              <label className="field field-light">
                <span>Effective from</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setBranchForm((current) => ({ ...current, effectiveFrom: event.target.value }))
                  }
                  placeholder="2026-04-01T00:00:00-05:00"
                  type="text"
                  value={branchForm.effectiveFrom}
                />
              </label>
              <label className="field field-light">
                <span>Effective to</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    setBranchForm((current) => ({ ...current, effectiveTo: event.target.value }))
                  }
                  placeholder="2026-12-31T23:59:59-06:00"
                  type="text"
                  value={branchForm.effectiveTo}
                />
              </label>
            </div>

            <div className="button-row">
              <button className="button" disabled={savingBranch || !selectedBranchId} type="submit">
                {savingBranch ? 'Saving override...' : 'Save branch override'}
              </button>
            </div>
          </form>
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
