import { useEffect, useMemo, useState } from 'react';
import {
  AgencyRole,
  ApiError,
  DocumentationFieldDefinition,
  DocumentationResponseState,
  DocumentationTemplateAggregate,
  DocumentationTemplateSummary,
  PatientAttachment,
  ScheduleVisitDetail,
  type AuthenticatedRequestContext,
  type PatientSummary,
  type PrintableDocumentationSummary,
  type VisitDocumentationAggregate,
  createVisitDocumentationRecord,
  fetchEpic8DocumentationTemplate,
  fetchEpic8DocumentationTemplates,
  fetchPatient,
  fetchPatientAttachments,
  fetchPrintableDocumentationSummary,
  fetchScheduleVisit,
  fetchVisitDocumentationAggregate,
  loadVisitDocumentationForVisit,
  linkVisitDocumentationPatientAttachment,
  saveVisitDocumentationDraft,
  submitVisitDocumentation,
  unlinkVisitDocumentationAttachment,
} from '../auth/session-api';
import {
  DocumentationAuditCallout,
  DocumentationEditorFrame,
  DocumentationModuleState,
  DocumentationMutationNotice,
  DocumentationStatusBanner,
} from './DocumentationWorkspaceFoundation';

type FieldDraft = {
  value: string;
};

type TaskDraft = {
  completed: boolean;
  notes: string;
};

type ValidationSummary = {
  fieldErrors: Record<string, string>;
  taskErrors: Record<string, string>;
  general: string | null;
};

type Props = {
  authContext: AuthenticatedRequestContext;
  role: AgencyRole;
  visitId: string;
  surface: 'desktop' | 'mobile';
};

function emptyValidation(): ValidationSummary {
  return {
    fieldErrors: {},
    taskErrors: {},
    general: null,
  };
}

function toBooleanString(value: string): string {
  if (value === 'true' || value === 'false') {
    return value;
  }
  return '';
}

function fieldVisibleToRole(field: DocumentationFieldDefinition, role: AgencyRole): boolean {
  return field.visibleActorRoles.length === 0 || field.visibleActorRoles.includes(role);
}

function fieldEditableByRole(field: DocumentationFieldDefinition, role: AgencyRole): boolean {
  return field.editableActorRoles.length === 0 || field.editableActorRoles.includes(role);
}

function buildFieldDisplayValue(field: DocumentationFieldDefinition, value: string): string {
  if (field.fieldType === 'BOOLEAN') {
    return value === 'true' ? 'Yes' : value === 'false' ? 'No' : '';
  }
  return value;
}

function buildFieldCompletionState(field: DocumentationFieldDefinition, value: string): DocumentationResponseState {
  if (field.fieldType === 'BOOLEAN') {
    return value === 'true' || value === 'false' ? 'COMPLETED' : 'NOT_STARTED';
  }
  return value.trim() ? 'COMPLETED' : 'NOT_STARTED';
}

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return `The backend rejected this change because it conflicts with existing documentation state. ${error.message}`;
    }
    if (error.status === 404) {
      return `The target documentation context is no longer available. ${error.message}`;
    }
    return error.message;
  }
  return fallback;
}

function extractValidation(error: unknown): ValidationSummary {
  if (!(error instanceof ApiError) || !error.details || typeof error.details !== 'object') {
    return emptyValidation();
  }
  const details = error.details as {
    error?: string;
    fieldErrors?: Array<{ fieldKey?: string; message?: string }>;
    taskErrors?: Array<{ taskTitle?: string; message?: string }>;
  };
  return {
    fieldErrors: Object.fromEntries(
      (details.fieldErrors ?? [])
        .filter((item) => item.fieldKey && item.message)
        .map((item) => [item.fieldKey as string, item.message as string]),
    ),
    taskErrors: Object.fromEntries(
      (details.taskErrors ?? [])
        .filter((item) => item.taskTitle && item.message)
        .map((item) => [item.taskTitle as string, item.message as string]),
    ),
    general:
      details.error ??
      (details.fieldErrors?.length || details.taskErrors?.length ? error.message : null),
  };
}

