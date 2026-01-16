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
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          subject?: string
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
          read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
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
          cover_image_url: string | null
          created_at: string | null
          email: string | null
          featured_until: string | null
          full_name: string
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          location: string | null
          social_links: Json | null
          synergy_boost_score: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email?: string | null
          featured_until?: string | null
          full_name: string
          id: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          social_links?: Json | null
          synergy_boost_score?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          email?: string | null
          featured_until?: string | null
          full_name?: string
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          location?: string | null
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
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          looking_for: string[] | null
          status: Database["public"]["Enums"]["collaboration_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          looking_for?: string[] | null
          status?: Database["public"]["Enums"]["collaboration_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          looking_for?: string[] | null
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
