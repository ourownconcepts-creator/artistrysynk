export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string | null
          target_user_name: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          action_data: Json | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          recipient_admin_id: string
          sender_admin_id: string | null
          title: string
        }
        Insert: {
          action_data?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          recipient_admin_id: string
          sender_admin_id?: string | null
          title: string
        }
        Update: {
          action_data?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          recipient_admin_id?: string
          sender_admin_id?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      career_applications: {
        Row: {
          cover_letter: string
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          job_title: string
          phone: string | null
          portfolio_url: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          cover_letter: string
          created_at?: string
          department: string
          email: string
          full_name: string
          id?: string
          job_title: string
          phone?: string | null
          portfolio_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          cover_letter?: string
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          job_title?: string
          phone?: string | null
          portfolio_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collaboration_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "collaboration_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "collaboration_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_post_ratings: {
        Row: {
          created_at: string
          id: string
          post_id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_post_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "collaboration_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "collaboration_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "collaboration_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_posts: {
        Row: {
          content: string
          created_at: string
          hashtags: string[] | null
          id: string
          role_tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          role_tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          role_tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_requests: {
        Row: {
          created_at: string
          id: string
          match_id: string
          message: string | null
          project_title: string
          project_type: string
          recipient_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          message?: string | null
          project_title: string
          project_type: string
          recipient_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          message?: string | null
          project_title?: string
          project_type?: string
          recipient_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_requests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          status: string | null
          subject: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      content_appeals: {
        Row: {
          admin_response: string | null
          appeal_reason: string
          content_id: string
          content_type: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          appeal_reason: string
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          appeal_reason?: string
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_flags: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_credits: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean | null
          project_id: string
          role_title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          project_id: string
          role_title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean | null
          project_id?: string
          role_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_credits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      device_push_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      external_file_links: {
        Row: {
          added_by: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          provider: string
        }
        Insert: {
          added_by: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          provider: string
        }
        Update: {
          added_by?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_file_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_creatives: {
        Row: {
          created_at: string | null
          end_date: string | null
          featured_by: string | null
          id: string
          is_active: boolean | null
          reason: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          featured_by?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          featured_by?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          budget_range: string | null
          created_at: string
          description: string
          expires_at: string | null
          id: string
          is_active: boolean
          job_type: string
          location: string | null
          required_roles: string[] | null
          required_skills: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_type?: string
          location?: string | null
          required_roles?: string[] | null
          required_skills?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          job_type?: string
          location?: string | null
          required_roles?: string[] | null
          required_skills?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          matched_at: string | null
          user_id_1: string
          user_id_2: string
        }
        Insert: {
          id?: string
          matched_at?: string | null
          user_id_1: string
          user_id_2: string
        }
        Update: {
          id?: string
          matched_at?: string | null
          user_id_1?: string
          user_id_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_id_1_fkey"
            columns: ["user_id_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_id_2_fkey"
            columns: ["user_id_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_hidden: boolean | null
          read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_hidden: boolean | null
          media_type: string
          media_url: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_hidden?: boolean | null
          media_type: string
          media_url: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_hidden?: boolean | null
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          email: string | null
          featured_until: string | null
          full_name: string
          id: string
          is_featured: boolean | null
          is_hidden: boolean | null
          is_verified: boolean | null
          last_seen_at: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          looking_for: string[] | null
          social_links: Json | null
          synergy_boost_score: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email?: string | null
          featured_until?: string | null
          full_name: string
          id: string
          is_featured?: boolean | null
          is_hidden?: boolean | null
          is_verified?: boolean | null
          last_seen_at?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          looking_for?: string[] | null
          social_links?: Json | null
          synergy_boost_score?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email?: string | null
          featured_until?: string | null
          full_name?: string
          id?: string
          is_featured?: boolean | null
          is_hidden?: boolean | null
          is_verified?: boolean | null
          last_seen_at?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          looking_for?: string[] | null
          social_links?: Json | null
          synergy_boost_score?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      project_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          project_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          project_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          message: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: string | null
          compensation_type: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_hidden: boolean | null
          is_open: boolean | null
          is_public: boolean | null
          looking_for: string[] | null
          project_category: string | null
          status: Database["public"]["Enums"]["collaboration_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget?: string | null
          compensation_type?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_hidden?: boolean | null
          is_open?: boolean | null
          is_public?: boolean | null
          looking_for?: string[] | null
          project_category?: string | null
          status?: Database["public"]["Enums"]["collaboration_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget?: string | null
          compensation_type?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_hidden?: boolean | null
          is_open?: boolean | null
          is_public?: boolean | null
          looking_for?: string[] | null
          project_category?: string | null
          status?: Database["public"]["Enums"]["collaboration_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      revenue_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_newsletters: {
        Row: {
          audience: string
          content: string
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          preview_text: string | null
          recipients_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string
          template_id: string
          updated_at: string
        }
        Insert: {
          audience?: string
          content: string
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          preview_text?: string | null
          recipients_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string
          updated_at?: string
        }
        Update: {
          audience?: string
          content?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          preview_text?: string | null
          recipients_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_sent: string | null
          next_scheduled: string | null
          recipients: Json
          report_type: string
        }
        Insert: {
          created_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          next_scheduled?: string | null
          recipients: Json
          report_type: string
        }
        Update: {
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          next_scheduled?: string | null
          recipients?: Json
          report_type?: string
        }
        Relationships: []
      }
      service_orders: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          delivery_date: string | null
          id: string
          requirements: string | null
          seller_id: string
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          requirements?: string | null
          seller_id: string
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          requirements?: string | null
          seller_id?: string
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          created_at: string
          id: string
          order_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          seller_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          seller_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          seller_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          average_rating: number | null
          category: string
          created_at: string
          currency: string | null
          delivery_days: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_hidden: boolean | null
          price: number
          seller_id: string
          title: string
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          average_rating?: number | null
          category: string
          created_at?: string
          currency?: string | null
          delivery_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          price: number
          seller_id: string
          title: string
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          average_rating?: number | null
          category?: string
          created_at?: string
          currency?: string | null
          delivery_days?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          price?: number
          seller_id?: string
          title?: string
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      studio_feedback: {
        Row: {
          content: string
          created_at: string | null
          id: string
          portfolio_item_id: string
          timestamp_seconds: number | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          portfolio_item_id: string
          timestamp_seconds?: number | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          portfolio_item_id?: string
          timestamp_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_feedback_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      swipe_rewinds: {
        Row: {
          id: string
          rewound_at: string
          swipe_id: string
          user_id: string
        }
        Insert: {
          id?: string
          rewound_at?: string
          swipe_id: string
          user_id: string
        }
        Update: {
          id?: string
          rewound_at?: string
          swipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipe_rewinds_swipe_id_fkey"
            columns: ["swipe_id"]
            isOneToOne: true
            referencedRelation: "swipes"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          created_at: string | null
          id: string
          liked: boolean
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          liked: boolean
          swiped_id: string
          swiper_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          liked?: boolean
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_swiped_id_fkey"
            columns: ["swiped_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_swiper_id_fkey"
            columns: ["swiper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_creative_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["creative_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["creative_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["creative_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_creative_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_genres: {
        Row: {
          created_at: string | null
          genre: Database["public"]["Enums"]["genre"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          genre: Database["public"]["Enums"]["genre"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          genre?: Database["public"]["Enums"]["genre"]
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_genres_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active: string | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          allow_messages_from: string | null
          created_at: string
          email_notifications: boolean | null
          force_password_change: boolean | null
          id: string
          last_digest_sent_at: string | null
          marketing_emails: boolean | null
          match_activity_digest: boolean
          match_notifications: boolean | null
          match_online_notifications: boolean
          message_notifications: boolean | null
          onboarding_completed: boolean | null
          profile_visibility: string | null
          project_notifications: boolean | null
          push_notifications: boolean | null
          show_online_status: boolean | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_messages_from?: string | null
          created_at?: string
          email_notifications?: boolean | null
          force_password_change?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          marketing_emails?: boolean | null
          match_activity_digest?: boolean
          match_notifications?: boolean | null
          match_online_notifications?: boolean
          message_notifications?: boolean | null
          onboarding_completed?: boolean | null
          profile_visibility?: string | null
          project_notifications?: boolean | null
          push_notifications?: boolean | null
          show_online_status?: boolean | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_messages_from?: string | null
          created_at?: string
          email_notifications?: boolean | null
          force_password_change?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          marketing_emails?: boolean | null
          match_activity_digest?: boolean
          match_notifications?: boolean | null
          match_online_notifications?: boolean
          message_notifications?: boolean | null
          onboarding_completed?: boolean | null
          profile_visibility?: string | null
          project_notifications?: boolean | null
          push_notifications?: boolean | null
          show_online_status?: boolean | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_skill_tags: {
        Row: {
          created_at: string
          id: string
          skill: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paystack_customer_id: string | null
          paystack_subscription_code: string | null
          status: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          status?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          reason: string
          suspended_by: string
          suspension_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason: string
          suspended_by: string
          suspension_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          reason?: string
          suspended_by?: string
          suspension_type?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string | null
          id: string
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
          user_id: string
          verification_data: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verification_data?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verification_data?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_user: {
        Args: { _target_id: string; _viewer_id: string }
        Returns: boolean
      }
      get_match_activity_since: {
        Args: { _since: string; _user_id: string }
        Returns: {
          avatar_url: string
          came_online: boolean
          full_name: string
          last_seen_at: string
          match_user_id: string
          new_messages: number
          new_portfolio_items: number
          username: string
        }[]
      }
      get_nearby_creators: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _radius_km?: number
          _user_id: string
        }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          distance_km: number
          full_name: string
          id: string
          is_verified: boolean
          latitude: number
          location: string
          longitude: number
          username: string
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_profile_emails: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_creator: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "master_admin" | "super_admin"
      collaboration_status: "pending" | "active" | "completed" | "cancelled"
      creative_role:
        | "musician"
        | "producer"
        | "songwriter"
        | "performer"
        | "dancer"
        | "vixen"
        | "actor"
        | "director"
        | "screenwriter"
        | "designer"
        | "photographer"
        | "videographer"
        | "promoter"
        | "manager"
        | "strategist"
        | "singer"
        | "rapper"
        | "dj"
        | "sound_engineer"
        | "beatmaker"
        | "vocal_coach"
        | "filmmaker"
        | "video_editor"
        | "cinematographer"
        | "animator"
        | "motion_designer"
        | "podcaster"
        | "voiceover_artist"
        | "graphic_designer"
        | "illustrator"
        | "model"
        | "stylist"
        | "makeup_artist"
        | "writer"
        | "creative_director"
        | "choreographer"
        | "fashion_designer"
        | "artist"
        | "audio_engineer"
        | "software_developer"
        | "frontend_developer"
        | "backend_developer"
        | "full_stack_developer"
        | "mobile_app_developer"
        | "ai_engineer"
        | "blockchain_developer"
        | "ui_designer"
        | "ux_designer"
        | "product_designer"
        | "3d_designer"
        | "product_manager"
        | "startup_founder"
        | "technical_cofounder"
        | "growth_marketer"
        | "seo_specialist"
        | "digital_marketer"
        | "data_scientist"
        | "devops_engineer"
        | "game_developer"
        | "content_creator"
      genre:
        | "afrobeats"
        | "hip_hop"
        | "rnb"
        | "gospel"
        | "pop"
        | "reggae"
        | "dancehall"
        | "amapiano"
        | "highlife"
        | "fuji"
        | "juju"
        | "other"
      subscription_tier: "free" | "pro" | "studio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "master_admin", "super_admin"],
      collaboration_status: ["pending", "active", "completed", "cancelled"],
      creative_role: [
        "musician",
        "producer",
        "songwriter",
        "performer",
        "dancer",
        "vixen",
        "actor",
        "director",
        "screenwriter",
        "designer",
        "photographer",
        "videographer",
        "promoter",
        "manager",
        "strategist",
        "singer",
        "rapper",
        "dj",
        "sound_engineer",
        "beatmaker",
        "vocal_coach",
        "filmmaker",
        "video_editor",
        "cinematographer",
        "animator",
        "motion_designer",
        "podcaster",
        "voiceover_artist",
        "graphic_designer",
        "illustrator",
        "model",
        "stylist",
        "makeup_artist",
        "writer",
        "creative_director",
        "choreographer",
        "fashion_designer",
        "artist",
        "audio_engineer",
        "software_developer",
        "frontend_developer",
        "backend_developer",
        "full_stack_developer",
        "mobile_app_developer",
        "ai_engineer",
        "blockchain_developer",
        "ui_designer",
        "ux_designer",
        "product_designer",
        "3d_designer",
        "product_manager",
        "startup_founder",
        "technical_cofounder",
        "growth_marketer",
        "seo_specialist",
        "digital_marketer",
        "data_scientist",
        "devops_engineer",
        "game_developer",
        "content_creator",
      ],
      genre: [
        "afrobeats",
        "hip_hop",
        "rnb",
        "gospel",
        "pop",
        "reggae",
        "dancehall",
        "amapiano",
        "highlife",
        "fuji",
        "juju",
        "other",
      ],
      subscription_tier: ["free", "pro", "studio"],
    },
  },
} as const
