import { RequestDetailSheet } from '@/components/portal/request-detail-sheet';
import { render, screen } from '../utils/render';

jest.mock('@/app/actions/client-requests', () => ({
  updateFeatureRequest: jest.fn(),
  markFeatureRequestDone: jest.fn(),
  cancelFeatureRequest: jest.fn(),
  reopenCompletedRequest: jest.fn(),
  getRequestAttachmentUrl: jest.fn(),
  assignFeatureRequest: jest.fn(),
}));

jest.mock('@/components/portal/request-comment-thread', () => ({
  RequestCommentThread: () => null,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
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

const baseRequest = {
  id: 'request-1',
  title: 'Improve booking flow',
  description: 'Make the client booking flow clearer.',
  priority: 'medium',
  status: 'pending',
  admin_response: null,
  created_at: '2026-05-22T12:00:00.000Z',
  attachments: [],
  project: {
    id: 'project-1',
    name: '7 Buddhas',
    logo_url: null,
    client: { id: 'client-org-1', display_name: '7 Buddhas', logo_url: null },
  },
  client: {
    id: 'client-1',
    full_name: 'Ernst Potempa',
    email: 'ernst@example.com',
    avatar_url: null,
  },
  assigned_to: null,
  assignee: null,
};

function renderSheet(overrides = {}, currentUserId = 'employee-1') {
  return render(
    <RequestDetailSheet
      request={{ ...baseRequest, ...overrides }}
      userRole="employee"
      currentUserId={currentUserId}
      onClose={jest.fn()}
    />
  );
}

describe('RequestDetailSheet', () => {
  it('shows employee status actions only for the assigned owner', () => {
    renderSheet({
      assigned_to: 'employee-1',
      assignee: { id: 'employee-1', full_name: 'Assigned Owner', avatar_url: null },
    });

    expect(screen.getByRole('button', { name: /move to in progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as done/i })).toBeInTheDocument();
  });

  it('keeps unassigned employee-visible requests read-only for status changes', () => {
    renderSheet();

    expect(screen.queryByRole('button', { name: /move to in progress/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark as done/i })).not.toBeInTheDocument();
    expect(screen.getByText(/status is editable by the assigned owner/i)).toBeInTheDocument();
  });
});