function documentationAuditHref(actionType: string) {
  return `/app/admin/audit?actionType=${encodeURIComponent(actionType)}`;
}

export function DocumentationRecordEditor({ authContext, role, visitId, surface }: Props) {
  const [visit, setVisit] = useState<ScheduleVisitDetail | null>(null);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<DocumentationTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateDetail, setTemplateDetail] = useState<DocumentationTemplateAggregate | null>(null);
  const [record, setRecord] = useState<VisitDocumentationAggregate | null>(null);
  const [printableSummary, setPrintableSummary] = useState<PrintableDocumentationSummary | null>(null);
  const [patientAttachments, setPatientAttachments] = useState<PatientAttachment[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState('');
  const [attachmentCaption, setAttachmentCaption] = useState('');
  const [attachmentDescription, setAttachmentDescription] = useState('');
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, FieldDraft>>({});
  const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationSummary>(emptyValidation());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'retry' | 'submitting'>('idle');
  const [saveMessage, setSaveMessage] = useState('Draft saves and final submit both use the shared Epic 8 mutation workflow.');
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);

  const canDraft = record?.record.status !== 'SUBMITTED';
  const visibleFields = useMemo(
    () =>
      (templateDetail?.fields ?? [])
        .filter((field) => fieldVisibleToRole(field, role))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [templateDetail, role],
  );
  const visibleTasks = useMemo(() => templateDetail?.tasks ?? [], [templateDetail]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const visitDetail = await fetchScheduleVisit(visitId, authContext);
        setVisit(visitDetail);
        const [patientSummary, templateResponse] = await Promise.all([
          fetchPatient(visitDetail.patientId, authContext),
          fetchEpic8DocumentationTemplates({
            ...authContext,
            templateType: 'ALL',
            page: 0,
            size: 100,
          }),
        ]);
        setPatient(patientSummary);

        const scopedTemplates = templateResponse.content.filter((template) => {
          const branchMatches = !template.branchId || template.branchId === visitDetail.branchId;
          const visitTypeMatches = !template.visitTypeId || template.visitTypeId === visitDetail.visitTypeId;
          return branchMatches && visitTypeMatches;
        });
        setAvailableTemplates(scopedTemplates);

        try {
          const documentation = await loadVisitDocumentationForVisit({
            ...authContext,
            visitOccurrenceId: visitId,
          });
          setRecord(documentation);
          setSelectedTemplateId(documentation.record.selectedTemplateId);
        } catch (loadError) {
          if (!(loadError instanceof ApiError) || loadError.status !== 404) {
            throw loadError;
          }
          setRecord(null);
          setSelectedTemplateId(scopedTemplates[0]?.id ?? '');
        }
      } catch (requestError) {
        setError(formatApiError(requestError, 'Unable to load the documentation editor right now.'));
      } finally {
        setLoading(false);
      }
    }

    void loadAll();
  }, [authContext, visitId]);

  useEffect(() => {
    async function loadTemplateAndAttachments() {
      const effectiveTemplateId = record?.record.selectedTemplateId || selectedTemplateId;
      if (!effectiveTemplateId) {
        setTemplateDetail(null);
        return;
      }
      try {
        const detail = await fetchEpic8DocumentationTemplate({
          ...authContext,
          templateId: effectiveTemplateId,
        });
        setTemplateDetail(detail);
      } catch (requestError) {
        setError(formatApiError(requestError, 'Unable to load the documentation template detail.'));
      }
    }

    void loadTemplateAndAttachments();
  }, [authContext, record?.record.selectedTemplateId, selectedTemplateId]);

  useEffect(() => {
    if (!patient?.id) {
      setPatientAttachments([]);
      return;
    }
    void fetchPatientAttachments(patient.id, authContext)
      .then((items) => {
        setPatientAttachments(items);
        setSelectedAttachmentId((current) => current || items[0]?.id || '');
      })
      .catch(() => {
        setPatientAttachments([]);
      });
  }, [authContext, patient?.id]);

  useEffect(() => {
    if (!record || !templateDetail) {
      setFieldDrafts({});
      setTaskDrafts({});
      setPrintableSummary(null);
      return;
    }

    const nextFieldDrafts: Record<string, FieldDraft> = {};
    templateDetail.fields.forEach((field) => {
      const existing = record.fieldResponses.find((item) => item.templateFieldId === field.id);
      nextFieldDrafts[field.id] = {
        value:
          existing?.normalizedValue ??
          (field.fieldType === 'BOOLEAN'
            ? toBooleanString(existing?.displayValue ?? '')
            : existing?.displayValue ?? ''),
      };
    });

    const nextTaskDrafts: Record<string, TaskDraft> = {};
    templateDetail.tasks.forEach((task) => {
      const existing = record.taskResponses.find((item) => item.templateTaskId === task.id);
      nextTaskDrafts[task.id] = {
        completed: existing?.completionState === 'COMPLETED',
        notes: existing?.completionNotes ?? '',
      };
    });

    setFieldDrafts(nextFieldDrafts);
    setTaskDrafts(nextTaskDrafts);
    void fetchPrintableDocumentationSummary({
      ...authContext,
      documentationRecordId: record.record.id,
    })
      .then(setPrintableSummary)
      .catch(() => {
        setPrintableSummary(null);
      });
  }, [authContext, record, templateDetail]);

  async function refreshRecord(documentationRecordId: string) {
    const refreshed = await fetchVisitDocumentationAggregate({
      ...authContext,
      documentationRecordId,
    });
    setRecord(refreshed);
    const summary = await fetchPrintableDocumentationSummary({
      ...authContext,
      documentationRecordId,
    }).catch(() => null);
    setPrintableSummary(summary);
  }

  async function handleCreateRecord() {
    if (!selectedTemplateId) {
      setError('Select a documentation template before creating a visit note.');
      return;
    }
    setCreatingRecord(true);
    setError(null);
    try {
      const created = await createVisitDocumentationRecord({
        ...authContext,
        visitOccurrenceId: visitId,
        selectedTemplateId,
        startedAt: new Date().toISOString(),
      });
      setRecord(created);
      setValidation(emptyValidation());
      setSaveState('saved');
      setSaveMessage('Documentation record created. You can now quick-save drafts or submit once required work is complete.');
    } catch (requestError) {
      setError(formatApiError(requestError, 'Unable to create a documentation record right now.'));
      setSaveState('retry');
    } finally {
      setCreatingRecord(false);
    }
  }

  async function persistDraft(currentRecord: VisitDocumentationAggregate, currentTemplate: DocumentationTemplateAggregate) {
    const saved = await saveVisitDocumentationDraft({
      ...authContext,
      documentationRecordId: currentRecord.record.id,
      fieldResponses: currentTemplate.fields.map((field) => {
        const draft = fieldDrafts[field.id] ?? { value: '' };
        return {
          templateFieldId: field.id,
          normalizedValue: draft.value || null,
          displayValue: buildFieldDisplayValue(field, draft.value) || null,
          completionState: buildFieldCompletionState(field, draft.value),
          completedAt: buildFieldCompletionState(field, draft.value) === 'COMPLETED' ? new Date().toISOString() : null,
        };
      }),
      taskResponses: currentTemplate.tasks.map((task) => {
        const draft = taskDrafts[task.id] ?? { completed: false, notes: '' };
        return {
          templateTaskId: task.id,
          completionState: draft.completed ? 'COMPLETED' : 'NOT_STARTED',
          completionNotes: draft.notes || null,
          completedAt: draft.completed ? new Date().toISOString() : null,
        };
      }),
      savedAt: new Date().toISOString(),
    });
    setRecord(saved);
    return saved;
  }

  async function handleSaveDraft() {
    if (!record || !templateDetail) {
      return;
    }
    setSaveState('saving');
    setSaveMessage('Saving draft to the Epic 8 backend workflow.');
    setValidation(emptyValidation());
    setError(null);
    try {
      await persistDraft(record, templateDetail);
      setSaveState('saved');
      setSaveMessage('Draft saved. Incomplete required fields are preserved without blocking future resume.');
    } catch (requestError) {
      setError(formatApiError(requestError, 'Unable to save this draft right now.'));
      setSaveState('retry');
      setSaveMessage('Draft save failed. Review the backend response and retry.');
    }
  }

  async function handleSubmit() {
    if (!record) {
      return;
    }
    setSaveState('submitting');
    setSaveMessage('Submitting documentation. The backend will enforce required fields, tasks, and signature-linked rules.');
    setValidation(emptyValidation());
    setError(null);
    try {
      if (!templateDetail) {
        return;
      }
      await persistDraft(record, templateDetail);
      const submitted = await submitVisitDocumentation({
        ...authContext,
        documentationRecordId: record.record.id,
        submittedAt: new Date().toISOString(),
      });
      setRecord(submitted);
      setSaveState('saved');
      setSaveMessage('Documentation submitted. The route is now in read-only summary mode.');
    } catch (requestError) {
      const nextValidation = extractValidation(requestError);
      setValidation(nextValidation);
      setError(nextValidation.general ?? formatApiError(requestError, 'Unable to submit this documentation right now.'));
      setSaveState('retry');
      setSaveMessage('Submission was blocked. Resolve the highlighted field and task issues, then retry.');
    }
  }

  async function handleLinkAttachment() {
    if (!record || !selectedAttachmentId) {
      return;
    }
    setAttachmentBusy(true);
    setError(null);
    try {
      await linkVisitDocumentationPatientAttachment({
        ...authContext,
        documentationRecordId: record.record.id,
        patientAttachmentId: selectedAttachmentId,
        caption: attachmentCaption || null,
        description: attachmentDescription || null,
      });
      await refreshRecord(record.record.id);
      setAttachmentCaption('');
      setAttachmentDescription('');
    } catch (requestError) {
      setError(formatApiError(requestError, 'Unable to link the selected patient attachment.'));
    } finally {
      setAttachmentBusy(false);
    }
  }

  async function handleUnlinkAttachment(attachmentLinkId: string) {
    if (!record) {
      return;
    }
    setAttachmentBusy(true);
    setError(null);
    try {
      await unlinkVisitDocumentationAttachment({
        ...authContext,
        documentationRecordId: record.record.id,
        attachmentLinkId,
      });
      await refreshRecord(record.record.id);
    } catch (requestError) {
      setError(formatApiError(requestError, 'Unable to remove the selected attachment link.'));
    } finally {
      setAttachmentBusy(false);
    }
  }

  return (
    <div className={`documentation-record-editor documentation-record-editor-${surface}`}>
      {loading ? <p className="session-note">Loading documentation context...</p> : null}
      {error ? <DocumentationModuleState title="Documentation editor error" description={error} variant="error" /> : null}

      {!loading && visit && patient ? (
        <DocumentationStatusBanner
          status={record?.record.status ?? 'NOT_STARTED'}
          summary={`${patient.firstName} ${patient.lastName} · Visit ${new Date(visit.plannedStartAt).toLocaleString()} · ${templateDetail?.template.name ?? 'No template selected yet'}`}
          tone={record?.record.status === 'SUBMITTED' ? 'success' : 'warning'}
        />
      ) : null}

      {!record ? (
        <DocumentationEditorFrame
          title="Create visit documentation"
          helper="Choose a template that matches this visit context, then create the documentation record."
          mode={surface === 'mobile' ? 'caregiver-edit' : 'admin-edit'}
        >
          <div className="documentation-form-grid">
            <label className="field">
              <span>Template</span>
              <select
                className="input"
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                value={selectedTemplateId}
              >
                <option value="">Select template</option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="button-row">
            <button className="button" disabled={creatingRecord || !selectedTemplateId} onClick={() => void handleCreateRecord()} type="button">
              {creatingRecord ? 'Creating...' : 'Create documentation record'}
            </button>
          </div>
        </DocumentationEditorFrame>
      ) : null}

      {record && templateDetail ? (
        <>
          <DocumentationMutationNotice state={saveState} message={saveMessage} />
          <DocumentationAuditCallout
            title={surface === 'mobile' ? 'Documentation updates are controlled' : 'Documentation activity is audit-visible'}
            body={
              surface === 'mobile'
                ? 'Draft saves, submissions, and attachment links are controlled documentation operations. The caregiver flow keeps patient detail focused while admin review happens later in the audit log.'
                : 'Template-driven note changes, submissions, and linked attachments are logged. Use the filtered audit view when you need to confirm who changed documentation state or opened printable summaries.'
            }
            links={
              surface === 'mobile'
                ? [{ to: documentationAuditHref('DOC_SUBMITTED'), label: 'Open documentation audit activity' }]
                : [
                    { to: documentationAuditHref('DOC_DRAFT_SAVED'), label: 'Open draft-save audit activity' },
                    { to: documentationAuditHref('DOC_SUBMITTED'), label: 'Open submission audit activity' },
                    { to: documentationAuditHref('DOC_ATTACHMENT_LINKED'), label: 'Open attachment-link audit activity' },
                  ]
            }
          />

          <DocumentationEditorFrame
            title={templateDetail.template.name}
            helper={templateDetail.template.helpText ?? 'Complete the configured tasks and narrative fields, then save or submit.'}
            mode={record.record.status === 'SUBMITTED' ? 'read-only' : surface === 'mobile' ? 'caregiver-edit' : 'admin-edit'}
          >
            <div className="documentation-form-grid">
              {visibleFields.map((field) => {
                const draft = fieldDrafts[field.id] ?? { value: '' };
                const editable = canDraft && fieldEditableByRole(field, role);
                const errorMessage = validation.fieldErrors[field.fieldKey];
                return (
                  <label key={field.id} className="field documentation-field-block">
                    <span>
                      {field.label}
                      {field.requiredField ? ' *' : ''}
                    </span>
                    {field.fieldType === 'LONG_TEXT' || field.fieldType === 'FREE_TEXT_BLOCK' ? (
                      <textarea
                        className="input"
                        disabled={!editable}
                        onChange={(event) =>
                          setFieldDrafts((current) => ({
                            ...current,
                            [field.id]: { value: event.target.value },
                          }))
                        }
                        rows={4}
                        value={draft.value}
                      />
                    ) : field.fieldType === 'BOOLEAN' ? (
                      <select
                        className="input"
                        disabled={!editable}
                        onChange={(event) =>
                          setFieldDrafts((current) => ({
                            ...current,
                            [field.id]: { value: event.target.value },
                          }))
                        }
                        value={draft.value}
                      >
                        <option value="">Select</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        className="input"
                        disabled={!editable}
                        onChange={(event) =>
                          setFieldDrafts((current) => ({
                            ...current,
                            [field.id]: { value: event.target.value },
                          }))
                        }
                        type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE_TIME' ? 'datetime-local' : 'text'}
                        value={draft.value}
                      />
                    )}
                    {field.helpText ? <small>{field.helpText}</small> : null}
                    {errorMessage ? <small className="form-error">{errorMessage}</small> : null}
                    {!editable ? <small>This field is read only for your role or after submission.</small> : null}
                  </label>
                );
              })}
            </div>

            <div className="documentation-task-list">
              {visibleTasks.map((task) => {
                const draft = taskDrafts[task.id] ?? { completed: false, notes: '' };
                const errorMessage = validation.taskErrors[task.effectiveTitle];
                return (
                  <article key={task.id} className="documentation-task-item">
                    <label className="checkbox-row">
                      <input
                        checked={draft.completed}
                        disabled={!canDraft}
                        onChange={(event) =>
                          setTaskDrafts((current) => ({
                            ...current,
                            [task.id]: {
                              ...draft,
                              completed: event.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      <span>
                        {task.effectiveTitle}
                        {task.effectiveRequired ? ' *' : ''}
                      </span>
                    </label>
                    {task.effectiveDescription ? <p>{task.effectiveDescription}</p> : null}
                    <textarea
                      className="input"
                      disabled={!canDraft}
                      onChange={(event) =>
                        setTaskDrafts((current) => ({
                          ...current,
                          [task.id]: {
                            ...draft,
                            notes: event.target.value,
                          },
                        }))
                      }
                      placeholder="Optional task completion note"
                      rows={2}
                      value={draft.notes}
                    />
                    {errorMessage ? <small className="form-error">{errorMessage}</small> : null}
                  </article>
                );
              })}
            </div>

            <div className="button-row">
              <button className="button button-secondary" disabled={!canDraft || saveState === 'saving'} onClick={() => void handleSaveDraft()} type="button">
                Quick save draft
              </button>
              <button className="button" disabled={!canDraft || saveState === 'submitting'} onClick={() => void handleSubmit()} type="button">
                Submit documentation
              </button>
            </div>
          </DocumentationEditorFrame>

          <DocumentationEditorFrame
            title="Linked attachments"
            helper="Epic 8 links existing patient attachments into the note rather than duplicating storage."
            mode={record.record.status === 'SUBMITTED' ? 'read-only' : 'caregiver-edit'}
          >
            <div className="documentation-attachment-editor">
              <label className="field">
                <span>Patient attachment source</span>
                <select
                  className="input"
                  disabled={!canDraft || attachmentBusy}
                  onChange={(event) => setSelectedAttachmentId(event.target.value)}
                  value={selectedAttachmentId}
                >
                  <option value="">Select attachment</option>
                  {patientAttachments.map((attachment) => (
                    <option key={attachment.id} value={attachment.id}>
                      {attachment.fileName} · {attachment.category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Caption</span>
                <input className="input" disabled={!canDraft || attachmentBusy} onChange={(event) => setAttachmentCaption(event.target.value)} value={attachmentCaption} />
              </label>
              <label className="field">
                <span>Description</span>
                <input className="input" disabled={!canDraft || attachmentBusy} onChange={(event) => setAttachmentDescription(event.target.value)} value={attachmentDescription} />
              </label>
              <div className="button-row">
                <button className="button button-secondary" disabled={!canDraft || !selectedAttachmentId || attachmentBusy} onClick={() => void handleLinkAttachment()} type="button">
                  Link selected attachment
                </button>
              </div>
              <div className="documentation-linked-attachments">
                {record.attachmentLinks.length === 0 ? (
                  <DocumentationModuleState
                    title="No linked attachments yet"
                    description="Linked patient attachments and previously captured mobile artifacts will appear here."
                    variant="empty"
                  />
                ) : null}
                {record.attachmentLinks.map((attachment) => (
                  <article key={attachment.id} className="documentation-list-row">
                    <div>
                      <strong>
                        {attachment.patientAttachmentId ? 'Linked patient attachment' : 'Linked mobile artifact'}
                      </strong>
                      <p>{attachment.caption ?? attachment.description ?? 'No note-specific caption or description.'}</p>
                    </div>
                    <div className="documentation-list-meta">
                      <span>{new Date(attachment.linkedAt).toLocaleString()}</span>
                      {canDraft ? (
                        <button className="button button-secondary" disabled={attachmentBusy} onClick={() => void handleUnlinkAttachment(attachment.id)} type="button">
                          Unlink
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </DocumentationEditorFrame>

          {printableSummary ? (
            <DocumentationEditorFrame
              title="Printable summary preview"
              helper="The print preview is backend-driven and read only."
              mode="read-only"
            >
              <div className="documentation-print-preview">
                <strong>{printableSummary.templateTitle}</strong>
                <p>{printableSummary.header.patientDisplayName}</p>
                <ul className="documentation-inline-list">
                  {printableSummary.fields.slice(0, 3).map((field) => (
                    <li key={field.fieldKey}>
                      <strong>{field.label}:</strong> {field.displayValue}
                    </li>
                  ))}
                </ul>
                <a className="button button-secondary" href={`/app/documentation/records/${record.record.id}/printable`}>
                  Open full print preview
                </a>
              </div>
            </DocumentationEditorFrame>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
