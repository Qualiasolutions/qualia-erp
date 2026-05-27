import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../utils/render';
import {
  QualiaProjectsGallery,
  type GalleryProject,
} from '@/components/portal/qualia-projects-gallery';

jest.mock('@/app/actions/projects', () => ({
  setProjectPipelineStage: jest.fn(async () => ({ success: true })),
  updateProjectStatus: jest.fn(async () => ({ success: true })),
  deleteProject: jest.fn(async () => ({ success: true })),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const finishedProject: GalleryProject = {
  id: 'project-finished-1',
  name: 'Finished Project',
  status: 'Done',
  start_date: null,
  target_date: null,
  project_type: 'web',
  client_id: 'client-1',
  client_name: 'Client',
  logo_url: null,
  issue_stats: { total: 4, done: 4 },
  roadmap_progress: 100,
  is_pre_production: false,
  team: [],
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

describe('QualiaProjectsGallery', () => {
  it('opens the status menu from a finished project row action', async () => {
    const user = userEvent.setup();

    render(<QualiaProjectsGallery projects={[finishedProject]} isAdmin expandTerminalGroups />);

    await user.click(screen.getByRole('button', { name: 'Move Finished Project' }));

    expect(screen.getByText('Move to stage')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Building/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Archived/i })).toBeInTheDocument();
  });
});
