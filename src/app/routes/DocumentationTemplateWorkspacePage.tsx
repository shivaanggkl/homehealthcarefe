import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  AgencyRole,
  ApiError,
  ConfigurationStatus,
  DocumentationFieldType,
  DocumentationTemplateAggregate,
  DocumentationTemplateSummary,
  DocumentationTemplateType,
  DocumentationTaskLibraryItem,
  ServiceLineSummary,
  VisitTypeSummary,
  deactivateEpic8DocumentationTemplate,
  fetchDocumentationTaskLibrary,
  fetchEpic8DocumentationTemplate,
  fetchEpic8DocumentationTemplates,
  fetchServiceLines,
  fetchVisitTypes,
  saveEpic8DocumentationTemplate,
} from '../auth/session-api';
import { AccessDeniedPanel } from '../components/AccessDeniedPanel';
import { confirmDestructiveConfigurationAction, formatConfigurationError } from '../components/ConfigurationSupport';
import {
  DocumentationAuditCallout,
  DocumentationEditorFrame,
  DocumentationModuleState,
  DocumentationMutationNotice,
  DocumentationPanel,
  DocumentationWorkspaceGrid,
  DocumentationWorkspaceShell,
} from '../components/DocumentationWorkspaceFoundation';

type SectionForm = { localId: string; sectionKey: string; title: string; helpText: string; sortOrder: string };
type FieldForm = {
  localId: string;
  sectionKey: string;
  fieldKey: string;
  label: string;
  fieldType: DocumentationFieldType;
  requiredField: boolean;
  sortOrder: string;
  helpText: string;
  optionsJson: string;
  visibleActorRoles: AgencyRole[];
  editableActorRoles: AgencyRole[];
};
type TaskLinkForm = {
  localId: string;
  sectionKey: string;
  taskTemplateId: string;
  titleOverride: string;
  descriptionOverride: string;
  requiredOverride: 'inherit' | 'required' | 'optional';
  sortOrder: string;
};
type TemplateForm = {
  name: string;
  code: string;
  templateType: DocumentationTemplateType;
  displayOrder: string;
  serviceLineId: string;
  visitTypeId: string;
  branchId: string;
  helpText: string;
  structuredDefinitionJson: string;
  requiresSignatureVerification: boolean;
  allowedActorRoles: AgencyRole[];
  sections: SectionForm[];
  fields: FieldForm[];
  tasks: TaskLinkForm[];
};

const TEMPLATE_TYPES: DocumentationTemplateType[] = ['VISIT_NOTE', 'ASSESSMENT', 'CARE_PLAN', 'CUSTOM_FORM'];
const FIELD_TYPES: DocumentationFieldType[] = ['TEXT', 'LONG_TEXT', 'BOOLEAN', 'NUMBER', 'DATE_TIME', 'SELECT_CODED_VALUE', 'FREE_TEXT_BLOCK'];
const ROLE_OPTIONS: AgencyRole[] = ['AGENCY_OWNER', 'BRANCH_ADMIN', 'SCHEDULER_COORDINATOR', 'CAREGIVER', 'QA_CLINICAL_REVIEWER', 'BILLING_BACK_OFFICE', 'READ_ONLY_AUDITOR'];

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyTemplateForm(): TemplateForm {
  return {
    name: '',
    code: '',
    templateType: 'VISIT_NOTE',
    displayOrder: '0',
    serviceLineId: '',
    visitTypeId: '',
    branchId: '',
    helpText: '',
    structuredDefinitionJson: '{"version":1}',
    requiresSignatureVerification: false,
    allowedActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
    sections: [{ localId: uid('section'), sectionKey: 'overview', title: 'Overview', helpText: '', sortOrder: '1' }],
    fields: [{
      localId: uid('field'),
      sectionKey: 'overview',
      fieldKey: 'narrative',
      label: 'Narrative',
      fieldType: 'LONG_TEXT',
      requiredField: true,
      sortOrder: '1',
      helpText: '',
      optionsJson: '',
      visibleActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
      editableActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
    }],
    tasks: [],
  };
}

