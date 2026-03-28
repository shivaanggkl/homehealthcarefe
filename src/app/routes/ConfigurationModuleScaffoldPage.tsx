import { useMemo } from 'react';
import { APP_ROUTES } from '../access/access-control';
import {
  ConfigurationFormScaffold,
  ConfigurationModuleCards,
  ConfigurationPageShell,
  ConfigurationPanel,
  ConfigurationTableScaffold,
  ConfigurationWorkspace,
} from '../components/ConfigurationFoundation';

type Props = {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  tableColumns: string[];
  tableRows: Array<{
    id: string;
    cells: string[];
    status: string;
    actionLabel: string;
  }>;
  searchPlaceholder: string;
  formTitle: string;
  formHelper: string;
  formFields: Array<{
    label: string;
    placeholder: string;
    type?: 'text' | 'textarea' | 'select';
    options?: string[];
  }>;
};

export function ConfigurationModuleScaffoldPage({
  path,
  eyebrow,
  title,
  description,
  tableColumns,
  tableRows,
  searchPlaceholder,
  formTitle,
  formHelper,
  formFields,
}: Props) {
  const siblingRoutes = useMemo(
    () =>
      APP_ROUTES.filter(
        (route) =>
          route.section === 'configuration' &&
          route.path !== path &&
          route.path.startsWith(path.split('/').slice(0, 4).join('/')),
      ),
    [path],
  );

  return (
    <ConfigurationPageShell eyebrow={eyebrow} title={title} description={description}>
      <ConfigurationWorkspace>
        <ConfigurationPanel
          title="Reusable list pattern"
          description="This module already uses the shared Epic 2 list/table scaffold for search, status filtering, and action placement."
        >
          <ConfigurationTableScaffold
            columns={tableColumns}
            emptyMessage="Future data from the backend API will render here without changing the surrounding UX pattern."
            emptyTitle="No records loaded in the scaffold."
            rows={tableRows}
            searchPlaceholder={searchPlaceholder}
          />
        </ConfigurationPanel>

        <ConfigurationPanel
          title="Reusable form pattern"
          description="Create and edit flows will reuse the same responsive form shell, success messaging, and destructive-action placement."
        >
          <ConfigurationFormScaffold
            fields={formFields}
            helper={formHelper}
            title={formTitle}
          />
        </ConfigurationPanel>

        {siblingRoutes.length > 0 ? (
          <ConfigurationPanel
            title="Related setup modules"
            description="Routes are grouped by domain so admins can move between related configuration areas quickly."
          >
            <ConfigurationModuleCards routes={siblingRoutes} />
          </ConfigurationPanel>
        ) : null}
      </ConfigurationWorkspace>
    </ConfigurationPageShell>
  );
}
