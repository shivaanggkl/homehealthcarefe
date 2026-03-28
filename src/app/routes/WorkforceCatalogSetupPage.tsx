import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function WorkforceCatalogSetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Workforce catalogs combine caregiver skills and certifications into one admin landing zone. The scaffold is tuned for small reusable records and conflict-aware edits."
      eyebrow="Workforce Setup"
      formFields={[
        { label: 'Catalog Type', placeholder: 'Choose a catalog type', type: 'select', options: ['Skill', 'Certification'] },
        { label: 'Name', placeholder: 'Dementia Care' },
        { label: 'Code', placeholder: 'DEM' },
        { label: 'Notes', placeholder: 'Reusable workforce definition', type: 'textarea' },
      ]}
      formHelper="This shared shell supports both skills and certifications without splitting the admin interaction model."
      formTitle="Workforce catalog form shell"
      path="/app/setup/workforce/catalogs"
      searchPlaceholder="Search skills or certifications"
      tableColumns={['Name', 'Type', 'Code', 'Status']}
      tableRows={[
        { id: 'skill-dem', cells: ['Dementia Care', 'Skill', 'DEM', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
        { id: 'cert-cpr', cells: ['CPR', 'Certification', 'CPR', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
      ]}
      title="Workforce catalogs"
    />
  );
}
