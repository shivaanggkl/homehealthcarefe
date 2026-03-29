import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DocumentationRecordEditor } from './DocumentationRecordEditor';

vi.mock('../auth/session-api', async () => {
  const actual = await vi.importActual('../auth/session-api');
  return {
    ...actual,
    createVisitDocumentationRecord: vi.fn(),
    fetchEpic8DocumentationTemplate: vi.fn(),
    fetchEpic8DocumentationTemplates: vi.fn(),
    fetchPatient: vi.fn(),
    fetchPatientAttachments: vi.fn(),
    fetchPrintableDocumentationSummary: vi.fn(),
    fetchScheduleVisit: vi.fn(),
    fetchVisitDocumentationAggregate: vi.fn(),
    linkVisitDocumentationPatientAttachment: vi.fn(),
    loadVisitDocumentationForVisit: vi.fn(),
    saveVisitDocumentationDraft: vi.fn(),
    submitVisitDocumentation: vi.fn(),
    unlinkVisitDocumentationAttachment: vi.fn(),
  };
});

const sessionApi = await import('../auth/session-api');

function templateAggregate() {
  return {
    template: {
      id: 'template-1',
      agencyId: 'agency-1',
      name: 'Skilled Nursing Routine Note',
      code: 'SN-RV',
      templateType: 'VISIT_NOTE',
      structuredDefinitionJson: '{"version":1}',
      version: 1,
      status: 'ACTIVE',
      displayOrder: 1,
      serviceLineId: 'service-line-1',
      visitTypeId: 'visit-type-1',
      branchId: 'branch-1',
      helpText: 'Complete before submitting.',
      allowedActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
      requiresSignatureVerification: false,
    },
    sections: [{
      id: 'section-1',
      sectionKey: 'overview',
      title: 'Overview',
      helpText: null,
      sortOrder: 1,
    }],
    fields: [{
      id: 'field-1',
      documentationTemplateId: 'template-1',
      sectionId: 'section-1',
      fieldKey: 'narrative',
      label: 'Narrative',
      fieldType: 'LONG_TEXT',
      requiredField: true,
      sortOrder: 1,
      optionsJson: null,
      helpText: 'Add visit narrative.',
      visibleActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
      editableActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
    }],
    tasks: [{
      id: 'task-link-1',
      documentationTemplateId: 'template-1',
      sectionId: 'section-1',
      taskTemplateId: 'task-1',
      effectiveTitle: 'Vitals',
      effectiveDescription: 'Capture vitals',
      effectiveRequired: true,
      sortOrder: 1,
    }],
  } as const;
}

function documentationAggregate(status: 'DRAFT' | 'SUBMITTED' = 'DRAFT') {
  return {
    record: {
      id: 'record-1',
      visitOccurrenceId: 'visit-1',
      patientId: 'patient-1',
      selectedTemplateId: 'template-1',
      status,
      startedAt: '2026-03-29T09:00:00-05:00',
      lastSavedAt: '2026-03-29T09:05:00-05:00',
      submittedAt: status === 'SUBMITTED' ? '2026-03-29T09:10:00-05:00' : null,
      authorMembershipId: 'membership-1',
      authorEmail: 'caregiver@northstar.example',
    },
    fieldResponses: [{
      id: 'response-1',
      documentationRecordId: 'record-1',
      templateFieldId: 'field-1',
      displayValue: 'Existing note',
      normalizedValue: 'Existing note',
      completionState: 'COMPLETED',
      completedAt: '2026-03-29T09:05:00-05:00',
    }],
    taskResponses: [{
      id: 'task-response-1',
      documentationRecordId: 'record-1',
      templateTaskId: 'task-link-1',
      completionState: 'COMPLETED',
      completionNotes: 'Recorded.',
      completedAt: '2026-03-29T09:05:00-05:00',
    }],
    attachmentLinks: [{
      id: 'attachment-link-1',
      documentationRecordId: 'record-1',
      patientAttachmentId: 'attachment-1',
      mobileArtifactId: null,
      caption: 'Existing attachment',
      description: null,
      linkedAt: '2026-03-29T09:06:00-05:00',
    }],
  } as const;
}