function toTemplateForm(item: DocumentationTemplateAggregate): TemplateForm {
  return {
    name: item.template.name,
    code: item.template.code,
    templateType: item.template.templateType ?? 'VISIT_NOTE',
    displayOrder: String(item.template.displayOrder),
    serviceLineId: item.template.serviceLineId ?? '',
    visitTypeId: item.template.visitTypeId ?? '',
    branchId: item.template.branchId ?? '',
    helpText: item.template.helpText ?? '',
    structuredDefinitionJson: item.template.structuredDefinitionJson,
    requiresSignatureVerification: item.template.requiresSignatureVerification ?? false,
    allowedActorRoles: item.template.allowedActorRoles ?? [],
    sections: item.sections.map((section) => ({
      localId: section.id,
      sectionKey: section.sectionKey,
      title: section.title,
      helpText: section.helpText ?? '',
      sortOrder: String(section.sortOrder),
    })),
    fields: item.fields.map((field) => ({
      localId: field.id,
      sectionKey: item.sections.find((section) => section.id === field.sectionId)?.sectionKey ?? '',
      fieldKey: field.fieldKey,
      label: field.label,
      fieldType: field.fieldType,
      requiredField: field.requiredField,
      sortOrder: String(field.sortOrder),
      helpText: field.helpText ?? '',
      optionsJson: field.optionsJson ?? '',
      visibleActorRoles: field.visibleActorRoles,
      editableActorRoles: field.editableActorRoles,
    })),
    tasks: item.tasks.map((task) => ({
      localId: task.id,
      sectionKey: item.sections.find((section) => section.id === task.sectionId)?.sectionKey ?? '',
      taskTemplateId: task.taskTemplateId ?? '',
      titleOverride: '',
      descriptionOverride: '',
      requiredOverride: 'inherit',
      sortOrder: String(task.sortOrder),
    })),
  };
}

