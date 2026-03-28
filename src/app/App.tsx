import { Navigate, Route, Routes } from 'react-router-dom';
import { AccessProvider, useAccess } from './access/access-context';
import { AuthProvider, useAuth } from './auth/auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './layout/AppShell';
import { ActiveSessionsPage } from './routes/ActiveSessionsPage';
import { AcceptInvitationPage } from './routes/AcceptInvitationPage';
import { AgencySettingsPage } from './routes/AgencySettingsPage';
import { AdminNotificationPreferencesPage } from './routes/AdminNotificationPreferencesPage';
import { AdminMfaPolicyPage } from './routes/AdminMfaPolicyPage';
import { AuditLogPage } from './routes/AuditLogPage';
import { BranchManagementPage } from './routes/BranchManagementPage';
import { ChangePasswordPage } from './routes/ChangePasswordPage';
import { ForgotPasswordPage } from './routes/ForgotPasswordPage';
import { HomePage } from './routes/HomePage';
import { InviteUserPage } from './routes/InviteUserPage';
import { LoginPage } from './routes/LoginPage';
import { MfaChallengePage } from './routes/MfaChallengePage';
import { MfaSettingsPage } from './routes/MfaSettingsPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { ResetPasswordPage } from './routes/ResetPasswordPage';
import { SecuritySettingsPage } from './routes/SecuritySettingsPage';
import { SelfProfilePage } from './routes/SelfProfilePage';
import { UserDirectoryPage } from './routes/UserDirectoryPage';

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
  const { profile } = useAccess();
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
