// 이 파일은 supabase/migrations 스키마와 1:1로 대응하는 타입 정의다.
// Supabase CLI 연결 시 `npm run gen:types` 로 자동 생성본으로 교체할 수 있다.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TaskStatusDb = 'todo' | 'in_progress' | 'review_requested' | 'done' | 'rejected'
export type EnvironmentDb = 'dev' | 'stg' | 'prd'
export type TeamRoleDb = '사업' | '기획' | 'TPM' | 'FE' | 'BE'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          project_id: string
          email: string
          name: string
          team_role: TeamRoleDb | null
          messenger_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          project_id: string
          email: string
          name: string
          team_role?: TeamRoleDb | null
          messenger_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          email?: string
          name?: string
          team_role?: TeamRoleDb | null
          messenger_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          assignee_id: string
          status: TaskStatusDb
          environment: EnvironmentDb
          due_date: string | null
          confluence_url: string | null
          verify_url: string | null
          verify_point: string | null
          screenshot_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          assignee_id: string
          status?: TaskStatusDb
          environment: EnvironmentDb
          due_date?: string | null
          confluence_url?: string | null
          verify_url?: string | null
          verify_point?: string | null
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          assignee_id?: string
          status?: TaskStatusDb
          environment?: EnvironmentDb
          due_date?: string | null
          confluence_url?: string | null
          verify_url?: string | null
          verify_point?: string | null
          screenshot_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          created_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string
          created_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string
          created_at?: string
          archived_at?: string | null
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          id: string
          project_id: string
          body: string
          author_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          body: string
          author_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          body?: string
          author_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      task_history: {
        Row: {
          id: string
          task_id: string
          from_status: TaskStatusDb | null
          to_status: TaskStatusDb
          changed_by: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          from_status?: TaskStatusDb | null
          to_status: TaskStatusDb
          changed_by: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          from_status?: TaskStatusDb | null
          to_status?: TaskStatusDb
          changed_by?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          task_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          author_id?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      template_items: {
        Row: {
          id: string
          template_id: string
          title: string
          description: string | null
          environment: EnvironmentDb | null
          confluence_url: string | null
          verify_url: string | null
          verify_point: string | null
          default_assignee_name: string | null
        }
        Insert: {
          id?: string
          template_id: string
          title: string
          description?: string | null
          environment?: EnvironmentDb | null
          confluence_url?: string | null
          verify_url?: string | null
          verify_point?: string | null
          default_assignee_name?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          title?: string
          description?: string | null
          environment?: EnvironmentDb | null
          confluence_url?: string | null
          verify_url?: string | null
          verify_point?: string | null
          default_assignee_name?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string
          task_id: string | null
          user_id: string
          kind: string
          sent_at: string
          dedupe_key: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          user_id: string
          kind: string
          sent_at?: string
          dedupe_key: string
        }
        Update: {
          id?: string
          task_id?: string | null
          user_id?: string
          kind?: string
          sent_at?: string
          dedupe_key?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedule_phases: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      task_status: TaskStatusDb
      environment: EnvironmentDb
    }
    CompositeTypes: Record<never, never>
  }
}
