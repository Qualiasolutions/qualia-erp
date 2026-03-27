export {};

/**
 * Tests for app/actions/pipeline.ts
 * Covers: getPhaseResources, createPhaseResource, updatePhaseResource, deletePhaseResource,
 *         getProjectNotes, getAllProjectNotes, createProjectNote, updateProjectNote, deleteProjectNote,
 *         initializeProjectPipeline, updatePhaseStatus, updatePhaseName, deletePhase,
 *         createPhase, getProjectPhasesWithDetails, resetAllPhaseTasks, linkTasksToPhases
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions/shared', () => ({
  isUserAdmin: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/gsd-templates', () => ({
  getTemplateForType: jest.fn().mockReturnValue({
    phases: [
      {
        name: 'SETUP',
        description: 'Setup phase',
        prompt: 'Setup prompt',
        tasks: [{ title: 'Task 1', helperText: 'Helper 1' }],
      },
      {
        name: 'DESIGN',
        description: 'Design phase',
        prompt: 'Design prompt',
        tasks: [{ title: 'Task 2', helperText: 'Helper 2' }],
      },
    ],
  }),
  WEB_DESIGN_TEMPLATE: {
    phases: [
      {
        name: 'SETUP',
        description: 'Setup phase',
        tasks: [{ title: 'Task 1' }],
      },
    ],
  },
}));

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: { getUser: jest.fn() as jest.Mock },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
}));

// ---- Imports ----
import {
  getPhaseResources,
  createPhaseResource,
  updatePhaseResource,
  deletePhaseResource,
  getProjectNotes,
  getAllProjectNotes,
  createProjectNote,
  updateProjectNote,
  deleteProjectNote,
  initializeProjectPipeline,
  updatePhaseStatus,
  updatePhaseName,
  deletePhase,
  createPhase,
  getProjectPhasesWithDetails,
  resetAllPhaseTasks,
  linkTasksToPhases,
} from '@/app/actions/pipeline';
import { isUserAdmin } from '@/app/actions/shared';

// ---- Helpers ----

const PROJECT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const PHASE_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const WS_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const RESOURCE_ID = 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const NOTE_ID = 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const AUTH_USER = { id: USER_ID, email: 'user@test.com' };

function buildChain(resolvedData: { data: unknown; error: unknown } = { data: null, error: null }) {
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'in',
    'is',
    'not',
    'order',
    'limit',
    'single',
    'maybeSingle',
    'upsert',
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => {
    fn.mockReturnValue(promised);
  });
  return chain;
}

function mockAuth(user: typeof AUTH_USER | null = AUTH_USER) {
  supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
  const { isUserAdmin: mockIsAdmin } = jest.requireMock('@/app/actions/shared');
  (mockIsAdmin as jest.Mock).mockResolvedValue(true);
  const { getTemplateForType: mockGetTemplate } = jest.requireMock('@/lib/gsd-templates');
  (mockGetTemplate as jest.Mock).mockReturnValue({
    phases: [
      {
        name: 'SETUP',
        description: 'Setup phase',
        prompt: 'Setup prompt',
        tasks: [{ title: 'Task 1', helperText: 'Helper 1' }],
      },
      {
        name: 'DESIGN',
        description: 'Design phase',
        prompt: 'Design prompt',
        tasks: [{ title: 'Task 2', helperText: 'Helper 2' }],
      },
    ],
  });
});

// ---- Tests ----

describe('getPhaseResources', () => {
  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getPhaseResources(PHASE_ID);
    expect(result).toEqual([]);
  });

  it('returns list of resources', async () => {
    const mockResources = [
      {
        id: RESOURCE_ID,
        phase_id: PHASE_ID,
        title: 'Figma Link',
        url: 'https://figma.com',
        description: null,
        resource_type: 'figma',
        display_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        created_by: USER_ID,
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: mockResources, error: null }));
    const result = await getPhaseResources(PHASE_ID);
    expect(result).toHaveLength(1);
    expect(result[0].resource_type).toBe('figma');
  });
});

describe('createPhaseResource', () => {
  it('creates resource successfully', async () => {
    const existingData: unknown[] = [];
    const newResource = {
      id: RESOURCE_ID,
      phase_id: PHASE_ID,
      title: 'New Resource',
      url: 'https://example.com',
      resource_type: 'link',
      display_order: 0,
    };
    supabase.from
      .mockReturnValueOnce(buildChain({ data: existingData, error: null }))
      .mockReturnValue(buildChain({ data: newResource, error: null }));

    const result = await createPhaseResource(PHASE_ID, {
      title: 'New Resource',
      url: 'https://example.com',
    });
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));

    const result = await createPhaseResource(PHASE_ID, { title: 'Broken' });
    expect(result.success).toBe(false);
  });
});

describe('updatePhaseResource', () => {
  it('updates resource successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await updatePhaseResource(RESOURCE_ID, { title: 'Updated Title' });
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updatePhaseResource(RESOURCE_ID, { title: 'Updated' });
    expect(result.success).toBe(false);
  });
});

describe('deletePhaseResource', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deletePhaseResource(RESOURCE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('deletes resource successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deletePhaseResource(RESOURCE_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deletePhaseResource(RESOURCE_ID);
    expect(result.success).toBe(false);
  });
});

describe('getProjectNotes', () => {
  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getProjectNotes(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('returns normalized notes with profile FK resolved', async () => {
    const rawNotes = [
      {
        id: NOTE_ID,
        project_id: PROJECT_ID,
        workspace_id: WS_ID,
        content: 'Test note',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: USER_ID,
        profile: [{ full_name: 'Fawzi', avatar_url: null, email: 'f@q.com' }],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawNotes, error: null }));
    const result = await getProjectNotes(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].profile)).toBe(false);
  });
});

describe('getAllProjectNotes', () => {
  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getAllProjectNotes(WS_ID);
    expect(result).toEqual([]);
  });

  it('returns normalized notes with project FK resolved', async () => {
    const rawNotes = [
      {
        id: NOTE_ID,
        project_id: PROJECT_ID,
        workspace_id: WS_ID,
        content: 'Note content',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: USER_ID,
        profile: [{ full_name: 'Fawzi', avatar_url: null, email: 'f@q.com' }],
        project: [{ id: PROJECT_ID, name: 'Test Project' }],
      },
    ];
    supabase.from.mockReturnValue(buildChain({ data: rawNotes, error: null }));
    const result = await getAllProjectNotes(WS_ID);
    expect(result).toHaveLength(1);
    expect(Array.isArray(result[0].profile)).toBe(false);
    expect(Array.isArray(result[0].project)).toBe(false);
  });
});

describe('createProjectNote', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await createProjectNote(PROJECT_ID, WS_ID, 'Test content');
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('creates note successfully', async () => {
    const newNote = {
      id: NOTE_ID,
      content: 'Test content',
      profile: [{ full_name: 'Fawzi', avatar_url: null, email: 'f@q.com' }],
    };
    supabase.from.mockReturnValue(buildChain({ data: newNote, error: null }));
    const result = await createProjectNote(PROJECT_ID, WS_ID, 'Test content');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));
    const result = await createProjectNote(PROJECT_ID, WS_ID, 'Test');
    expect(result.success).toBe(false);
  });
});

describe('updateProjectNote', () => {
  it('updates note successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await updateProjectNote(NOTE_ID, 'Updated content');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updateProjectNote(NOTE_ID, 'Updated');
    expect(result.success).toBe(false);
  });
});

describe('deleteProjectNote', () => {
  it('deletes note successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deleteProjectNote(NOTE_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Delete failed' } }));
    const result = await deleteProjectNote(NOTE_ID);
    expect(result.success).toBe(false);
  });
});

describe('initializeProjectPipeline', () => {
  it('returns success with message when pipeline already initialized', async () => {
    supabase.from.mockReturnValue(buildChain({ data: [{ id: PHASE_ID }], error: null }));
    const result = await initializeProjectPipeline(PROJECT_ID);
    expect(result.success).toBe(true);
    expect((result.data as { message: string }).message).toContain('already initialized');
  });

  it('returns error when project not found', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: [], error: null })) // no existing phases
      .mockReturnValue(buildChain({ data: null, error: null })); // project not found

    const result = await initializeProjectPipeline(PROJECT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns error when phases creation fails', async () => {
    const projectData = { workspace_id: WS_ID, project_type: 'web_design' };

    supabase.from
      .mockReturnValueOnce(buildChain({ data: [], error: null })) // check existing phases
      .mockReturnValueOnce(buildChain({ data: projectData, error: null })) // get project
      .mockReturnValue(buildChain({ data: null, error: { message: 'Insert phases failed' } })); // insert phases fails

    const result = await initializeProjectPipeline(PROJECT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('phases');
  });

  it('creates phases and tasks successfully', async () => {
    const projectData = { workspace_id: WS_ID, project_type: 'web_design' };
    const createdPhases = [
      { id: PHASE_ID, name: 'SETUP', display_order: 1 },
      { id: 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'DESIGN', display_order: 2 },
    ];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: [], error: null })) // check existing phases
      .mockReturnValueOnce(buildChain({ data: projectData, error: null })) // get project
      .mockReturnValueOnce(buildChain({ data: createdPhases, error: null })) // insert phases
      .mockReturnValue(buildChain({ data: null, error: null })); // remaining calls

    const result = await initializeProjectPipeline(PROJECT_ID);
    expect(result.success).toBe(true);
  });
});

describe('updatePhaseStatus', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await updatePhaseStatus(PHASE_ID, 'in_progress', PROJECT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('updates phase status successfully', async () => {
    supabase.from
      .mockReturnValueOnce(
        buildChain({ data: { status: 'not_started', name: 'SETUP' }, error: null })
      )
      .mockReturnValue(buildChain({ data: null, error: null }));

    const result = await updatePhaseStatus(PHASE_ID, 'in_progress', PROJECT_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from
      .mockReturnValueOnce(
        buildChain({ data: { status: 'not_started', name: 'SETUP' }, error: null })
      )
      .mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));

    const result = await updatePhaseStatus(PHASE_ID, 'completed', PROJECT_ID);
    expect(result.success).toBe(false);
  });
});

describe('updatePhaseName', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await updatePhaseName(PHASE_ID, 'New Name', PROJECT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('updates phase name successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await updatePhaseName(PHASE_ID, 'New Phase Name', PROJECT_ID);
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'Update failed' } }));
    const result = await updatePhaseName(PHASE_ID, 'New Name', PROJECT_ID);
    expect(result.success).toBe(false);
  });
});

describe('deletePhase', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deletePhase(PHASE_ID, PROJECT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('deletes phase and linked tasks/resources successfully', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await deletePhase(PHASE_ID, PROJECT_ID);
    expect(result.success).toBe(true);
  });

  it('returns error when task deletion fails', async () => {
    supabase.from.mockReturnValueOnce(
      buildChain({ data: null, error: { message: 'Delete tasks failed' } })
    );

    const result = await deletePhase(PHASE_ID, PROJECT_ID);
    expect(result.success).toBe(false);
  });
});

describe('createPhase', () => {
  it('creates phase successfully', async () => {
    const existingPhases = [{ sort_order: 2 }];
    const newPhase = {
      id: PHASE_ID,
      project_id: PROJECT_ID,
      name: 'New Phase',
      sort_order: 3,
      status: 'not_started',
    };
    supabase.from
      .mockReturnValueOnce(buildChain({ data: existingPhases, error: null }))
      .mockReturnValue(buildChain({ data: newPhase, error: null }));

    const result = await createPhase(PROJECT_ID, 'New Phase', 'Description');
    expect(result.success).toBe(true);
    expect((result.data as { name: string }).name).toBe('New Phase');
  });

  it('creates phase as first when no existing phases', async () => {
    const newPhase = { id: PHASE_ID, project_id: PROJECT_ID, name: 'First Phase', sort_order: 1 };
    supabase.from
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValue(buildChain({ data: newPhase, error: null }));

    const result = await createPhase(PROJECT_ID, 'First Phase');
    expect(result.success).toBe(true);
  });

  it('returns error on DB failure', async () => {
    supabase.from
      .mockReturnValueOnce(buildChain({ data: [], error: null }))
      .mockReturnValue(buildChain({ data: null, error: { message: 'Insert failed' } }));

    const result = await createPhase(PROJECT_ID, 'New Phase');
    expect(result.success).toBe(false);
  });
});

describe('getProjectPhasesWithDetails', () => {
  it('returns empty array on phases DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await getProjectPhasesWithDetails(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('returns phases with computed task counts and progress', async () => {
    const phases = [
      {
        id: PHASE_ID,
        project_id: PROJECT_ID,
        name: 'SETUP',
        description: null,
        status: 'in_progress',
        sort_order: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_locked: false,
        helper_text: null,
        template_key: null,
      },
    ];
    const tasks = [
      { phase_id: PHASE_ID, status: 'Done' },
      { phase_id: PHASE_ID, status: 'Todo' },
    ];
    const resources = [{ phase_id: PHASE_ID }];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: phases, error: null }))
      .mockReturnValueOnce(buildChain({ data: tasks, error: null }))
      .mockReturnValue(buildChain({ data: resources, error: null }));

    const result = await getProjectPhasesWithDetails(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].task_count).toBe(2);
    expect(result[0].completed_task_count).toBe(1);
    expect(result[0].progress).toBe(50);
    expect(result[0].resource_count).toBe(1);
  });
});

describe('resetAllPhaseTasks', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await resetAllPhaseTasks();
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when not admin', async () => {
    (isUserAdmin as jest.Mock).mockResolvedValueOnce(false);
    const result = await resetAllPhaseTasks();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Admin');
  });

  it('returns success with message when no phases found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));
    const result = await resetAllPhaseTasks();
    expect(result.success).toBe(true);
    expect((result.data as { message: string }).message).toContain('No phases');
  });

  it('returns error when fetching phases fails', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await resetAllPhaseTasks();
    expect(result.success).toBe(false);
  });
});

describe('getProjectPhasesWithDetails (additional)', () => {
  it('handles phases with no tasks and returns 0% progress', async () => {
    const phases = [
      {
        id: PHASE_ID,
        project_id: PROJECT_ID,
        name: 'SETUP',
        description: null,
        status: 'not_started',
        sort_order: 1,
        created_at: '2024-01-01T00:00:00Z',
        is_locked: false,
        helper_text: null,
        template_key: null,
      },
    ];
    supabase.from
      .mockReturnValueOnce(buildChain({ data: phases, error: null }))
      .mockReturnValueOnce(buildChain({ data: [], error: null })) // no tasks
      .mockReturnValue(buildChain({ data: [], error: null })); // no resources

    const result = await getProjectPhasesWithDetails(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].progress).toBe(0);
    expect(result[0].task_count).toBe(0);
    expect(result[0].resource_count).toBe(0);
  });
});

describe('updatePhaseStatus (completed notification path)', () => {
  it('calls notification for completed status change', async () => {
    supabase.from
      .mockReturnValueOnce(
        buildChain({ data: { status: 'in_progress', name: 'DESIGN' }, error: null })
      )
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // updatePhaseStatus
      .mockReturnValue(buildChain({ data: { full_name: 'Fawzi' }, error: null })); // profile fetch

    const result = await updatePhaseStatus(PHASE_ID, 'completed', PROJECT_ID);
    expect(result.success).toBe(true);
  });
});

describe('linkTasksToPhases', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await linkTasksToPhases();
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when not admin', async () => {
    (isUserAdmin as jest.Mock).mockResolvedValueOnce(false);
    const result = await linkTasksToPhases();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Admin');
  });

  it('returns success when no unlinked tasks found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));
    const result = await linkTasksToPhases();
    expect(result.success).toBe(true);
    expect((result.data as { message: string }).message).toContain('No unlinked');
  });

  it('returns error when fetching unlinked tasks fails', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'DB error' } }));
    const result = await linkTasksToPhases();
    expect(result.success).toBe(false);
  });

  it('links unlinked tasks to phases and returns count', async () => {
    const unlinkedTasks = [{ id: 'task-1', project_id: PROJECT_ID, phase_name: 'SETUP' }];
    const phases = [{ id: PHASE_ID, project_id: PROJECT_ID, name: 'SETUP' }];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: unlinkedTasks, error: null })) // get unlinked tasks
      .mockReturnValueOnce(buildChain({ data: phases, error: null })) // get all phases
      .mockReturnValue(buildChain({ data: null, error: null })); // update task

    const result = await linkTasksToPhases();
    expect(result.success).toBe(true);
    const data = result.data as { tasksLinked: number };
    expect(data.tasksLinked).toBe(1);
  });
});

describe('resetAllPhaseTasks (with phases and tasks)', () => {
  it('resets tasks for found phases', async () => {
    const phases = [{ id: PHASE_ID, name: 'SETUP', project_id: PROJECT_ID }];
    const projects = [{ id: PROJECT_ID, workspace_id: WS_ID }];

    supabase.from
      .mockReturnValueOnce(buildChain({ data: phases, error: null })) // get all phases
      .mockReturnValueOnce(buildChain({ data: projects, error: null })) // get projects
      .mockReturnValueOnce(buildChain({ data: null, error: null })) // delete tasks
      .mockReturnValue(buildChain({ data: null, error: null })); // insert tasks

    const result = await resetAllPhaseTasks();
    expect(result.success).toBe(true);
    const data = result.data as { phasesUpdated: number };
    expect(data.phasesUpdated).toBe(1);
  });
});
