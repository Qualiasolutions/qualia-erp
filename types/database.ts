export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          actor_id: string | null;
          comment_id: string | null;
          created_at: string | null;
          id: string;
          issue_id: string | null;
          meeting_id: string | null;
          metadata: Json | null;
          project_id: string | null;
          team_id: string | null;
          type: Database['public']['Enums']['activity_type'];
          workspace_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          comment_id?: string | null;
          created_at?: string | null;
          id?: string;
          issue_id?: string | null;
          meeting_id?: string | null;
          metadata?: Json | null;
          project_id?: string | null;
          team_id?: string | null;
          type: Database['public']['Enums']['activity_type'];
          workspace_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          comment_id?: string | null;
          created_at?: string | null;
          id?: string;
          issue_id?: string | null;
          meeting_id?: string | null;
          metadata?: Json | null;
          project_id?: string | null;
          team_id?: string | null;
          type?: Database['public']['Enums']['activity_type'];
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      client_activities: {
        Row: {
          client_id: string;
          created_at: string | null;
          created_by: string | null;
          description: string;
          id: string;
          metadata: Json | null;
          type: string;
        };
        Insert: {
          client_id: string;
          created_at?: string | null;
          created_by?: string | null;
          description: string;
          id?: string;
          metadata?: Json | null;
          type: string;
        };
        Update: {
          client_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string;
          id?: string;
          metadata?: Json | null;
          type?: string;
        };
        Relationships: [];
      };
      client_contacts: {
        Row: {
          client_id: string;
          created_at: string | null;
          email: string | null;
          id: string;
          is_primary: boolean | null;
          name: string;
          phone: string | null;
          position: string | null;
        };
        Insert: {
          client_id: string;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          is_primary?: boolean | null;
          name: string;
          phone?: string | null;
          position?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          is_primary?: boolean | null;
          name?: string;
          phone?: string | null;
          position?: string | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          assigned_to: string | null;
          billing_address: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          display_name: string | null;
          id: string;
          last_contacted_at: string | null;
          lead_status: Database['public']['Enums']['lead_status'] | null;
          logo_url: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string | null;
          website: string | null;
          workspace_id: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          billing_address?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_name?: string | null;
          id?: string;
          last_contacted_at?: string | null;
          lead_status?: Database['public']['Enums']['lead_status'] | null;
          logo_url?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string | null;
          website?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          billing_address?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_name?: string | null;
          id?: string;
          last_contacted_at?: string | null;
          lead_status?: Database['public']['Enums']['lead_status'] | null;
          logo_url?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string | null;
          website?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          body: string;
          created_at: string | null;
          id: string;
          issue_id: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          id?: string;
          issue_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          id?: string;
          issue_id?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          content: string;
          created_at: string | null;
          embedding: string | null;
          id: string;
          metadata: Json | null;
          title: string;
          updated_at: string | null;
          url: string | null;
          workspace_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          title: string;
          updated_at?: string | null;
          url?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          title?: string;
          updated_at?: string | null;
          url?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      issue_assignees: {
        Row: {
          assigned_at: string | null;
          assigned_by: string | null;
          id: string;
          issue_id: string;
          profile_id: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          id?: string;
          issue_id: string;
          profile_id: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          id?: string;
          issue_id?: string;
          profile_id?: string;
        };
        Relationships: [];
      };
      issues: {
        Row: {
          created_at: string | null;
          creator_id: string | null;
          description: string | null;
          id: string;
          parent_id: string | null;
          priority: Database['public']['Enums']['issue_priority'] | null;
          project_id: string | null;
          sort_order: number | null;
          status: Database['public']['Enums']['issue_status'] | null;
          team_id: string | null;
          title: string;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          id?: string;
          parent_id?: string | null;
          priority?: Database['public']['Enums']['issue_priority'] | null;
          project_id?: string | null;
          sort_order?: number | null;
          status?: Database['public']['Enums']['issue_status'] | null;
          team_id?: string | null;
          title: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          id?: string;
          parent_id?: string | null;
          priority?: Database['public']['Enums']['issue_priority'] | null;
          project_id?: string | null;
          sort_order?: number | null;
          status?: Database['public']['Enums']['issue_status'] | null;
          team_id?: string | null;
          title?: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      meeting_attendees: {
        Row: {
          created_at: string | null;
          id: string;
          meeting_id: string;
          profile_id: string;
          status: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          meeting_id: string;
          profile_id: string;
          status?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          meeting_id?: string;
          profile_id?: string;
          status?: string | null;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          client_id: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          end_time: string;
          id: string;
          project_id: string | null;
          start_time: string;
          title: string;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_time: string;
          id?: string;
          project_id?: string | null;
          start_time: string;
          title: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          client_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          end_time?: string;
          id?: string;
          project_id?: string | null;
          start_time?: string;
          title?: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      milestone_issues: {
        Row: {
          added_at: string | null;
          added_by: string | null;
          issue_id: string;
          milestone_id: string;
        };
        Insert: {
          added_at?: string | null;
          added_by?: string | null;
          issue_id: string;
          milestone_id: string;
        };
        Update: {
          added_at?: string | null;
          added_by?: string | null;
          issue_id?: string;
          milestone_id?: string;
        };
        Relationships: [];
      };
      milestones: {
        Row: {
          color: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          display_order: number | null;
          id: string;
          name: string;
          progress: number | null;
          project_id: string;
          status: string;
          target_date: string;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_order?: number | null;
          id?: string;
          name: string;
          progress?: number | null;
          project_id: string;
          status?: string;
          target_date: string;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_order?: number | null;
          id?: string;
          name?: string;
          progress?: number | null;
          project_id?: string;
          status?: string;
          target_date?: string;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          job_title: string | null;
          location: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          theme: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          job_title?: string | null;
          location?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          theme?: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          job_title?: string | null;
          location?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          theme?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          client_id: string | null;
          created_at: string | null;
          deployment_platform: Database['public']['Enums']['deployment_platform'] | null;
          description: string | null;
          id: string;
          lead_id: string | null;
          logo_url: string | null;
          name: string;
          project_group: Database['public']['Enums']['project_group'] | null;
          project_type: Database['public']['Enums']['project_type'] | null;
          start_date: string | null;
          status: Database['public']['Enums']['project_status'] | null;
          target_date: string | null;
          team_id: string | null;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string | null;
          deployment_platform?: Database['public']['Enums']['deployment_platform'] | null;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          logo_url?: string | null;
          name: string;
          project_group?: Database['public']['Enums']['project_group'] | null;
          project_type?: Database['public']['Enums']['project_type'] | null;
          start_date?: string | null;
          status?: Database['public']['Enums']['project_status'] | null;
          target_date?: string | null;
          team_id?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          client_id?: string | null;
          created_at?: string | null;
          deployment_platform?: Database['public']['Enums']['deployment_platform'] | null;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          logo_url?: string | null;
          name?: string;
          project_group?: Database['public']['Enums']['project_group'] | null;
          project_type?: Database['public']['Enums']['project_type'] | null;
          start_date?: string | null;
          status?: Database['public']['Enums']['project_status'] | null;
          target_date?: string | null;
          team_id?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          created_at: string | null;
          id: string;
          profile_id: string;
          role: string | null;
          team_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          profile_id: string;
          role?: string | null;
          team_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          profile_id?: string;
          role?: string | null;
          team_id?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          key: string;
          name: string;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          key: string;
          name: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          key?: string;
          name?: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          created_at: string | null;
          id: string;
          is_default: boolean | null;
          profile_id: string;
          role: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          profile_id: string;
          role?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          profile_id?: string;
          role?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_project_stats: {
        Args: { p_workspace_id: string };
        Returns: {
          done_issues: number;
          id: string;
          lead_email: string;
          lead_full_name: string;
          lead_id: string;
          milestone_progress: number;
          name: string;
          project_group: Database['public']['Enums']['project_group'];
          status: Database['public']['Enums']['project_status'];
          target_date: string;
          total_issues: number;
        }[];
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_system_admin: { Args: Record<string, never>; Returns: boolean };
      is_team_member: { Args: { team_uuid: string }; Returns: boolean };
      is_workspace_admin: { Args: { ws_id: string }; Returns: boolean };
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean };
    };
    Enums: {
      activity_type:
        | 'project_created'
        | 'project_updated'
        | 'issue_created'
        | 'issue_updated'
        | 'issue_completed'
        | 'issue_assigned'
        | 'comment_added'
        | 'team_created'
        | 'member_added'
        | 'meeting_created';
      deployment_platform: 'vercel' | 'squarespace' | 'railway';
      issue_priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
      issue_status: 'Yet to Start' | 'Todo' | 'In Progress' | 'Done' | 'Canceled';
      lead_status: 'dropped' | 'cold' | 'hot' | 'active_client' | 'inactive_client';
      project_group:
        | 'salman_kuwait'
        | 'tasos_kyriakides'
        | 'finished'
        | 'inactive'
        | 'active'
        | 'demos'
        | 'other';
      project_status: 'Demos' | 'Active' | 'Launched' | 'Delayed' | 'Archived' | 'Canceled';
      project_type: 'web_design' | 'ai_agent' | 'seo' | 'ads';
      user_role: 'admin' | 'employee';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Commonly used entity types
export type Profile = Tables<'profiles'>;
export type Workspace = Tables<'workspaces'>;
export type WorkspaceMember = Tables<'workspace_members'>;
export type Team = Tables<'teams'>;
export type TeamMember = Tables<'team_members'>;
export type Project = Tables<'projects'>;
export type Issue = Tables<'issues'>;
export type IssueAssignee = Tables<'issue_assignees'>;
export type Comment = Tables<'comments'>;
export type Client = Tables<'clients'>;
export type ClientContact = Tables<'client_contacts'>;
export type ClientActivity = Tables<'client_activities'>;
export type Meeting = Tables<'meetings'>;
export type MeetingAttendee = Tables<'meeting_attendees'>;
export type Milestone = Tables<'milestones'>;
export type MilestoneIssue = Tables<'milestone_issues'>;
export type Activity = Tables<'activities'>;
export type Document = Tables<'documents'>;

// Enum types
export type ActivityType = Enums<'activity_type'>;
export type DeploymentPlatform = Enums<'deployment_platform'>;
export type IssuePriority = Enums<'issue_priority'>;
export type IssueStatus = Enums<'issue_status'>;
export type LeadStatus = Enums<'lead_status'>;
export type ProjectGroup = Enums<'project_group'>;
export type ProjectStatus = Enums<'project_status'>;
export type ProjectType = Enums<'project_type'>;
export type UserRole = Enums<'user_role'>;

// Constants for enum values
export const DEPLOYMENT_PLATFORMS: DeploymentPlatform[] = ['vercel', 'squarespace', 'railway'];
export const ISSUE_PRIORITIES: IssuePriority[] = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];
export const ISSUE_STATUSES: IssueStatus[] = [
  'Yet to Start',
  'Todo',
  'In Progress',
  'Done',
  'Canceled',
];
export const LEAD_STATUSES: LeadStatus[] = [
  'dropped',
  'cold',
  'hot',
  'active_client',
  'inactive_client',
];
export const PROJECT_GROUPS: ProjectGroup[] = [
  'salman_kuwait',
  'tasos_kyriakides',
  'finished',
  'inactive',
  'active',
  'demos',
  'other',
];
export const PROJECT_STATUSES: ProjectStatus[] = [
  'Demos',
  'Active',
  'Launched',
  'Delayed',
  'Archived',
  'Canceled',
];
export const PROJECT_TYPES: ProjectType[] = ['web_design', 'ai_agent', 'seo', 'ads'];
