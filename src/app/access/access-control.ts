import { AgencyRole } from '../auth/session-api';
import { FrontendAccessOverride } from '../auth/session-storage';

export type FrontendPermission =
  | 'view_session_home'
  | 'manage_self_profile'
  | 'manage_self_password'
  | 'manage_self_mfa'
  | 'manage_self_sessions'
  | 'view_mobile_app'
  | 'view_mobile_evv'
  | 'submit_mobile_evv'
  | 'manage_mobile_evv_exceptions'
  | 'view_mobile_missed_visits'
  | 'resolve_mobile_missed_visits'
  | 'receive_mobile_evv_notifications'
  | 'execute_mobile_visits'
  | 'submit_mobile_visit_documentation'
  | 'upload_mobile_visit_artifacts'
  | 'create_mobile_incidents'
  | 'view_mobile_messages'
  | 'send_mobile_messages'
  | 'view_evv_issue_workspace'
  | 'view_scheduling_workspace'
  | 'manage_schedule_visits'
  | 'assign_caregivers'
  | 'manage_open_shifts'
  | 'reschedule_visits'
  | 'cancel_visits'
  | 'view_schedule_conflicts'
  | 'view_workforce_workspace'
  | 'manage_caregiver_profiles'
  | 'manage_caregiver_credentials'
  | 'manage_caregiver_availability'
  | 'manage_caregiver_unavailability'
  | 'view_caregiver_performance'
  | 'view_patient_workspace'
  | 'manage_patient_demographics'
  | 'manage_patient_contacts'
  | 'manage_patient_address'
  | 'manage_patient_eligibility'
  | 'manage_patient_diagnoses'
  | 'manage_patient_payer_links'
  | 'manage_patient_authorizations'
  | 'view_patient_attachments'
  | 'manage_patient_attachments'
  | 'view_documentation_workspace'
  | 'manage_documentation_templates'
  | 'manage_documentation_task_library'
  | 'view_visit_documentation'
  | 'draft_visit_documentation'
  | 'submit_visit_documentation'
  | 'amend_visit_documentation'
  | 'generate_printable_documentation_summary'
  | 'view_review_workspace'
  | 'view_review_exception_queue'
  | 'assign_review_work'
  | 'perform_review_decisions'
  | 'request_review_signoff'
  | 'view_review_audit_context'
  | 'view_compliance_workspace'
  | 'view_compliance_dashboard'
  | 'manage_compliance_checklists'
  | 'manage_required_documentation_rules'
  | 'manage_patient_acknowledgments'
  | 'manage_certification_periods'
  | 'manage_patient_risk_reminders'
  | 'recalculate_compliance_status'
  | 'view_patient_event_workspace'
  | 'create_incident_records'
  | 'manage_infection_records'
  | 'manage_wound_records'
  | 'link_patient_event_evidence'
  | 'assign_patient_event_follow_up'
  | 'escalate_patient_events'
  | 'resolve_patient_events'
  | 'view_goal_workspace'
  | 'manage_goal_templates'
  | 'manage_patient_goals'
  | 'manage_goal_interventions'
  | 'add_goal_progress_notes'
  | 'manage_goal_state_transitions'
  | 'manage_careplan_sync'
  | 'view_analytics_workspace'
  | 'view_branch_performance_metrics'
  | 'view_caregiver_utilization_metrics'
  | 'view_qa_backlog_metrics'
  | 'view_revenue_readiness_metrics'
  | 'view_compliance_exception_metrics'
  | 'refresh_dashboard_metrics'
  | 'view_revenue_readiness_workspace'
  | 'recalculate_revenue_readiness'
  | 'manage_revenue_exception_flags'
  | 'generate_revenue_exports'
  | 'view_authorization_usage_summaries'
  | 'view_payer_service_summaries'
  | 'view_messaging_workspace'
  | 'send_secure_messages'
  | 'manage_staff_groups'
  | 'send_branch_broadcasts'
  | 'manage_message_escalations'
  | 'view_setup_console'
  | 'manage_agency_profile_setup'
  | 'manage_service_line_setup'
  | 'manage_visit_type_setup'
  | 'manage_workforce_catalog_setup'
  | 'manage_task_template_setup'
  | 'manage_documentation_template_setup'
  | 'manage_branch_policy_setup'
  | 'manage_alert_rule_setup'
  | 'manage_mileage_pay_setup'
  | 'view_user_directory'
  | 'invite_users'
  | 'edit_user_accounts'
  | 'manage_user_status'
  | 'view_audit_log'
  | 'manage_agency_settings'
  | 'manage_branches'
  | 'manage_security_settings'
  | 'manage_agency_mfa_policy'
  | 'manage_admin_notifications';

export type BranchScopeKind = 'agency-wide' | 'agency-wide-read' | 'branch-assigned';

export type FrontendAccessProfile = {
  role: AgencyRole;
  roleLabel: string;
  branchScope: BranchScopeKind;
  branchScopeLabel: string;
  assignedBranchIds: string[];
  permissions: FrontendPermission[];
  defaultRoute: string;
  source: 'fallback' | 'override' | 'backend';
};

export type AppRouteDefinition = {
  path: string;
  navLabel: string;
  permission: FrontendPermission;
  description: string;
  navBehavior: 'visible' | 'disabled';
  section:
    | 'workspace'
    | 'mobile'
    | 'scheduling'
    | 'workforce'
    | 'patients'
    | 'analytics'
    | 'goals'
    | 'revenue'
    | 'documentation'
    | 'review'
    | 'messaging'
    | 'configuration'
    | 'people'
    | 'security'
    | 'personal';
  audience?: 'owner-only' | 'admin';
};

type RoleDefinition = Omit<FrontendAccessProfile, 'assignedBranchIds' | 'source'>;

const COMMON_SELF_SERVICE_PERMISSIONS: FrontendPermission[] = [
  'view_session_home',
  'manage_self_profile',
  'manage_self_password',
  'manage_self_mfa',
  'manage_self_sessions',
];

