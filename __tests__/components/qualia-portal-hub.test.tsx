import { QualiaPortalHub } from '@/components/portal/qualia-portal-hub';
import { render, screen } from '../utils/render';

jest.mock('@/components/new-meeting-modal', () => ({
  NewMeetingModalControlled: () => null,
}));

const baseProps = {
  stats: {
    projectCount: 1,
    pendingRequests: 0,
  },
  recentActivity: [],
  isLoading: false,
  isError: false,
  clientId: 'client-1',
  displayName: 'Seven Buddhas',
  upcomingMeetings: [],
  upcomingInvoice: null,
  userRole: 'client' as const,
};

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

describe('QualiaPortalHub', () => {
  it('renders percentage progress from dashboard data without multiplying twice', () => {
    render(
      <QualiaPortalHub
        {...baseProps}
        projects={[
          {
            id: 'project-1',
            name: '7 Buddhas AI Front Desk',
            status: 'Active',
            project_type: 'voice_agent',
            progress: 50,
            totalPhases: 4,
            completedPhases: 2,
            currentPhase: 'Voice setup',
          },
        ]}
      />
    );

    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.queryByText('5000')).not.toBeInTheDocument();
  });

  it('still supports fractional progress from project gallery data', () => {
    render(
      <QualiaPortalHub
        {...baseProps}
        projects={[
          {
            id: 'project-1',
            name: '7 Buddhas AI Front Desk',
            status: 'Active',
            project_type: 'voice_agent',
            progress: 0.42,
            totalPhases: 5,
            completedPhases: 2,
            currentPhase: 'Voice setup',
          },
        ]}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('hides billing and request shortcuts when those client apps are disabled', () => {
    render(
      <QualiaPortalHub
        {...baseProps}
        enabledApps={['home', 'projects', 'files', 'settings']}
        projects={[]}
      />
    );

    expect(screen.queryByText(/open requests/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/upcoming invoice/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /start a conversation/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book a meeting/i })).toBeInTheDocument();
  });

  it('keeps billing and request shortcuts when those client apps are enabled', () => {
    render(
      <QualiaPortalHub
        {...baseProps}
        enabledApps={['home', 'projects', 'requests', 'billing', 'settings']}
        projects={[]}
        upcomingInvoice={{ dueDate: '2026-06-15', total: 1500, currency: 'EUR' }}
      />
    );

    expect(screen.getByText(/open requests/i)).toBeInTheDocument();
    expect(screen.getByText(/upcoming invoice/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view in billing/i })).toHaveAttribute(
      'href',
      '/billing'
    );
    expect(screen.getByRole('link', { name: /start a conversation/i })).toHaveAttribute(
      'href',
      '/requests'
    );
  });
});
