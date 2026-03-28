# HomeHealthCareFE

This frontend project currently covers Epic 1 FE-01 through FE-14, plus FE-24 and FE-25, including FE-12 route and navigation authorization.

What is implemented:

- React + TypeScript + Vite scaffold
- authenticated app shell
- startup auth bootstrap from `GET /api/auth/session`
- protected route handling
- frontend permission-aware route and navigation guards with role-based default landing routes
- secure-cookie session support
- local-dev header fallback using stored `accessToken` + `sessionId`
- clean unauthenticated redirect to `/login`
- email/password login screen wired to `POST /api/auth/login`
- generic invalid-credentials handling and distinct lockout/rate-limit messaging
- MFA challenge screen wired to `POST /api/auth/login/mfa`
- TOTP and recovery-code completion paths for MFA-protected login
- logout action wired to `POST /api/auth/logout` with backend redirect support
- forgot-password screen wired to `POST /api/auth/forgot-password` with generic success UX
- reset-password screen wired to `GET /api/auth/password-policy` and `POST /api/auth/reset-password`
- authenticated change-password settings screen wired to `GET /api/auth/password-policy` and `POST /api/auth/change-password`
- reusable backend-driven password policy presentation component shared across reset and change password flows
- authenticated MFA settings screen wired to `GET /api/auth/mfa/status`, `POST /api/auth/mfa/enrollment/start`, and `POST /api/auth/mfa/enrollment/confirm`
- admin MFA policy settings screen wired to `GET /api/security/mfa-policy` and `PUT /api/security/mfa-policy`
- admin notification preferences screen wired to `GET /api/security/admin-notifications` and `PUT /api/security/admin-notifications`
- consolidated security settings screen that combines live MFA policy management, backend password-policy display, and a designed read-only session-policy section
- role-based home experience with a distinct permission-denied `403` state separate from the `404` route-not-found state
- authenticated active-sessions screen wired to `GET /api/auth/sessions` and `DELETE /api/auth/sessions/{sessionId}`
- session timeout warning banner driven by `GET /api/auth/session` and `POST /api/auth/refresh`
- frontend access-profile override layer for partial-backend permission metadata during development

## Expected backend

Run the Spring backend on `http://localhost:8080`.

The Vite dev server proxies `/api/*` requests to that backend by default.

## Local development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

## Environment options

- `VITE_API_BASE_URL`
  Use an explicit backend base URL instead of proxy-relative `/api`.
- `VITE_BACKEND_PROXY_TARGET`
  Changes the Vite proxy target. Default is `http://localhost:8080`.

## Local dev auth fallback

The backend uses secure cookies, which usually do not round-trip on plain local HTTP frontend development.

FE-01 supports a fallback local storage record under:

```text
hhc_dev_auth
```

Expected JSON shape:

```json
{
  "accessToken": "token-from-login-response",
  "sessionId": "session-id-from-login-response",
  "refreshToken": "optional-refresh-token"
}
```

The login screen can populate that storage automatically for local development mode when the fallback checkbox is enabled.

## Frontend access metadata override

FE-12 adds a frontend-only access-profile layer because the backend does not yet expose a current-user permissions endpoint.

It stores temporary role and branch metadata under:

```text
hhc_frontend_access_profile
```

Expected JSON shape:

```json
{
  "role": "BRANCH_ADMIN",
  "assignedBranchIds": ["branch-a", "branch-b"]
}
```

The app shell exposes a small access-profile card so you can switch role/branch scope locally and validate menu visibility, guarded routes, and role-based landing behavior.
