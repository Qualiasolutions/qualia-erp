import userEvent from '@testing-library/user-event';

import { AdminClientFormLinkDialog } from '@/components/portal/admin-client-form-link-dialog';
import { render, screen } from '../utils/render';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

const writeTextMock = jest.fn(async () => undefined);

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

  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: writeTextMock,
    },
  });
});

beforeEach(() => {
  writeTextMock.mockClear();
});

describe('AdminClientFormLinkDialog', () => {
  it('creates a copyable client brief form link for the selected project', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });

    render(
      <AdminClientFormLinkDialog
        projects={[
          { id: 'project-1', name: '7 Buddhas' },
          { id: 'project-2', name: 'Cellas' },
        ]}
      />
    );

    await user.click(screen.getByRole('button', { name: /client form/i }));
    await user.selectOptions(screen.getByLabelText(/project/i), 'project-2');

    expect(screen.getByDisplayValue('/projects/project-2?brief=1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copy/i }));

    expect(writeTextMock).toHaveBeenCalledWith('http://localhost/projects/project-2?brief=1');
  });
});
