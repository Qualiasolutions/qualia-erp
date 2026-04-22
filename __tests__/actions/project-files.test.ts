export {};

/**
 * Tests for app/actions/project-files.ts
 * Covers: getProjectFiles, uploadProjectFile, deleteProjectFile, getFileDownloadUrl
 */

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/app/actions/activity-feed', () => ({
  createActivityLogEntry: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/email', () => ({
  notifyEmployeesOfClientFileUpload: jest.fn().mockResolvedValue(undefined),
}));

// Permission mocks — default: allow
const mockCanAccessProject = jest.fn().mockResolvedValue(true);
const mockCanDeleteProjectFile = jest.fn().mockResolvedValue(true);

jest.mock('@/app/actions/shared', () => ({
  canAccessProject: (...args: unknown[]) => mockCanAccessProject(...args),
  canDeleteProjectFile: (...args: unknown[]) => mockCanDeleteProjectFile(...args),
}));

jest.mock('@/lib/portal-utils', () => ({
  canAccessProject: jest.fn().mockResolvedValue(false),
}));

const storageUpload = jest.fn().mockResolvedValue({ data: {}, error: null });
const storageRemove = jest.fn().mockResolvedValue({ data: {}, error: null });
const storageCreateSignedUrl = jest
  .fn()
  .mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null });

const supabase = {
  from: jest.fn() as jest.Mock,
  auth: { getUser: jest.fn() as jest.Mock },
  storage: {
    from: jest.fn().mockReturnValue({
      upload: storageUpload,
      remove: storageRemove,
      createSignedUrl: storageCreateSignedUrl,
    }),
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(supabase),
}));

// ---- Imports ----
import {
  getProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  getFileDownloadUrl,
} from '@/app/actions/project-files';

// ---- Helpers ----

const PROJECT_ID = '11111111-1111-4111-8111-111111111111';
const FILE_ID = 'f-2222';
const USER_ID = 'u-3333';
const AUTH_USER = { id: USER_ID, email: 'dev@test.com' };

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
  ];
  const chain: Record<string, jest.Mock> = Object.fromEntries(methods.map((m) => [m, jest.fn()]));
  const promised = Object.assign(Promise.resolve(resolvedData), chain);
  Object.values(chain).forEach((fn) => fn.mockReturnValue(promised));
  return chain;
}

function mockAuth(user: typeof AUTH_USER | null = AUTH_USER) {
  supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
}

function makeFormData(overrides: Record<string, string | File> = {}): FormData {
  const fd = new FormData();
  const defaults: Record<string, string | File> = {
    file: new File(['hello'], 'test.pdf', { type: 'application/pdf' }),
    project_id: PROJECT_ID,
  };
  const merged = { ...defaults, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    fd.set(k, v);
  }
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth();
  mockCanAccessProject.mockResolvedValue(true);
  mockCanDeleteProjectFile.mockResolvedValue(true);
});

// ---- Tests ----

