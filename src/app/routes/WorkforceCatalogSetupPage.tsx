import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  CaregiverCertificationSummary,
  CaregiverSkillSummary,
  ConfigurationStatus,
  deactivateCaregiverCertification,
  deactivateCaregiverSkill,
  fetchCaregiverCertifications,
  fetchCaregiverSkills,
  saveCaregiverCertification,
  saveCaregiverSkill,
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

type WorkforceMode = 'skills' | 'certifications';

type SkillFormState = {
  name: string;
  code: string;
  description: string;
};

type CertificationFormState = {
  name: string;
  code: string;
  description: string;
  expirationRequired: boolean;
};

const INITIAL_SKILL_FORM: SkillFormState = {
  name: '',
  code: '',
  description: '',
};

const INITIAL_CERTIFICATION_FORM: CertificationFormState = {
  name: '',
  code: '',
  description: '',
  expirationRequired: true,
};

function mapSkillToForm(item: CaregiverSkillSummary): SkillFormState {
  return {
    name: item.name,
    code: item.code,
    description: item.description ?? '',
  };
}

function mapCertificationToForm(item: CaregiverCertificationSummary): CertificationFormState {
  return {
    name: item.name,
    code: item.code,
    description: item.description ?? '',
    expirationRequired: item.expirationRequired,
  };
}

