import userEvent from '@testing-library/user-event';

import { AdminRequestsBoard } from '@/components/portal/admin-requests-board';
import { render, screen, within } from '../utils/render';

jest.mock('@/app/actions/client-requests', () => ({
  updateFeatureRequest: jest.fn(),
}));

jest.mock('@/components/portal/request-detail-sheet', () => ({
  RequestDetailSheet: () => null,
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
  description: null,
  priority: 'medium',
  status: 'pending',
  admin_response: null,
  created_at: '2026-05-22T12:00:00.000Z',
  attachments: [],
  client: {
    id: 'client-1',
    full_name: 'Client User',
    email: 'client@example.com',
    avatar_url: null,
  },
  assigned_to: null,
  assignee: null,
};

function request(overrides: {
  id: string;
  title: string;
  project: { id: string; name: string; logo_url: string | null; client: null };
}) {
  return {
    ...baseRequest,
    ...overrides,
  };
}

describe('AdminRequestsBoard', () => {
  it('honors the initial project filter and can reset to all projects', async () => {
    const user = userEvent.setup();

    render(
      <AdminRequestsBoard
        requests={[
          request({
            id: 'request-1',
            title: 'First project request',
            project: { id: 'project-1', name: 'First Project', logo_url: null, client: null },
          }),
          request({
            id: 'request-2',
            title: 'Second project request',
            project: { id: 'project-2', name: 'Second Project', logo_url: null, client: null },
          }),
        ]}
        currentUserId="client-1"
        userRole="client"
        projects={[
          { id: 'project-1', name: 'First Project' },
          { id: 'project-2', name: 'Second Project' },
        ]}
        initialProjectId="project-2"
      />
    );

    const projectFilter = screen.getByRole('combobox', { name: /filter by project/i });
    expect(projectFilter).toHaveValue('project-2');
    expect(screen.getByText('Second project request')).toBeInTheDocument();
    expect(screen.queryByText('First project request')).not.toBeInTheDocument();

    await user.selectOptions(projectFilter, 'all');

    const pipeline = screen.getByRole('region', { name: /requests pipeline/i });
    expect(within(pipeline).getByText('First project request')).toBeInTheDocument();
    expect(within(pipeline).getByText('Second project request')).toBeInTheDocument();
  });
});