const ROLE_DEFINITIONS: Record<AgencyRole, RoleDefinition> = {
  AGENCY_OWNER: {
    role: 'AGENCY_OWNER',
    roleLabel: 'Agency Owner',
    branchScope: 'agency-wide',
    branchScopeLabel: 'Agency-wide branch access',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'view_mobile_app',
      'view_mobile_evv',
      'submit_mobile_evv',
      'manage_mobile_evv_exceptions',
      'view_mobile_missed_visits',
      'resolve_mobile_missed_visits',
      'receive_mobile_evv_notifications',
      'execute_mobile_visits',
      'submit_mobile_visit_documentation',
      'upload_mobile_visit_artifacts',
      'create_mobile_incidents',
      'view_mobile_messages',
      'send_mobile_messages',
      'view_evv_issue_workspace',
      'view_scheduling_workspace',
      'manage_schedule_visits',
      'assign_caregivers',
      'manage_open_shifts',
      'reschedule_visits',
      'cancel_visits',
      'view_schedule_conflicts',
      'view_workforce_workspace',
      'manage_caregiver_profiles',
      'manage_caregiver_credentials',
      'manage_caregiver_availability',
      'manage_caregiver_unavailability',
      'view_caregiver_performance',
      'view_patient_workspace',
      'manage_patient_demographics',
      'manage_patient_contacts',
      'manage_patient_address',
      'manage_patient_eligibility',
      'manage_patient_diagnoses',
      'manage_patient_payer_links',
      'manage_patient_authorizations',
      'view_patient_attachments',
      'manage_patient_attachments',
      'view_documentation_workspace',
      'manage_documentation_templates',
      'manage_documentation_task_library',
      'view_visit_documentation',
      'draft_visit_documentation',
      'submit_visit_documentation',
      'amend_visit_documentation',
      'generate_printable_documentation_summary',
      'view_review_workspace',
      'view_review_exception_queue',
      'assign_review_work',
      'perform_review_decisions',
      'request_review_signoff',
      'view_review_audit_context',
      'view_compliance_workspace',
      'view_compliance_dashboard',
      'manage_compliance_checklists',
      'manage_required_documentation_rules',
      'manage_patient_acknowledgments',
      'manage_certification_periods',
      'manage_patient_risk_reminders',
      'recalculate_compliance_status',
      'view_patient_event_workspace',
      'create_incident_records',
      'manage_infection_records',
      'manage_wound_records',
      'link_patient_event_evidence',
      'assign_patient_event_follow_up',
      'escalate_patient_events',
      'resolve_patient_events',
      'view_goal_workspace',
      'manage_goal_templates',
      'manage_patient_goals',
      'manage_goal_interventions',
      'add_goal_progress_notes',
      'manage_goal_state_transitions',
      'manage_careplan_sync',
      'view_analytics_workspace',
      'view_branch_performance_metrics',
      'view_caregiver_utilization_metrics',
      'view_qa_backlog_metrics',
      'view_revenue_readiness_metrics',
      'view_compliance_exception_metrics',
      'refresh_dashboard_metrics',
      'view_revenue_readiness_workspace',
      'recalculate_revenue_readiness',
      'manage_revenue_exception_flags',
      'generate_revenue_exports',
      'view_authorization_usage_summaries',
      'view_payer_service_summaries',
      'view_messaging_workspace',
      'send_secure_messages',
      'manage_staff_groups',
      'send_branch_broadcasts',
      'manage_message_escalations',
      'view_setup_console',
      'manage_agency_profile_setup',
      'manage_service_line_setup',
      'manage_visit_type_setup',
      'manage_workforce_catalog_setup',
      'manage_task_template_setup',
      'manage_documentation_template_setup',
      'manage_branch_policy_setup',
      'manage_alert_rule_setup',
      'manage_mileage_pay_setup',
      'view_user_directory',
      'invite_users',
      'edit_user_accounts',
      'manage_user_status',
      'view_audit_log',
      'manage_agency_settings',
      'manage_branches',
      'manage_security_settings',
      'manage_agency_mfa_policy',
      'manage_admin_notifications',
    ],
    defaultRoute: '/app/settings/security',
  },
  BRANCH_ADMIN: {
    role: 'BRANCH_ADMIN',
    roleLabel: 'Branch Admin',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'manage_mobile_evv_exceptions',
      'view_mobile_missed_visits',
      'resolve_mobile_missed_visits',
      'receive_mobile_evv_notifications',
      'view_evv_issue_workspace',
      'view_scheduling_workspace',
      'manage_schedule_visits',
      'assign_caregivers',
      'manage_open_shifts',
      'reschedule_visits',
      'cancel_visits',
      'view_schedule_conflicts',
      'view_workforce_workspace',
      'manage_caregiver_profiles',
      'manage_caregiver_credentials',
      'manage_caregiver_availability',
      'manage_caregiver_unavailability',
      'view_caregiver_performance',
      'view_patient_workspace',
      'manage_patient_demographics',
      'manage_patient_contacts',
      'manage_patient_address',
      'manage_patient_eligibility',
      'manage_patient_diagnoses',
      'manage_patient_payer_links',
      'manage_patient_authorizations',
      'view_patient_attachments',
      'manage_patient_attachments',
      'view_documentation_workspace',
      'manage_documentation_templates',
      'manage_documentation_task_library',
      'view_visit_documentation',
      'draft_visit_documentation',
      'submit_visit_documentation',
      'amend_visit_documentation',
      'generate_printable_documentation_summary',
      'view_review_workspace',
      'view_review_exception_queue',
      'assign_review_work',
      'perform_review_decisions',
      'request_review_signoff',
      'view_review_audit_context',
      'view_compliance_workspace',
      'view_compliance_dashboard',
      'manage_compliance_checklists',
      'manage_required_documentation_rules',
      'manage_patient_acknowledgments',
      'manage_certification_periods',
      'manage_patient_risk_reminders',
      'recalculate_compliance_status',
      'view_analytics_workspace',
      'view_branch_performance_metrics',
      'view_caregiver_utilization_metrics',
      'view_qa_backlog_metrics',
      'view_revenue_readiness_metrics',
      'view_compliance_exception_metrics',
      'refresh_dashboard_metrics',
      'view_revenue_readiness_workspace',
      'recalculate_revenue_readiness',
      'view_authorization_usage_summaries',
      'view_payer_service_summaries',
      'view_patient_event_workspace',
      'create_incident_records',
      'manage_infection_records',
      'manage_wound_records',
      'link_patient_event_evidence',
      'assign_patient_event_follow_up',
      'escalate_patient_events',
      'resolve_patient_events',
      'view_messaging_workspace',
      'send_secure_messages',
      'manage_staff_groups',
      'send_branch_broadcasts',
      'manage_message_escalations',
      'view_setup_console',
      'manage_agency_profile_setup',
      'manage_service_line_setup',
      'manage_visit_type_setup',
      'manage_workforce_catalog_setup',
      'manage_task_template_setup',
      'manage_documentation_template_setup',
      'manage_branch_policy_setup',
      'manage_alert_rule_setup',
      'manage_mileage_pay_setup',
      'view_user_directory',
      'invite_users',
      'edit_user_accounts',
      'manage_user_status',
      'view_audit_log',
      'manage_branches',
      'manage_agency_mfa_policy',
      'manage_admin_notifications',
    ],
    defaultRoute: '/app/settings/admin-notifications',
  },
  SCHEDULER_COORDINATOR: {
    role: 'SCHEDULER_COORDINATOR',
    roleLabel: 'Scheduler Coordinator',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'manage_mobile_evv_exceptions',
      'view_mobile_missed_visits',
      'resolve_mobile_missed_visits',
      'receive_mobile_evv_notifications',
      'view_evv_issue_workspace',
      'view_scheduling_workspace',
      'manage_schedule_visits',
      'assign_caregivers',
      'manage_open_shifts',
      'reschedule_visits',
      'cancel_visits',
      'view_schedule_conflicts',
      'view_workforce_workspace',
      'manage_caregiver_profiles',
      'manage_caregiver_credentials',
      'manage_caregiver_availability',
      'manage_caregiver_unavailability',
      'view_caregiver_performance',
      'view_messaging_workspace',
      'send_secure_messages',
      'send_branch_broadcasts',
      'manage_message_escalations',
      'view_documentation_workspace',
      'view_visit_documentation',
      'draft_visit_documentation',
      'submit_visit_documentation',
      'generate_printable_documentation_summary',
      'view_review_workspace',
      'view_review_exception_queue',
      'assign_review_work',
      'perform_review_decisions',
      'request_review_signoff',
      'view_review_audit_context',
      'view_compliance_workspace',
      'view_compliance_dashboard',
      'view_analytics_workspace',
      'view_branch_performance_metrics',
      'view_caregiver_utilization_metrics',
      'view_qa_backlog_metrics',
      'view_revenue_readiness_metrics',
      'view_compliance_exception_metrics',
      'view_revenue_readiness_workspace',
      'view_authorization_usage_summaries',
      'view_payer_service_summaries',
      'view_patient_event_workspace',
      'create_incident_records',
      'link_patient_event_evidence',
      'assign_patient_event_follow_up',
      'escalate_patient_events',
      'view_goal_workspace',
      'manage_patient_goals',
      'manage_goal_interventions',
      'manage_goal_state_transitions',
      'manage_careplan_sync',
      ],
    defaultRoute: '/app/home',
  },
  CAREGIVER: {
    role: 'CAREGIVER',
    roleLabel: 'Caregiver',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'view_mobile_app',
      'view_mobile_evv',
      'submit_mobile_evv',
      'execute_mobile_visits',
      'view_messaging_workspace',
      'send_secure_messages',
      'submit_mobile_visit_documentation',
      'view_documentation_workspace',
      'view_visit_documentation',
      'draft_visit_documentation',
      'submit_visit_documentation',
      'upload_mobile_visit_artifacts',
      'create_mobile_incidents',
      'view_mobile_messages',
      'send_mobile_messages',
      'view_goal_workspace',
      'add_goal_progress_notes',
    ],
    defaultRoute: '/mobile',
  },
  QA_CLINICAL_REVIEWER: {
    role: 'QA_CLINICAL_REVIEWER',
    roleLabel: 'QA Clinical Reviewer',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'manage_mobile_evv_exceptions',
      'view_mobile_missed_visits',
      'resolve_mobile_missed_visits',
      'receive_mobile_evv_notifications',
      'view_evv_issue_workspace',
      'view_patient_workspace',
      'manage_patient_eligibility',
      'manage_patient_diagnoses',
      'view_patient_attachments',
      'view_messaging_workspace',
      'send_secure_messages',
      'manage_message_escalations',
      'view_documentation_workspace',
      'view_visit_documentation',
      'amend_visit_documentation',
      'generate_printable_documentation_summary',
      'view_review_workspace',
      'view_review_exception_queue',
      'perform_review_decisions',
      'request_review_signoff',
      'view_review_audit_context',
      'view_compliance_workspace',
      'view_compliance_dashboard',
      'manage_compliance_checklists',
      'manage_required_documentation_rules',
      'manage_patient_acknowledgments',
      'manage_certification_periods',
      'manage_patient_risk_reminders',
      'recalculate_compliance_status',
      'view_analytics_workspace',
      'view_branch_performance_metrics',
      'view_caregiver_utilization_metrics',
      'view_qa_backlog_metrics',
      'view_revenue_readiness_metrics',
      'view_compliance_exception_metrics',
      'refresh_dashboard_metrics',
      'view_revenue_readiness_workspace',
      'recalculate_revenue_readiness',
      'view_authorization_usage_summaries',
      'view_payer_service_summaries',
      'view_patient_event_workspace',
      'create_incident_records',
      'manage_infection_records',
      'manage_wound_records',
      'link_patient_event_evidence',
      'assign_patient_event_follow_up',
      'escalate_patient_events',
      'resolve_patient_events',
      'view_goal_workspace',
      'manage_goal_templates',
      'manage_patient_goals',
      'manage_goal_interventions',
      'add_goal_progress_notes',
      'manage_goal_state_transitions',
      'manage_careplan_sync',
    ],
    defaultRoute: '/app/home',
  },
  BILLING_BACK_OFFICE: {
    role: 'BILLING_BACK_OFFICE',
    roleLabel: 'Billing Back Office',
    branchScope: 'branch-assigned',
    branchScopeLabel: 'Assigned branches only',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'view_patient_workspace',
      'manage_patient_payer_links',
      'manage_patient_authorizations',
      'view_patient_attachments',
      'view_documentation_workspace',
      'view_visit_documentation',
      'generate_printable_documentation_summary',
      'view_analytics_workspace',
      'view_branch_performance_metrics',
      'view_caregiver_utilization_metrics',
      'view_qa_backlog_metrics',
      'view_revenue_readiness_metrics',
      'view_compliance_exception_metrics',
      'refresh_dashboard_metrics',
      'view_revenue_readiness_workspace',
      'recalculate_revenue_readiness',
      'manage_revenue_exception_flags',
      'generate_revenue_exports',
      'view_authorization_usage_summaries',
      'view_payer_service_summaries',
      'view_audit_log',
    ],
    defaultRoute: '/app/home',
  },
  READ_ONLY_AUDITOR: {
    role: 'READ_ONLY_AUDITOR',
    roleLabel: 'Read Only Auditor',
    branchScope: 'agency-wide-read',
    branchScopeLabel: 'Agency-wide read scope',
    permissions: [
      ...COMMON_SELF_SERVICE_PERMISSIONS,
      'view_analytics_workspace',
      'view_branch_performance_metrics',
      'view_caregiver_utilization_metrics',
      'view_qa_backlog_metrics',
      'view_revenue_readiness_metrics',
      'view_compliance_exception_metrics',
      'view_audit_log',
      'view_patient_event_workspace',
      'view_goal_workspace',
    ],
    defaultRoute: '/app/home',
  },
};

