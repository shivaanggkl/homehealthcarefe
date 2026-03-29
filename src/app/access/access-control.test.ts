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

  it('maps Epic 6 backend permissions to the caregiver mobile workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_OWN_MOBILE_VISITS',
        'EXECUTE_OWN_VISITS',
        'SUBMIT_MOBILE_VISIT_DOCUMENTATION',
        'VIEW_MOBILE_MESSAGES',
      ],
      ['view_mobile_app'],
    );

    expect(resolved).toContain('view_mobile_app');
    expect(resolved).toContain('execute_mobile_visits');
    expect(resolved).toContain('submit_mobile_visit_documentation');
    expect(resolved).toContain('view_mobile_messages');
  });

  it('maps Epic 7 backend permissions to the shared mobile EVV capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_OWN_EVV',
        'SUBMIT_OWN_EVV',
        'MANAGE_EVV_EXCEPTIONS',
        'VIEW_MISSED_VISITS',
        'RECEIVE_EVV_NOTIFICATIONS',
      ],
      ['view_mobile_app'],
    );

    expect(resolved).toContain('view_mobile_evv');
    expect(resolved).toContain('submit_mobile_evv');
    expect(resolved).toContain('manage_mobile_evv_exceptions');
    expect(resolved).toContain('view_mobile_missed_visits');
    expect(resolved).toContain('receive_mobile_evv_notifications');
    expect(resolved).toContain('view_evv_issue_workspace');
  });

  it('maps Epic 8 backend permissions to the shared documentation workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_DOCUMENTATION_WORKSPACE',
        'MANAGE_DOCUMENTATION_TEMPLATES',
        'MANAGE_DOCUMENTATION_TASK_LIBRARY',
        'VIEW_VISIT_DOCUMENTATION',
        'SUBMIT_VISIT_DOCUMENTATION',
        'GENERATE_PRINTABLE_DOCUMENTATION_SUMMARY',
      ],
      ['view_documentation_workspace'],
    );

    expect(resolved).toContain('view_documentation_workspace');
    expect(resolved).toContain('manage_documentation_templates');
    expect(resolved).toContain('manage_documentation_task_library');
    expect(resolved).toContain('view_visit_documentation');
    expect(resolved).toContain('submit_visit_documentation');
    expect(resolved).toContain('generate_printable_documentation_summary');
  });
});
