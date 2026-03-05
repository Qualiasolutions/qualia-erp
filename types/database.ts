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
      activity_log: {
        Row: {
          id: string;
          project_id: string;
          action_type: string;
          actor_id: string;
          action_data: Json | null;
          is_client_visible: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          action_type: string;
          actor_id: string;
          action_data?: Json | null;
          is_client_visible?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          action_type?: string;
          actor_id?: string;
          action_data?: Json | null;
          is_client_visible?: boolean | null;
          created_at?: string | null;
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
      client_projects: {
        Row: {
          id: string;
          client_id: string;
          project_id: string;
          access_level: string | null;
          invited_at: string | null;
          invited_by: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id: string;
          access_level?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string;
          access_level?: string | null;
          invited_at?: string | null;
          invited_by?: string | null;
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      phase_comments: {
        Row: {
          id: string;
          project_id: string;
          phase_name: string;
          task_key: string | null;
          commented_by: string;
          comment_text: string;
          is_internal: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          phase_name: string;
          task_key?: string | null;
          commented_by: string;
          comment_text: string;
          is_internal?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          phase_name?: string;
          task_key?: string | null;
          commented_by?: string;
          comment_text?: string;
          is_internal?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
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
          template_key?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      phase_reviews: {
        Row: {
          id: string;
          project_id: string;
          phase_id: string;
          phase_name: string;
          submitted_by: string;
          submitted_at: string | null;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          feedback: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          phase_id: string;
          phase_name: string;
          submitted_by: string;
          submitted_at?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          feedback?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          phase_id?: string;
          phase_name?: string;
          submitted_by?: string;
          submitted_at?: string | null;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          feedback?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      project_phases: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          display_order: number;
          helper_text: string | null;
          id: string;
          is_custom: boolean | null;
          name: string;
          project_id: string;
          status: string;
          template_key: string | null;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          helper_text?: string | null;
          id?: string;
          is_custom?: boolean | null;
          name: string;
          project_id: string;
          status?: string;
          template_key?: string | null;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          helper_text?: string | null;
          id?: string;
          is_custom?: boolean | null;
          name?: string;
          project_id?: string;
          status?: string;
          template_key?: string | null;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      project_integrations: {
        Row: {
          id: string;
          project_id: string;
          service_type: string;
          external_url: string;
          external_id: string | null;
          metadata: Json | null;
          connected_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          service_type: string;
          external_url: string;
          external_id?: string | null;
          metadata?: Json | null;
          connected_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          service_type?: string;
          external_url?: string;
          external_id?: string | null;
          metadata?: Json | null;
          connected_at?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          creator_id: string | null;
          assignee_id: string | null;
          project_id: string | null;
          phase_id: string | null;
          title: string;
          description: string | null;
          status: Database['public']['Enums']['task_status'];
          priority: Database['public']['Enums']['task_priority'];
          sort_order: number;
          due_date: string | null;
          completed_at: string | null;
          difficulty: string | null;
          learning_objective: string | null;
          estimated_minutes_trainee: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          creator_id?: string | null;
          assignee_id?: string | null;
          project_id?: string | null;
          phase_id?: string | null;
          title: string;
          description?: string | null;
          status?: Database['public']['Enums']['task_status'];
          priority?: Database['public']['Enums']['task_priority'];
          sort_order?: number;
          due_date?: string | null;
          completed_at?: string | null;
          difficulty?: string | null;
          learning_objective?: string | null;
          estimated_minutes_trainee?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          creator_id?: string | null;
          assignee_id?: string | null;
          project_id?: string | null;
          phase_id?: string | null;
          title?: string;
          description?: string | null;
          status?: Database['public']['Enums']['task_status'];
          priority?: Database['public']['Enums']['task_priority'];
          sort_order?: number;
          due_date?: string | null;
          completed_at?: string | null;
          difficulty?: string | null;
          learning_objective?: string | null;
          estimated_minutes_trainee?: number | null;
          created_at?: string;
          updated_at?: string;
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
          is_building: boolean;
          is_finished: boolean;
          is_live: boolean;
          is_pre_production: boolean;
          lead_id: string | null;
          logo_url: string | null;
          metadata: Json | null;
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
          is_building?: boolean;
          is_finished?: boolean;
          is_live?: boolean;
          is_pre_production?: boolean;
          lead_id?: string | null;
          logo_url?: string | null;
          metadata?: Json | null;
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
          is_building?: boolean;
          is_finished?: boolean;
          is_live?: boolean;
          is_pre_production?: boolean;
          lead_id?: string | null;
          logo_url?: string | null;
          metadata?: Json | null;
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
      workspace_integrations: {
        Row: {
          id: string;
          workspace_id: string;
          provider: Database['public']['Enums']['integration_provider'];
          encrypted_token: string;
          config: Json;
          is_connected: boolean;
          last_verified_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          provider: Database['public']['Enums']['integration_provider'];
          encrypted_token: string;
          config?: Json;
          is_connected?: boolean;
          last_verified_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          provider?: Database['public']['Enums']['integration_provider'];
          encrypted_token?: string;
          config?: Json;
          is_connected?: boolean;
          last_verified_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      project_provisioning: {
        Row: {
          id: string;
          project_id: string;
          status: Database['public']['Enums']['provisioning_status'];
          github_repo_url: string | null;
          github_error: string | null;
          vercel_project_url: string | null;
          vercel_project_id: string | null;
          vercel_error: string | null;
          vapi_assistant_id: string | null;
          vapi_error: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          status?: Database['public']['Enums']['provisioning_status'];
          github_repo_url?: string | null;
          github_error?: string | null;
          vercel_project_url?: string | null;
          vercel_project_id?: string | null;
          vercel_error?: string | null;
          vapi_assistant_id?: string | null;
          vapi_error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          status?: Database['public']['Enums']['provisioning_status'];
          github_repo_url?: string | null;
          github_error?: string | null;
          vercel_project_url?: string | null;
          vercel_project_id?: string | null;
          vercel_error?: string | null;
          vapi_assistant_id?: string | null;
          vapi_error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
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
      issue_priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
      issue_status: 'Yet to Start' | 'Todo' | 'In Progress' | 'Done' | 'Canceled';
      lead_status: 'dropped' | 'cold' | 'hot' | 'active_client' | 'inactive_client' | 'dead_lead';
      project_group:
        | 'salman_kuwait'
        | 'tasos_kyriakides'
        | 'finished'
        | 'inactive'
        | 'active'
        | 'demos'
        | 'other';
      project_status: 'Demos' | 'Active' | 'Launched' | 'Delayed' | 'Archived' | 'Canceled';
      project_type: 'web_design' | 'ai_agent' | 'voice_agent' | 'ai_platform' | 'seo' | 'ads';
      task_priority: 'No Priority' | 'Urgent' | 'High' | 'Medium' | 'Low';
      task_status: 'Todo' | 'In Progress' | 'Done' | 'Canceled';
      user_role: 'admin' | 'manager' | 'employee' | 'client';
      integration_provider: 'github' | 'vercel' | 'vapi';
      provisioning_status:
        | 'not_started'
        | 'in_progress'
        | 'completed'
        | 'partial_failure'
        | 'failed';
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
export type Message = Tables<'messages'>;
export type Notification = Tables<'notifications'>;
export type ProjectPhase = Tables<'project_phases'>;
export type PhaseItem = Tables<'phase_items'>;
export type Task = Tables<'tasks'>;

// Portal & Trainee system types
export type ActivityLog = Tables<'activity_log'>;
export type ClientProject = Tables<'client_projects'>;
export type PhaseComment = Tables<'phase_comments'>;
export type PhaseReview = Tables<'phase_reviews'>;
export type ProjectIntegration = Tables<'project_integrations'>;

// Task enum types
export type TaskStatus = Enums<'task_status'>;
export type TaskPriority = Enums<'task_priority'>;

export const TASK_STATUSES: TaskStatus[] = ['Todo', 'In Progress', 'Done', 'Canceled'];
export const TASK_PRIORITIES: TaskPriority[] = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];

// Notification types
export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_updated'
  | 'comment_added'
  | 'mention'
  | 'system';

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
export const DEPLOYMENT_PLATFORMS: DeploymentPlatform[] = [
  'vercel',
  'squarespace',
  'railway',
  'meta',
  'instagram',
  'google_ads',
  'tiktok',
  'linkedin',
  'none',
];
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
  'dead_lead',
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
export const PROJECT_TYPES: ProjectType[] = [
  'web_design',
  'ai_agent',
  'voice_agent',
  'ai_platform',
  'seo',
  'ads',
];

// =====================================================
// MENTORSHIP, SKILLS & LEARNING TYPES
// =====================================================

// Task difficulty levels
export type TaskDifficulty = 'starter' | 'easy' | 'medium' | 'hard' | 'expert';
export const TASK_DIFFICULTIES: TaskDifficulty[] = ['starter', 'easy', 'medium', 'hard', 'expert'];

// Review status for mentor approval workflow
export type ReviewStatus = 'pending' | 'approved' | 'needs_revision';
export const REVIEW_STATUSES: ReviewStatus[] = ['pending', 'approved', 'needs_revision'];

// Assignment types
export type AssignmentType = 'mentor' | 'self' | 'system';
export const ASSIGNMENT_TYPES: AssignmentType[] = ['mentor', 'self', 'system'];

// Teaching note types
export type TeachingNoteType = 'hint' | 'explanation' | 'resource' | 'warning' | 'encouragement';
export const TEACHING_NOTE_TYPES: TeachingNoteType[] = [
  'hint',
  'explanation',
  'resource',
  'warning',
  'encouragement',
];

// Achievement categories and rarity
export type AchievementCategory = 'consistency' | 'milestone' | 'mastery' | 'speed' | 'quality';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

// Skill proficiency levels (1-5)
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5;
export const PROFICIENCY_LEVELS: ProficiencyLevel[] = [1, 2, 3, 4, 5];
export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  1: 'Novice',
  2: 'Beginner',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

// Skill practice source types
export type SkillPracticeSource = 'phase_item' | 'issue' | 'project' | 'manual';

// Skill category interface
export interface SkillCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
  created_at: string;
}

// Skill interface
export interface Skill {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  project_types: string[];
  complexity_level: number;
  created_at: string;
  // Joined data
  category?: SkillCategory;
}

// User skill interface
export interface UserSkill {
  id: string;
  profile_id: string;
  skill_id: string;
  proficiency_level: ProficiencyLevel;
  times_practiced: number;
  xp_earned: number;
  last_practiced_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  skill?: Skill;
}

// Skill practice log interface
export interface SkillPracticeLog {
  id: string;
  profile_id: string;
  skill_id: string;
  source_type: SkillPracticeSource;
  source_id: string | null;
  xp_earned: number;
  notes: string | null;
  practiced_at: string;
}

// Achievement interface
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlock_conditions: Record<string, unknown>;
  xp_reward: number;
  is_active: boolean;
  created_at: string;
}

// User achievement interface
export interface UserAchievement {
  id: string;
  profile_id: string;
  achievement_id: string;
  earned_at: string;
  is_seen: boolean;
  // Joined data
  achievement?: Achievement;
}

// Teaching note interface
export interface TeachingNote {
  id: string;
  issue_id: string | null;
  phase_item_id: string | null;
  mentor_id: string;
  note_type: TeachingNoteType;
  content: string;
  is_pinned: boolean;
  created_at: string;
  // Joined data
  mentor?: Profile;
}

// Task reflection interface
export interface TaskReflection {
  id: string;
  issue_id: string | null;
  task_id: string | null;
  profile_id: string;
  what_learned: string | null;
  challenges_faced: string | null;
  time_spent_minutes: number | null;
  difficulty_rating: number | null;
  created_at: string;
}

// Issue skill junction
export interface IssueSkill {
  id: string;
  issue_id: string;
  skill_id: string;
  is_primary: boolean;
}

// Extended profile with trainee fields
export interface ExtendedProfile extends Profile {
  is_trainee?: boolean;
  mentor_id?: string | null;
  learn_mode?: boolean;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  total_xp?: number;
  current_streak?: number;
  longest_streak?: number;
  last_activity_date?: string | null;
  // Joined data
  mentor?: Profile;
}

// Extended issue with learning fields
export interface ExtendedIssue extends Issue {
  difficulty?: TaskDifficulty;
  learning_objective?: string | null;
  why_it_matters?: string | null;
  estimated_minutes_experienced?: number | null;
  estimated_minutes_trainee?: number | null;
  requires_review?: boolean;
  reviewer_id?: string | null;
  review_status?: ReviewStatus | null;
  review_notes?: string | null;
  reviewed_at?: string | null;
  // Joined data
  reviewer?: Profile;
  skills?: Skill[];
  teaching_notes?: TeachingNote[];
}

// Extended issue assignee with mentor tracking
export interface ExtendedIssueAssignee extends IssueAssignee {
  assignment_type?: AssignmentType;
  assignment_context?: string | null;
  mentor_id?: string | null;
}

// Project file interface
export interface ProjectFile {
  id: string;
  project_id: string;
  workspace_id: string | null;
  name: string;
  original_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // New columns (Phase 3 Plan 2)
  description: string | null;
  phase_id: string | null;
  is_client_visible: boolean;
  // Joined data
  uploader?: Profile;
  phase?: { id: string; phase_name: string } | null;
}

// Integration types
export type WorkspaceIntegration = Tables<'workspace_integrations'>;
export type ProjectProvisioning = Tables<'project_provisioning'>;
export type IntegrationProvider = Enums<'integration_provider'>;
export type ProvisioningStatus = Enums<'provisioning_status'>;

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = ['github', 'vercel', 'vapi'];
export const PROVISIONING_STATUSES: ProvisioningStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'partial_failure',
  'failed',
];