export const APP_ROUTES: AppRouteDefinition[] = [
  {
    path: '/app/home',
    navLabel: 'Session Home',
    permission: 'view_session_home',
    description: 'Authenticated session dashboard and backend session snapshot.',
    navBehavior: 'visible',
    section: 'workspace',
  },
  {
    path: '/mobile',
    navLabel: 'Mobile Field App',
    permission: 'view_mobile_app',
    description: 'Epic 6 caregiver mobile home and field execution shell.',
    navBehavior: 'disabled',
    section: 'mobile',
  },
  {
    path: '/mobile/visits/:visitId/evv',
    navLabel: 'Visit EVV',
    permission: 'view_mobile_evv',
    description: 'Epic 7 EVV verification status and proof-of-visit workflow entry point.',
    navBehavior: 'disabled',
    section: 'mobile',
  },
  {
    path: '/app/admin/evv-issues',
    navLabel: 'EVV Issues',
    permission: 'view_evv_issue_workspace',
    description: 'Epic 7 coordinator-facing EVV issue list for missed visits and verification exceptions.',
    navBehavior: 'visible',
    section: 'security',
    audience: 'admin',
  },
  {
    path: '/app/scheduling',
    navLabel: 'Scheduling Workspace',
    permission: 'view_scheduling_workspace',
    description: 'Epic 5 scheduling board landing area with shared board and drawer foundations.',
    navBehavior: 'visible',
    section: 'scheduling',
  },
  {
    path: '/app/workforce',
    navLabel: 'Workforce Workspace',
    permission: 'view_workforce_workspace',
    description: 'Epic 4 caregiver workforce landing area and record workspace entry point.',
    navBehavior: 'visible',
    section: 'workforce',
  },
  {
    path: '/app/workforce/new/profile',
    navLabel: 'New Caregiver',
    permission: 'manage_caregiver_profiles',
    description: 'Create a new caregiver workforce profile with the shared workforce form shell.',
    navBehavior: 'disabled',
    section: 'workforce',
    audience: 'admin',
  },
  {
    path: '/app/patients',
    navLabel: 'Patient Workspace',
    permission: 'view_patient_workspace',
    description: 'Epic 3 patient management landing area and record workspace entry point.',
    navBehavior: 'visible',
    section: 'patients',
  },
  {
    path: '/app/patient-events',
    navLabel: 'Patient Events',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 incident, infection, wound, follow-up, escalation, and patient-event timeline workspace.',
    navBehavior: 'visible',
    section: 'patients',
  },
  {
    path: '/app/patient-events/incidents',
    navLabel: 'Incident Log',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 incident list and create route for patient and visit event logging.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/incidents/:incidentId',
    navLabel: 'Incident Detail',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 incident detail route with evidence, follow-up, escalation, and related context.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/infections',
    navLabel: 'Infection Log',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 infection log route for clinical review and longitudinal follow-up.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/infections/:infectionId',
    navLabel: 'Infection Detail',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 infection detail route with follow-up and escalation context.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/wounds',
    navLabel: 'Wound Records',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 wound record route with active-status and longitudinal-history visibility.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/wounds/:woundId',
    navLabel: 'Wound Detail',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 wound detail route with wound history, evidence, and escalation visibility.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/follow-ups',
    navLabel: 'Follow-up Queue',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 patient-event follow-up visibility route.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/escalations',
    navLabel: 'Escalations',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 patient-event escalation visibility route.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/patients/:patientId/timeline',
    navLabel: 'Patient Event Timeline',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 patient-level longitudinal timeline route for incident, infection, wound, evidence, follow-up, and escalation milestones.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/patient-events/command-center',
    navLabel: 'Patient Event Command Center',
    permission: 'view_patient_event_workspace',
    description: 'Epic 12 coordinator-facing summary for open incidents, active infections, escalated events, and overdue follow-up.',
    navBehavior: 'disabled',
    section: 'patients',
  },
  {
    path: '/app/analytics/command-center',
    navLabel: 'Analytics Command Center',
    permission: 'view_analytics_workspace',
    description:
      'Epic 15 leadership-facing command-center route for operational, backlog, utilization, revenue, and compliance summary visibility.',
    navBehavior: 'visible',
    section: 'analytics',
  },
  {
    path: '/app/analytics',
    navLabel: 'Analytics Dashboard',
    permission: 'view_analytics_workspace',
    description: 'Epic 15 dashboard summary route for operational, backlog, utilization, revenue, and compliance command-center visibility.',
    navBehavior: 'visible',
    section: 'analytics',
  },
  {
    path: '/app/analytics/operational',
    navLabel: 'Operational Drilldown',
    permission: 'view_analytics_workspace',
    description: 'Epic 15 operational drilldown route for visits, staffing gaps, late starts, and missed work.',
    navBehavior: 'visible',
    section: 'analytics',
  },
  {
    path: '/app/analytics/branch-performance',
    navLabel: 'Branch Performance',
    permission: 'view_analytics_workspace',
    description: 'Epic 15 branch-performance route for operational posture and branch comparison.',
    navBehavior: 'visible',
    section: 'analytics',
  },
  {
    path: '/app/analytics/caregiver-utilization',
    navLabel: 'Caregiver Utilization',
    permission: 'view_analytics_workspace',
    description: 'Epic 15 caregiver-utilization route for staffing load and capacity visibility.',
    navBehavior: 'visible',
    section: 'analytics',
  },
  {
    path: '/app/analytics/readiness',
    navLabel: 'Revenue & Compliance',
    permission: 'view_analytics_workspace',
    description: 'Epic 15 revenue-readiness and compliance-exception drilldown route.',
    navBehavior: 'visible',
    section: 'analytics',
  },
  {
    path: '/app/goals',
    navLabel: 'Care Progression',
    permission: 'view_goal_workspace',
    description: 'Epic 13 goal templates, patient goals, interventions, progress notes, version history, and care-plan sync workspace.',
    navBehavior: 'visible',
    section: 'goals',
  },
  {
    path: '/app/goals/templates',
    navLabel: 'Goal Templates',
    permission: 'view_goal_workspace',
    description: 'Epic 13 goal-template management route with shared progression admin scaffolding.',
    navBehavior: 'visible',
    section: 'goals',
  },
  {
    path: '/app/goals/command-center',
    navLabel: 'Progression Command Center',
    permission: 'view_goal_workspace',
    description: 'Epic 13 coordinator-facing summary for overdue, unmet, unsynced, and recently updated progression work.',
    navBehavior: 'disabled',
    section: 'goals',
  },
  {
    path: '/app/goals/patients/:patientId',
    navLabel: 'Patient Goal Summary',
    permission: 'view_goal_workspace',
    description: 'Epic 13 patient-level progression summary route with goal counts, target posture, and sync visibility.',
    navBehavior: 'disabled',
    section: 'goals',
  },
  {
    path: '/app/goals/patient-goals/:goalId',
    navLabel: 'Patient Goal Detail',
    permission: 'view_goal_workspace',
    description: 'Epic 13 patient-goal detail route with intervention, note, version, and sync context.',
    navBehavior: 'disabled',
    section: 'goals',
  },
  {
    path: '/app/goals/patient-goals/:goalId/interventions',
    navLabel: 'Interventions',
    permission: 'view_goal_workspace',
    description: 'Epic 13 intervention and care-task route within the selected patient goal.',
    navBehavior: 'disabled',
    section: 'goals',
  },
  {
    path: '/app/goals/patient-goals/:goalId/progress-notes',
    navLabel: 'Progress Notes',
    permission: 'view_goal_workspace',
    description: 'Epic 13 progress-note route for the selected patient goal.',
    navBehavior: 'disabled',
    section: 'goals',
  },
  {
    path: '/app/goals/patient-goals/:goalId/history',
    navLabel: 'Goal History',
    permission: 'view_goal_workspace',
    description: 'Epic 13 version-history route for the selected patient goal.',
    navBehavior: 'disabled',
    section: 'goals',
  },
  {
    path: '/app/goals/patient-goals/:goalId/careplan-sync',
    navLabel: 'Care-Plan Sync',
    permission: 'view_goal_workspace',
    description: 'Epic 13 care-plan sync visibility route for the selected patient goal.',
    navBehavior: 'disabled',
    section: 'goals',
  },
  {
    path: '/app/revenue-readiness',
    navLabel: 'Revenue Readiness',
    permission: 'view_revenue_readiness_workspace',
    description: 'Epic 14 revenue-readiness workspace for blocked, warning, and export-ready visit finance review.',
    navBehavior: 'visible',
    section: 'revenue',
  },
  {
    path: '/app/revenue-readiness/visits/:visitId',
    navLabel: 'Revenue Detail',
    permission: 'view_revenue_readiness_workspace',
    description: 'Epic 14 readiness detail route with validation, payer/service, export, and linked context.',
    navBehavior: 'disabled',
    section: 'revenue',
  },
  {
    path: '/app/revenue-readiness/exceptions',
    navLabel: 'Revenue Exceptions',
    permission: 'view_revenue_readiness_workspace',
    description: 'Epic 14 blocker and exception-flag route for revenue-readiness triage.',
    navBehavior: 'visible',
    section: 'revenue',
  },
  {
    path: '/app/revenue-readiness/payroll-export',
    navLabel: 'Payroll Export',
    permission: 'view_revenue_readiness_workspace',
    description: 'Epic 14 payroll export preview and generation route.',
    navBehavior: 'visible',
    section: 'revenue',
  },
  {
    path: '/app/revenue-readiness/invoice-export',
    navLabel: 'Invoice Export',
    permission: 'view_revenue_readiness_workspace',
    description: 'Epic 14 invoice export preview and generation route.',
    navBehavior: 'visible',
    section: 'revenue',
  },
  {
    path: '/app/revenue-readiness/authorizations/:authorizationId',
    navLabel: 'Authorization Usage',
    permission: 'view_revenue_readiness_workspace',
    description: 'Epic 14 authorization-usage summary route for revenue-readiness follow-up.',
    navBehavior: 'disabled',
    section: 'revenue',
  },
  {
    path: '/app/revenue-readiness/command-center',
    navLabel: 'Revenue Summary',
    permission: 'view_revenue_readiness_workspace',
    description: 'Coordinator-facing Epic 14 revenue summary route for blocked visits, signature issues, completion failures, and authorization pressure.',
    navBehavior: 'visible',
    section: 'revenue',
  },
  {
    path: '/app/documentation',
    navLabel: 'Documentation Workspace',
    permission: 'view_documentation_workspace',
    description: 'Epic 8 documentation landing area for visit records, templates, task libraries, and printable summaries.',
    navBehavior: 'visible',
    section: 'documentation',
  },
  {
    path: '/app/documentation/templates',
    navLabel: 'Documentation Templates',
    permission: 'manage_documentation_templates',
    description: 'Manage Epic 8 visit note and form templates with the shared template-builder framework.',
    navBehavior: 'visible',
    section: 'documentation',
    audience: 'admin',
  },
  {
    path: '/app/documentation/task-library',
    navLabel: 'Task Library',
    permission: 'manage_documentation_task_library',
    description: 'Manage reusable Epic 8 documentation tasks and defaults.',
    navBehavior: 'visible',
    section: 'documentation',
    audience: 'admin',
  },
  {
    path: '/app/documentation/status',
    navLabel: 'Documentation Status',
    permission: 'view_visit_documentation',
    description: 'Focused documentation status visibility for draft, incomplete, and submitted visit notes.',
    navBehavior: 'visible',
    section: 'documentation',
    audience: 'admin',
  },
  {
    path: '/app/documentation/visits/:visitId',
    navLabel: 'Visit Documentation',
    permission: 'view_visit_documentation',
    description: 'Open the documentation workspace for a scheduled visit.',
    navBehavior: 'disabled',
    section: 'documentation',
  },
  {
    path: '/app/documentation/records/:documentationRecordId/printable',
    navLabel: 'Printable Summary',
    permission: 'generate_printable_documentation_summary',
    description: 'Read-only printable documentation summary backed by the Epic 8 summary contract.',
    navBehavior: 'disabled',
    section: 'documentation',
  },
  {
    path: '/app/review',
    navLabel: 'Review Workspace',
    permission: 'view_review_workspace',
    description: 'Epic 10 review queue landing area for documentation, EVV, and exception-driven QA work.',
    navBehavior: 'visible',
    section: 'review',
  },
  {
    path: '/app/review/exceptions',
    navLabel: 'Exception Queue',
    permission: 'view_review_exception_queue',
    description: 'Focused Epic 10 exception queue for open review blockers and carryover issues.',
    navBehavior: 'visible',
    section: 'review',
  },
  {
    path: '/app/review/command-center',
    navLabel: 'Review Summary',
    permission: 'view_review_workspace',
    description: 'Coordinator-facing Epic 10 summary route for backlog, unassigned, overdue, returned, and exception-driven review work.',
    navBehavior: 'visible',
    section: 'review',
  },
  {
    path: '/app/review/items/:workItemId',
    navLabel: 'Review Item Detail',
    permission: 'view_review_workspace',
    description: 'Epic 10 review detail route with findings, history, assignment, and decision context.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/review/items/:workItemId/resubmission',
    navLabel: 'Resubmission Detail',
    permission: 'view_review_workspace',
    description: 'Returned-for-fix and resubmission visibility route for the selected review item.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/review/items/:workItemId/assignment',
    navLabel: 'Assignment Detail',
    permission: 'view_review_workspace',
    description: 'Reviewer assignment context route for the selected work item.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/compliance',
    navLabel: 'Compliance Workspace',
    permission: 'view_compliance_workspace',
    description: 'Epic 11 clinical compliance dashboard and patient compliance workspace entry point.',
    navBehavior: 'visible',
    section: 'review',
  },
  {
    path: '/app/compliance/command-center',
    navLabel: 'Compliance Summary',
    permission: 'view_compliance_workspace',
    description: 'Coordinator-facing Epic 11 compliance visibility route for patient gaps, certification risk, acknowledgment issues, and active reminder follow-up.',
    navBehavior: 'visible',
    section: 'review',
  },
  {
    path: '/app/compliance/patients/:patientId',
    navLabel: 'Patient Compliance',
    permission: 'view_compliance_workspace',
    description: 'Epic 11 patient compliance summary with checklist, documentation, acknowledgment, certification, and risk context.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/compliance/patients/:patientId/checklist',
    navLabel: 'Checklist Detail',
    permission: 'view_compliance_workspace',
    description: 'Epic 11 checklist-focused compliance detail route.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/compliance/patients/:patientId/documentation-gaps',
    navLabel: 'Documentation Gaps',
    permission: 'view_compliance_workspace',
    description: 'Epic 11 required-documentation gap detail route.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/compliance/patients/:patientId/acknowledgments',
    navLabel: 'Acknowledgments',
    permission: 'view_compliance_workspace',
    description: 'Epic 11 patient acknowledgment management route.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/compliance/patients/:patientId/certification-periods',
    navLabel: 'Certification Periods',
    permission: 'view_compliance_workspace',
    description: 'Epic 11 certification-period management route.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/compliance/patients/:patientId/risk-reminders',
    navLabel: 'Risk Reminders',
    permission: 'view_compliance_workspace',
    description: 'Epic 11 patient risk-reminder management route.',
    navBehavior: 'disabled',
    section: 'review',
  },
  {
    path: '/app/messaging',
    navLabel: 'Messaging Workspace',
    permission: 'view_messaging_workspace',
    description: 'Epic 9 messaging inbox, contextual coordination routes, and secure branch communication workspace.',
    navBehavior: 'visible',
    section: 'messaging',
  },
  {
    path: '/app/messaging/threads/:threadId',
    navLabel: 'Thread Detail',
    permission: 'view_messaging_workspace',
    description: 'Open a secure Epic 9 thread detail route with message timeline and participant summary.',
    navBehavior: 'disabled',
    section: 'messaging',
  },
  {
    path: '/app/patients/:patientId/discussion',
    navLabel: 'Patient Discussion',
    permission: 'view_messaging_workspace',
    description: 'Patient-linked Epic 9 discussion route for care-team coordination.',
    navBehavior: 'disabled',
    section: 'messaging',
  },
  {
    path: '/app/scheduling/visits/:visitId/discussion',
    navLabel: 'Visit Discussion',
    permission: 'view_messaging_workspace',
    description: 'Visit-linked Epic 9 discussion route for schedule coordination.',
    navBehavior: 'disabled',
    section: 'messaging',
  },
  {
    path: '/app/documentation/tasks/:taskTemplateId/discussion',
    navLabel: 'Task Discussion',
    permission: 'view_messaging_workspace',
    description: 'Task-linked Epic 9 discussion route for reusable workflow follow-up.',
    navBehavior: 'disabled',
    section: 'messaging',
  },
  {
    path: '/app/messaging/admin',
    navLabel: 'Groups & Broadcasts',
    permission: 'view_messaging_workspace',
    description: 'Epic 9 admin messaging surface for staff-group and branch-broadcast route entry points.',
    navBehavior: 'visible',
    section: 'messaging',
    audience: 'admin',
  },
  {
    path: '/app/messaging/command-center',
    navLabel: 'Communication Summary',
    permission: 'view_messaging_workspace',
    description: 'Coordinator-facing Epic 9 communication visibility screen for unread, escalated, broadcast, and context-linked work.',
    navBehavior: 'visible',
    section: 'messaging',
  },
  {
    path: '/app/setup',
    navLabel: 'Agency Setup',
    permission: 'view_setup_console',
    description: 'Epic 2 configuration overview and setup information architecture.',
    navBehavior: 'visible',
    section: 'configuration',
  },
  {
    path: '/app/setup/profile',
    navLabel: 'Agency Profile',
    permission: 'manage_agency_profile_setup',
    description: 'Manage agency-level operational profile defaults.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'owner-only',
  },
  {
    path: '/app/setup/catalog/service-lines',
    navLabel: 'Service Lines',
    permission: 'manage_service_line_setup',
    description: 'Manage the agency service line catalog.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/catalog/visit-types',
    navLabel: 'Visit Types',
    permission: 'manage_visit_type_setup',
    description: 'Manage visit classifications and defaults.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/workforce/catalogs',
    navLabel: 'Workforce Catalogs',
    permission: 'manage_workforce_catalog_setup',
    description: 'Manage caregiver skills and certifications.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/templates/tasks',
    navLabel: 'Task Templates',
    permission: 'manage_task_template_setup',
    description: 'Manage reusable task templates.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/templates/documentation',
    navLabel: 'Documentation Templates',
    permission: 'manage_documentation_template_setup',
    description: 'Manage reusable documentation templates and versions.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/policies/branches',
    navLabel: 'Branch Policies',
    permission: 'manage_branch_policy_setup',
    description: 'Manage branch-level policy overrides.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/policies/alerts',
    navLabel: 'Alert Rules',
    permission: 'manage_alert_rule_setup',
    description: 'Manage agency-wide and branch-specific alert rules.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'admin',
  },
  {
    path: '/app/setup/compensation/mileage-pay',
    navLabel: 'Mileage & Pay',
    permission: 'manage_mileage_pay_setup',
    description: 'Manage mileage reimbursement and pay defaults.',
    navBehavior: 'visible',
    section: 'configuration',
    audience: 'owner-only',
  },
  {
    path: '/app/settings/password',
    navLabel: 'Change Password',
    permission: 'manage_self_password',
    description: 'Authenticated password change settings.',
    navBehavior: 'visible',
    section: 'personal',
  },
  {
    path: '/app/settings/mfa',
    navLabel: 'MFA Settings',
    permission: 'manage_self_mfa',
    description: 'Self-service MFA enrollment and status.',
    navBehavior: 'visible',
    section: 'personal',
  },
  {
    path: '/app/settings/profile',
    navLabel: 'My Profile',
    permission: 'manage_self_profile',
    description: 'Update your own profile details and preferences.',
    navBehavior: 'visible',
    section: 'personal',
  },
  {
    path: '/app/admin/users',
    navLabel: 'User Directory',
    permission: 'view_user_directory',
    description: 'Admin directory, invite flow, and staff assignment editing.',
    navBehavior: 'visible',
    section: 'people',
    audience: 'admin',
  },
  {
    path: '/app/admin/audit',
    navLabel: 'Audit Log',
    permission: 'view_audit_log',
    description: 'Review sensitive events and export the audit trail.',
    navBehavior: 'visible',
    section: 'people',
    audience: 'admin',
  },
  {
    path: '/app/admin/branches',
    navLabel: 'Branch Management',
    permission: 'manage_branches',
    description: 'Search, create, edit, and deactivate branches.',
    navBehavior: 'disabled',
    section: 'people',
    audience: 'admin',
  },
  {
    path: '/app/settings/agency',
    navLabel: 'Agency Settings',
    permission: 'manage_agency_settings',
    description: 'Owner-only agency profile settings.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'owner-only',
  },
  {
    path: '/app/settings/security',
    navLabel: 'Security Settings',
    permission: 'manage_security_settings',
    description: 'Owner-facing consolidated security settings.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'owner-only',
  },
  {
    path: '/app/settings/admin-mfa-policy',
    navLabel: 'Agency MFA Policy',
    permission: 'manage_agency_mfa_policy',
    description: 'Admin-only agency MFA enforcement settings.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'admin',
  },
  {
    path: '/app/settings/admin-notifications',
    navLabel: 'Admin Notifications',
    permission: 'manage_admin_notifications',
    description: 'Admin-only critical account notification preferences.',
    navBehavior: 'disabled',
    section: 'security',
    audience: 'admin',
  },
  {
    path: '/app/settings/sessions',
    navLabel: 'Active Sessions',
    permission: 'manage_self_sessions',
    description: 'Review and revoke your active sessions.',
    navBehavior: 'visible',
    section: 'personal',
  },
];

