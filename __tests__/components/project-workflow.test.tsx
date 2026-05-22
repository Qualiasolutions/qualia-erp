import { ProjectWorkflow } from '@/components/project-workflow';
import { render, screen, waitFor } from '../utils/render';

jest.mock('@/app/actions/phases', () => ({
  getProjectPhases: jest.fn(async () => [
    {
      id: 'milestone-1',
      name: 'Milestone 1',
      description: null,
      status: 'in_progress',
      sort_order: 0,
      is_locked: false,
      milestone_number: 1,
      phase_type: 'milestone',
      plan_count: null,
      plans_completed: null,
      started_at: null,
      completed_at: null,
      github_synced_at: null,
    },
    {
      id: 'phase-1',
      name: 'Discovery',
      description: 'Understand client needs',
      status: 'in_progress',
      sort_order: 1,
      is_locked: false,
      milestone_number: 1,
      phase_type: 'phase',
      plan_count: 2,
      plans_completed: 1,
      started_at: null,
      completed_at: null,
      github_synced_at: null,
    },
  ]),
  createProjectPhase: jest.fn(),
  updateProjectPhase: jest.fn(),
  deleteProjectPhase: jest.fn(),
  loadQualiaFrameworkPipeline: jest.fn(),
}));

jest.mock('@/app/actions/github-planning-sync', () => ({
  syncPlanningFromGitHub: jest.fn(),
}));

jest.mock('@/app/actions/work-sessions', () => ({
  getSessionReportsForProject: jest.fn(async () => []),
}));

jest.mock('@/lib/swr', () => ({
  invalidateProjectPhases: jest.fn(),
}));

jest.mock('@/components/portal/briefs', () => ({
  ProjectBriefForm: () => null,
}));

jest.mock('@/components/phase-comments', () => ({
  PhaseComments: () => null,
}));

jest.mock('@/components/phase-items-list', () => ({
  PhaseItemsList: () => null,
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

describe('ProjectWorkflow', () => {
  it('keeps manual roadmap mutation controls admin-only', async () => {
    render(
      <ProjectWorkflow
        projectId="project-1"
        projectName="7 Buddhas"
        projectType="voice_agent"
        workspaceId="workspace-1"
        userRole="employee"
      />
    );

    await waitFor(() => expect(screen.getAllByText('Discovery').length).toBeGreaterThan(0));

    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add phase/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/edit stage/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete stage/i)).not.toBeInTheDocument();
  });
});