export function DocumentationTemplateWorkspacePage() {
  const { state } = useAuth();
  const [templates, setTemplates] = useState<DocumentationTemplateSummary[]>([]);
  const [serviceLines, setServiceLines] = useState<ServiceLineSummary[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitTypeSummary[]>([]);
  const [taskLibrary, setTaskLibrary] = useState<DocumentationTaskLibraryItem[]>([]);
  const [selected, setSelected] = useState<DocumentationTemplateAggregate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyTemplateForm());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConfigurationStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<DocumentationTemplateType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state.status, state.status === 'authenticated' ? state.session.sessionId : undefined]);

  async function loadWorkspace(selectTemplateId?: string) {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const [templateResponse, serviceLineResponse, visitTypeResponse, taskResponse] = await Promise.all([
        fetchEpic8DocumentationTemplates({ ...authContext, search, status: statusFilter, templateType: typeFilter, page: 0, size: 100 }),
        fetchServiceLines({ ...authContext, status: 'ALL', page: 0, size: 100 }),
        fetchVisitTypes({ ...authContext, status: 'ALL', page: 0, size: 100 }),
        fetchDocumentationTaskLibrary({ ...authContext, status: 'ALL', page: 0, size: 100 }),
      ]);
      setTemplates(templateResponse.content);
      setServiceLines(serviceLineResponse.content);
      setVisitTypes(visitTypeResponse.content);
      setTaskLibrary(taskResponse.content);

      const nextId = selectTemplateId ?? selected?.template.id ?? templateResponse.content[0]?.id;
      if (nextId) {
        const detail = await fetchEpic8DocumentationTemplate({ ...authContext, templateId: nextId });
        setSelected(detail);
        setForm(toTemplateForm(detail));
      } else {
        setSelected(null);
        setForm(emptyTemplateForm());
      }
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setUnauthorized(true);
      } else {
        setError(formatConfigurationError(requestError, 'Unable to load documentation templates right now.'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state.status === 'authenticated') {
      void loadWorkspace();
    }
  }, [authContext, state.status, search, statusFilter, typeFilter]);

  if (state.status !== 'authenticated') {
    return null;
  }

  if (unauthorized) {
    return (
      <div className="page-grid">
        <AccessDeniedPanel
          eyebrow="Frontend Story FE8-02"
          message="Only permitted admins can manage Epic 8 documentation templates."
          primaryLabel="Back to documentation"
          primaryLink="/app/documentation"
          title="Documentation template management is restricted."
        />
      </div>
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveEpic8DocumentationTemplate({
        ...authContext,
        templateId: selected?.template.id,
        name: form.name,
        code: form.code,
        templateType: form.templateType,
        structuredDefinitionJson: form.structuredDefinitionJson,
        displayOrder: Number(form.displayOrder || 0),
        serviceLineId: form.serviceLineId || null,
        visitTypeId: form.visitTypeId || null,
        branchId: form.branchId || null,
        helpText: form.helpText || null,
        allowedActorRoles: form.allowedActorRoles,
        requiresSignatureVerification: form.requiresSignatureVerification,
        sections: form.sections.map((section) => ({
          sectionKey: section.sectionKey,
          title: section.title,
          helpText: section.helpText || null,
          sortOrder: Number(section.sortOrder || 0),
        })),
        fields: form.fields.map((field) => ({
          sectionKey: field.sectionKey || null,
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          requiredField: field.requiredField,
          sortOrder: Number(field.sortOrder || 0),
          optionsJson: field.optionsJson || null,
          helpText: field.helpText || null,
          visibleActorRoles: field.visibleActorRoles,
          editableActorRoles: field.editableActorRoles,
        })),
        tasks: form.tasks.map((task) => ({
          sectionKey: task.sectionKey || null,
          taskTemplateId: task.taskTemplateId || null,
          titleOverride: task.titleOverride || null,
          descriptionOverride: task.descriptionOverride || null,
          requiredOverride:
            task.requiredOverride === 'inherit'
              ? null
              : task.requiredOverride === 'required',
          sortOrder: Number(task.sortOrder || 0),
        })),
      });
      setSelected(saved);
      setForm(toTemplateForm(saved));
      setSuccess(
        selected
          ? `Template ${saved.template.name} updated.`
          : `Template ${saved.template.name} created.`,
      );
      await loadWorkspace(saved.template.id);
    } catch (requestError) {
      setError(formatConfigurationError(requestError, 'Unable to save the documentation template right now.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!selected || !confirmDestructiveConfigurationAction(`documentation template ${selected.template.name}`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const updated = await deactivateEpic8DocumentationTemplate({
        ...authContext,
        templateId: selected.template.id,
      });
      setSuccess(`Template ${updated.name} deactivated.`);
      await loadWorkspace();
    } catch (requestError) {
      setError(formatConfigurationError(requestError, 'Unable to deactivate the documentation template right now.'));
    }
  }

  function toggleRole(list: AgencyRole[], role: AgencyRole): AgencyRole[] {
    return list.includes(role) ? list.filter((item) => item !== role) : [...list, role];
  }

  return (
    <DocumentationWorkspaceShell
      eyebrow="Frontend Stories FE8-02 · FE8-10"
      title="Documentation template management"
      description="Create and edit Epic 8 visit-note templates with real backend CRUD, visit-type linkage, role visibility, ordered sections, field definitions, and reusable task-library links."
    >
      <DocumentationWorkspaceGrid>
        <DocumentationPanel
          title="Template library"
          description="Search and filter documentation templates, then open one in the shared admin builder."
        >
          <div className="toolbar-row">
            <input className="input" onChange={(event) => setSearch(event.target.value)} placeholder="Search templates" value={search} />
            <select className="input" onChange={(event) => setStatusFilter(event.target.value as ConfigurationStatus | 'ALL')} value={statusFilter}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <select className="input" onChange={(event) => setTypeFilter(event.target.value as DocumentationTemplateType | 'ALL')} value={typeFilter}>
              <option value="ALL">All types</option>
              {TEMPLATE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button className="button button-secondary" onClick={() => { setSelected(null); setForm(emptyTemplateForm()); }} type="button">
              New template
            </button>
          </div>
          {loading ? <p className="session-note">Loading templates...</p> : null}
          {error ? <DocumentationModuleState title="Template load failed" description={error} variant="error" /> : null}
          {!loading && !error && templates.length === 0 ? (
            <DocumentationModuleState title="No templates found" description="No templates match the current filters." variant="empty" />
          ) : null}
          {templates.map((template) => (
            <button
              key={template.id}
              className={`documentation-select-row${selected?.template.id === template.id ? ' documentation-select-row-active' : ''}`}
              onClick={async () => {
                const detail = await fetchEpic8DocumentationTemplate({ ...authContext, templateId: template.id });
                setSelected(detail);
                setForm(toTemplateForm(detail));
              }}
              type="button"
            >
              <strong>{template.name}</strong>
              <span>{template.status} · {template.templateType}</span>
            </button>
          ))}
        </DocumentationPanel>

        <DocumentationPanel
          title="Template builder"
          description="The shared admin builder now supports real Epic 8 template CRUD instead of placeholder scaffolding."
        >
          <DocumentationMutationNotice
            message={
              success ??
              'Template saves are audited and go straight to the Epic 8 backend template API.'
            }
            state={saving ? 'saving' : success ? 'saved' : error ? 'retry' : 'idle'}
          />
          <DocumentationAuditCallout
            title="Template changes are controlled"
            body="Template saves and deactivations affect later caregiver note entry, so the frontend keeps audit-aware messaging visible without exposing backend-only identifiers."
            links={[
              { to: '/app/admin/audit?actionType=DOC_TEMPLATE_UPDATED', label: 'Open template audit activity' },
            ]}
          />
          <form onSubmit={handleSave}>
            <DocumentationEditorFrame
              title={selected?.template.name ?? 'New documentation template'}
              helper="Define note metadata, sections, fields, and reusable task-library links."
              mode="admin-edit"
            >
              <div className="documentation-form-grid">
                <label className="field"><span>Name</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} /></label>
                <label className="field"><span>Code</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required value={form.code} /></label>
                <label className="field"><span>Template type</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, templateType: event.target.value as DocumentationTemplateType }))} value={form.templateType}>{TEMPLATE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                <label className="field"><span>Display order</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} type="number" value={form.displayOrder} /></label>
                <label className="field"><span>Service line</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, serviceLineId: event.target.value }))} value={form.serviceLineId}><option value="">All service lines</option>{serviceLines.map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}</select></label>
                <label className="field"><span>Visit type</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, visitTypeId: event.target.value }))} value={form.visitTypeId}><option value="">All visit types</option>{visitTypes.map((visitType) => <option key={visitType.id} value={visitType.id}>{visitType.name}</option>)}</select></label>
                <label className="field documentation-field-block"><span>Helper text</span><textarea className="input" onChange={(event) => setForm((current) => ({ ...current, helpText: event.target.value }))} rows={3} value={form.helpText} /></label>
                <label className="field documentation-field-block"><span>Structured definition JSON</span><textarea className="input" onChange={(event) => setForm((current) => ({ ...current, structuredDefinitionJson: event.target.value }))} rows={3} value={form.structuredDefinitionJson} /></label>
              </div>

              <label className="checkbox-row">
                <input checked={form.requiresSignatureVerification} onChange={(event) => setForm((current) => ({ ...current, requiresSignatureVerification: event.target.checked }))} type="checkbox" />
                <span>Require signature verification before submit</span>
              </label>

              <div className="documentation-role-grid">
                {ROLE_OPTIONS.map((role) => (
                  <label key={role} className="checkbox-row">
                    <input
                      checked={form.allowedActorRoles.includes(role)}
                      onChange={() => setForm((current) => ({ ...current, allowedActorRoles: toggleRole(current.allowedActorRoles, role) }))}
                      type="checkbox"
                    />
                    <span>{role}</span>
                  </label>
                ))}
              </div>

              <div className="documentation-builder-section">
                <div className="documentation-builder-header">
                  <h4>Sections</h4>
                  <button className="button button-secondary" onClick={() => setForm((current) => ({ ...current, sections: [...current.sections, { localId: uid('section'), sectionKey: `section_${current.sections.length + 1}`, title: 'New section', helpText: '', sortOrder: String(current.sections.length + 1) }] }))} type="button">Add section</button>
                </div>
                {form.sections.map((section) => (
                  <article key={section.localId} className="documentation-builder-card">
                    <div className="documentation-form-grid">
                      <label className="field"><span>Section key</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, sections: current.sections.map((item) => item.localId === section.localId ? { ...item, sectionKey: event.target.value } : item) }))} value={section.sectionKey} /></label>
                      <label className="field"><span>Title</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, sections: current.sections.map((item) => item.localId === section.localId ? { ...item, title: event.target.value } : item) }))} value={section.title} /></label>
                      <label className="field"><span>Sort order</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, sections: current.sections.map((item) => item.localId === section.localId ? { ...item, sortOrder: event.target.value } : item) }))} type="number" value={section.sortOrder} /></label>
                      <label className="field documentation-field-block"><span>Help text</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, sections: current.sections.map((item) => item.localId === section.localId ? { ...item, helpText: event.target.value } : item) }))} value={section.helpText} /></label>
                    </div>
                  </article>
                ))}
              </div>

              <div className="documentation-builder-section">
                <div className="documentation-builder-header">
                  <h4>Fields</h4>
                  <button className="button button-secondary" onClick={() => setForm((current) => ({ ...current, fields: [...current.fields, { localId: uid('field'), sectionKey: current.sections[0]?.sectionKey ?? '', fieldKey: `field_${current.fields.length + 1}`, label: 'New field', fieldType: 'TEXT', requiredField: false, sortOrder: String(current.fields.length + 1), helpText: '', optionsJson: '', visibleActorRoles: current.allowedActorRoles, editableActorRoles: current.allowedActorRoles }] }))} type="button">Add field</button>
                </div>
                {form.fields.map((field) => (
                  <article key={field.localId} className="documentation-builder-card">
                    <div className="documentation-form-grid">
                      <label className="field"><span>Section</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, sectionKey: event.target.value } : item) }))} value={field.sectionKey}>{form.sections.map((section) => <option key={section.localId} value={section.sectionKey}>{section.title}</option>)}</select></label>
                      <label className="field"><span>Field key</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, fieldKey: event.target.value } : item) }))} value={field.fieldKey} /></label>
                      <label className="field"><span>Label</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, label: event.target.value } : item) }))} value={field.label} /></label>
                      <label className="field"><span>Type</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, fieldType: event.target.value as DocumentationFieldType } : item) }))} value={field.fieldType}>{FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                      <label className="field"><span>Sort order</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, sortOrder: event.target.value } : item) }))} type="number" value={field.sortOrder} /></label>
                      <label className="checkbox-row"><input checked={field.requiredField} onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, requiredField: event.target.checked } : item) }))} type="checkbox" /><span>Required</span></label>
                      <label className="field documentation-field-block"><span>Help text</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, helpText: event.target.value } : item) }))} value={field.helpText} /></label>
                      <label className="field documentation-field-block"><span>Options JSON</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, fields: current.fields.map((item) => item.localId === field.localId ? { ...item, optionsJson: event.target.value } : item) }))} value={field.optionsJson} /></label>
                    </div>
                  </article>
                ))}
              </div>

              <div className="documentation-builder-section">
                <div className="documentation-builder-header">
                  <h4>Task links</h4>
                  <button className="button button-secondary" onClick={() => setForm((current) => ({ ...current, tasks: [...current.tasks, { localId: uid('task'), sectionKey: current.sections[0]?.sectionKey ?? '', taskTemplateId: taskLibrary[0]?.id ?? '', titleOverride: '', descriptionOverride: '', requiredOverride: 'inherit', sortOrder: String(current.tasks.length + 1) }] }))} type="button">Add task link</button>
                </div>
                {form.tasks.length === 0 ? <DocumentationModuleState title="No task-library links yet" description="Templates can stay free-text only, or you can add reusable task links below." variant="empty" /> : null}
                {form.tasks.map((task) => (
                  <article key={task.localId} className="documentation-builder-card">
                    <div className="documentation-form-grid">
                      <label className="field"><span>Section</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, tasks: current.tasks.map((item) => item.localId === task.localId ? { ...item, sectionKey: event.target.value } : item) }))} value={task.sectionKey}>{form.sections.map((section) => <option key={section.localId} value={section.sectionKey}>{section.title}</option>)}</select></label>
                      <label className="field"><span>Task library item</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, tasks: current.tasks.map((item) => item.localId === task.localId ? { ...item, taskTemplateId: event.target.value } : item) }))} value={task.taskTemplateId}><option value="">Select task</option>{taskLibrary.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label className="field"><span>Sort order</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, tasks: current.tasks.map((item) => item.localId === task.localId ? { ...item, sortOrder: event.target.value } : item) }))} type="number" value={task.sortOrder} /></label>
                      <label className="field"><span>Required override</span><select className="input" onChange={(event) => setForm((current) => ({ ...current, tasks: current.tasks.map((item) => item.localId === task.localId ? { ...item, requiredOverride: event.target.value as TaskLinkForm['requiredOverride'] } : item) }))} value={task.requiredOverride}><option value="inherit">Inherit task default</option><option value="required">Always required</option><option value="optional">Always optional</option></select></label>
                      <label className="field documentation-field-block"><span>Title override</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, tasks: current.tasks.map((item) => item.localId === task.localId ? { ...item, titleOverride: event.target.value } : item) }))} value={task.titleOverride} /></label>
                      <label className="field documentation-field-block"><span>Description override</span><input className="input" onChange={(event) => setForm((current) => ({ ...current, tasks: current.tasks.map((item) => item.localId === task.localId ? { ...item, descriptionOverride: event.target.value } : item) }))} value={task.descriptionOverride} /></label>
                    </div>
                  </article>
                ))}
              </div>

              <div className="button-row">
                <button className="button" disabled={saving} type="submit">{saving ? 'Saving...' : selected ? 'Save template' : 'Create template'}</button>
                {selected ? <button className="button button-secondary" disabled={saving} onClick={() => void handleDeactivate()} type="button">Deactivate</button> : null}
              </div>
            </DocumentationEditorFrame>
          </form>
        </DocumentationPanel>
      </DocumentationWorkspaceGrid>
    </DocumentationWorkspaceShell>
  );
}
