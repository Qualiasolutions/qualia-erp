import { QualiaSidebar } from '@/components/portal/qualia-sidebar';
import { render, screen } from '../utils/render';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <span data-src={src} aria-label={alt || undefined} className={className} />
  ),
}));

jest.mock('@/components/clock-gate-provider', () => ({
  useClockGate: () => ({ isGated: false, session: null, isLoading: false, workspaceId: null }),
}));

jest.mock('@/lib/swr', () => ({
  invalidateActiveSession: jest.fn(),
  invalidateTodaysSessions: jest.fn(),
}));

jest.mock('@/components/today-dashboard/clock-in-modal', () => ({
  ClockInModal: () => null,
}));

jest.mock('@/components/clock-out-modal', () => ({
  ClockOutModal: () => null,
}));

jest.mock('@/components/portal/view-as-dialog', () => ({
  ViewAsDialog: () => null,
}));

jest.mock('@/components/portal/qualia-tweaks-panel', () => ({
  QualiaTweaksPanel: () => null,
}));

const baseProps = {
  displayName: 'Seven Buddhas',
  displayEmail: 'client@example.com',
  isAdminViewing: false,
  userRole: 'client',
  userId: 'client-1',
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

describe('QualiaSidebar', () => {
  it('shows Files in the client navigation when the files app is enabled', () => {
    render(
      <QualiaSidebar
        {...baseProps}
        enabledApps={['home', 'projects', 'files', 'requests', 'billing', 'settings']}
      />
    );

    expect(screen.getAllByRole('link', { name: /files/i })[0]).toHaveAttribute('href', '/files');
  });

  it('hides Files in the client navigation when the files app is disabled', () => {
    render(
      <QualiaSidebar
        {...baseProps}
        enabledApps={['home', 'projects', 'requests', 'billing', 'settings']}
      />
    );

    expect(screen.queryByRole('link', { name: /files/i })).not.toBeInTheDocument();
  });
});
