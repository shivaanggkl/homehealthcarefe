import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="auth-layout">
      <section className="auth-card auth-card-primary">
        <span className="eyebrow">404</span>
        <h1>Route not found</h1>
        <p>The frontend shell only includes the FE-01 routes so far.</p>
        <div className="button-row">
          <Link className="button" to="/app">
            Go to app
          </Link>
          <Link className="button button-secondary" to="/login">
            Go to login
          </Link>
        </div>
      </section>
    </div>
  );
}
