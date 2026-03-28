import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './layout/AppShell';
import { ActiveSessionsPage } from './routes/ActiveSessionsPage';
import { ChangePasswordPage } from './routes/ChangePasswordPage';
import { ForgotPasswordPage } from './routes/ForgotPasswordPage';
import { HomePage } from './routes/HomePage';
import { LoginPage } from './routes/LoginPage';
import { MfaChallengePage } from './routes/MfaChallengePage';
import { MfaSettingsPage } from './routes/MfaSettingsPage';
import { NotFoundPage } from './routes/NotFoundPage';
import { ResetPasswordPage } from './routes/ResetPasswordPage';

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
      <Route path="/login/mfa" element={<MfaChallengePage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell>
              <HomePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/password"
        element={
          <ProtectedRoute>
            <AppShell>
              <ChangePasswordPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/mfa"
        element={
          <ProtectedRoute>
            <AppShell>
              <MfaSettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/settings/sessions"
        element={
          <ProtectedRoute>
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
      <AppRoutes />
    </AuthProvider>
  );
}
