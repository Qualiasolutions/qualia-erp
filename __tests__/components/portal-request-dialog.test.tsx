import userEvent from '@testing-library/user-event';

import { createFeatureRequest } from '@/app/actions/client-requests';
import { PortalRequestDialog } from '@/components/portal/portal-request-dialog';
import { render, screen, waitFor } from '../utils/render';

jest.mock('@/app/actions/client-requests', () => ({
  createFeatureRequest: jest.fn(),
  uploadRequestAttachment: jest.fn(),
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

describe('PortalRequestDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createFeatureRequest as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'request-1' },
    });
  });

  it('submits new requests against the current project by default', async () => {
    const user = userEvent.setup();

    render(
      <PortalRequestDialog
        projects={[
          { id: 'project-1', name: 'First Project' },
          { id: 'project-2', name: 'Second Project' },
        ]}
        initialProjectId="project-2"
      />
    );

    await user.click(screen.getByRole('button', { name: /new request/i }));
    await user.type(screen.getByLabelText(/what’s on your mind/i), 'Update booking copy');
    await user.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => expect(createFeatureRequest).toHaveBeenCalledTimes(1));
    expect(createFeatureRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project-2',
        title: '[Feature] Update booking copy',
      })
    );
  });

  it('defaults to the only available project when there is no URL project context', async () => {
    const user = userEvent.setup();

    render(<PortalRequestDialog projects={[{ id: 'project-1', name: 'Only Project' }]} />);

    await user.click(screen.getByRole('button', { name: /new request/i }));
    await user.type(screen.getByLabelText(/what’s on your mind/i), 'Add a status note');
    await user.click(screen.getByRole('button', { name: /send request/i }));

    await waitFor(() => expect(createFeatureRequest).toHaveBeenCalledTimes(1));
    expect(createFeatureRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project-1',
      })
    );
  });
});
