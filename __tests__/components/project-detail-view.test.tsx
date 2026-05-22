import userEvent from '@testing-library/user-event';

import { ProjectDetailView } from '@/app/(portal)/projects/[id]/project-detail-view';
import { render, screen } from '../utils/render';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('@/app/actions/projects', () => ({
  getProjectById: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
}));

jest.mock('@/app/actions/project-assignments', () => ({
  assignEmployeeToProject: jest.fn(),
  completeProjectAssignment: jest.fn(),
  removeAssignment: jest.fn(),
}));

jest.mock('@/lib/swr', () => ({
  useProjectAssignments: () => ({ assignments: [], isLoading: false }),
  invalidateProjectAssignments: jest.fn(),
}));

jest.mock('@/components/mobile-menu-button', () => ({
  MobileMenuButton: () => null,
}));

jest.mock('@/components/project-workflow', () => ({
  ProjectWorkflow: () => <div data-testid="project-workflow" />,
}));

jest.mock('@/components/project-resources', () => ({
  ProjectResources: () => <div data-testid="project-resources" />,
}));

jest.mock('@/components/project-files-panel', () => ({
  ProjectFilesPanel: ({ isClient }: { isClient: boolean }) => (
    <div data-testid="project-files-panel">{isClient ? 'client files' : 'staff files'}</div>
  ),
}));

jest.mock('@/components/project-brief-viewer', () => ({
  ProjectBriefViewer: () => <div data-testid="project-brief-viewer" />,
}));

jest.mock('@/components/portal/project-client-submissions-panel', () => ({
  ProjectClientSubmissionsPanel: () => <div data-testid="client-submissions" />,
}));

jest.mock('@/components/project-reports-panel', () => ({
  ProjectReportsPanel: () => <div data-testid="project-reports" />,
}));

jest.mock('@/components/logo-upload', () => ({
  LogoUpload: () => <div data-testid="logo-upload" />,
}));

jest.mock('@/components/project-integrations-display', () => ({
  ProjectIntegrationsDisplay: () => <div data-testid="project-integrations" />,
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

const project = {
  id: 'project-1',
  name: '7 Buddhas',
  description: 'Voice agent project',
  status: 'active',
  project_group: 'active',
  project_type: 'voice_agent',
  workspace_id: 'workspace-1',
  start_date: null,
  target_date: null,
  created_at: '2026-05-22T12:00:00.000Z',
  updated_at: '2026-05-22T12:00:00.000Z',
  logo_url: null,
  lead: null,
  team: null,
  client: { id: 'client-1', name: '7 Buddhas' },
  issues: [],
  issue_stats: { total: 0, done: 0 },
  metadata: { resources: [] },
};

describe('ProjectDetailView', () => {
  it('keeps files reachable in the mobile client project sheet', async () => {
    const user = userEvent.setup();

    render(
      <ProjectDetailView
        project={project}
        profiles={[]}
        clients={[]}
        userRole="client"
        clientSubmissions={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /open project info/i }));

    expect(screen.getByRole('tab', { name: /resources/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /requests/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /briefs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /reports/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /files/i }));

    expect(
      screen.getAllByTestId('project-files-panel').some((el) => el.textContent === 'client files')
    ).toBe(true);
  });
});
