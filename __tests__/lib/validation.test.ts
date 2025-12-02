import {
  createIssueSchema,
  updateIssueSchema,
  createProjectSchema,
  updateProjectSchema,
  createTeamSchema,
  createClientSchema,
  updateClientSchema,
  createMeetingSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createCommentSchema,
  parseFormData,
  validateData,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('createIssueSchema', () => {
    it('validates a valid issue', () => {
      const validIssue = {
        title: 'Test Issue',
        description: 'This is a test issue',
        status: 'Todo',
        priority: 'Medium',
        team_id: '123e4567-e89b-12d3-a456-426614174000',
        project_id: '123e4567-e89b-12d3-a456-426614174001',
        workspace_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = createIssueSchema.safeParse(validIssue);
      expect(result.success).toBe(true);
    });

    it('requires a title', () => {
      const invalidIssue = {
        description: 'No title provided',
      };

      const result = createIssueSchema.safeParse(invalidIssue);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('title');
      }
    });

    it('validates status enum', () => {
      const invalidStatus = {
        title: 'Test Issue',
        status: 'InvalidStatus',
      };

      const result = createIssueSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it('validates priority enum', () => {
      const invalidPriority = {
        title: 'Test Issue',
        priority: 'SuperHigh',
      };

      const result = createIssueSchema.safeParse(invalidPriority);
      expect(result.success).toBe(false);
    });

    it('allows optional fields to be null', () => {
      const minimalIssue = {
        title: 'Minimal Issue',
        description: null,
        team_id: null,
        project_id: null,
      };

      const result = createIssueSchema.safeParse(minimalIssue);
      expect(result.success).toBe(true);
    });
  });

  describe('updateIssueSchema', () => {
    it('requires an id', () => {
      const updateWithoutId = {
        title: 'Updated Title',
      };

      const result = updateIssueSchema.safeParse(updateWithoutId);
      expect(result.success).toBe(false);
    });

    it('validates with valid id', () => {
      const validUpdate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated Title',
      };

      const result = updateIssueSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe('createProjectSchema', () => {
    it('validates a valid project', () => {
      const validProject = {
        name: 'Test Project',
        description: 'This is a test project',
        status: 'active',
        team_id: '123e4567-e89b-12d3-a456-426614174000',
        target_date: '2024-12-31',
        project_group: 'active',
        workspace_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = createProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it('requires a name', () => {
      const invalidProject = {
        description: 'No name provided',
      };

      const result = createProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it('validates project_group enum', () => {
      const invalidGroup = {
        name: 'Test Project',
        project_group: 'invalid_group',
      };

      const result = createProjectSchema.safeParse(invalidGroup);
      expect(result.success).toBe(false);
    });
  });

  describe('createTeamSchema', () => {
    it('validates a valid team', () => {
      const validTeam = {
        name: 'Engineering',
        key: 'ENG',
        description: 'Engineering team',
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = createTeamSchema.safeParse(validTeam);
      expect(result.success).toBe(true);
    });

    it('requires name and key', () => {
      const invalidTeam = {
        description: 'Missing name and key',
      };

      const result = createTeamSchema.safeParse(invalidTeam);
      expect(result.success).toBe(false);
    });

    it('enforces key max length', () => {
      const longKey = {
        name: 'Test Team',
        key: 'THIS_KEY_IS_WAY_TOO_LONG',
      };

      const result = createTeamSchema.safeParse(longKey);
      expect(result.success).toBe(false);
    });
  });

  describe('createClientSchema', () => {
    it('validates a valid client', () => {
      const validClient = {
        display_name: 'Acme Corp',
        phone: '+1234567890',
        website: 'https://acme.com',
        billing_address: '123 Main St',
        lead_status: 'cold',
        notes: 'Initial contact',
        workspace_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = createClientSchema.safeParse(validClient);
      expect(result.success).toBe(true);
    });

    it('requires display_name', () => {
      const invalidClient = {
        phone: '+1234567890',
      };

      const result = createClientSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
    });

    it('validates lead_status enum', () => {
      const invalidStatus = {
        display_name: 'Test Client',
        lead_status: 'invalid_status',
      };

      const result = createClientSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });

    it('validates website URL format', () => {
      const invalidWebsite = {
        display_name: 'Test Client',
        website: 'not-a-valid-url',
      };

      const result = createClientSchema.safeParse(invalidWebsite);
      expect(result.success).toBe(false);
    });

    it('allows empty string for website', () => {
      const emptyWebsite = {
        display_name: 'Test Client',
        website: '',
      };

      const result = createClientSchema.safeParse(emptyWebsite);
      expect(result.success).toBe(true);
    });
  });

  describe('createMeetingSchema', () => {
    it('validates a valid meeting', () => {
      const validMeeting = {
        title: 'Team Standup',
        description: 'Daily standup meeting',
        start_time: '2024-12-15T09:00:00Z',
        end_time: '2024-12-15T09:30:00Z',
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        client_id: null,
        workspace_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = createMeetingSchema.safeParse(validMeeting);
      expect(result.success).toBe(true);
    });

    it('requires title and times', () => {
      const invalidMeeting = {
        description: 'Missing required fields',
      };

      const result = createMeetingSchema.safeParse(invalidMeeting);
      expect(result.success).toBe(false);
    });
  });

  describe('createMilestoneSchema', () => {
    it('validates a valid milestone', () => {
      const validMilestone = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'MVP Launch',
        description: 'Launch minimum viable product',
        target_date: '2024-12-31',
        color: '#00A4AC',
        status: 'not_started',
        workspace_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = createMilestoneSchema.safeParse(validMilestone);
      expect(result.success).toBe(true);
    });

    it('requires project_id and name', () => {
      const invalidMilestone = {
        description: 'Missing required fields',
      };

      const result = createMilestoneSchema.safeParse(invalidMilestone);
      expect(result.success).toBe(false);
    });

    it('validates status enum', () => {
      const invalidStatus = {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Milestone',
        status: 'invalid_status',
      };

      const result = createMilestoneSchema.safeParse(invalidStatus);
      expect(result.success).toBe(false);
    });
  });

  describe('createCommentSchema', () => {
    it('validates a valid comment', () => {
      const validComment = {
        issue_id: '123e4567-e89b-12d3-a456-426614174000',
        body: 'This is a comment',
      };

      const result = createCommentSchema.safeParse(validComment);
      expect(result.success).toBe(true);
    });

    it('requires issue_id and body', () => {
      const invalidComment = {
        body: 'Comment without issue',
      };

      const result = createCommentSchema.safeParse(invalidComment);
      expect(result.success).toBe(false);
    });
  });

  describe('parseFormData', () => {
    it('parses valid form data', () => {
      const formData = new FormData();
      formData.append('title', 'Test Issue');
      formData.append('description', 'A description');
      formData.append('status', 'Todo');
      formData.append('priority', 'Medium');

      const result = parseFormData(createIssueSchema, formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Test Issue');
      }
    });

    it('converts empty strings to null', () => {
      const formData = new FormData();
      formData.append('title', 'Test Issue');
      formData.append('description', '');
      formData.append('team_id', '');

      const result = parseFormData(createIssueSchema, formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeNull();
        expect(result.data.team_id).toBeNull();
      }
    });

    it('returns error for invalid data', () => {
      const formData = new FormData();
      // Missing required title
      formData.append('description', 'A description');

      const result = parseFormData(createIssueSchema, formData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('validateData', () => {
    it('validates plain objects', () => {
      const data = {
        title: 'Test Issue',
        status: 'Todo',
        priority: 'High',
      };

      const result = validateData(createIssueSchema, data);
      expect(result.success).toBe(true);
    });

    it('returns error for invalid objects', () => {
      const data = {
        status: 'InvalidStatus',
      };

      const result = validateData(createIssueSchema, data);
      expect(result.success).toBe(false);
    });
  });
});