const BACKEND_PERMISSION_MAPPING: Record<string, FrontendPermission[]> = {
  VIEW_OWN_MOBILE_VISITS: ['view_mobile_app'],
  VIEW_OWN_EVV: ['view_mobile_app', 'view_mobile_evv'],
  SUBMIT_OWN_EVV: ['view_mobile_app', 'view_mobile_evv', 'submit_mobile_evv'],
  MANAGE_EVV_EXCEPTIONS: ['manage_mobile_evv_exceptions', 'view_evv_issue_workspace'],
  VIEW_MISSED_VISITS: ['view_mobile_missed_visits', 'view_evv_issue_workspace'],
  RESOLVE_MISSED_VISITS: ['view_mobile_missed_visits', 'resolve_mobile_missed_visits', 'view_evv_issue_workspace'],
  RECEIVE_EVV_NOTIFICATIONS: ['receive_mobile_evv_notifications', 'view_evv_issue_workspace'],
  EXECUTE_OWN_VISITS: ['view_mobile_app', 'execute_mobile_visits'],
  SUBMIT_MOBILE_VISIT_DOCUMENTATION: [
    'view_mobile_app',
    'submit_mobile_visit_documentation',
  ],
  UPLOAD_MOBILE_VISIT_ARTIFACTS: ['view_mobile_app', 'upload_mobile_visit_artifacts'],
  CREATE_MOBILE_INCIDENTS: ['view_mobile_app', 'create_mobile_incidents'],
  VIEW_MOBILE_MESSAGES: ['view_mobile_app', 'view_mobile_messages'],
  SEND_MOBILE_MESSAGES: ['view_mobile_app', 'view_mobile_messages', 'send_mobile_messages'],
  VIEW_SCHEDULING_WORKSPACE: ['view_scheduling_workspace'],
  MANAGE_SCHEDULE_VISITS: ['view_scheduling_workspace', 'manage_schedule_visits'],
  ASSIGN_CAREGIVERS: ['view_scheduling_workspace', 'assign_caregivers'],
  MANAGE_OPEN_SHIFTS: ['view_scheduling_workspace', 'manage_open_shifts'],
  RESCHEDULE_VISITS: ['view_scheduling_workspace', 'reschedule_visits'],
  CANCEL_VISITS: ['view_scheduling_workspace', 'cancel_visits'],
  VIEW_SCHEDULE_CONFLICTS: ['view_scheduling_workspace', 'view_schedule_conflicts'],
  VIEW_WORKFORCE_DIRECTORY: ['view_workforce_workspace'],
  MANAGE_CAREGIVER_PROFILES: ['view_workforce_workspace', 'manage_caregiver_profiles'],
  MANAGE_CAREGIVER_CREDENTIALS: ['view_workforce_workspace', 'manage_caregiver_credentials'],
  MANAGE_CAREGIVER_AVAILABILITY: ['view_workforce_workspace', 'manage_caregiver_availability'],
  MANAGE_CAREGIVER_UNAVAILABILITY: [
    'view_workforce_workspace',
    'manage_caregiver_unavailability',
  ],
  VIEW_CAREGIVER_PERFORMANCE: ['view_workforce_workspace', 'view_caregiver_performance'],
  VIEW_PATIENT_DIRECTORY: ['view_patient_workspace'],
  MANAGE_PATIENT_DEMOGRAPHICS: ['view_patient_workspace', 'manage_patient_demographics'],
  MANAGE_PATIENT_CONTACTS: ['view_patient_workspace', 'manage_patient_contacts'],
  MANAGE_PATIENT_ADDRESS: ['view_patient_workspace', 'manage_patient_address'],
  MANAGE_PATIENT_ELIGIBILITY: ['view_patient_workspace', 'manage_patient_eligibility'],
  MANAGE_PATIENT_DIAGNOSES: ['view_patient_workspace', 'manage_patient_diagnoses'],
  MANAGE_PATIENT_PAYER_LINKAGE: ['view_patient_workspace', 'manage_patient_payer_links'],
  MANAGE_PATIENT_AUTHORIZATIONS: ['view_patient_workspace', 'manage_patient_authorizations'],
  VIEW_PATIENT_ATTACHMENTS: ['view_patient_workspace', 'view_patient_attachments'],
  MANAGE_PATIENT_ATTACHMENTS: [
    'view_patient_workspace',
    'view_patient_attachments',
    'manage_patient_attachments',
  ],
  VIEW_DOCUMENTATION_WORKSPACE: ['view_documentation_workspace'],
  MANAGE_DOCUMENTATION_TEMPLATES: [
    'view_documentation_workspace',
    'manage_documentation_templates',
  ],
  MANAGE_DOCUMENTATION_TASK_LIBRARY: [
    'view_documentation_workspace',
    'manage_documentation_task_library',
  ],
  VIEW_VISIT_DOCUMENTATION: [
    'view_documentation_workspace',
    'view_visit_documentation',
  ],
  DRAFT_VISIT_DOCUMENTATION: [
    'view_documentation_workspace',
    'view_visit_documentation',
    'draft_visit_documentation',
  ],
  SUBMIT_VISIT_DOCUMENTATION: [
    'view_documentation_workspace',
    'view_visit_documentation',
    'submit_visit_documentation',
  ],
  AMEND_VISIT_DOCUMENTATION: [
    'view_documentation_workspace',
    'view_visit_documentation',
    'amend_visit_documentation',
  ],
  GENERATE_PRINTABLE_DOCUMENTATION_SUMMARY: [
    'view_documentation_workspace',
    'view_visit_documentation',
    'generate_printable_documentation_summary',
  ],
  VIEW_REVIEW_WORKSPACE: ['view_review_workspace'],
  VIEW_EXCEPTION_QUEUE: ['view_review_workspace', 'view_review_exception_queue'],
  ASSIGN_REVIEW_WORK: ['view_review_workspace', 'assign_review_work'],
  PERFORM_REVIEW_DECISIONS: ['view_review_workspace', 'perform_review_decisions'],
  REQUEST_REVIEW_SIGNOFF: ['view_review_workspace', 'request_review_signoff'],
  VIEW_REVIEW_AUDIT_CONTEXT: ['view_review_workspace', 'view_review_audit_context'],
  VIEW_COMPLIANCE_WORKSPACE: ['view_compliance_workspace'],
  VIEW_COMPLIANCE_DASHBOARD: ['view_compliance_workspace', 'view_compliance_dashboard'],
  MANAGE_COMPLIANCE_CHECKLISTS: ['view_compliance_workspace', 'manage_compliance_checklists'],
  MANAGE_REQUIRED_DOCUMENTATION_RULES: [
    'view_compliance_workspace',
    'manage_required_documentation_rules',
  ],
  MANAGE_PATIENT_ACKNOWLEDGMENTS: [
    'view_compliance_workspace',
    'manage_patient_acknowledgments',
  ],
  MANAGE_CERTIFICATION_PERIODS: [
    'view_compliance_workspace',
    'manage_certification_periods',
  ],
  MANAGE_PATIENT_RISK_REMINDERS: [
    'view_compliance_workspace',
    'manage_patient_risk_reminders',
  ],
  RECALCULATE_COMPLIANCE_STATUS: [
    'view_compliance_workspace',
    'recalculate_compliance_status',
  ],
  VIEW_REVENUE_READINESS_WORKSPACE: ['view_revenue_readiness_workspace'],
  RECALCULATE_REVENUE_READINESS: [
    'view_revenue_readiness_workspace',
    'recalculate_revenue_readiness',
  ],
  MANAGE_REVENUE_EXCEPTION_FLAGS: [
    'view_revenue_readiness_workspace',
    'manage_revenue_exception_flags',
  ],
  GENERATE_REVENUE_EXPORTS: [
    'view_revenue_readiness_workspace',
    'generate_revenue_exports',
  ],
  VIEW_AUTHORIZATION_USAGE_SUMMARIES: [
    'view_revenue_readiness_workspace',
    'view_authorization_usage_summaries',
  ],
  VIEW_PAYER_SERVICE_SUMMARIES: [
    'view_revenue_readiness_workspace',
    'view_payer_service_summaries',
  ],
  VIEW_PATIENT_EVENT_WORKSPACE: ['view_patient_event_workspace'],
  CREATE_INCIDENT_RECORDS: ['view_patient_event_workspace', 'create_incident_records'],
  MANAGE_INFECTION_RECORDS: ['view_patient_event_workspace', 'manage_infection_records'],
  MANAGE_WOUND_RECORDS: ['view_patient_event_workspace', 'manage_wound_records'],
  LINK_PATIENT_EVENT_EVIDENCE: ['view_patient_event_workspace', 'link_patient_event_evidence'],
  ASSIGN_PATIENT_EVENT_FOLLOW_UP: [
    'view_patient_event_workspace',
    'assign_patient_event_follow_up',
  ],
  ESCALATE_PATIENT_EVENTS: ['view_patient_event_workspace', 'escalate_patient_events'],
  RESOLVE_PATIENT_EVENTS: ['view_patient_event_workspace', 'resolve_patient_events'],
  VIEW_GOAL_WORKSPACE: ['view_goal_workspace'],
  MANAGE_GOAL_TEMPLATES: ['view_goal_workspace', 'manage_goal_templates'],
  MANAGE_PATIENT_GOALS: ['view_goal_workspace', 'manage_patient_goals'],
  MANAGE_GOAL_INTERVENTIONS: ['view_goal_workspace', 'manage_goal_interventions'],
  ADD_GOAL_PROGRESS_NOTES: ['view_goal_workspace', 'add_goal_progress_notes'],
  MANAGE_GOAL_STATE_TRANSITIONS: ['view_goal_workspace', 'manage_goal_state_transitions'],
  MANAGE_CAREPLAN_SYNC: ['view_goal_workspace', 'manage_careplan_sync'],
  VIEW_ANALYTICS_WORKSPACE: ['view_analytics_workspace'],
  VIEW_BRANCH_PERFORMANCE_METRICS: [
    'view_analytics_workspace',
    'view_branch_performance_metrics',
  ],
  VIEW_CAREGIVER_UTILIZATION_METRICS: [
    'view_analytics_workspace',
    'view_caregiver_utilization_metrics',
  ],
  VIEW_QA_BACKLOG_METRICS: ['view_analytics_workspace', 'view_qa_backlog_metrics'],
  VIEW_REVENUE_READINESS_METRICS: [
    'view_analytics_workspace',
    'view_revenue_readiness_metrics',
  ],
  VIEW_COMPLIANCE_EXCEPTION_METRICS: [
    'view_analytics_workspace',
    'view_compliance_exception_metrics',
  ],
  REFRESH_DASHBOARD_METRICS: [
    'view_analytics_workspace',
    'refresh_dashboard_metrics',
  ],
  VIEW_MESSAGING_WORKSPACE: ['view_messaging_workspace'],
  SEND_SECURE_MESSAGES: ['view_messaging_workspace', 'send_secure_messages'],
  MANAGE_STAFF_GROUPS: ['view_messaging_workspace', 'manage_staff_groups'],
  SEND_BRANCH_BROADCASTS: ['view_messaging_workspace', 'send_branch_broadcasts'],
  MANAGE_MESSAGE_ESCALATIONS: ['view_messaging_workspace', 'manage_message_escalations'],
  VIEW_USER_DIRECTORY: ['view_user_directory'],
  INVITE_USER: ['invite_users'],
  EDIT_USER_PROFILE: ['edit_user_accounts'],
  MANAGE_USER_STATUS: ['manage_user_status'],
  VIEW_AUDIT_LOG: ['view_audit_log'],
  MANAGE_AGENCY_SETTINGS: ['manage_agency_settings', 'manage_security_settings'],
  MANAGE_BRANCHES: ['manage_branches'],
  MANAGE_AGENCY_MFA_POLICY: ['manage_agency_mfa_policy'],
  MANAGE_ADMIN_NOTIFICATIONS: ['manage_admin_notifications'],
  VIEW_AGENCY_CONFIGURATION: [
    'view_setup_console',
    'manage_agency_profile_setup',
    'manage_service_line_setup',
    'manage_visit_type_setup',
  ],
  MANAGE_AGENCY_CONFIGURATION: [
    'view_setup_console',
    'manage_agency_profile_setup',
    'manage_service_line_setup',
    'manage_visit_type_setup',
  ],
  VIEW_WORKFORCE_CONFIGURATION: ['view_setup_console', 'manage_workforce_catalog_setup'],
  MANAGE_WORKFORCE_CONFIGURATION: ['view_setup_console', 'manage_workforce_catalog_setup'],
  VIEW_TEMPLATE_CONFIGURATION: [
    'view_setup_console',
    'manage_task_template_setup',
    'manage_documentation_template_setup',
  ],
  MANAGE_TEMPLATE_CONFIGURATION: [
    'view_setup_console',
    'manage_task_template_setup',
    'manage_documentation_template_setup',
  ],
  VIEW_BRANCH_POLICY: ['view_setup_console', 'manage_branch_policy_setup'],
  MANAGE_BRANCH_POLICY: ['view_setup_console', 'manage_branch_policy_setup'],
  VIEW_ALERT_RULE: ['view_setup_console', 'manage_alert_rule_setup'],
  MANAGE_ALERT_RULE: ['view_setup_console', 'manage_alert_rule_setup'],
  VIEW_COMPENSATION_SETTINGS: ['view_setup_console', 'manage_mileage_pay_setup'],
  MANAGE_COMPENSATION_SETTINGS: ['view_setup_console', 'manage_mileage_pay_setup'],
};

