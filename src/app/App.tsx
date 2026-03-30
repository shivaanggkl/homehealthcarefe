import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AccessProvider, useAccess } from './access/access-context';
import { AuthProvider, useAuth } from './auth/auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './layout/AppShell';
import { ActiveSessionsPage } from './routes/ActiveSessionsPage';
import { AcceptInvitationPage } from './routes/AcceptInvitationPage';
import { AgencySettingsPage } from './routes/AgencySettingsPage';
import { AgencyProfileSetupPage } from './routes/AgencyProfileSetupPage';
import { AdminNotificationPreferencesPage } from './routes/AdminNotificationPreferencesPage';
import { AdminMfaPolicyPage } from './routes/AdminMfaPolicyPage';
import { AuditLogPage } from './routes/AuditLogPage';
import { AlertRuleSetupPage } from './routes/AlertRuleSetupPage';
import { BranchManagementPage } from './routes/BranchManagementPage';
import { BranchPolicySetupPage } from './routes/BranchPolicySetupPage';
import { CaregiverRecordWorkspacePage } from './routes/CaregiverRecordWorkspacePage';
import { CaregiverWorkspacePage } from './routes/CaregiverWorkspacePage';
import { ChangePasswordPage } from './routes/ChangePasswordPage';
import { DocumentationRecordWorkspacePage } from './routes/DocumentationRecordWorkspacePage';
import { DocumentationStatusPage } from './routes/DocumentationStatusPage';
import { DocumentationTaskLibraryPage } from './routes/DocumentationTaskLibraryPage';
import { DocumentationTemplateWorkspacePage } from './routes/DocumentationTemplateWorkspacePage';
import { DocumentationWorkspacePage } from './routes/DocumentationWorkspacePage';
import { GoalWorkspacePage } from './routes/GoalWorkspacePage';
import { GoalCommandCenterPage } from './routes/GoalCommandCenterPage';
import { ComplianceCommandCenterPage } from './routes/ComplianceCommandCenterPage';
import { ComplianceWorkspacePage } from './routes/ComplianceWorkspacePage';
import { EvvIssueListPage } from './routes/EvvIssueListPage';
import { ForgotPasswordPage } from './routes/ForgotPasswordPage';
import { HomePage } from './routes/HomePage';
import { InviteUserPage } from './routes/InviteUserPage';
import { LoginPage } from './routes/LoginPage';
import { MileagePaySetupPage } from './routes/MileagePaySetupPage';
import { MobileLoginPage } from './routes/MobileLoginPage';
import { MobileWorkspacePage } from './routes/MobileWorkspacePage';
import { MfaChallengePage } from './routes/MfaChallengePage';
import { MfaSettingsPage } from './routes/MfaSettingsPage';
import { MessagingWorkspacePage } from './routes/MessagingWorkspacePage';
import { MessagingCommandCenterPage } from './routes/MessagingCommandCenterPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { PatientRecordWorkspacePage } from './routes/PatientRecordWorkspacePage';
import { PatientEventCommandCenterPage } from './routes/PatientEventCommandCenterPage';
import { PatientEventWorkspacePage } from './routes/PatientEventWorkspacePage';
import { PatientWorkspacePage } from './routes/PatientWorkspacePage';
import { PrintableDocumentationPage } from './routes/PrintableDocumentationPage';
import { RevenueReadinessWorkspacePage } from './routes/RevenueReadinessWorkspacePage';
import { RevenueCommandCenterPage } from './routes/RevenueCommandCenterPage';
import { ReviewCommandCenterPage } from './routes/ReviewCommandCenterPage';
import { ReviewWorkspacePage } from './routes/ReviewWorkspacePage';
import { AnalyticsWorkspacePage } from './routes/AnalyticsWorkspacePage';
import { AnalyticsCommandCenterPage } from './routes/AnalyticsCommandCenterPage';
import { ResetPasswordPage } from './routes/ResetPasswordPage';
import { SecuritySettingsPage } from './routes/SecuritySettingsPage';
import { SelfProfilePage } from './routes/SelfProfilePage';
import { SchedulingWorkspacePage } from './routes/SchedulingWorkspacePage';
import { ServiceLineSetupPage } from './routes/ServiceLineSetupPage';
import { SetupOverviewPage } from './routes/SetupOverviewPage';
import { TaskTemplateSetupPage } from './routes/TaskTemplateSetupPage';
import { UserDirectoryPage } from './routes/UserDirectoryPage';
import { VisitTypeSetupPage } from './routes/VisitTypeSetupPage';
import { WorkforceCatalogSetupPage } from './routes/WorkforceCatalogSetupPage';
import { MobileProtectedRoute } from './components/MobileProtectedRoute';
import { MobileDocumentationPage } from './routes/MobileDocumentationPage';

