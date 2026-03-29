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

  it('maps workforce backend permissions to the shared workforce workspace and module capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_WORKFORCE_DIRECTORY',
        'MANAGE_CAREGIVER_PROFILES',
        'MANAGE_CAREGIVER_AVAILABILITY',
        'VIEW_CAREGIVER_PERFORMANCE',
      ],
      ['view_workforce_workspace'],
    );

    expect(resolved).toContain('view_workforce_workspace');
    expect(resolved).toContain('manage_caregiver_profiles');
    expect(resolved).toContain('manage_caregiver_availability');
    expect(resolved).toContain('view_caregiver_performance');
  });

  it('maps scheduling backend permissions to the shared scheduling workspace and rule capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_SCHEDULING_WORKSPACE',
        'MANAGE_SCHEDULE_VISITS',
        'ASSIGN_CAREGIVERS',
        'VIEW_SCHEDULE_CONFLICTS',
      ],
      ['view_scheduling_workspace'],
    );

    expect(resolved).toContain('view_scheduling_workspace');
    expect(resolved).toContain('manage_schedule_visits');
    expect(resolved).toContain('assign_caregivers');
    expect(resolved).toContain('view_schedule_conflicts');
  });
});