export function WorkforceCatalogSetupPage() {
  const { state } = useAuth();
  const [mode, setMode] = useState<WorkforceMode>('skills');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [skillRows, setSkillRows] = useState<CaregiverSkillSummary[]>([]);
  const [certificationRows, setCertificationRows] = useState<CaregiverCertificationSummary[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<CaregiverSkillSummary | null>(null);
  const [selectedCertification, setSelectedCertification] =
    useState<CaregiverCertificationSummary | null>(null);
  const [skillForm, setSkillForm] = useState<SkillFormState>(INITIAL_SKILL_FORM);
  const [certificationForm, setCertificationForm] = useState<CertificationFormState>(
    INITIAL_CERTIFICATION_FORM,
  );
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
      if (mode === 'skills') {
        const response = await fetchCaregiverSkills({
          ...authContext,
          search,
          status,
          page: nextPage,
          size: 20,
        });
        setSkillRows(response.content);
        setTotalElements(response.totalElements);
        setTotalPages(response.totalPages);
        setPage(response.page);
        if (selectedSkill) {
          const refreshed = response.content.find((item) => item.id === selectedSkill.id);
          if (refreshed) {
            setSelectedSkill(refreshed);
            setSkillForm(mapSkillToForm(refreshed));
          }
        }
      } else {
        const response = await fetchCaregiverCertifications({
          ...authContext,
          search,
          status,
          page: nextPage,
          size: 20,
        });
        setCertificationRows(response.content);
        setTotalElements(response.totalElements);
        setTotalPages(response.totalPages);
        setPage(response.page);
        if (selectedCertification) {
          const refreshed = response.content.find((item) => item.id === selectedCertification.id);
          if (refreshed) {
            setSelectedCertification(refreshed);
            setCertificationForm(mapCertificationToForm(refreshed));
          }
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setUnauthorized(true);
      } else {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load workforce catalogs.',
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
    void loadRows(0);
  }, [authContext, state.status, mode, search, status]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Stories FE2-05 / FE2-06"
          message="Only permitted admins can manage caregiver skills and certifications."
          primaryLabel="Back to setup"
          primaryLink="/app/setup"
          title="Workforce catalogs are restricted."
        />
      </div>
    );
  }

  const isSkillMode = mode === 'skills';

  function startCreate() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectedSkill(null);
    setSelectedCertification(null);
    setSkillForm(INITIAL_SKILL_FORM);
    setCertificationForm(INITIAL_CERTIFICATION_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSkillMode) {
        const wasInactive = selectedSkill?.status === 'INACTIVE';
        const saved = await saveCaregiverSkill({
          ...authContext,
          skillId: selectedSkill?.id,
          name: skillForm.name,
          code: skillForm.code,
          description: skillForm.description,
        });
        setSelectedSkill(saved);
        setSkillForm(mapSkillToForm(saved));
        setSuccessMessage(
          selectedSkill
            ? wasInactive
              ? `Skill ${saved.name} reactivated and updated.`
              : `Skill ${saved.name} updated.`
            : `Skill ${saved.name} created.`,
        );
      } else {
        const wasInactive = selectedCertification?.status === 'INACTIVE';
        const saved = await saveCaregiverCertification({
          ...authContext,
          certificationId: selectedCertification?.id,
          name: certificationForm.name,
          code: certificationForm.code,
          description: certificationForm.description,
          expirationRequired: certificationForm.expirationRequired,
        });
        setSelectedCertification(saved);
        setCertificationForm(mapCertificationToForm(saved));
        setSuccessMessage(
          selectedCertification
            ? wasInactive
              ? `Certification ${saved.name} reactivated and updated.`
              : `Certification ${saved.name} updated.`
            : `Certification ${saved.name} created.`,
        );
      }

      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to save workforce catalog right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateSkill(item: CaregiverSkillSummary) {
    if (!confirmDestructiveConfigurationAction(`skill ${item.name}`)) {
      return;
    }
    setDeactivatingId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateCaregiverSkill({
        ...authContext,
        skillId: item.id,
      });
      setSuccessMessage(`Skill ${updated.name} deactivated.`);
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to deactivate skill right now.'));
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleDeactivateCertification(item: CaregiverCertificationSummary) {
    if (!confirmDestructiveConfigurationAction(`certification ${item.name}`)) {
      return;
    }
    setDeactivatingId(item.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await deactivateCaregiverCertification({
        ...authContext,
        certificationId: item.id,
      });
      setSuccessMessage(`Certification ${updated.name} deactivated.`);
      await loadRows(page);
    } catch (error) {
      setErrorMessage(formatConfigurationError(error, 'Unable to deactivate certification right now.'));
    } finally {
      setDeactivatingId(null);
    }
  }

  const activeRows = isSkillMode ? skillRows : certificationRows;
  const activeStatus = isSkillMode ? selectedSkill?.status : selectedCertification?.status;

  return (
    <ConfigurationPageShell
      actions={
        <div className="button-row">
          <button className="button button-secondary" onClick={() => setMode('skills')} type="button">
            Caregiver skills
          </button>
          <button
            className="button button-secondary"
            onClick={() => setMode('certifications')}
            type="button"
          >
            Certifications
          </button>
          <button className="button button-secondary" onClick={startCreate} type="button">
            New {isSkillMode ? 'skill' : 'certification'}
          </button>
        </div>
      }
      description="Manage reusable caregiver skills and certifications in one shared workforce setup area. Duplicate conflicts and validation errors are surfaced directly from the backend."
      eyebrow="Frontend Stories FE2-05 / FE2-06"
      title="Workforce catalogs"
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          aside={
            <div className="directory-summary">
              <span>{totalElements} total</span>
              <span>Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ''}</span>
            </div>
          }
          description={
            isSkillMode
              ? 'Search and manage reusable caregiver skill definitions.'
              : 'Search and manage certifications, including expiration-required behavior.'
          }
          title={isSkillMode ? 'Caregiver skills' : 'Certifications'}
        >
          <div className="toolbar-row">
            <div className="toolbar-grid">
              <label className="field field-light compact-field">
                <span>Search</span>
                <input
                  className="input input-light"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isSkillMode ? 'Skill name or code' : 'Certification name or code'}
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
          </div>

          {loading ? <p className="session-note">Loading workforce catalogs...</p> : null}
          {errorMessage ? (
            <p className="alert">
              <strong>Workforce catalog unavailable.</strong> {errorMessage}
            </p>
          ) : null}
          {successMessage ? <p className="success-note">{successMessage}</p> : null}

          <div className="config-table">
            <div
              className="config-table-row config-table-row-header"
              style={{
                gridTemplateColumns: isSkillMode
                  ? '1.2fr 0.8fr 1.4fr 0.8fr minmax(170px, auto)'
                  : '1.1fr 0.8fr 1.2fr 0.9fr 0.8fr minmax(170px, auto)',
              }}
            >
              <span>Name</span>
              <span>Code</span>
              <span>Description</span>
              {!isSkillMode ? <span>Expiration</span> : null}
              <span>Status</span>
              <span>Actions</span>
            </div>

            {activeRows.length === 0 ? (
              <div className="empty-state-card">
                <strong>No {isSkillMode ? 'skills' : 'certifications'} found</strong>
                <p>Create the first record or widen the filters above.</p>
              </div>
            ) : isSkillMode ? (
              skillRows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1.2fr 0.8fr 1.4fr 0.8fr minmax(170px, auto)' }}
                >
                  <span>{item.name}</span>
                  <span>{item.code}</span>
                  <span>{item.description || 'No description'}</span>
                  <span>{item.status}</span>
                  <div className="config-row-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => {
                        setSelectedSkill(item);
                        setSkillForm(mapSkillToForm(item));
                        setSuccessMessage(null);
                        setErrorMessage(null);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            ) : (
              certificationRows.map((item) => (
                <div
                  className="config-table-row"
                  key={item.id}
                  style={{ gridTemplateColumns: '1.1fr 0.8fr 1.2fr 0.9fr 0.8fr minmax(170px, auto)' }}
                >
                  <span>{item.name}</span>
                  <span>{item.code}</span>
                  <span>{item.description || 'No description'}</span>
                  <span>{item.expirationRequired ? 'Required' : 'Not required'}</span>
                  <span>{item.status}</span>
                  <div className="config-row-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => {
                        setSelectedCertification(item);
                        setCertificationForm(mapCertificationToForm(item));
                        setSuccessMessage(null);
                        setErrorMessage(null);
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

          <div className="pagination-row">
            <button
              className="button button-secondary"
              disabled={page === 0 || loading}
              onClick={() => void loadRows(page - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="button button-secondary"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => void loadRows(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          aside={
            activeStatus ? <span className={`status-pill status-${activeStatus.toLowerCase()}`}>{activeStatus}</span> : null
          }
          description={
            isSkillMode
              ? 'Create or edit caregiver skills for later reuse across staffing and scheduling.'
              : 'Create or edit certifications and define whether expiration tracking is required.'
          }
          title={
            isSkillMode
              ? selectedSkill
                ? `Edit ${selectedSkill.name}`
                : 'Create caregiver skill'
              : selectedCertification
                ? `Edit ${selectedCertification.name}`
                : 'Create certification'
          }
        >
          <ConfigurationAuditNotice subject={isSkillMode ? 'caregiver skill definitions' : 'certification definitions'} />
          <form className="stack-form stack-form-light" onSubmit={handleSubmit}>
            <div className="split-grid">
              <label className="field field-light">
                <span>Name</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    isSkillMode
                      ? setSkillForm((current) => ({ ...current, name: event.target.value }))
                      : setCertificationForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                  type="text"
                  value={isSkillMode ? skillForm.name : certificationForm.name}
                />
              </label>
              <label className="field field-light">
                <span>Code</span>
                <input
                  className="input input-light"
                  onChange={(event) =>
                    isSkillMode
                      ? setSkillForm((current) => ({ ...current, code: event.target.value }))
                      : setCertificationForm((current) => ({ ...current, code: event.target.value }))
                  }
                  required
                  type="text"
                  value={isSkillMode ? skillForm.code : certificationForm.code}
                />
              </label>
            </div>

            <label className="field field-light">
              <span>Description</span>
              <textarea
                className="input input-light config-textarea"
                onChange={(event) =>
                  isSkillMode
                    ? setSkillForm((current) => ({ ...current, description: event.target.value }))
                    : setCertificationForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                }
                value={isSkillMode ? skillForm.description : certificationForm.description}
              />
            </label>

            {!isSkillMode ? (
              <label className="checkbox-card">
                <input
                  checked={certificationForm.expirationRequired}
                  onChange={(event) =>
                    setCertificationForm((current) => ({
                      ...current,
                      expirationRequired: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <div>
                  <strong>Expiration required</strong>
                  <small>Use this when the certification must later support expiration tracking.</small>
                </div>
              </label>
            ) : null}

            <div className="button-row">
              <button className="button" disabled={saving} type="submit">
                {saving
                  ? 'Saving...'
                  : isSkillMode
                    ? selectedSkill
                      ? selectedSkill.status === 'INACTIVE'
                        ? 'Reactivate and save'
                        : 'Save changes'
                      : 'Create skill'
                    : selectedCertification
                      ? selectedCertification.status === 'INACTIVE'
                        ? 'Reactivate and save'
                        : 'Save changes'
                      : 'Create certification'}
              </button>

              {isSkillMode && selectedSkill?.status === 'ACTIVE' ? (
                <button
                  className="button button-secondary"
                  disabled={deactivatingId === selectedSkill.id}
                  onClick={() => void handleDeactivateSkill(selectedSkill)}
                  type="button"
                >
                  {deactivatingId === selectedSkill.id ? 'Deactivating...' : 'Deactivate'}
                </button>
              ) : null}

              {!isSkillMode && selectedCertification?.status === 'ACTIVE' ? (
                <button
                  className="button button-secondary"
                  disabled={deactivatingId === selectedCertification.id}
                  onClick={() => void handleDeactivateCertification(selectedCertification)}
                  type="button"
                >
                  {deactivatingId === selectedCertification.id ? 'Deactivating...' : 'Deactivate'}
                </button>
              ) : null}
            </div>
          </form>
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
