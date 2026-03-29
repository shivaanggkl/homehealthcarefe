import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationTemplateWorkspacePage } from './DocumentationTemplateWorkspacePage';

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../auth/session-storage', () => ({
  loadDevSessionCredentials: vi.fn(() => null),
}));

vi.mock('../auth/session-api', async () => {
  const actual = await vi.importActual('../auth/session-api');
  return {
    ...actual,
    deactivateEpic8DocumentationTemplate: vi.fn(),
    fetchDocumentationTaskLibrary: vi.fn(),
    fetchEpic8DocumentationTemplate: vi.fn(),
    fetchEpic8DocumentationTemplates: vi.fn(),
    fetchServiceLines: vi.fn(),
    fetchVisitTypes: vi.fn(),
    saveEpic8DocumentationTemplate: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
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
      branchId: null,
      helpText: 'Complete before submitting.',
      allowedActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
      requiresSignatureVerification: false,
    },
    sections: [{ id: 'section-1', sectionKey: 'overview', title: 'Overview', helpText: null, sortOrder: 1 }],
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
      helpText: null,
      visibleActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
      editableActorRoles: ['CAREGIVER', 'BRANCH_ADMIN'],
    }],
    tasks: [],
  } as const;
}

describe('DocumentationTemplateWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        authSource: 'storage',
        session: { sessionId: 'session-1', userId: 'user-1', forcedLogoutAt: null },
      },
    } as never);

    vi.mocked(sessionApi.fetchEpic8DocumentationTemplates).mockResolvedValue({
      content: [templateAggregate().template],
      page: 0,
      size: 100,
      totalElements: 1,
      totalPages: 1,
    });
    vi.mocked(sessionApi.fetchEpic8DocumentationTemplate).mockResolvedValue(templateAggregate());
    vi.mocked(sessionApi.fetchServiceLines).mockResolvedValue({
      content: [{ id: 'service-line-1', agencyId: 'agency-1', name: 'Skilled Nursing', code: 'SN', description: null, status: 'ACTIVE', displayOrder: 1 }],
      page: 0, size: 100, totalElements: 1, totalPages: 1,
    });
    vi.mocked(sessionApi.fetchVisitTypes).mockResolvedValue({
      content: [{ id: 'visit-type-1', agencyId: 'agency-1', serviceLineId: 'service-line-1', name: 'Routine Visit', code: 'RV', description: null, defaultDurationMinutes: 60, billable: true, status: 'ACTIVE', displayOrder: 1 }],
      page: 0, size: 100, totalElements: 1, totalPages: 1,
    });
    vi.mocked(sessionApi.fetchDocumentationTaskLibrary).mockResolvedValue({
      content: [{ id: 'task-1', agencyId: 'agency-1', serviceLineId: null, visitTypeId: null, name: 'Vitals', code: 'VITALS', description: 'Capture vitals', category: 'CLINICAL', status: 'ACTIVE', displayOrder: 1, defaultSortOrder: 1, defaultCompletionExpectation: null, requiredByDefault: true }],
      page: 0, size: 100, totalElements: 1, totalPages: 1,
    });
    vi.mocked(sessionApi.saveEpic8DocumentationTemplate).mockResolvedValue(templateAggregate());
  });

  it('saves template changes through the Epic 8 API', async () => {
    render(
      <MemoryRouter>
        <DocumentationTemplateWorkspacePage />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Skilled Nursing Routine Note')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Skilled Nursing Routine Note'), {
      target: { value: 'Updated Routine Note' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() => {
      expect(sessionApi.saveEpic8DocumentationTemplate).toHaveBeenCalled();
    });
  });
});
