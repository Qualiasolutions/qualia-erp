import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

// Mock workspace context
const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  slug: 'test-workspace',
};

// Wrapper with all providers
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}
    </ThemeProvider>
  );
}

// Custom render function
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  role: 'employee' as const,
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  status: 'active' as const,
  project_group: 'active' as const,
  team_id: 'test-team-id',
  lead_id: 'test-user-id',
  workspace_id: 'test-workspace-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockIssue = (overrides = {}) => ({
  id: 'test-issue-id',
  title: 'Test Issue',
  description: 'A test issue',
  status: 'Todo' as const,
  priority: 'Medium' as const,
  team_id: 'test-team-id',
  project_id: 'test-project-id',
  creator_id: 'test-user-id',
  workspace_id: 'test-workspace-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockTeam = (overrides = {}) => ({
  id: 'test-team-id',
  name: 'Test Team',
  key: 'TST',
  description: 'A test team',
  workspace_id: 'test-workspace-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockClient = (overrides = {}) => ({
  id: 'test-client-id',
  display_name: 'Test Client',
  phone: '+1234567890',
  website: 'https://example.com',
  billing_address: '123 Test St',
  lead_status: 'cold' as const,
  notes: 'Test notes',
  workspace_id: 'test-workspace-id',
  created_by: 'test-user-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockMeeting = (overrides = {}) => ({
  id: 'test-meeting-id',
  title: 'Test Meeting',
  description: 'A test meeting',
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 3600000).toISOString(),
  project_id: null,
  client_id: null,
  created_by: 'test-user-id',
  workspace_id: 'test-workspace-id',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockPhase = (overrides = {}) => ({
  id: 'test-phase-id',
  name: 'Test Phase',
  description: 'A test phase',
  helper_text: 'Test helper text',
  project_id: 'test-project-id',
  workspace_id: 'test-workspace-id',
  display_order: 0,
  status: 'not_started' as const,
  template_key: null,
  is_custom: false,
  created_by: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockPhaseItem = (overrides = {}) => ({
  id: 'test-phase-item-id',
  phase_id: 'test-phase-id',
  title: 'Test Phase Item',
  description: 'A test phase item',
  helper_text: 'Test item helper text',
  display_order: 0,
  is_completed: false,
  completed_at: null,
  completed_by: null,
  linked_issue_id: null,
  template_key: null,
  is_custom: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export { mockWorkspace };
