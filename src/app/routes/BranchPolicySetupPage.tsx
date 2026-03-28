import { ConfigurationModuleScaffoldPage } from './ConfigurationModuleScaffoldPage';

export function BranchPolicySetupPage() {
  return (
    <ConfigurationModuleScaffoldPage
      description="Branch policies are the first branch-aware Epic 2 admin module. This placeholder keeps branch-specific policy work inside the shared setup architecture and highlights scope-sensitive behavior."
      eyebrow="Policy Setup"
      formFields={[
        { label: 'Branch', placeholder: 'Choose a branch', type: 'select', options: ['Chicago', 'Northwest'] },
        { label: 'Policy Key', placeholder: 'scheduling.window' },
        { label: 'Fallback Behavior', placeholder: 'Choose fallback behavior', type: 'select', options: ['Use branch override', 'Fallback to agency default'] },
        { label: 'Policy Payload', placeholder: 'Structured JSON payload', type: 'textarea' },
      ]}
      formHelper="Future branch-scope errors from the backend will surface in this pattern without changing the route or shell."
      formTitle="Branch policy form shell"
      path="/app/setup/policies/branches"
      searchPlaceholder="Search branch policies"
      tableColumns={['Policy Key', 'Branch', 'Mode', 'Status']}
      tableRows={[
        { id: 'window', cells: ['scheduling.window', 'Chicago', 'Branch Override', 'ACTIVE'], status: 'ACTIVE', actionLabel: 'Edit' },
      ]}
      title="Branch policies"
    />
  );
}
