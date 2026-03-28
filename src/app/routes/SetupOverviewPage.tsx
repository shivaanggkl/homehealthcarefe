import { useEffect, useMemo, useState } from 'react';
import { APP_ROUTES } from '../access/access-control';
import { useAccess } from '../access/access-context';
import { useAuth } from '../auth/auth-context';
import { loadDevSessionCredentials } from '../auth/session-storage';
import {
  ApiError,
  fetchAlertRules,
  fetchBranches,
  fetchBranchPolicies,
  fetchCaregiverCertifications,
  fetchCaregiverSkills,
  fetchDocumentationTemplates,
  fetchMileagePaySettings,
  fetchServiceLines,
  fetchTaskTemplates,
  fetchVisitTypes,
} from '../auth/session-api';
import { ConfigurationAuditNotice } from '../components/ConfigurationSupport';
import {
  ConfigurationModuleCards,
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

type SetupModuleSummary = {
  key: string;
  label: string;
  countLabel: string;
  complete: boolean;
};

export function SetupOverviewPage() {
  const { profile } = useAccess();
  const { state } = useAuth();
  const [summaries, setSummaries] = useState<SetupModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const configurationRoutes = APP_ROUTES.filter((route) => route.section === 'configuration');
  const visibleModules = configurationRoutes.filter((route) =>
    profile.permissions.includes(route.permission),
  );

  const authContext = useMemo(() => {
    const devSession = loadDevSessionCredentials();
    return {
      accessToken: devSession?.accessToken,
      sessionId:
        devSession?.sessionId ??
        (state.status === 'authenticated' ? state.session.sessionId : undefined),
    };
  }, [state]);

  useEffect(() => {
    if (state.status !== 'authenticated') {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    void Promise.allSettled([
      fetchServiceLines({ ...authContext, page: 0, size: 1 }),
      fetchVisitTypes({ ...authContext, page: 0, size: 1 }),
      fetchCaregiverSkills({ ...authContext, page: 0, size: 1 }),
      fetchCaregiverCertifications({ ...authContext, page: 0, size: 1 }),
      fetchTaskTemplates({ ...authContext, page: 0, size: 1 }),
      fetchDocumentationTemplates({ ...authContext, page: 0, size: 1 }),
      fetchBranchPolicies({ ...authContext, page: 0, size: 1 }),
      fetchAlertRules({ ...authContext, page: 0, size: 1 }),
      fetchMileagePaySettings(authContext),
      fetchBranches(authContext),
    ])
      .then((results) => {
        if (cancelled) {
          return;
        }

        const [
          serviceLines,
          visitTypes,
          skills,
          certifications,
          taskTemplates,
          documentationTemplates,
          branchPolicies,
          alertRules,
          mileagePaySettings,
          branches,
        ] = results;

        const nextSummaries: SetupModuleSummary[] = [
          summaryFromPaged('service-lines', 'Service lines', serviceLines),
          summaryFromPaged('visit-types', 'Visit types', visitTypes),
          summaryFromPaged('skills', 'Caregiver skills', skills),
          summaryFromPaged('certifications', 'Certifications', certifications),
          summaryFromPaged('task-templates', 'Task templates', taskTemplates),
          summaryFromPaged('documentation-templates', 'Documentation templates', documentationTemplates),
          summaryFromPaged('branch-policies', 'Branch policies', branchPolicies),
          summaryFromPaged('alert-rules', 'Alert rules', alertRules),
          summaryFromMileage('mileage-pay', 'Mileage & pay settings', mileagePaySettings),
          summaryFromBranches('branches', 'Active branches', branches),
        ];

        setSummaries(nextSummaries);

        const fatalError = results.find(
          (result) =>
            result.status === 'rejected' &&
            (!(result.reason instanceof ApiError) || result.reason.status !== 403),
        );
        if (fatalError && fatalError.status === 'rejected') {
          setErrorMessage(
            fatalError.reason instanceof Error
              ? fatalError.reason.message
              : 'Some setup summaries could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authContext, state.status]);

  const completeCount = summaries.filter((item) => item.complete).length;

  return (
    <ConfigurationPageShell
      eyebrow="Epic 2 Setup Overview"
      title="Agency setup and configuration"
      description="See what is configured, what is still empty, and where to go next across the Epic 2 setup area."
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          title="Setup status"
          description="This overview uses live backend counts so the setup dashboard reflects real agency configuration state."
        >
          <div className="definition-list">
            <div>
              <dt>Current role</dt>
              <dd>{profile.roleLabel}</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>{profile.branchScopeLabel}</dd>
            </div>
            <div>
              <dt>Visible setup modules</dt>
              <dd>{visibleModules.length}</dd>
            </div>
            <div>
              <dt>Configured areas</dt>
              <dd>{loading ? 'Loading...' : `${completeCount} of ${summaries.length}`}</dd>
            </div>
          </div>

          <ConfigurationAuditNotice subject="Epic 2 setup changes" />

          {errorMessage ? (
            <p className="alert">
              <strong>Some setup counts are unavailable.</strong> {errorMessage}
            </p>
          ) : null}
        </ConfigurationPanel>

        <ConfigurationPanel
          title="Completion snapshot"
          description="Missing or incomplete areas stay visible here so the setup backlog is obvious to owners and admins."
        >
          <div className="config-module-grid">
            {summaries.map((item) => (
              <article className="config-module-card" key={item.key}>
                <div className="config-module-card-header">
                  <strong>{item.label}</strong>
                  <span className={`status-pill ${item.complete ? 'status-active' : 'status-draft'}`}>
                    {item.complete ? 'Configured' : 'Needs setup'}
                  </span>
                </div>
                <p>{loading ? 'Loading summary...' : item.countLabel}</p>
              </article>
            ))}
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          title="Module routes"
          description="Each module remains permission-aware and routes directly to the detailed configuration screen."
        >
          <ConfigurationModuleCards routes={visibleModules} />
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}

function summaryFromPaged(
  key: string,
  label: string,
  result: PromiseSettledResult<{ totalElements: number }>,
): SetupModuleSummary {
  if (result.status === 'rejected') {
    return {
      key,
      label,
      countLabel:
        result.reason instanceof ApiError && result.reason.status === 403
          ? 'Restricted for this role'
          : 'Unavailable right now',
      complete: false,
    };
  }

  return {
    key,
    label,
    countLabel: `${result.value.totalElements} configured`,
    complete: result.value.totalElements > 0,
  };
}

function summaryFromMileage(
  key: string,
  label: string,
  result: PromiseSettledResult<{ agencyDefault: unknown; branchOverrides: unknown[] }>,
): SetupModuleSummary {
  if (result.status === 'rejected') {
    return {
      key,
      label,
      countLabel:
        result.reason instanceof ApiError && result.reason.status === 403
          ? 'Restricted for this role'
          : 'Unavailable right now',
      complete: false,
    };
  }

  const configuredCount = (result.value.agencyDefault ? 1 : 0) + result.value.branchOverrides.length;
  return {
    key,
    label,
    countLabel: `${configuredCount} effective setting scope${configuredCount === 1 ? '' : 's'}`,
    complete: configuredCount > 0,
  };
}

function summaryFromBranches(
  key: string,
  label: string,
  result: PromiseSettledResult<Array<{ status: string }>>,
): SetupModuleSummary {
  if (result.status === 'rejected') {
    return {
      key,
      label,
      countLabel:
        result.reason instanceof ApiError && result.reason.status === 403
          ? 'Restricted for this role'
          : 'Unavailable right now',
      complete: false,
    };
  }

  const activeCount = result.value.filter((item) => item.status === 'ACTIVE').length;
  return {
    key,
    label,
    countLabel: `${activeCount} active branch${activeCount === 1 ? '' : 'es'}`,
    complete: activeCount > 0,
  };
}
