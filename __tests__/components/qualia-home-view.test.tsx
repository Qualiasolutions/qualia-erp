import { QualiaHomeView } from '@/components/portal/qualia-home-view';
import { getDashboardNotes } from '@/app/actions/dashboard-notes';
import { render, screen, waitFor } from '../utils/render';

jest.mock('@/components/clock-gate-provider', () => ({
  useClockGate: () => ({ isGated: false, session: null, isLoading: false, workspaceId: null }),
}));

jest.mock('@/components/portal/employee-daily-tasks', () => ({
  EmployeeDailyTasks: () => null,
}));

jest.mock('@/components/portal/assignment-focus-card', () => ({
  AssignmentFocusCard: () => null,
}));

jest.mock('@/app/actions/dashboard-notes', () => ({
  getDashboardNotes: jest.fn(async () => []),
  createDashboardNote: jest.fn(async () => ({ success: true })),
  updateDashboardNote: jest.fn(async () => ({ success: true })),
  deleteDashboardNote: jest.fn(async () => ({ success: true })),
  togglePinNote: jest.fn(async () => ({ success: true })),
}));

jest.mock('@/lib/swr', () => ({
  useTodaysMeetings: () => ({ meetings: [] }),
  useEmployeeAssignments: () => ({ data: [] }),
  useNotifications: () => ({ notifications: [] }),
  useCurrentWorkspaceId: () => ({ workspaceId: 'workspace-1' }),
  useMilestonesDue: () => ({ milestones: [] }),
  useOpenRequestsCount: () => ({ count: 0 }),
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

  window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  window.cancelAnimationFrame = jest.fn();
});

describe('QualiaHomeView', () => {
  beforeEach(() => {
    (getDashboardNotes as jest.Mock).mockResolvedValue([]);
  });

  it('shows the current owner waiting-list follow-ups', () => {
    render(<QualiaHomeView role="admin" displayName="Fawzi Goussous" userId="owner-1" />);

    expect(screen.getByText('7Buddas - ask him to refill the form')).toBeInTheDocument();
    expect(
      screen.getByText('AI Expo / Maxim - remake the Health AI Expo website')
    ).toBeInTheDocument();
    expect(screen.getByText('Geo - close off officially what is happening')).toBeInTheDocument();
    expect(screen.getByText('Cellas - create proposal')).toBeInTheDocument();
  });

  it('loads dynamic owner dashboard notes', async () => {
    (getDashboardNotes as jest.Mock).mockResolvedValueOnce([
      {
        id: 'note-1',
        content: 'Keep Cellas proposal in front of me',
        author_id: 'owner-1',
        pinned: true,
        created_at: '2026-05-23T12:00:00.000Z',
        updated_at: '2026-05-23T12:00:00.000Z',
        author: null,
      },
    ]);

    render(<QualiaHomeView role="admin" displayName="Fawzi Goussous" userId="owner-1" />);

    await waitFor(() =>
      expect(screen.getByText('Keep Cellas proposal in front of me')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /unpin note/i })).toBeInTheDocument();
  });
});
