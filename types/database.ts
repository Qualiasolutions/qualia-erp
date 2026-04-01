export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
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
        Relationships: [
          {
            foreignKeyName: 'activities_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_issue_id_fkey';
            columns: ['issue_id'];
            isOneToOne: false;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      activity_log: {
        Row: {
          action_data: Json | null;
          action_type: string;
          actor_id: string;
          created_at: string | null;
          id: string;
          is_client_visible: boolean | null;
          project_id: string;
        };
        Insert: {
          action_data?: Json | null;
          action_type: string;
          actor_id: string;
          created_at?: string | null;
          id?: string;
          is_client_visible?: boolean | null;
          project_id: string;
        };
        Update: {
          action_data?: Json | null;
          action_type?: string;
          actor_id?: string;
          created_at?: string | null;
          id?: string;
          is_client_visible?: boolean | null;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_log_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_conversations: {
        Row: {
          created_at: string;
          id: string;
          summary: string | null;
          title: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          summary?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_conversations_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          tool_calls: Json | null;
          tool_results: Json | null;
        };
        Insert: {
          content?: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          tool_calls?: Json | null;
          tool_results?: Json | null;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          tool_calls?: Json | null;
          tool_results?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'ai_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_reminders: {
        Row: {
          content: string;
          created_at: string | null;
          due_at: string;
          id: string;
          is_delivered: boolean | null;
          is_recurring: boolean | null;
          recurrence_rule: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          due_at: string;
          id?: string;
          is_delivered?: boolean | null;
          is_recurring?: boolean | null;
          recurrence_rule?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          due_at?: string;
          id?: string;
          is_delivered?: boolean | null;
          is_recurring?: boolean | null;
          recurrence_rule?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_reminders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_reminders_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_user_context: {
        Row: {
          admin_notes: Json | null;
          id: string;
          interaction_count: number | null;
          recent_summaries: Json | null;
          skill_signals: Json | null;
          updated_at: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          admin_notes?: Json | null;
          id?: string;
          interaction_count?: number | null;
          recent_summaries?: Json | null;
          skill_signals?: Json | null;
          updated_at?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          admin_notes?: Json | null;
          id?: string;
          interaction_count?: number | null;
          recent_summaries?: Json | null;
          skill_signals?: Json | null;
          updated_at?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_user_context_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_user_memory: {
        Row: {
          category: string;
          confidence: number | null;
          content: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          source: string | null;
          updated_at: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          category: string;
          confidence?: number | null;
          content: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          source?: string | null;
          updated_at?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          category?: string;
          confidence?: number | null;
          content?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          source?: string | null;
          updated_at?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_user_memory_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_user_memory_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      blog_posts: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          keywords: string[] | null;
          notes: string | null;
          project_id: string;
          published_at: string | null;
          status: string;
          title: string;
          updated_at: string | null;
          url: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          keywords?: string[] | null;
          notes?: string | null;
          project_id: string;
          published_at?: string | null;
          status?: string;
          title: string;
          updated_at?: string | null;
          url?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          keywords?: string[] | null;
          notes?: string | null;
          project_id?: string;
          published_at?: string | null;
          status?: string;
          title?: string;
          updated_at?: string | null;
          url?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blog_posts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blog_posts_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blog_posts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      claude_sessions: {
        Row: {
          branch: string | null;
          created_at: string | null;
          files_changed: number | null;
          id: string;
          project_name: string;
          session_timestamp: string | null;
          summary: string | null;
          working_directory: string | null;
        };
        Insert: {
          branch?: string | null;
          created_at?: string | null;
          files_changed?: number | null;
          id?: string;
          project_name: string;
          session_timestamp?: string | null;
          summary?: string | null;
          working_directory?: string | null;
        };
        Update: {
          branch?: string | null;
          created_at?: string | null;
          files_changed?: number | null;
          id?: string;
          project_name?: string;
          session_timestamp?: string | null;
          summary?: string | null;
          working_directory?: string | null;
        };
        Relationships: [];
      };
      client_action_items: {
        Row: {
          action_type: string;
          client_id: string;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          project_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          action_type?: string;
          client_id: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          project_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          action_type?: string;
          client_id?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          project_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_action_items_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_action_items_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_action_items_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_action_items_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'client_activities_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_activities_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'client_contacts_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      client_feature_requests: {
        Row: {
          admin_response: string | null;
          client_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          priority: string | null;
          project_id: string | null;
          status: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          admin_response?: string | null;
          client_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          priority?: string | null;
          project_id?: string | null;
          status?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          admin_response?: string | null;
          client_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          priority?: string | null;
          project_id?: string | null;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_feature_requests_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      client_invitations: {
        Row: {
          account_created_at: string | null;
          email: string;
          id: string;
          invitation_token: string;
          invited_at: string | null;
          invited_by: string;
          metadata: Json | null;
          opened_at: string | null;
          project_id: string;
          resent_at: string | null;
          resent_count: number | null;
          status: Database['public']['Enums']['invitation_status'];
        };
        Insert: {
          account_created_at?: string | null;
          email: string;
          id?: string;
          invitation_token: string;
          invited_at?: string | null;
          invited_by: string;
          metadata?: Json | null;
          opened_at?: string | null;
          project_id: string;
          resent_at?: string | null;
          resent_count?: number | null;
          status?: Database['public']['Enums']['invitation_status'];
        };
        Update: {
          account_created_at?: string | null;
          email?: string;
          id?: string;
          invitation_token?: string;
          invited_at?: string | null;
          invited_by?: string;
          metadata?: Json | null;
          opened_at?: string | null;
          project_id?: string;
          resent_at?: string | null;
          resent_count?: number | null;
          status?: Database['public']['Enums']['invitation_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'client_invitations_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      client_projects: {
        Row: {
          access_level: string | null;
          client_id: string;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          project_id: string;
        };
        Insert: {
          access_level?: string | null;
          client_id: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          project_id: string;
        };
        Update: {
          access_level?: string | null;
          client_id?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_projects_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_projects_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'clients_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'clients_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'clients_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'comments_issue_id_fkey';
            columns: ['issue_id'];
            isOneToOne: false;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_checkins: {
        Row: {
          actual_clock_out_time: string | null;
          blockers: string | null;
          checkin_date: string;
          checkin_type: string;
          clock_in_time: string | null;
          completed_tasks: string[] | null;
          created_at: string;
          energy_level: number | null;
          id: string;
          mood: number | null;
          planned_clock_out_time: string | null;
          planned_tasks: string[] | null;
          profile_id: string;
          tomorrow_plan: string | null;
          updated_at: string;
          wins: string | null;
          workspace_id: string;
        };
        Insert: {
          actual_clock_out_time?: string | null;
          blockers?: string | null;
          checkin_date?: string;
          checkin_type: string;
          clock_in_time?: string | null;
          completed_tasks?: string[] | null;
          created_at?: string;
          energy_level?: number | null;
          id?: string;
          mood?: number | null;
          planned_clock_out_time?: string | null;
          planned_tasks?: string[] | null;
          profile_id: string;
          tomorrow_plan?: string | null;
          updated_at?: string;
          wins?: string | null;
          workspace_id: string;
        };
        Update: {
          actual_clock_out_time?: string | null;
          blockers?: string | null;
          checkin_date?: string;
          checkin_type?: string;
          clock_in_time?: string | null;
          completed_tasks?: string[] | null;
          created_at?: string;
          energy_level?: number | null;
          id?: string;
          mood?: number | null;
          planned_clock_out_time?: string | null;
          planned_tasks?: string[] | null;
          profile_id?: string;
          tomorrow_plan?: string | null;
          updated_at?: string;
          wins?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_checkins_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_checkins_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      dashboard_notes: {
        Row: {
          author_id: string;
          content: string;
          created_at: string | null;
          id: string;
          pinned: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string | null;
          id?: string;
          pinned?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string | null;
          id?: string;
          pinned?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dashboard_notes_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'documents_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string | null;
          date: string;
          description: string | null;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string | null;
          date: string;
          description?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string | null;
          date?: string;
          description?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      financial_invoices: {
        Row: {
          balance: number;
          client_id: string | null;
          currency_code: string | null;
          customer_id: string | null;
          customer_name: string;
          date: string;
          due_date: string | null;
          invoice_number: string;
          is_hidden: boolean;
          last_payment_date: string | null;
          status: string;
          synced_at: string;
          total: number;
          zoho_id: string;
        };
        Insert: {
          balance?: number;
          client_id?: string | null;
          currency_code?: string | null;
          customer_id?: string | null;
          customer_name: string;
          date: string;
          due_date?: string | null;
          invoice_number: string;
          is_hidden?: boolean;
          last_payment_date?: string | null;
          status: string;
          synced_at?: string;
          total?: number;
          zoho_id: string;
        };
        Update: {
          balance?: number;
          client_id?: string | null;
          currency_code?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          date?: string;
          due_date?: string | null;
          invoice_number?: string;
          is_hidden?: boolean;
          last_payment_date?: string | null;
          status?: string;
          synced_at?: string;
          total?: number;
          zoho_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'financial_invoices_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      financial_payments: {
        Row: {
          amount: number;
          currency_code: string | null;
          customer_id: string | null;
          customer_name: string;
          date: string;
          description: string | null;
          invoice_numbers: string | null;
          payment_mode: string | null;
          payment_number: string | null;
          synced_at: string;
          zoho_id: string;
        };
        Insert: {
          amount?: number;
          currency_code?: string | null;
          customer_id?: string | null;
          customer_name: string;
          date: string;
          description?: string | null;
          invoice_numbers?: string | null;
          payment_mode?: string | null;
          payment_number?: string | null;
          synced_at?: string;
          zoho_id: string;
        };
        Update: {
          amount?: number;
          currency_code?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          date?: string;
          description?: string | null;
          invoice_numbers?: string | null;
          payment_mode?: string | null;
          payment_number?: string | null;
          synced_at?: string;
          zoho_id?: string;
        };
        Relationships: [];
      };
      issue_assignees: {
        Row: {
          assigned_at: string | null;
          assigned_by: string | null;
          assignment_context: string | null;
          assignment_type: string | null;
          id: string;
          issue_id: string;
          mentor_id: string | null;
          profile_id: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          assignment_context?: string | null;
          assignment_type?: string | null;
          id?: string;
          issue_id: string;
          mentor_id?: string | null;
          profile_id: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_by?: string | null;
          assignment_context?: string | null;
          assignment_type?: string | null;
          id?: string;
          issue_id?: string;
          mentor_id?: string | null;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'issue_assignees_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issue_assignees_issue_id_fkey';
            columns: ['issue_id'];
            isOneToOne: false;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issue_assignees_mentor_id_fkey';
            columns: ['mentor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issue_assignees_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      issue_skills: {
        Row: {
          id: string;
          is_primary: boolean | null;
          issue_id: string;
          skill_id: string;
        };
        Insert: {
          id?: string;
          is_primary?: boolean | null;
          issue_id: string;
          skill_id: string;
        };
        Update: {
          id?: string;
          is_primary?: boolean | null;
          issue_id?: string;
          skill_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'issue_skills_issue_id_fkey';
            columns: ['issue_id'];
            isOneToOne: false;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
        ];
      };
      issues: {
        Row: {
          created_at: string | null;
          creator_id: string | null;
          description: string | null;
          difficulty: string | null;
          estimated_minutes_experienced: number | null;
          estimated_minutes_trainee: number | null;
          id: string;
          learning_objective: string | null;
          parent_id: string | null;
          priority: Database['public']['Enums']['issue_priority'] | null;
          project_id: string | null;
          requires_review: boolean | null;
          review_notes: string | null;
          review_status: string | null;
          reviewed_at: string | null;
          reviewer_id: string | null;
          scheduled_end_time: string | null;
          scheduled_start_time: string | null;
          sort_order: number | null;
          status: Database['public']['Enums']['issue_status'] | null;
          team_id: string | null;
          title: string;
          updated_at: string | null;
          why_it_matters: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          difficulty?: string | null;
          estimated_minutes_experienced?: number | null;
          estimated_minutes_trainee?: number | null;
          id?: string;
          learning_objective?: string | null;
          parent_id?: string | null;
          priority?: Database['public']['Enums']['issue_priority'] | null;
          project_id?: string | null;
          requires_review?: boolean | null;
          review_notes?: string | null;
          review_status?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          scheduled_end_time?: string | null;
          scheduled_start_time?: string | null;
          sort_order?: number | null;
          status?: Database['public']['Enums']['issue_status'] | null;
          team_id?: string | null;
          title: string;
          updated_at?: string | null;
          why_it_matters?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          creator_id?: string | null;
          description?: string | null;
          difficulty?: string | null;
          estimated_minutes_experienced?: number | null;
          estimated_minutes_trainee?: number | null;
          id?: string;
          learning_objective?: string | null;
          parent_id?: string | null;
          priority?: Database['public']['Enums']['issue_priority'] | null;
          project_id?: string | null;
          requires_review?: boolean | null;
          review_notes?: string | null;
          review_status?: string | null;
          reviewed_at?: string | null;
          reviewer_id?: string | null;
          scheduled_end_time?: string | null;
          scheduled_start_time?: string | null;
          sort_order?: number | null;
          status?: Database['public']['Enums']['issue_status'] | null;
          team_id?: string | null;
          title?: string;
          updated_at?: string | null;
          why_it_matters?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'issues_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issues_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issues_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issues_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issues_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'issues_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      knowledge_guides: {
        Row: {
          category: string;
          checklist: Json;
          created_at: string;
          id: string;
          project_type: string;
          slug: string;
          sort_order: number;
          steps: Json;
          subtitle: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          category: string;
          checklist?: Json;
          created_at?: string;
          id?: string;
          project_type: string;
          slug: string;
          sort_order?: number;
          steps?: Json;
          subtitle: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          category?: string;
          checklist?: Json;
          created_at?: string;
          id?: string;
          project_type?: string;
          slug?: string;
          sort_order?: number;
          steps?: Json;
          subtitle?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      lead_follow_ups: {
        Row: {
          assigned_to: string | null;
          client_id: string;
          completed_at: string | null;
          created_at: string | null;
          follow_up_date: string;
          id: string;
          notes: string | null;
          priority: string | null;
          status: string | null;
          title: string;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          assigned_to?: string | null;
          client_id: string;
          completed_at?: string | null;
          created_at?: string | null;
          follow_up_date: string;
          id?: string;
          notes?: string | null;
          priority?: string | null;
          status?: string | null;
          title: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          client_id?: string;
          completed_at?: string | null;
          created_at?: string | null;
          follow_up_date?: string;
          id?: string;
          notes?: string | null;
          priority?: string | null;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_follow_ups_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_follow_ups_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_follow_ups_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'meeting_attendees_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meeting_attendees_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      meetings: {
        Row: {
          client_id: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          end_time: string;
          id: string;
          meeting_link: string | null;
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
          meeting_link?: string | null;
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
          meeting_link?: string | null;
          project_id?: string | null;
          start_time?: string;
          title?: string;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'meetings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetings_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetings_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meetings_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          author_id: string;
          channel_type: string;
          content: string;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          linked_issue_id: string | null;
          metadata: Json | null;
          project_id: string | null;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          author_id: string;
          channel_type?: string;
          content: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          linked_issue_id?: string | null;
          metadata?: Json | null;
          project_id?: string | null;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          author_id?: string;
          channel_type?: string;
          content?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          linked_issue_id?: string | null;
          metadata?: Json | null;
          project_id?: string | null;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_linked_issue_id_fkey';
            columns: ['linked_issue_id'];
            isOneToOne: false;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          client_activity: boolean;
          created_at: string;
          delivery_method: Database['public']['Enums']['notification_delivery_method'];
          id: string;
          meeting_reminder: boolean;
          project_update: boolean;
          task_assigned: boolean;
          task_due_soon: boolean;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          client_activity?: boolean;
          created_at?: string;
          delivery_method?: Database['public']['Enums']['notification_delivery_method'];
          id?: string;
          meeting_reminder?: boolean;
          project_update?: boolean;
          task_assigned?: boolean;
          task_due_soon?: boolean;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          client_activity?: boolean;
          created_at?: string;
          delivery_method?: Database['public']['Enums']['notification_delivery_method'];
          id?: string;
          meeting_reminder?: boolean;
          project_update?: boolean;
          task_assigned?: boolean;
          task_due_soon?: boolean;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_preferences_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          link: string | null;
          message: string | null;
          metadata: Json | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          link?: string | null;
          message?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          link?: string | null;
          message?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      owner_update_reads: {
        Row: {
          id: string;
          profile_id: string;
          read_at: string;
          update_id: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          read_at?: string;
          update_id: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          read_at?: string;
          update_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'owner_update_reads_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'owner_update_reads_update_id_fkey';
            columns: ['update_id'];
            isOneToOne: false;
            referencedRelation: 'owner_updates';
            referencedColumns: ['id'];
          },
        ];
      };
      owner_updates: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          pinned: boolean;
          priority: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          priority?: string;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          pinned?: boolean;
          priority?: string;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'owner_updates_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'owner_updates_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      phase_comments: {
        Row: {
          comment_text: string;
          commented_by: string;
          created_at: string | null;
          id: string;
          is_internal: boolean | null;
          phase_name: string;
          project_id: string;
          task_key: string | null;
        };
        Insert: {
          comment_text: string;
          commented_by: string;
          created_at?: string | null;
          id?: string;
          is_internal?: boolean | null;
          phase_name: string;
          project_id: string;
          task_key?: string | null;
        };
        Update: {
          comment_text?: string;
          commented_by?: string;
          created_at?: string | null;
          id?: string;
          is_internal?: boolean | null;
          phase_name?: string;
          project_id?: string;
          task_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phase_comments_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      phase_items: {
        Row: {
          completed_at: string | null;
          completed_by: string | null;
          created_at: string | null;
          description: string | null;
          display_order: number;
          helper_text: string | null;
          id: string;
          is_completed: boolean | null;
          is_custom: boolean | null;
          linked_issue_id: string | null;
          phase_id: string;
          status: string | null;
          template_key: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number;
          helper_text?: string | null;
          id?: string;
          is_completed?: boolean | null;
          is_custom?: boolean | null;
          linked_issue_id?: string | null;
          phase_id: string;
          status?: string | null;
          template_key?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number;
          helper_text?: string | null;
          id?: string;
          is_completed?: boolean | null;
          is_custom?: boolean | null;
          linked_issue_id?: string | null;
          phase_id?: string;
          status?: string | null;
          template_key?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phase_items_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phase_items_linked_issue_id_fkey';
            columns: ['linked_issue_id'];
            isOneToOne: false;
            referencedRelation: 'issues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phase_items_phase_id_fkey';
            columns: ['phase_id'];
            isOneToOne: false;
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          },
        ];
      };
      phase_resources: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          display_order: number;
          id: string;
          phase_id: string;
          resource_type: string | null;
          title: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          phase_id: string;
          resource_type?: string | null;
          title: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          phase_id?: string;
          resource_type?: string | null;
          title?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phase_resources_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phase_resources_phase_id_fkey';
            columns: ['phase_id'];
            isOneToOne: false;
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          },
        ];
      };
      phase_reviews: {
        Row: {
          created_at: string | null;
          feedback: string | null;
          id: string;
          phase_id: string;
          phase_name: string;
          project_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          submitted_at: string | null;
          submitted_by: string;
        };
        Insert: {
          created_at?: string | null;
          feedback?: string | null;
          id?: string;
          phase_id: string;
          phase_name: string;
          project_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          submitted_by: string;
        };
        Update: {
          created_at?: string | null;
          feedback?: string | null;
          id?: string;
          phase_id?: string;
          phase_name?: string;
          project_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          submitted_at?: string | null;
          submitted_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'phase_reviews_phase_id_fkey';
            columns: ['phase_id'];
            isOneToOne: false;
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'phase_reviews_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      phase_templates: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
          phases: Json;
          project_type: string | null;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
          phases?: Json;
          project_type?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
          phases?: Json;
          project_type?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'phase_templates_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          is_trainee: boolean | null;
          job_title: string | null;
          last_activity_date: string | null;
          location: string | null;
          longest_streak: number | null;
          mentor_id: string | null;
          planned_logout_time: string | null;
          projects_completed: number | null;
          role: Database['public']['Enums']['user_role'] | null;
          skill_level: string | null;
          theme: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          is_trainee?: boolean | null;
          job_title?: string | null;
          last_activity_date?: string | null;
          location?: string | null;
          longest_streak?: number | null;
          mentor_id?: string | null;
          planned_logout_time?: string | null;
          projects_completed?: number | null;
          role?: Database['public']['Enums']['user_role'] | null;
          skill_level?: string | null;
          theme?: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          is_trainee?: boolean | null;
          job_title?: string | null;
          last_activity_date?: string | null;
          location?: string | null;
          longest_streak?: number | null;
          mentor_id?: string | null;
          planned_logout_time?: string | null;
          projects_completed?: number | null;
          role?: Database['public']['Enums']['user_role'] | null;
          skill_level?: string | null;
          theme?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_mentor_id_fkey';
            columns: ['mentor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      project_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          created_at: string;
          employee_id: string;
          id: string;
          notes: string | null;
          project_id: string;
          removed_at: string | null;
          removed_by: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          created_at?: string;
          employee_id: string;
          id?: string;
          notes?: string | null;
          project_id: string;
          removed_at?: string | null;
          removed_by?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          created_at?: string;
          employee_id?: string;
          id?: string;
          notes?: string | null;
          project_id?: string;
          removed_at?: string | null;
          removed_by?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_assignments_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_assignments_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_assignments_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_assignments_removed_by_fkey';
            columns: ['removed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_assignments_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      project_deployments: {
        Row: {
          branch: string | null;
          commit_message: string | null;
          commit_sha: string | null;
          created_at: string | null;
          environment: string;
          error_message: string | null;
          id: string;
          project_id: string | null;
          ready_at: string | null;
          status: string;
          url: string | null;
          vercel_deployment_id: string | null;
          vercel_project_id: string | null;
        };
        Insert: {
          branch?: string | null;
          commit_message?: string | null;
          commit_sha?: string | null;
          created_at?: string | null;
          environment?: string;
          error_message?: string | null;
          id?: string;
          project_id?: string | null;
          ready_at?: string | null;
          status?: string;
          url?: string | null;
          vercel_deployment_id?: string | null;
          vercel_project_id?: string | null;
        };
        Update: {
          branch?: string | null;
          commit_message?: string | null;
          commit_sha?: string | null;
          created_at?: string | null;
          environment?: string;
          error_message?: string | null;
          id?: string;
          project_id?: string | null;
          ready_at?: string | null;
          status?: string;
          url?: string | null;
          vercel_deployment_id?: string | null;
          vercel_project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_deployments_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_environments: {
        Row: {
          created_at: string | null;
          health_status: string | null;
          id: string;
          last_checked_at: string | null;
          last_deployment_id: string | null;
          name: string;
          project_id: string | null;
          url: string | null;
          vercel_project_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          health_status?: string | null;
          id?: string;
          last_checked_at?: string | null;
          last_deployment_id?: string | null;
          name: string;
          project_id?: string | null;
          url?: string | null;
          vercel_project_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          health_status?: string | null;
          id?: string;
          last_checked_at?: string | null;
          last_deployment_id?: string | null;
          name?: string;
          project_id?: string | null;
          url?: string | null;
          vercel_project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_environments_last_deployment_id_fkey';
            columns: ['last_deployment_id'];
            isOneToOne: false;
            referencedRelation: 'project_deployments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_environments_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_files: {
        Row: {
          created_at: string | null;
          description: string | null;
          file_size: number;
          id: string;
          is_client_upload: boolean;
          is_client_visible: boolean | null;
          mime_type: string | null;
          name: string;
          original_name: string;
          phase_name: string | null;
          project_id: string;
          storage_path: string;
          updated_at: string | null;
          uploaded_by: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          file_size: number;
          id?: string;
          is_client_upload?: boolean;
          is_client_visible?: boolean | null;
          mime_type?: string | null;
          name: string;
          original_name: string;
          phase_name?: string | null;
          project_id: string;
          storage_path: string;
          updated_at?: string | null;
          uploaded_by?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          file_size?: number;
          id?: string;
          is_client_upload?: boolean;
          is_client_visible?: boolean | null;
          mime_type?: string | null;
          name?: string;
          original_name?: string;
          phase_name?: string | null;
          project_id?: string;
          storage_path?: string;
          updated_at?: string | null;
          uploaded_by?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_files_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_files_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      project_integrations: {
        Row: {
          connected_at: string | null;
          external_id: string | null;
          external_url: string;
          id: string;
          metadata: Json | null;
          project_id: string;
          service_type: string;
        };
        Insert: {
          connected_at?: string | null;
          external_id?: string | null;
          external_url: string;
          id?: string;
          metadata?: Json | null;
          project_id: string;
          service_type: string;
        };
        Update: {
          connected_at?: string | null;
          external_id?: string | null;
          external_url?: string;
          id?: string;
          metadata?: Json | null;
          project_id?: string;
          service_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_integrations_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_notes: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          project_id: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          project_id: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_notes_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_notes_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      project_phases: {
        Row: {
          auto_progress: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          github_synced_at: string | null;
          helper_text: string | null;
          id: string;
          is_locked: boolean | null;
          milestone_number: number | null;
          name: string;
          phase_type: string | null;
          plan_count: number | null;
          plans_completed: number | null;
          prerequisite_phase_id: string | null;
          project_id: string | null;
          sort_order: number | null;
          start_date: string | null;
          started_at: string | null;
          status: string | null;
          target_date: string | null;
          template_key: string | null;
          updated_at: string | null;
          workspace_id: string | null;
        };
        Insert: {
          auto_progress?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          github_synced_at?: string | null;
          helper_text?: string | null;
          id?: string;
          is_locked?: boolean | null;
          milestone_number?: number | null;
          name: string;
          phase_type?: string | null;
          plan_count?: number | null;
          plans_completed?: number | null;
          prerequisite_phase_id?: string | null;
          project_id?: string | null;
          sort_order?: number | null;
          start_date?: string | null;
          started_at?: string | null;
          status?: string | null;
          target_date?: string | null;
          template_key?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          auto_progress?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          github_synced_at?: string | null;
          helper_text?: string | null;
          id?: string;
          is_locked?: boolean | null;
          milestone_number?: number | null;
          name?: string;
          phase_type?: string | null;
          plan_count?: number | null;
          plans_completed?: number | null;
          prerequisite_phase_id?: string | null;
          project_id?: string | null;
          sort_order?: number | null;
          start_date?: string | null;
          started_at?: string | null;
          status?: string | null;
          target_date?: string | null;
          template_key?: string | null;
          updated_at?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_phases_prerequisite_phase_id_fkey';
            columns: ['prerequisite_phase_id'];
            isOneToOne: false;
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_phases_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_phases_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      project_provisioning: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          github_clone_url: string | null;
          github_error: string | null;
          github_provisioned_at: string | null;
          github_repo_name: string | null;
          github_repo_url: string | null;
          id: string;
          project_id: string;
          retry_count: number | null;
          started_at: string | null;
          status: Database['public']['Enums']['provisioning_status'] | null;
          updated_at: string | null;
          vapi_assistant_id: string | null;
          vapi_error: string | null;
          vapi_phone_number_id: string | null;
          vapi_provisioned_at: string | null;
          vapi_webhook_url: string | null;
          vercel_deployment_url: string | null;
          vercel_error: string | null;
          vercel_project_id: string | null;
          vercel_project_url: string | null;
          vercel_provisioned_at: string | null;
          workspace_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          github_clone_url?: string | null;
          github_error?: string | null;
          github_provisioned_at?: string | null;
          github_repo_name?: string | null;
          github_repo_url?: string | null;
          id?: string;
          project_id: string;
          retry_count?: number | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['provisioning_status'] | null;
          updated_at?: string | null;
          vapi_assistant_id?: string | null;
          vapi_error?: string | null;
          vapi_phone_number_id?: string | null;
          vapi_provisioned_at?: string | null;
          vapi_webhook_url?: string | null;
          vercel_deployment_url?: string | null;
          vercel_error?: string | null;
          vercel_project_id?: string | null;
          vercel_project_url?: string | null;
          vercel_provisioned_at?: string | null;
          workspace_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          github_clone_url?: string | null;
          github_error?: string | null;
          github_provisioned_at?: string | null;
          github_repo_name?: string | null;
          github_repo_url?: string | null;
          id?: string;
          project_id?: string;
          retry_count?: number | null;
          started_at?: string | null;
          status?: Database['public']['Enums']['provisioning_status'] | null;
          updated_at?: string | null;
          vapi_assistant_id?: string | null;
          vapi_error?: string | null;
          vapi_phone_number_id?: string | null;
          vapi_provisioned_at?: string | null;
          vapi_webhook_url?: string | null;
          vercel_deployment_url?: string | null;
          vercel_error?: string | null;
          vercel_project_id?: string | null;
          vercel_project_url?: string | null;
          vercel_provisioned_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_provisioning_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_provisioning_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          client_id: string | null;
          created_at: string | null;
          deployment_platform: Database['public']['Enums']['deployment_platform'] | null;
          description: string | null;
          github_repo_url: string | null;
          id: string;
          is_building: boolean | null;
          is_finished: boolean;
          is_live: boolean;
          is_pre_production: boolean;
          is_trainee_project: boolean | null;
          lead_id: string | null;
          logo_url: string | null;
          mentor_id: string | null;
          metadata: Json | null;
          name: string;
          progress: number | null;
          project_category: string | null;
          project_group: Database['public']['Enums']['project_group'] | null;
          project_type: Database['public']['Enums']['project_type'] | null;
          sort_order: number | null;
          start_date: string | null;
          status: Database['public']['Enums']['project_status'] | null;
          target_date: string | null;
          team_id: string | null;
          trainee_id: string | null;
          updated_at: string | null;
          vercel_project_url: string | null;
          workspace_id: string | null;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string | null;
          deployment_platform?: Database['public']['Enums']['deployment_platform'] | null;
          description?: string | null;
          github_repo_url?: string | null;
          id?: string;
          is_building?: boolean | null;
          is_finished?: boolean;
          is_live?: boolean;
          is_pre_production?: boolean;
          is_trainee_project?: boolean | null;
          lead_id?: string | null;
          logo_url?: string | null;
          mentor_id?: string | null;
          metadata?: Json | null;
          name: string;
          progress?: number | null;
          project_category?: string | null;
          project_group?: Database['public']['Enums']['project_group'] | null;
          project_type?: Database['public']['Enums']['project_type'] | null;
          sort_order?: number | null;
          start_date?: string | null;
          status?: Database['public']['Enums']['project_status'] | null;
          target_date?: string | null;
          team_id?: string | null;
          trainee_id?: string | null;
          updated_at?: string | null;
          vercel_project_url?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          client_id?: string | null;
          created_at?: string | null;
          deployment_platform?: Database['public']['Enums']['deployment_platform'] | null;
          description?: string | null;
          github_repo_url?: string | null;
          id?: string;
          is_building?: boolean | null;
          is_finished?: boolean;
          is_live?: boolean;
          is_pre_production?: boolean;
          is_trainee_project?: boolean | null;
          lead_id?: string | null;
          logo_url?: string | null;
          mentor_id?: string | null;
          metadata?: Json | null;
          name?: string;
          progress?: number | null;
          project_category?: string | null;
          project_group?: Database['public']['Enums']['project_group'] | null;
          project_type?: Database['public']['Enums']['project_type'] | null;
          sort_order?: number | null;
          start_date?: string | null;
          status?: Database['public']['Enums']['project_status'] | null;
          target_date?: string | null;
          team_id?: string | null;
          trainee_id?: string | null;
          updated_at?: string | null;
          vercel_project_url?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_mentor_id_fkey';
            columns: ['mentor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_trainee_id_fkey';
            columns: ['trainee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      reminders: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          is_seen: boolean;
          text: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          is_seen?: boolean;
          text: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          is_seen?: boolean;
          text?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      research_entries: {
        Row: {
          action_items: string | null;
          author_id: string;
          category: string;
          created_at: string;
          id: string;
          key_findings: string | null;
          raw_content: string | null;
          research_date: string;
          sources: string | null;
          summary: string | null;
          title: string;
          topic: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          action_items?: string | null;
          author_id: string;
          category?: string;
          created_at?: string;
          id?: string;
          key_findings?: string | null;
          raw_content?: string | null;
          research_date?: string;
          sources?: string | null;
          summary?: string | null;
          title: string;
          topic: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          action_items?: string | null;
          author_id?: string;
          category?: string;
          created_at?: string;
          id?: string;
          key_findings?: string | null;
          raw_content?: string | null;
          research_date?: string;
          sources?: string | null;
          summary?: string | null;
          title?: string;
          topic?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'research_entries_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_entries_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      research_findings: {
        Row: {
          action_items: string[] | null;
          created_at: string;
          created_by: string;
          gemini_used: boolean | null;
          id: string;
          key_findings: string[] | null;
          notebooklm_used: boolean | null;
          research_date: string;
          source_links: string[] | null;
          summary: string | null;
          time_spent_minutes: number | null;
          topic: string;
          topic_category: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          action_items?: string[] | null;
          created_at?: string;
          created_by: string;
          gemini_used?: boolean | null;
          id?: string;
          key_findings?: string[] | null;
          notebooklm_used?: boolean | null;
          research_date?: string;
          source_links?: string[] | null;
          summary?: string | null;
          time_spent_minutes?: number | null;
          topic: string;
          topic_category: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          action_items?: string[] | null;
          created_at?: string;
          created_by?: string;
          gemini_used?: boolean | null;
          id?: string;
          key_findings?: string[] | null;
          notebooklm_used?: boolean | null;
          research_date?: string;
          source_links?: string[] | null;
          summary?: string | null;
          time_spent_minutes?: number | null;
          topic?: string;
          topic_category?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'research_findings_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_findings_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      task_attachments: {
        Row: {
          created_at: string | null;
          file_name: string;
          file_size: number;
          id: string;
          mime_type: string;
          storage_path: string;
          task_id: string;
          uploader_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          file_name: string;
          file_size: number;
          id?: string;
          mime_type: string;
          storage_path: string;
          task_id: string;
          uploader_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          file_name?: string;
          file_size?: number;
          id?: string;
          mime_type?: string;
          storage_path?: string;
          task_id?: string;
          uploader_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_attachments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_uploader_id_fkey';
            columns: ['uploader_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      task_time_logs: {
        Row: {
          created_at: string;
          duration_minutes: number | null;
          ended_at: string | null;
          id: string;
          notes: string | null;
          profile_id: string;
          project_id: string | null;
          started_at: string;
          task_id: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          duration_minutes?: number | null;
          ended_at?: string | null;
          id?: string;
          notes?: string | null;
          profile_id: string;
          project_id?: string | null;
          started_at?: string;
          task_id?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          duration_minutes?: number | null;
          ended_at?: string | null;
          id?: string;
          notes?: string | null;
          profile_id?: string;
          project_id?: string | null;
          started_at?: string;
          task_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_time_logs_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_time_logs_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_time_logs_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_time_logs_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assignee_id: string | null;
          auto_assign_trigger: string | null;
          completed_at: string | null;
          created_at: string;
          creator_id: string | null;
          description: string | null;
          difficulty: string | null;
          due_date: string | null;
          estimated_minutes_trainee: number | null;
          id: string;
          item_type: Database['public']['Enums']['task_item_type'];
          learning_objective: string | null;
          milestone: string | null;
          phase_id: string | null;
          phase_name: string | null;
          priority: Database['public']['Enums']['task_priority'];
          project_id: string | null;
          requires_attachment: string | null;
          scheduled_end_time: string | null;
          scheduled_start_time: string | null;
          show_in_inbox: boolean;
          sort_order: number;
          source_phase_item_id: string | null;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          assignee_id?: string | null;
          auto_assign_trigger?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_id?: string | null;
          description?: string | null;
          difficulty?: string | null;
          due_date?: string | null;
          estimated_minutes_trainee?: number | null;
          id?: string;
          item_type?: Database['public']['Enums']['task_item_type'];
          learning_objective?: string | null;
          milestone?: string | null;
          phase_id?: string | null;
          phase_name?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          project_id?: string | null;
          requires_attachment?: string | null;
          scheduled_end_time?: string | null;
          scheduled_start_time?: string | null;
          show_in_inbox?: boolean;
          sort_order?: number;
          source_phase_item_id?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          assignee_id?: string | null;
          auto_assign_trigger?: string | null;
          completed_at?: string | null;
          created_at?: string;
          creator_id?: string | null;
          description?: string | null;
          difficulty?: string | null;
          due_date?: string | null;
          estimated_minutes_trainee?: number | null;
          id?: string;
          item_type?: Database['public']['Enums']['task_item_type'];
          learning_objective?: string | null;
          milestone?: string | null;
          phase_id?: string | null;
          phase_name?: string | null;
          priority?: Database['public']['Enums']['task_priority'];
          project_id?: string | null;
          requires_attachment?: string | null;
          scheduled_end_time?: string | null;
          scheduled_start_time?: string | null;
          show_in_inbox?: boolean;
          sort_order?: number;
          source_phase_item_id?: string | null;
          status?: Database['public']['Enums']['task_status'];
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_phase_id_fkey';
            columns: ['phase_id'];
            isOneToOne: false;
            referencedRelation: 'project_phases';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_source_phase_item_id_fkey';
            columns: ['source_phase_item_id'];
            isOneToOne: false;
            referencedRelation: 'phase_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'team_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'teams_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      time_entries: {
        Row: {
          created_at: string | null;
          description: string | null;
          duration_seconds: number | null;
          end_time: string | null;
          entry_date: string;
          id: string;
          is_running: boolean | null;
          project_id: string | null;
          start_time: string;
          task_id: string | null;
          updated_at: string | null;
          user_id: string;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          duration_seconds?: number | null;
          end_time?: string | null;
          entry_date: string;
          id?: string;
          is_running?: boolean | null;
          project_id?: string | null;
          start_time: string;
          task_id?: string | null;
          updated_at?: string | null;
          user_id: string;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          duration_seconds?: number | null;
          end_time?: string | null;
          entry_date?: string;
          id?: string;
          is_running?: boolean | null;
          project_id?: string | null;
          start_time?: string;
          task_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'time_entries_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_entries_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_entries_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      trainee_daily_logs: {
        Row: {
          blockers: string | null;
          completed_today: string | null;
          created_at: string | null;
          id: string;
          log_date: string;
          mentor_feedback: string | null;
          next_steps: string | null;
          project_id: string;
          trainee_id: string;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          blockers?: string | null;
          completed_today?: string | null;
          created_at?: string | null;
          id?: string;
          log_date?: string;
          mentor_feedback?: string | null;
          next_steps?: string | null;
          project_id: string;
          trainee_id: string;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          blockers?: string | null;
          completed_today?: string | null;
          created_at?: string | null;
          id?: string;
          log_date?: string;
          mentor_feedback?: string | null;
          next_steps?: string | null;
          project_id?: string;
          trainee_id?: string;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trainee_daily_logs_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trainee_daily_logs_trainee_id_fkey';
            columns: ['trainee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trainee_daily_logs_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      trainee_progress: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          id: string;
          notes: string | null;
          phase_name: string;
          project_id: string | null;
          started_at: string | null;
          status: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          phase_name: string;
          project_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          phase_name?: string;
          project_id?: string | null;
          started_at?: string | null;
          status?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trainee_progress_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trainee_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'trainee_progress_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      work_sessions: {
        Row: {
          created_at: string;
          duration_minutes: number | null;
          ended_at: string | null;
          id: string;
          profile_id: string;
          project_id: string | null;
          started_at: string;
          summary: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          duration_minutes?: number | null;
          ended_at?: string | null;
          id?: string;
          profile_id: string;
          project_id?: string | null;
          started_at?: string;
          summary?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          duration_minutes?: number | null;
          ended_at?: string | null;
          id?: string;
          profile_id?: string;
          project_id?: string | null;
          started_at?: string;
          summary?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'work_sessions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_sessions_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'work_sessions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_integrations: {
        Row: {
          config: Json | null;
          created_at: string | null;
          encrypted_token: string;
          id: string;
          is_connected: boolean | null;
          last_verified_at: string | null;
          provider: Database['public']['Enums']['integration_provider'];
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          config?: Json | null;
          created_at?: string | null;
          encrypted_token: string;
          id?: string;
          is_connected?: boolean | null;
          last_verified_at?: string | null;
          provider: Database['public']['Enums']['integration_provider'];
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          config?: Json | null;
          created_at?: string | null;
          encrypted_token?: string;
          id?: string;
          is_connected?: boolean | null;
          last_verified_at?: string | null;
          provider?: Database['public']['Enums']['integration_provider'];
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_integrations_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'workspace_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_notes: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          updated_at: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_notes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_notes_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'workspaces_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      portal_project_mappings: {
        Row: {
          erp_client_id: string | null;
          erp_client_name: string | null;
          erp_company_name: string | null;
          mapping_id: string | null;
          portal_client_email: string | null;
          portal_client_id: string | null;
          project_id: string | null;
          project_name: string | null;
          project_status: Database['public']['Enums']['project_status'] | null;
          project_type: Database['public']['Enums']['project_type'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_projects_client_id_fkey';
            columns: ['portal_client_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_projects_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_client_id_fkey';
            columns: ['erp_client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      batch_update_task_orders: { Args: { updates: Json }; Returns: undefined };
      calculate_phase_progress: {
        Args: { p_phase_id: string };
        Returns: number;
      };
      calculate_roadmap_progress: {
        Args: { p_project_id: string };
        Returns: number;
      };
      calculate_task_progress: {
        Args: { p_project_id: string };
        Returns: number;
      };
      check_and_award_achievements: {
        Args: { p_user_id: string };
        Returns: {
          achievement_name: string;
          xp_reward: number;
        }[];
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      get_my_workspace_ids: { Args: never; Returns: string[] };
      get_project_pipeline_stats: {
        Args: { p_workspace_id?: string };
        Returns: {
          client_id: string;
          client_name: string;
          completed_phases: number;
          completed_tasks: number;
          current_phase_id: string;
          current_phase_name: string;
          current_phase_order: number;
          deployment_platform: string;
          id: string;
          is_live: boolean;
          lead_email: string;
          lead_full_name: string;
          lead_id: string;
          logo_url: string;
          metadata: Json;
          name: string;
          overall_progress: number;
          project_group: string;
          project_type: string;
          start_date: string;
          status: Database['public']['Enums']['project_status'];
          target_date: string;
          total_phases: number;
          total_tasks: number;
        }[];
      };
      get_project_stats: {
        Args: { p_workspace_id: string };
        Returns: {
          client_id: string;
          client_name: string;
          deployment_platform: string;
          done_issues: number;
          id: string;
          is_building: boolean;
          is_finished: boolean;
          is_live: boolean;
          is_pre_production: boolean;
          lead_email: string;
          lead_full_name: string;
          lead_id: string;
          logo_url: string;
          metadata: Json;
          name: string;
          project_group: string;
          project_type: string;
          roadmap_progress: number;
          start_date: string;
          status: Database['public']['Enums']['project_status'];
          target_date: string;
          total_issues: number;
        }[];
      };
      get_project_task_progress: {
        Args: { p_project_id: string };
        Returns: {
          completed_tasks: number;
          progress_percent: number;
          total_tasks: number;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      is_admin_or_manager: { Args: never; Returns: boolean };
      is_client_of_project: { Args: { p_project_id: string }; Returns: boolean };
      is_issue_assignee: { Args: { p_issue_id: string }; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
      is_system_admin: { Args: never; Returns: boolean };
      is_team_member: { Args: { team_uuid: string }; Returns: boolean };
      is_workspace_admin: { Args: { ws_id: string }; Returns: boolean };
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean };
      log_task_skill_practice: {
        Args: { p_project_type?: string; p_task_id: string; p_user_id: string };
        Returns: undefined;
      };
      match_documents: {
        Args: {
          filter_workspace_id?: string;
          match_count: number;
          match_threshold: number;
          query_embedding: string;
        };
        Returns: {
          content: string;
          id: string;
          metadata: Json;
          similarity: number;
          title: string;
          url: string;
        }[];
      };
      update_user_streak: { Args: { p_user_id: string }; Returns: undefined };
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
      deployment_platform:
        | 'vercel'
        | 'squarespace'
        | 'railway'
        | 'meta'
        | 'instagram'
        | 'google_ads'
        | 'tiktok'
        | 'linkedin'
        | 'none';
      integration_provider: 'github' | 'vercel' | 'vapi';
      invitation_status: 'sent' | 'resent' | 'opened' | 'accepted' | 'expired';
      issue_priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
      issue_status: 'Yet to Start' | 'Todo' | 'In Progress' | 'Done' | 'Canceled';
      lead_status: 'dropped' | 'cold' | 'hot' | 'active_client' | 'inactive_client' | 'dead_lead';
      notification_delivery_method: 'email' | 'in_app' | 'both';
      project_group:
        | 'salman_kuwait'
        | 'tasos_kyriakides'
        | 'finished'
        | 'inactive'
        | 'active'
        | 'demos'
        | 'other';
      project_status:
        | 'Demos'
        | 'Active'
        | 'Launched'
        | 'Delayed'
        | 'Archived'
        | 'Canceled'
        | 'Done';
      project_type:
        | 'web_design'
        | 'ai_agent'
        | 'seo'
        | 'ads'
        | 'voice_agent'
        | 'ai_platform'
        | 'app';
      provisioning_status:
        | 'not_started'
        | 'pending'
        | 'in_progress'
        | 'completed'
        | 'partial_failure'
        | 'failed';
      task_item_type: 'task' | 'issue' | 'note' | 'resource';
      task_priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
      task_status: 'Todo' | 'In Progress' | 'Done' | 'Canceled';
      user_role: 'admin' | 'manager' | 'employee' | 'client';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: [
        'project_created',
        'project_updated',
        'issue_created',
        'issue_updated',
        'issue_completed',
        'issue_assigned',
        'comment_added',
        'team_created',
        'member_added',
        'meeting_created',
      ],
      deployment_platform: [
        'vercel',
        'squarespace',
        'railway',
        'meta',
        'instagram',
        'google_ads',
        'tiktok',
        'linkedin',
        'none',
      ],
      integration_provider: ['github', 'vercel', 'vapi'],
      invitation_status: ['sent', 'resent', 'opened', 'accepted', 'expired'],
      issue_priority: ['No Priority', 'Urgent', 'High', 'Medium', 'Low'],
      issue_status: ['Yet to Start', 'Todo', 'In Progress', 'Done', 'Canceled'],
      lead_status: ['dropped', 'cold', 'hot', 'active_client', 'inactive_client', 'dead_lead'],
      notification_delivery_method: ['email', 'in_app', 'both'],
      project_group: [
        'salman_kuwait',
        'tasos_kyriakides',
        'finished',
        'inactive',
        'active',
        'demos',
        'other',
      ],
      project_status: ['Demos', 'Active', 'Launched', 'Delayed', 'Archived', 'Canceled', 'Done'],
      project_type: ['web_design', 'ai_agent', 'seo', 'ads', 'voice_agent', 'ai_platform', 'app'],
      provisioning_status: [
        'not_started',
        'pending',
        'in_progress',
        'completed',
        'partial_failure',
        'failed',
      ],
      task_item_type: ['task', 'issue', 'note', 'resource'],
      task_priority: ['No Priority', 'Urgent', 'High', 'Medium', 'Low'],
      task_status: ['Todo', 'In Progress', 'Done', 'Canceled'],
      user_role: ['admin', 'manager', 'employee', 'client'],
    },
  },
} as const;

// ============================================================================
// Type Aliases for Convenience
// ============================================================================

// Table type aliases
export type Client = Tables<'clients'>;
export type Project = Tables<'projects'>;
export type Task = Tables<'tasks'>;
export type Issue = Tables<'issues'>;
export type Meeting = Tables<'meetings'>;
export type Profile = Tables<'profiles'>;
export type ProjectFile = Tables<'project_files'>;
export type ProjectIntegration = Tables<'project_integrations'>;

// Enum type aliases
export type ProjectType = Database['public']['Enums']['project_type'];
export type ProjectStatus = Database['public']['Enums']['project_status'];
export type ProjectGroup = Database['public']['Enums']['project_group'];
export type DeploymentPlatform = Database['public']['Enums']['deployment_platform'];
export type UserRole = Database['public']['Enums']['user_role'];
export type LeadStatus = Database['public']['Enums']['lead_status'];
