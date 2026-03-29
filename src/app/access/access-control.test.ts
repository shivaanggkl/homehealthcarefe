import { mapBackendPermissionsToFrontend } from './access-control';

describe('mapBackendPermissionsToFrontend', () => {
  it('maps owner agency settings permission to the consolidated security route capability', () => {
    const resolved = mapBackendPermissionsToFrontend(
      ['MANAGE_AGENCY_SETTINGS'],
      ['manage_agency_settings', 'manage_security_settings'],
    );

    expect(resolved).toContain('manage_agency_settings');
    expect(resolved).toContain('manage_security_settings');
  });

  it('maps patient backend permissions to the shared patient workspace and module capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      ['VIEW_PATIENT_DIRECTORY', 'MANAGE_PATIENT_DIAGNOSES', 'VIEW_PATIENT_ATTACHMENTS'],
      ['view_patient_workspace'],
    );

    expect(resolved).toContain('view_patient_workspace');
    expect(resolved).toContain('manage_patient_diagnoses');
    expect(resolved).toContain('view_patient_attachments');
  });
});
