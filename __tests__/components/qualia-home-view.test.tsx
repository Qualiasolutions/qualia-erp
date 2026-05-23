import { QualiaHomeView } from '@/components/portal/qualia-home-view';
import { render, screen } from '../utils/render';

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
  it('shows the current owner waiting-list follow-ups', () => {
    render(<QualiaHomeView role="admin" displayName="Fawzi Goussous" userId="owner-1" />);

    expect(screen.getByText('7Buddas - ask him to refill the form')).toBeInTheDocument();
    expect(
      screen.getByText('AI Expo / Maxim - remake the Health AI Expo website')
    ).toBeInTheDocument();
    expect(screen.getByText('Geo - close off officially what is happening')).toBeInTheDocument();
    expect(screen.getByText('Cellas - create proposal')).toBeInTheDocument();
  });
});
