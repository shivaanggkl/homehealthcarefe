import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function ServiceLineSetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Service lines are the first shared catalog module in Epic 2. This scaffold establishes the common table, status, and edit-panel layout that later catalog screens will reuse."
      eyebrow="Catalog Setup"
      formFields={[
        { label: 'Name', placeholder: 'Private Duty' },
        { label: 'Code', placeholder: 'PD' },
        { label: 'Description', placeholder: 'Companion and personal care', type: 'textarea' },
      ]}
      formHelper="Conflict handling, validation, and deactivation messaging will plug into this exact pattern once the full CRUD screen is implemented."
      formTitle="Service line form shell"
      path="/app/setup/catalog/service-lines"
      searchPlaceholder="Search service lines"
      tableColumns={['Name', 'Code', 'Description', 'Status']}
      tableRows={[
        { id: 'pd', cells: ['Private Duty', 'PD', 'Companion and personal care', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
        { id: 'sn', cells: ['Skilled Nursing', 'SN', 'Clinical services', 'DRAFT'], status: 'INVITED', actionLabel: 'Review' },
      ]}
      title="Service line catalog"
    />
  );
}
