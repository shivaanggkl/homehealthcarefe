import { APP_ROUTES } from '../access/access-control';
import { useAccess } from '../access/access-context';
import {
  ConfigurationModuleCards,
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

export function SetupOverviewPage() {
  const { profile } = useAccess();
  const configurationRoutes = APP_ROUTES.filter((route) => route.section === 'configuration');
  const visibleModules = configurationRoutes.filter((route) =>
    profile.permissions.includes(route.permission),
  );

  return (
    <ConfigurationPageShell
      eyebrow="Epic 2 Foundation"
      title="Agency setup and configuration"
      description="This shared setup hub groups Epic 2 configuration modules by domain, keeps route access aligned to backend permissions, and gives every future setup screen a consistent shell."
    >
      <ConfigurationWorkspace>
        <ConfigurationPanel
          title="Setup navigation model"
          description="Epic 2 lives in its own setup area instead of being scattered across unrelated admin screens."
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
          </div>
        </ConfigurationPanel>

        <ConfigurationPanel
          title="Module routes"
          description="Each card is already permission-gated and ready for the corresponding Epic 2 screen implementation."
        >
          <ConfigurationModuleCards routes={visibleModules} />
        </ConfigurationPanel>
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
