import { fireEvent, render, screen, waitFor } from '../utils/render';
import { ProjectFilesPanel } from '@/components/project-files-panel';
import { getProjectFiles, uploadClientFile, uploadProjectFile } from '@/app/actions/project-files';

jest.mock('@/app/actions/project-files', () => ({
  deleteProjectFile: jest.fn(),
  getFileDownloadUrl: jest.fn(),
  getProjectFiles: jest.fn(),
  uploadClientFile: jest.fn(),
  uploadProjectFile: jest.fn(),
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

describe('ProjectFilesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProjectFiles as jest.Mock).mockResolvedValue([]);
    (uploadClientFile as jest.Mock).mockResolvedValue({ success: true });
    (uploadProjectFile as jest.Mock).mockResolvedValue({ success: true });
  });

  it('uses the client upload action for client-visible project file panels', async () => {
    const { container } = render(<ProjectFilesPanel projectId="project-1" isClient />);

    await waitFor(() =>
      expect(screen.getByText(/upload files you want the team to review/i)).toBeInTheDocument()
    );

    expect(screen.getByRole('button', { name: /upload client file/i })).toBeInTheDocument();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['brief'], 'brief.pdf', { type: 'application/pdf' })] },
    });

    await waitFor(() => expect(uploadClientFile).toHaveBeenCalledTimes(1));
    expect(uploadProjectFile).not.toHaveBeenCalled();
  });

  it('keeps employee project file panels read-only for uploads', async () => {
    render(<ProjectFilesPanel projectId="project-1" isClient={false} />);

    await waitFor(() => expect(screen.getByText(/upload briefs/i)).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
  });
});
