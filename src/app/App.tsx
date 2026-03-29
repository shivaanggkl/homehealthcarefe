import { Navigate, Route, Routes } from 'react-router-dom';
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
import { ChangePasswordPage } from './routes/ChangePasswordPage';
import { DocumentationTemplateSetupPage } from './routes/DocumentationTemplateSetupPage';
import { ForgotPasswordPage } from './routes/ForgotPasswordPage';
import { HomePage } from './routes/HomePage';
import { InviteUserPage } from './routes/InviteUserPage';
import { LoginPage } from './routes/LoginPage';
import { MileagePaySetupPage } from './routes/MileagePaySetupPage';
import { MfaChallengePage } from './routes/MfaChallengePage';
import { MfaSettingsPage } from './routes/MfaSettingsPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { PatientRecordWorkspacePage } from './routes/PatientRecordWorkspacePage';
import { PatientWorkspacePage } from './routes/PatientWorkspacePage';
import { ResetPasswordPage } from './routes/ResetPasswordPage';
import { SecuritySettingsPage } from './routes/SecuritySettingsPage';
import { SelfProfilePage } from './routes/SelfProfilePage';
import { ServiceLineSetupPage } from './routes/ServiceLineSetupPage';
import { SetupOverviewPage } from './routes/SetupOverviewPage';
import { TaskTemplateSetupPage } from './routes/TaskTemplateSetupPage';
import { UserDirectoryPage } from './routes/UserDirectoryPage';
import { VisitTypeSetupPage } from './routes/VisitTypeSetupPage';
import { WorkforceCatalogSetupPage } from './routes/WorkforceCatalogSetupPage';

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

function DefaultLandingRoute() {
  const { loading, profile } = useAccess();

  if (loading) {
    return <BootstrapScreen />;
  }

  return <Navigate replace to={profile.defaultRoute} />;
}

function AppRoutes() {
  const { state } = useAuth();

  if (state.status === 'bootstrapping') {
    return <BootstrapScreen />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate replace to={state.status === 'authenticated' ? '/app' : '/login'} />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/login/mfa" element={<MfaChallengePage />} />
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
            requiredPermission="manage_documentation_template_setup"
          >
            <AppShell>
              <DocumentationTemplateSetupPage />
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