describe('DocumentationRecordEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(sessionApi.fetchScheduleVisit).mockResolvedValue({
      id: 'visit-1',
      patientId: 'patient-1',
      branchId: 'branch-1',
      visitTypeId: 'visit-type-1',
      plannedStartAt: '2026-03-29T09:00:00-05:00',
    } as never);
    vi.mocked(sessionApi.fetchPatient).mockResolvedValue({
      id: 'patient-1',
      firstName: 'Ava',
      lastName: 'Patient',
    } as never);
    vi.mocked(sessionApi.fetchEpic8DocumentationTemplates).mockResolvedValue({
      content: [templateAggregate().template],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.loadVisitDocumentationForVisit).mockResolvedValue(documentationAggregate() as never);
    vi.mocked(sessionApi.fetchEpic8DocumentationTemplate).mockResolvedValue(templateAggregate() as never);
    vi.mocked(sessionApi.fetchPatientAttachments).mockResolvedValue([{
      id: 'attachment-2',
      fileName: 'photo.jpg',
      category: 'PHOTO',
    }] as never);
    vi.mocked(sessionApi.fetchPrintableDocumentationSummary).mockResolvedValue({
      templateTitle: 'Skilled Nursing Routine Note',
      header: {
        patientDisplayName: 'Ava Patient',
      },
      fields: [{
        fieldKey: 'narrative',
        label: 'Narrative',
        displayValue: 'Existing note',
      }],
      tasks: [],
      attachments: [],
    } as never);
    vi.mocked(sessionApi.fetchVisitDocumentationAggregate).mockResolvedValue(documentationAggregate() as never);
    vi.mocked(sessionApi.saveVisitDocumentationDraft).mockResolvedValue(documentationAggregate() as never);
    vi.mocked(sessionApi.submitVisitDocumentation).mockResolvedValue(documentationAggregate('SUBMITTED') as never);
    vi.mocked(sessionApi.linkVisitDocumentationPatientAttachment).mockResolvedValue(undefined as never);
    vi.mocked(sessionApi.unlinkVisitDocumentationAttachment).mockResolvedValue(undefined as never);
  });

  it('saves draft changes through the Epic 8 backend', async () => {
    render(
      <DocumentationRecordEditor
        authContext={{ sessionId: 'session-1' }}
        role="CAREGIVER"
        surface="desktop"
        visitId="visit-1"
      />,
    );

    expect(await screen.findByDisplayValue('Existing note')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Existing note'), {
      target: { value: 'Updated narrative' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Quick save draft' }));

    await waitFor(() => {
      expect(sessionApi.saveVisitDocumentationDraft).toHaveBeenCalled();
    });
  });

  it('shows backend validation errors when submit is blocked', async () => {
    vi.mocked(sessionApi.submitVisitDocumentation).mockRejectedValue(
      new sessionApi.ApiError(422, 'Validation failed', {
        error: 'Resolve required items first.',
        fieldErrors: [{ fieldKey: 'narrative', message: 'Narrative is required.' }],
        taskErrors: [{ taskTitle: 'Vitals', message: 'Vitals must be completed.' }],
      }),
    );

    render(
      <DocumentationRecordEditor
        authContext={{ sessionId: 'session-1' }}
        role="CAREGIVER"
        surface="desktop"
        visitId="visit-1"
      />,
    );

    expect(await screen.findByDisplayValue('Existing note')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit documentation' }));

    expect(await screen.findByText('Narrative is required.')).toBeInTheDocument();
    expect(screen.getByText('Vitals must be completed.')).toBeInTheDocument();
    expect(screen.getByText('Resolve required items first.')).toBeInTheDocument();
  });

  it('links patient attachments into the note through the backend', async () => {
    render(
      <DocumentationRecordEditor
        authContext={{ sessionId: 'session-1' }}
        role="CAREGIVER"
        surface="desktop"
        visitId="visit-1"
      />,
    );

    expect(await screen.findByDisplayValue('Existing note')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Caption'), {
      target: { value: 'Wound photo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link selected attachment' }));

    await waitFor(() => {
      expect(sessionApi.linkVisitDocumentationPatientAttachment).toHaveBeenCalled();
    });
  });
});