function normalizeAssignedBranchIds(role: AgencyRole, branchIds?: string[]): string[] {
  const roleDefinition = ROLE_DEFINITIONS[role];
  if (roleDefinition.branchScope !== 'branch-assigned') {
    return [];
  }

  const normalized = (branchIds ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? [...new Set(normalized)] : ['branch-a'];
}

export function buildAccessProfileForRole(
  role: AgencyRole,
  branchIds: string[] | undefined,
  source: FrontendAccessProfile['source'],
): FrontendAccessProfile {
  const definition = ROLE_DEFINITIONS[role];
  return {
    ...definition,
    assignedBranchIds: normalizeAssignedBranchIds(role, branchIds),
    source,
  };
}

export function buildAccessProfile(
  override: FrontendAccessOverride | null,
): FrontendAccessProfile {
  if (override) {
    return buildAccessProfileForRole(
      override.role,
      override.assignedBranchIds,
      'override',
    );
  }

  return {
    ...buildAccessProfileForRole('CAREGIVER', undefined, 'fallback'),
    defaultRoute: '/app/home',
  };
}

export function canAccessPermission(
  profile: FrontendAccessProfile,
  permission: FrontendPermission,
): boolean {
  return profile.permissions.includes(permission);
}

export function mapBackendPermissionsToFrontend(
  backendPermissions: string[],
  fallbackPermissions: FrontendPermission[],
): FrontendPermission[] {
  const resolved = new Set<FrontendPermission>(COMMON_SELF_SERVICE_PERMISSIONS);

  backendPermissions.forEach((permission) => {
    BACKEND_PERMISSION_MAPPING[permission]?.forEach((mapped) => resolved.add(mapped));
  });

  if (resolved.size === COMMON_SELF_SERVICE_PERMISSIONS.length) {
    fallbackPermissions.forEach((permission) => resolved.add(permission));
  }

  return Array.from(resolved);
}

export function routeForPath(pathname: string): AppRouteDefinition | undefined {
  return APP_ROUTES.find((route) => route.path === pathname);
}

export const NAV_SECTIONS: Array<{
  key: AppRouteDefinition['section'];
  label: string;
}> = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'mobile', label: 'Caregiver Mobile' },
  { key: 'scheduling', label: 'Scheduling' },
  { key: 'workforce', label: 'Workforce' },
  { key: 'patients', label: 'Patients' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'goals', label: 'Care Progression' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'review', label: 'Review' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'configuration', label: 'Agency Setup' },
  { key: 'people', label: 'People & Audit' },
  { key: 'security', label: 'Security' },
  { key: 'personal', label: 'Personal' },
];
