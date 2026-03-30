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

  it('maps Epic 9 backend permissions to the shared messaging workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_MESSAGING_WORKSPACE',
        'SEND_SECURE_MESSAGES',
        'MANAGE_STAFF_GROUPS',
        'SEND_BRANCH_BROADCASTS',
        'MANAGE_MESSAGE_ESCALATIONS',
      ],
      ['view_messaging_workspace'],
    );

    expect(resolved).toContain('view_messaging_workspace');
    expect(resolved).toContain('send_secure_messages');
    expect(resolved).toContain('manage_staff_groups');
    expect(resolved).toContain('send_branch_broadcasts');
    expect(resolved).toContain('manage_message_escalations');
  });

  it('maps Epic 10 backend permissions to the shared review workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_REVIEW_WORKSPACE',
        'VIEW_EXCEPTION_QUEUE',
        'ASSIGN_REVIEW_WORK',
        'PERFORM_REVIEW_DECISIONS',
        'REQUEST_REVIEW_SIGNOFF',
        'VIEW_REVIEW_AUDIT_CONTEXT',
      ],
      ['view_review_workspace'],
    );

    expect(resolved).toContain('view_review_workspace');
    expect(resolved).toContain('view_review_exception_queue');
    expect(resolved).toContain('assign_review_work');
    expect(resolved).toContain('perform_review_decisions');
    expect(resolved).toContain('request_review_signoff');
    expect(resolved).toContain('view_review_audit_context');
  });

  it('maps Epic 11 backend permissions to the shared compliance workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_COMPLIANCE_WORKSPACE',
        'VIEW_COMPLIANCE_DASHBOARD',
        'MANAGE_COMPLIANCE_CHECKLISTS',
        'MANAGE_REQUIRED_DOCUMENTATION_RULES',
        'MANAGE_PATIENT_ACKNOWLEDGMENTS',
        'MANAGE_CERTIFICATION_PERIODS',
        'MANAGE_PATIENT_RISK_REMINDERS',
        'RECALCULATE_COMPLIANCE_STATUS',
      ],
      ['view_compliance_workspace'],
    );

    expect(resolved).toContain('view_compliance_workspace');
    expect(resolved).toContain('view_compliance_dashboard');
    expect(resolved).toContain('manage_compliance_checklists');
    expect(resolved).toContain('manage_required_documentation_rules');
    expect(resolved).toContain('manage_patient_acknowledgments');
    expect(resolved).toContain('manage_certification_periods');
    expect(resolved).toContain('manage_patient_risk_reminders');
    expect(resolved).toContain('recalculate_compliance_status');
  });

  it('maps Epic 12 backend permissions to the shared patient-event workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_PATIENT_EVENT_WORKSPACE',
        'CREATE_INCIDENT_RECORDS',
        'MANAGE_INFECTION_RECORDS',
        'MANAGE_WOUND_RECORDS',
        'LINK_PATIENT_EVENT_EVIDENCE',
        'ASSIGN_PATIENT_EVENT_FOLLOW_UP',
        'ESCALATE_PATIENT_EVENTS',
        'RESOLVE_PATIENT_EVENTS',
      ],
      ['view_patient_event_workspace'],
    );

    expect(resolved).toContain('view_patient_event_workspace');
    expect(resolved).toContain('create_incident_records');
    expect(resolved).toContain('manage_infection_records');
    expect(resolved).toContain('manage_wound_records');
    expect(resolved).toContain('link_patient_event_evidence');
    expect(resolved).toContain('assign_patient_event_follow_up');
    expect(resolved).toContain('escalate_patient_events');
    expect(resolved).toContain('resolve_patient_events');
  });

  it('maps Epic 13 backend permissions to the shared care-progression workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_GOAL_WORKSPACE',
        'MANAGE_GOAL_TEMPLATES',
        'MANAGE_PATIENT_GOALS',
        'MANAGE_GOAL_INTERVENTIONS',
        'ADD_GOAL_PROGRESS_NOTES',
        'MANAGE_GOAL_STATE_TRANSITIONS',
        'MANAGE_CAREPLAN_SYNC',
      ],
      ['view_goal_workspace'],
    );

    expect(resolved).toContain('view_goal_workspace');
    expect(resolved).toContain('manage_goal_templates');
    expect(resolved).toContain('manage_patient_goals');
    expect(resolved).toContain('manage_goal_interventions');
    expect(resolved).toContain('add_goal_progress_notes');
    expect(resolved).toContain('manage_goal_state_transitions');
    expect(resolved).toContain('manage_careplan_sync');
  });

  it('maps Epic 15 backend permissions to the shared analytics workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_ANALYTICS_WORKSPACE',
        'VIEW_BRANCH_PERFORMANCE_METRICS',
        'VIEW_CAREGIVER_UTILIZATION_METRICS',
        'VIEW_QA_BACKLOG_METRICS',
        'VIEW_REVENUE_READINESS_METRICS',
        'VIEW_COMPLIANCE_EXCEPTION_METRICS',
        'REFRESH_DASHBOARD_METRICS',
      ],
      ['view_analytics_workspace'],
    );

    expect(resolved).toContain('view_analytics_workspace');
    expect(resolved).toContain('view_branch_performance_metrics');
    expect(resolved).toContain('view_caregiver_utilization_metrics');
    expect(resolved).toContain('view_qa_backlog_metrics');
    expect(resolved).toContain('view_revenue_readiness_metrics');
    expect(resolved).toContain('view_compliance_exception_metrics');
    expect(resolved).toContain('refresh_dashboard_metrics');
  });

  it('maps Epic 14 backend permissions to the shared revenue-readiness workspace capabilities', () => {
    const resolved = mapBackendPermissionsToFrontend(
      [
        'VIEW_REVENUE_READINESS_WORKSPACE',
        'RECALCULATE_REVENUE_READINESS',
        'MANAGE_REVENUE_EXCEPTION_FLAGS',
        'GENERATE_REVENUE_EXPORTS',
        'VIEW_AUTHORIZATION_USAGE_SUMMARIES',
        'VIEW_PAYER_SERVICE_SUMMARIES',
      ],
      ['view_revenue_readiness_workspace'],
    );

    expect(resolved).toContain('view_revenue_readiness_workspace');
    expect(resolved).toContain('recalculate_revenue_readiness');
    expect(resolved).toContain('manage_revenue_exception_flags');
    expect(resolved).toContain('generate_revenue_exports');
    expect(resolved).toContain('view_authorization_usage_summaries');
    expect(resolved).toContain('view_payer_service_summaries');
  });
});
