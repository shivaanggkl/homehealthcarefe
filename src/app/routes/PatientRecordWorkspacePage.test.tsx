import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PatientRecordWorkspacePage } from './PatientRecordWorkspacePage';

vi.mock('../auth/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../access/access-context', () => ({
  useAccess: vi.fn(),
}));

vi.mock('../auth/session-storage', () => ({
  loadDevSessionCredentials: vi.fn(() => null),
}));

vi.mock('../auth/session-api', async () => {
  const actual = await vi.importActual('../auth/session-api');
  return {
    ...actual,
    fetchPatient: vi.fn(),
    fetchPatientAttachments: vi.fn(),
    downloadPatientAttachment: vi.fn(),
    uploadPatientAttachment: vi.fn(),
    updatePatientAttachmentMetadata: vi.fn(),
  };
});

const { useAuth } = await import('../auth/auth-context');
const { useAccess } = await import('../access/access-context');
const sessionApi = await import('../auth/session-api');

function renderAttachmentRoute() {
  return render(
    <MemoryRouter initialEntries={['/app/patients/patient-1/attachments']}>
      <Routes>
        <Route
          element={<PatientRecordWorkspacePage section="attachments" />}
          path="/app/patients/:patientId/attachments"
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PatientRecordWorkspacePage attachments', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        status: 'authenticated',
        session: {
          sessionId: 'session-1',
        },
      },
    } as never);

    vi.mocked(useAccess).mockReturnValue({
      loading: false,
      profile: {
        role: 'AGENCY_OWNER',
        roleLabel: 'Agency Owner',
        branchScope: 'agency-wide',
        branchScopeLabel: 'Agency-wide branch access',
        assignedBranchIds: [],
        permissions: ['view_patient_attachments', 'manage_patient_attachments'],
        defaultRoute: '/app/settings/security',
        source: 'backend',
      },
      setRoleOverride: vi.fn(),
      setAssignedBranches: vi.fn(),
      clearOverride: vi.fn(),
    } as never);

    vi.mocked(sessionApi.fetchPatient).mockResolvedValue({
      id: 'patient-1',
      externalReference: 'MRN-1001',
      firstName: 'Alicia',
      middleName: null,
      lastName: 'Stone',
      preferredName: null,
      dateOfBirth: '1982-10-10',
      sexMarker: 'F',
      primaryPhone: '312-555-0101',
      secondaryPhone: null,
      email: 'alicia@example.com',
      language: 'en-US',
      notesSummary: null,
      status: 'ACTIVE',
    });
  });

  it('renders attachments and shows a controlled unauthorized-download failure', async () => {
    vi.mocked(sessionApi.fetchPatientAttachments).mockResolvedValue([
      {
        id: 'attachment-1',
        patientId: 'patient-1',
        fileName: 'plan-of-care.pdf',
        contentType: 'application/pdf',
        sizeBytes: 200000,
        category: 'Plan of care',
        uploaderMembershipId: 'membership-1',
        uploaderEmail: 'owner@example.com',
        uploadedAt: '2026-03-28T12:00:00Z',
        status: 'ACTIVE',
        description: 'Signed plan of care',
      },
    ]);
    vi.mocked(sessionApi.downloadPatientAttachment).mockRejectedValue(
      new sessionApi.ApiError(403, 'Forbidden'),
    );

    renderAttachmentRoute();

    await waitFor(() => {
      expect(screen.getByText('plan-of-care.pdf')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(
        screen.getByText('You are not allowed to download this attachment.'),
      ).toBeInTheDocument();
    });
  });

  it('shows client-side file-policy validation before upload', async () => {
    vi.mocked(sessionApi.fetchPatientAttachments).mockResolvedValue([]);

    const view = renderAttachmentRoute();

    await waitFor(() => {
      expect(screen.getByText('No attachments on file')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'Care plan' },
    });
    fireEvent.change(view.container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [new File(['secret'], 'care-plan.exe', { type: 'application/x-msdownload' })],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload attachment' }));

    await waitFor(() => {
      expect(
        screen.getByText('Allowed file types are PDF, JPEG, PNG, and plain text.'),
      ).toBeInTheDocument();
    });
  });
});
