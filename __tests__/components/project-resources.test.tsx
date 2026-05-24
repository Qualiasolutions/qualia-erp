import { ProjectResources } from '@/components/project-resources';
import { render, screen } from '../utils/render';

jest.mock('@/app/actions/projects', () => ({
  updateProject: jest.fn(),
  getProjectById: jest.fn(),
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

const resources = [
  {
    id: 'resource-1',
    type: 'other',
    label: 'Client preview',
    url: 'https://preview.example.com',
  },
];

describe('ProjectResources', () => {
  it('renders resources read-only unless management is explicitly enabled', () => {
    render(<ProjectResources projectId="project-1" initialResources={resources} />);

    expect(screen.getByText('Client preview')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open resource in new tab/i })).toHaveAttribute(
      'href',
      'https://preview.example.com'
    );
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete resource/i })).not.toBeInTheDocument();
  });

  it('shows add and delete controls for admin-managed resource panels', () => {
    render(<ProjectResources projectId="project-1" initialResources={resources} canManage />);

    expect(screen.getByRole('button', { name: /^add$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete resource/i })).toBeInTheDocument();
  });
});
