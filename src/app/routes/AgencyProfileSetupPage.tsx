import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function AgencyProfileSetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Agency profile setup is the operational root of Epic 2. This scaffold keeps profile editing inside the shared setup area and uses the same card, form, and status language as the catalog modules."
      eyebrow="Agency Setup"
      formFields={[
        { label: 'Display Name', placeholder: 'North Star Home Care' },
        { label: 'Primary Phone', placeholder: '(312) 555-0101' },
        { label: 'Operations Email', placeholder: 'operations@northstar.example' },
        { label: 'Timezone', placeholder: 'Select a timezone', type: 'select', options: ['America/Chicago', 'America/New_York'] },
      ]}
      formHelper="Later Epic 2 work will wire this directly to the agency profile API. The shell is already ready for success, validation, and owner/admin access states."
      formTitle="Agency profile form shell"
      path="/app/setup/profile"
      searchPlaceholder="Search profile fields"
      tableColumns={['Field', 'Current Value', 'Status']}
      tableRows={[
        { id: 'display-name', cells: ['Display Name', 'North Star Home Care', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
        { id: 'timezone', cells: ['Timezone', 'America/Chicago', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
      ]}
      title="Agency profile setup"
    />
  );
}