describe('getProjectFiles', () => {
  it('returns empty array when not authenticated', async () => {
    mockAuth(null);
    const result = await getProjectFiles(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('returns files on success', async () => {
    const files = [
      { id: FILE_ID, project_id: PROJECT_ID, name: 'doc.pdf', uploader: { id: USER_ID } },
    ];
    supabase.from.mockReturnValue(buildChain({ data: files, error: null }));
    const result = await getProjectFiles(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('doc.pdf');
  });

  it('returns empty array on DB error', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'fail' } }));
    const result = await getProjectFiles(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('returns empty array when access denied', async () => {
    mockCanAccessProject.mockResolvedValue(false);
    supabase.from.mockReturnValue(buildChain({ data: [], error: null }));
    const result = await getProjectFiles(PROJECT_ID);
    expect(result).toEqual([]);
  });
});

describe('uploadProjectFile', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await uploadProjectFile(makeFormData());
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when no file provided', async () => {
    const fd = new FormData();
    fd.set('project_id', PROJECT_ID);
    const result = await uploadProjectFile(fd);
    expect(result.success).toBe(false);
    expect(result.error).toContain('No file');
  });

  it('returns error when project_id missing', async () => {
    const fd = new FormData();
    fd.set('file', new File(['x'], 'a.pdf', { type: 'application/pdf' }));
    const result = await uploadProjectFile(fd);
    expect(result.success).toBe(false);
    // Zod reports a type/required error on missing project_id.
    expect(result.error).toBeTruthy();
  });

  it('rejects file exceeding 50MB', async () => {
    const bigBuf = new ArrayBuffer(50 * 1024 * 1024 + 1);
    const bigFile = new File([bigBuf], 'big.pdf', { type: 'application/pdf' });
    const result = await uploadProjectFile(makeFormData({ file: bigFile }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('50MB');
  });

  it('rejects disallowed MIME type', async () => {
    const badFile = new File(['x'], 'malware.exe', { type: 'application/x-msdownload' });
    const result = await uploadProjectFile(makeFormData({ file: badFile }));
    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('accepts allowed MIME types', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: { id: PROJECT_ID, workspace_id: 'ws-1' }, error: null })
    );
    const result = await uploadProjectFile(makeFormData());
    expect(result.success).toBe(true);
  });

  it('returns error when user lacks project access', async () => {
    supabase.from.mockReturnValue(
      buildChain({ data: { id: PROJECT_ID, workspace_id: 'ws-1' }, error: null })
    );
    mockCanAccessProject.mockResolvedValue(false);
    const result = await uploadProjectFile(makeFormData());
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });
});

describe('deleteProjectFile', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await deleteProjectFile(FILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns error when user lacks delete permission', async () => {
    mockCanDeleteProjectFile.mockResolvedValue(false);
    const result = await deleteProjectFile(FILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission');
  });

  it('deletes file successfully', async () => {
    supabase.from.mockReturnValue(
      buildChain({
        data: { id: FILE_ID, project_id: PROJECT_ID, storage_path: 'p/f.pdf' },
        error: null,
      })
    );
    const result = await deleteProjectFile(FILE_ID);
    expect(result.success).toBe(true);
    expect(supabase.storage.from).toHaveBeenCalledWith('project-files');
  });

  it('returns error when file not found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'not found' } }));
    const result = await deleteProjectFile(FILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

describe('getFileDownloadUrl', () => {
  it('returns error when not authenticated', async () => {
    mockAuth(null);
    const result = await getFileDownloadUrl(FILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('authenticated');
  });

  it('returns signed URL on success', async () => {
    // First call: file record lookup; second call: workspace membership check
    const fileData = {
      storage_path: 'p/f.pdf',
      original_name: 'f.pdf',
      workspace_id: 'ws-1',
      project_id: PROJECT_ID,
      is_client_visible: false,
    };
    const membershipChain = buildChain({ data: { id: 'm-1' }, error: null });
    const fileChain = buildChain({ data: fileData, error: null });

    supabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') return membershipChain;
      return fileChain;
    });

    const result = await getFileDownloadUrl(FILE_ID);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('url');
  });

  it('returns error when file not found', async () => {
    supabase.from.mockReturnValue(buildChain({ data: null, error: { message: 'missing' } }));
    const result = await getFileDownloadUrl(FILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns access denied when user has no membership', async () => {
    const fileData = {
      storage_path: 'p/f.pdf',
      original_name: 'f.pdf',
      workspace_id: 'ws-1',
      project_id: PROJECT_ID,
      is_client_visible: false,
    };
    const noMemberChain = buildChain({ data: null, error: null });
    const fileChain = buildChain({ data: fileData, error: null });

    supabase.from.mockImplementation((table: string) => {
      if (table === 'workspace_members') return noMemberChain;
      if (table === 'client_projects') return noMemberChain;
      return fileChain;
    });

    const result = await getFileDownloadUrl(FILE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain('denied');
  });
});