function BootstrapScreen() {
  return (
    <div className="boot-screen">
      <div className="boot-card">
        <span className="eyebrow">HomeHealthCare</span>
        <h1>Restoring secure session</h1>
        <p>Checking the backend session API before rendering protected routes.</p>
      </div>
    </div>
  );
}

function MobileBootstrapScreen() {
  return (
    <div className="mobile-auth-layout">
      <section className="mobile-auth-card">
        <span className="eyebrow">Epic 6 Mobile</span>
        <h1>Restoring field session</h1>
        <p>
          Checking the backend session before rendering caregiver mobile routes so visit work never
          opens with stale auth state.
        </p>
      </section>
    </div>
  );
}

function DefaultLandingRoute() {
  const { loading, profile } = useAccess();

  if (loading) {
    return <BootstrapScreen />;
  }

  return <Navigate replace to={profile.defaultRoute} />;
}

function AppRoutes() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'bootstrapping') {
    return location.pathname.startsWith('/mobile') ? <MobileBootstrapScreen /> : <BootstrapScreen />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate replace to={state.status === 'authenticated' ? '/app' : '/login'} />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mobile/login" element={<MobileLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/login/mfa" element={<MfaChallengePage />} />
      <Route
        path="/mobile"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregiver-facing mobile permissions can open the Epic 6 field app."
            deniedTitle="Mobile field workspace is not available for this role."
            requiredPermission="view_mobile_app"
          >
            <MobileWorkspacePage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/mobile/visits/:visitId"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregiver-facing mobile permissions can open assigned visit detail."
            deniedTitle="Mobile visit detail is not available for this role."
            requiredPermission="view_mobile_app"
          >
            <MobileWorkspacePage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/mobile/visits/:visitId/evv"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregivers with EVV access can open mobile visit verification routes."
            deniedTitle="Mobile EVV verification is not available for this role."
            requiredPermission="view_mobile_evv"
          >
            <MobileWorkspacePage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/mobile/visits/:visitId/evv/missed-visit"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregivers with EVV access can open missed-visit reporting routes."
            deniedTitle="Mobile missed-visit workflow is not available for this role."
            requiredPermission="view_mobile_evv"
          >
            <MobileWorkspacePage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/mobile/visits/:visitId/evv/exception"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregivers with EVV access can open visit-exception routes."
            deniedTitle="Mobile EVV exception workflow is not available for this role."
            requiredPermission="view_mobile_evv"
          >
            <MobileWorkspacePage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/mobile/visits/:visitId/documentation"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregivers with documentation access can open mobile visit documentation routes."
            deniedTitle="Mobile visit documentation is not available for this role."
            requiredPermission="view_visit_documentation"
          >
            <MobileDocumentationPage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/mobile/messages"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregiver-facing mobile permissions can open the mobile shell."
            deniedTitle="Mobile message center is not available for this role."
            requiredPermission="view_mobile_app"
          >
            <MobileWorkspacePage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/mobile/account"
        element={
          <MobileProtectedRoute
            deniedMessage="Only caregiver-facing mobile permissions can open the mobile shell."
            deniedTitle="Mobile account screen is not available for this role."
            requiredPermission="view_mobile_app"
          >
            <MobileWorkspacePage />
          </MobileProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DefaultLandingRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/home"
        element={
          <ProtectedRoute requiredPermission="view_session_home">
            <AppShell>
              <HomePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/scheduling"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with backend scheduling access can open the Epic 5 scheduling workspace."
            deniedTitle="Scheduling workspace is not available for this role."
            requiredPermission="view_scheduling_workspace"
          >
            <AppShell>
              <SchedulingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/scheduling/visits/:visitId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with backend scheduling access can open schedule detail drawers."
            deniedTitle="Scheduling detail is not available for this role."
            requiredPermission="view_scheduling_workspace"
          >
            <AppShell>
              <SchedulingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/revenue-readiness"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized finance and operations roles can open the Epic 14 revenue-readiness workspace."
            deniedTitle="Revenue-readiness workspace is not available for this role."
            requiredPermission="view_revenue_readiness_workspace"
          >
            <AppShell>
              <RevenueReadinessWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/revenue-readiness/visits/:visitId"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized finance and operations roles can open Epic 14 readiness detail routes."
            deniedTitle="Revenue-readiness detail is not available for this role."
            requiredPermission="view_revenue_readiness_workspace"
          >
            <AppShell>
              <RevenueReadinessWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/revenue-readiness/exceptions"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized finance and operations roles can open Epic 14 blocker routes."
            deniedTitle="Revenue exception visibility is not available for this role."
            requiredPermission="view_revenue_readiness_workspace"
          >
            <AppShell>
              <RevenueReadinessWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/revenue-readiness/payroll-export"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized finance and operations roles can open Epic 14 payroll export routes."
            deniedTitle="Payroll export preview is not available for this role."
            requiredPermission="view_revenue_readiness_workspace"
          >
            <AppShell>
              <RevenueReadinessWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/revenue-readiness/invoice-export"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized finance and operations roles can open Epic 14 invoice export routes."
            deniedTitle="Invoice export preview is not available for this role."
            requiredPermission="view_revenue_readiness_workspace"
          >
            <AppShell>
              <RevenueReadinessWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/revenue-readiness/command-center"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized finance and operations roles can open the Epic 14 revenue summary route."
            deniedTitle="Revenue summary is not available for this role."
            requiredPermission="view_revenue_readiness_workspace"
          >
            <AppShell>
              <RevenueCommandCenterPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/revenue-readiness/authorizations/:authorizationId"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized finance and operations roles can open Epic 14 authorization usage routes."
            deniedTitle="Authorization usage summary is not available for this role."
            requiredPermission="view_revenue_readiness_workspace"
          >
            <AppShell>
              <RevenueReadinessWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/messaging"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 9 messaging access can open the secure coordination workspace."
            deniedTitle="Messaging workspace is not available for this role."
            requiredPermission="view_messaging_workspace"
          >
            <AppShell>
              <MessagingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/messaging/command-center"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 9 messaging access can open the coordinator communication summary."
            deniedTitle="Communication summary is not available for this role."
            requiredPermission="view_messaging_workspace"
          >
            <AppShell>
              <MessagingCommandCenterPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/messaging/threads/:threadId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 9 messaging access can open secure thread detail routes."
            deniedTitle="Messaging thread detail is not available for this role."
            requiredPermission="view_messaging_workspace"
          >
            <AppShell>
              <MessagingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/discussion"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 9 messaging access can open patient-linked discussion routes."
            deniedTitle="Patient discussion is not available for this role."
            requiredPermission="view_messaging_workspace"
          >
            <AppShell>
              <MessagingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/scheduling/visits/:visitId/discussion"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 9 messaging access can open visit-linked discussion routes."
            deniedTitle="Visit discussion is not available for this role."
            requiredPermission="view_messaging_workspace"
          >
            <AppShell>
              <MessagingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/documentation/tasks/:taskTemplateId/discussion"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 9 messaging access can open task-linked discussion routes."
            deniedTitle="Task discussion is not available for this role."
            requiredPermission="view_messaging_workspace"
          >
            <AppShell>
              <MessagingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/messaging/admin"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 9 messaging access can open the messaging admin surface."
            deniedTitle="Messaging admin routes are not available for this role."
            requiredPermission="view_messaging_workspace"
          >
            <AppShell>
              <MessagingWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analytics/command-center"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized leadership and operations roles can open the Epic 15 analytics command center."
            deniedTitle="Analytics command center is not available for this role."
            requiredPermission="view_analytics_workspace"
          >
            <AppShell>
              <AnalyticsCommandCenterPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analytics"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized leadership and operations roles can open the Epic 15 analytics workspace."
            deniedTitle="Analytics workspace is not available for this role."
            requiredPermission="view_analytics_workspace"
          >
            <AppShell>
              <AnalyticsWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analytics/operational"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized leadership and operations roles can open the Epic 15 operational drilldown route."
            deniedTitle="Operational analytics are not available for this role."
            requiredPermission="view_analytics_workspace"
          >
            <AppShell>
              <AnalyticsWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analytics/branch-performance"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized leadership and operations roles can open the Epic 15 branch-performance route."
            deniedTitle="Branch-performance analytics are not available for this role."
            requiredPermission="view_analytics_workspace"
          >
            <AppShell>
              <AnalyticsWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analytics/caregiver-utilization"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized leadership and operations roles can open the Epic 15 caregiver-utilization route."
            deniedTitle="Caregiver-utilization analytics are not available for this role."
            requiredPermission="view_analytics_workspace"
          >
            <AppShell>
              <AnalyticsWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/analytics/readiness"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized leadership and operations roles can open the Epic 15 revenue and compliance summary route."
            deniedTitle="Revenue and compliance analytics are not available for this role."
            requiredPermission="view_analytics_workspace"
          >
            <AppShell>
              <AnalyticsWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open the goal and progression workspace."
            deniedTitle="Care progression workspace is not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/command-center"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open the coordinator progression summary."
            deniedTitle="Progression command center is not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalCommandCenterPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/templates"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open goal-template routes."
            deniedTitle="Goal-template routes are not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/patients/:patientId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open patient progression summary routes."
            deniedTitle="Patient progression summary is not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/patient-goals/:goalId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open patient-goal detail routes."
            deniedTitle="Patient-goal detail is not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/patient-goals/:goalId/interventions"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open intervention routes."
            deniedTitle="Goal interventions are not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/patient-goals/:goalId/progress-notes"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open progress-note routes."
            deniedTitle="Goal progress notes are not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/patient-goals/:goalId/history"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open goal version-history routes."
            deniedTitle="Goal version history is not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/goals/patient-goals/:goalId/careplan-sync"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 13 care progression access can open care-plan sync routes."
            deniedTitle="Care-plan sync visibility is not available for this role."
            requiredPermission="view_goal_workspace"
          >
            <AppShell>
              <GoalWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open the clinical compliance workspace."
            deniedTitle="Compliance workspace is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open incident, infection, wound, follow-up, escalation, and timeline routes."
            deniedTitle="Patient-event workspace is not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/incidents"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open incident routes."
            deniedTitle="Incident routes are not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/incidents/:incidentId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open incident detail routes."
            deniedTitle="Incident detail is not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/infections"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open infection routes."
            deniedTitle="Infection routes are not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/infections/:infectionId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open infection detail routes."
            deniedTitle="Infection detail is not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/wounds"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open wound routes."
            deniedTitle="Wound routes are not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/wounds/:woundId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open wound detail routes."
            deniedTitle="Wound detail is not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/follow-ups"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open follow-up routes."
            deniedTitle="Follow-up routes are not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/escalations"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open escalation routes."
            deniedTitle="Escalation routes are not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/patients/:patientId/timeline"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open patient-event timelines."
            deniedTitle="Patient-event timeline is not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patient-events/command-center"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 12 patient-event workspace access can open the coordinator-facing patient-event summary."
            deniedTitle="Patient-event command center is not available for this role."
            requiredPermission="view_patient_event_workspace"
          >
            <AppShell>
              <PatientEventCommandCenterPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance/command-center"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open the coordinator-facing compliance summary."
            deniedTitle="Compliance summary is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceCommandCenterPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance/patients/:patientId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open patient compliance detail routes."
            deniedTitle="Patient compliance detail is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance/patients/:patientId/checklist"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open checklist-detail compliance routes."
            deniedTitle="Checklist compliance detail is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance/patients/:patientId/documentation-gaps"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open documentation-gap compliance routes."
            deniedTitle="Documentation-gap detail is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance/patients/:patientId/acknowledgments"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open acknowledgment routes."
            deniedTitle="Acknowledgment management is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance/patients/:patientId/certification-periods"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open certification-period routes."
            deniedTitle="Certification-period management is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/compliance/patients/:patientId/risk-reminders"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 11 compliance workspace access can open risk-reminder routes."
            deniedTitle="Risk-reminder management is not available for this role."
            requiredPermission="view_compliance_workspace"
          >
            <AppShell>
              <ComplianceWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/documentation"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 8 documentation workspace access can open the documentation workspace."
            deniedTitle="Documentation workspace is not available for this role."
            requiredPermission="view_documentation_workspace"
          >
            <AppShell>
              <DocumentationWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/documentation/templates"
        element={
          <ProtectedRoute
            deniedMessage="Only permitted admins can manage Epic 8 documentation templates."
            deniedTitle="Documentation template management is not available for this role."
            requiredPermission="manage_documentation_templates"
          >
            <AppShell>
              <DocumentationTemplateWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/documentation/task-library"
        element={
          <ProtectedRoute
            deniedMessage="Only permitted admins can manage Epic 8 documentation task-library items."
            deniedTitle="Documentation task-library management is not available for this role."
            requiredPermission="manage_documentation_task_library"
          >
            <AppShell>
              <DocumentationTaskLibraryPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/documentation/status"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized coordinators and admins can open the Epic 8 documentation status list."
            deniedTitle="Documentation status visibility is not available for this role."
            requiredPermission="view_visit_documentation"
          >
            <AppShell>
              <DocumentationStatusPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/documentation/visits/:visitId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with visit-documentation access can open Epic 8 visit documentation routes."
            deniedTitle="Visit documentation is not available for this role."
            requiredPermission="view_visit_documentation"
          >
            <AppShell>
              <DocumentationRecordWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/documentation/records/:documentationRecordId/printable"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with printable documentation access can open Epic 8 printable summary routes."
            deniedTitle="Printable documentation summary is not available for this role."
            requiredPermission="generate_printable_documentation_summary"
          >
            <AppShell>
              <PrintableDocumentationPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/review"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 10 review access can open the QA review workspace."
            deniedTitle="Review workspace is not available for this role."
            requiredPermission="view_review_workspace"
          >
            <AppShell>
              <ReviewWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/review/exceptions"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 10 exception-queue access can open review exception routes."
            deniedTitle="Review exception queue is not available for this role."
            requiredPermission="view_review_exception_queue"
          >
            <AppShell>
              <ReviewWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/review/command-center"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized reviewers and coordinators can open the review summary route."
            deniedTitle="Review summary is not available for this role."
            requiredPermission="view_review_workspace"
          >
            <AppShell>
              <ReviewCommandCenterPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/review/items/:workItemId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 10 review access can open review item detail routes."
            deniedTitle="Review item detail is not available for this role."
            requiredPermission="view_review_workspace"
          >
            <AppShell>
              <ReviewWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/review/items/:workItemId/resubmission"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 10 review access can open returned-for-fix visibility routes."
            deniedTitle="Review resubmission detail is not available for this role."
            requiredPermission="view_review_workspace"
          >
            <AppShell>
              <ReviewWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/review/items/:workItemId/assignment"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with Epic 10 review access can open reviewer assignment detail routes."
            deniedTitle="Review assignment detail is not available for this role."
            requiredPermission="view_review_workspace"
          >
            <AppShell>
              <ReviewWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with backend workforce directory access can open the Epic 4 workforce workspace."
            deniedTitle="Workforce workspace is not available for this role."
            requiredPermission="view_workforce_workspace"
          >
            <AppShell>
              <CaregiverWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/new/profile"
        element={
          <ProtectedRoute
            deniedMessage="Caregiver create routes follow backend workforce profile permissions."
            deniedTitle="Caregiver creation is not available for this role."
            requiredPermission="manage_caregiver_profiles"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage createMode section="profile" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with backend workforce directory access can open caregiver records."
            deniedTitle="Caregiver record workspace is not available for this role."
            requiredPermission="view_workforce_workspace"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="overview" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/profile"
        element={
          <ProtectedRoute
            deniedMessage="Caregiver profile routes follow backend workforce profile permissions."
            deniedTitle="Caregiver profile is not available for this role."
            requiredPermission="manage_caregiver_profiles"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="profile" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/credentials"
        element={
          <ProtectedRoute
            deniedMessage="Credential routes follow backend workforce credential permissions."
            deniedTitle="Caregiver credentials are not available for this role."
            requiredPermission="manage_caregiver_credentials"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="credentials" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/capabilities"
        element={
          <ProtectedRoute
            deniedMessage="Language and skill routes follow backend caregiver profile permissions."
            deniedTitle="Caregiver capabilities are not available for this role."
            requiredPermission="manage_caregiver_profiles"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="capabilities" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/geography"
        element={
          <ProtectedRoute
            deniedMessage="Geography routes follow backend caregiver profile permissions."
            deniedTitle="Caregiver geography preferences are not available for this role."
            requiredPermission="manage_caregiver_profiles"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="geography" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/shifts"
        element={
          <ProtectedRoute
            deniedMessage="Shift preference routes follow backend caregiver profile permissions."
            deniedTitle="Caregiver shift preferences are not available for this role."
            requiredPermission="manage_caregiver_profiles"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="shifts" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/availability"
        element={
          <ProtectedRoute
            deniedMessage="Availability routes follow backend workforce availability permissions."
            deniedTitle="Caregiver availability is not available for this role."
            requiredPermission="manage_caregiver_availability"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="availability" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/unavailability"
        element={
          <ProtectedRoute
            deniedMessage="PTO and blocked-time routes follow backend workforce unavailability permissions."
            deniedTitle="Caregiver unavailability is not available for this role."
            requiredPermission="manage_caregiver_unavailability"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="unavailability" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/workforce/:caregiverId/performance"
        element={
          <ProtectedRoute
            deniedMessage="Performance routes follow backend workforce performance visibility permissions."
            deniedTitle="Caregiver performance is not available for this role."
            requiredPermission="view_caregiver_performance"
          >
            <AppShell>
              <CaregiverRecordWorkspacePage section="performance" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with backend patient directory access can open the Epic 3 patient workspace."
            deniedTitle="Patient workspace is not available for this role."
            requiredPermission="view_patient_workspace"
          >
            <AppShell>
              <PatientWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId"
        element={
          <ProtectedRoute
            deniedMessage="Only roles with backend patient directory access can open patient records."
            deniedTitle="Patient record workspace is not available for this role."
            requiredPermission="view_patient_workspace"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="overview" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/demographics"
        element={
          <ProtectedRoute
            deniedMessage="Demographic edits follow backend patient-management permissions."
            deniedTitle="Patient demographics are not available for this role."
            requiredPermission="manage_patient_demographics"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="demographics" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/new/demographics"
        element={
          <ProtectedRoute
            deniedMessage="Demographic create routes follow backend patient-management permissions."
            deniedTitle="Patient creation is not available for this role."
            requiredPermission="manage_patient_demographics"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="demographics" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/contacts"
        element={
          <ProtectedRoute
            deniedMessage="Patient contact routes follow backend patient-management permissions."
            deniedTitle="Patient contacts are not available for this role."
            requiredPermission="manage_patient_contacts"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="contacts" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/address"
        element={
          <ProtectedRoute
            deniedMessage="Patient address routes follow backend patient-management permissions."
            deniedTitle="Patient address is not available for this role."
            requiredPermission="manage_patient_address"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="address" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/eligibility"
        element={
          <ProtectedRoute
            deniedMessage="Eligibility routes follow backend patient-management permissions."
            deniedTitle="Patient eligibility is not available for this role."
            requiredPermission="manage_patient_eligibility"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="eligibility" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/diagnoses"
        element={
          <ProtectedRoute
            deniedMessage="Diagnosis routes follow backend patient-management permissions."
            deniedTitle="Patient diagnoses are not available for this role."
            requiredPermission="manage_patient_diagnoses"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="diagnoses" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/payer"
        element={
          <ProtectedRoute
            deniedMessage="Payer linkage routes follow backend patient-management permissions."
            deniedTitle="Patient payer linkage is not available for this role."
            requiredPermission="manage_patient_payer_links"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="payer" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/authorizations"
        element={
          <ProtectedRoute
            deniedMessage="Authorization routes follow backend patient-management permissions."
            deniedTitle="Patient authorizations are not available for this role."
            requiredPermission="manage_patient_authorizations"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="authorizations" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/patients/:patientId/attachments"
        element={
          <ProtectedRoute
            deniedMessage="Patient attachments follow backend attachment-view permissions and controlled download access."
            deniedTitle="Patient attachments are not available for this role."
            requiredPermission="view_patient_attachments"
          >
            <AppShell>
              <PatientRecordWorkspacePage section="attachments" />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup"
        element={
          <ProtectedRoute
            deniedMessage="Epic 2 setup routes are limited to roles with agency configuration access."
            deniedTitle="Agency setup is not available for this role."
            requiredPermission="view_setup_console"
          >
            <AppShell>
              <SetupOverviewPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/profile"
        element={
          <ProtectedRoute
            deniedMessage="Agency profile setup follows backend configuration permissions."
            deniedTitle="Agency profile setup is not available for this role."
            requiredPermission="manage_agency_profile_setup"
          >
            <AppShell>
              <AgencyProfileSetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/catalog/service-lines"
        element={
          <ProtectedRoute
            deniedMessage="Service line setup follows backend configuration permissions."
            deniedTitle="Service line setup is not available for this role."
            requiredPermission="manage_service_line_setup"
          >
            <AppShell>
              <ServiceLineSetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/catalog/visit-types"
        element={
          <ProtectedRoute
            deniedMessage="Visit type setup follows backend configuration permissions."
            deniedTitle="Visit type setup is not available for this role."
            requiredPermission="manage_visit_type_setup"
          >
            <AppShell>
              <VisitTypeSetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/workforce/catalogs"
        element={
          <ProtectedRoute
            deniedMessage="Workforce catalog setup follows backend configuration permissions."
            deniedTitle="Workforce catalogs are not available for this role."
            requiredPermission="manage_workforce_catalog_setup"
          >
            <AppShell>
              <WorkforceCatalogSetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/templates/tasks"
        element={
          <ProtectedRoute
            deniedMessage="Task template setup follows backend configuration permissions."
            deniedTitle="Task templates are not available for this role."
            requiredPermission="manage_task_template_setup"
          >
            <AppShell>
              <TaskTemplateSetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/templates/documentation"
        element={
          <ProtectedRoute
            deniedMessage="Documentation template setup follows backend configuration permissions."
            deniedTitle="Documentation templates are not available for this role."
            requiredPermission="manage_documentation_templates"
          >
            <AppShell>
              <DocumentationTemplateWorkspacePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/policies/branches"
        element={
          <ProtectedRoute
            deniedMessage="Branch policy setup follows backend branch-aware permissions."
            deniedTitle="Branch policies are not available for this role."
            requiredPermission="manage_branch_policy_setup"
          >
            <AppShell>
              <BranchPolicySetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/policies/alerts"
        element={
          <ProtectedRoute
            deniedMessage="Alert rule setup follows backend branch-aware permissions."
            deniedTitle="Alert rules are not available for this role."
            requiredPermission="manage_alert_rule_setup"
          >
            <AppShell>
              <AlertRuleSetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/setup/compensation/mileage-pay"
        element={
          <ProtectedRoute
            deniedMessage="Mileage and pay setup follows backend compensation permissions."
            deniedTitle="Mileage and pay settings are not available for this role."
            requiredPermission="manage_mileage_pay_setup"
          >
            <AppShell>
              <MileagePaySetupPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/profile"
        element={
          <ProtectedRoute requiredPermission="manage_self_profile">
            <AppShell>
              <SelfProfilePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin/users"
        element={
          <ProtectedRoute
            deniedMessage="Only permitted admins can access the agency user directory."
            deniedTitle="User directory is not available for this role."
            requiredPermission="view_user_directory"
          >
            <AppShell>
              <UserDirectoryPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin/users/invite"
        element={
          <ProtectedRoute
            deniedMessage="Only permitted admins can invite users into the agency."
            deniedTitle="Invite user is not available for this role."
            requiredPermission="invite_users"
          >
            <AppShell>
              <InviteUserPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin/evv-issues"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized coordinators, reviewers, or supervisors can review open EVV issues."
            deniedTitle="EVV issue visibility is not available for this role."
            requiredPermission="view_evv_issue_workspace"
          >
            <AppShell>
              <EvvIssueListPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin/audit"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized admins and auditors can access the audit log."
            deniedTitle="Audit log is not available for this role."
            requiredPermission="view_audit_log"
          >
            <AppShell>
              <AuditLogPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin/branches"
        element={
          <ProtectedRoute
            deniedMessage="Only authorized admins can manage branches."
            deniedTitle="Branch management is not available for this role."
            requiredPermission="manage_branches"
          >
            <AppShell>
              <BranchManagementPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/agency"
        element={
          <ProtectedRoute
            deniedMessage="Agency settings are limited to the agency owner."
            deniedTitle="Agency settings are not available for this role."
            requiredPermission="manage_agency_settings"
          >
            <AppShell>
              <AgencySettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/security"
        element={
          <ProtectedRoute
            deniedMessage="The consolidated security settings page is currently limited to the agency owner access profile."
            deniedTitle="Security settings are not available for this role."
            requiredPermission="manage_security_settings"
          >
            <AppShell>
              <SecuritySettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/password"
        element={
          <ProtectedRoute requiredPermission="manage_self_password">
            <AppShell>
              <ChangePasswordPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/mfa"
        element={
          <ProtectedRoute requiredPermission="manage_self_mfa">
            <AppShell>
              <MfaSettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/admin-mfa-policy"
        element={
          <ProtectedRoute
            deniedMessage="Agency MFA enforcement is limited to roles with admin security permissions."
            deniedTitle="Agency MFA policy is not available for this role."
            requiredPermission="manage_agency_mfa_policy"
          >
            <AppShell>
              <AdminMfaPolicyPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/admin-notifications"
        element={
          <ProtectedRoute
            deniedMessage="Critical account notification settings are limited to admin roles."
            deniedTitle="Admin notifications are not available for this role."
            requiredPermission="manage_admin_notifications"
          >
            <AppShell>
              <AdminNotificationPreferencesPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/sessions"
        element={
          <ProtectedRoute requiredPermission="manage_self_sessions">
            <AppShell>
              <ActiveSessionsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AccessProvider>
        <AppRoutes />
      </AccessProvider>
    </AuthProvider>
  );
}
