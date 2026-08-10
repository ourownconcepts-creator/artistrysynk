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
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          confirmation_token: string
          confirmed_at: string | null
          email: string
          id: string
          requested_at: string
          scheduled_for: string | null
          status: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          confirmation_token: string
          confirmed_at?: string | null
          email: string
          id?: string
          requested_at?: string
          scheduled_for?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          confirmation_token?: string
          confirmed_at?: string | null
          email?: string
          id?: string
          requested_at?: string
          scheduled_for?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
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
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_role: string | null
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json
          reason: string | null
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          reason?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          reason?: string | null
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
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
      compliance_records: {
        Row: {
          activity: string | null
          approved_at: string | null
          approved_by: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          last_reviewed_at: string | null
          linked_record_id: string | null
          owner: string | null
          record_type: string
          reference_id: string | null
          review_due: string | null
          review_notes: string | null
          risk_level: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          activity?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_reviewed_at?: string | null
          linked_record_id?: string | null
          owner?: string | null
          record_type: string
          reference_id?: string | null
          review_due?: string | null
          review_notes?: string | null
          risk_level?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          activity?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_reviewed_at?: string | null
          linked_record_id?: string | null
          owner?: string | null
          record_type?: string
          reference_id?: string | null
          review_due?: string | null
          review_notes?: string | null
          risk_level?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_records_linked_record_id_fkey"
            columns: ["linked_record_id"]
            isOneToOne: false
            referencedRelation: "compliance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submission_audit: {
        Row: {
          captcha_passed: boolean | null
          captcha_required: boolean
          created_at: string
          email: string | null
          id: string
          ip_hash: string | null
          outcome: string
          reference_id: string | null
          reject_reason: string | null
          submission_id: string | null
          user_agent: string | null
          validation_results: Json
        }
        Insert: {
          captcha_passed?: boolean | null
          captcha_required?: boolean
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          outcome: string
          reference_id?: string | null
          reject_reason?: string | null
          submission_id?: string | null
          user_agent?: string | null
          validation_results?: Json
        }
        Update: {
          captcha_passed?: boolean | null
          captcha_required?: boolean
          created_at?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          outcome?: string
          reference_id?: string | null
          reject_reason?: string | null
          submission_id?: string | null
          user_agent?: string | null
          validation_results?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contact_submission_audit_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contact_submissions"
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
          reference_id: string | null
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
          reference_id?: string | null
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
          reference_id?: string | null
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
          evidence_urls: string[]
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          supporting_info: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          appeal_reason: string
          content_id: string
          content_type: string
          created_at?: string
          evidence_urls?: string[]
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_info?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          appeal_reason?: string
          content_id?: string
          content_type?: string
          created_at?: string
          evidence_urls?: string[]
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_info?: string | null
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
          evidence_urls: string[]
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          evidence_urls?: string[]
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          evidence_urls?: string[]
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
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
      copyright_claims: {
        Row: {
          admin_notes: string | null
          claimant_user_id: string | null
          contact_email: string
          contact_phone: string | null
          content_id: string | null
          content_type: string
          content_url: string
          created_at: string
          declaration_accepted: boolean
          evidence_urls: string[]
          id: string
          infringement_explanation: string
          outcome: string | null
          reference_id: string
          respondent_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rights_holder_name: string
          status: string
          submitter_ip_hash: string | null
          updated_at: string
          work_description: string
        }
        Insert: {
          admin_notes?: string | null
          claimant_user_id?: string | null
          contact_email: string
          contact_phone?: string | null
          content_id?: string | null
          content_type: string
          content_url: string
          created_at?: string
          declaration_accepted?: boolean
          evidence_urls?: string[]
          id?: string
          infringement_explanation: string
          outcome?: string | null
          reference_id: string
          respondent_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_holder_name: string
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
          work_description: string
        }
        Update: {
          admin_notes?: string | null
          claimant_user_id?: string | null
          contact_email?: string
          contact_phone?: string | null
          content_id?: string | null
          content_type?: string
          content_url?: string
          created_at?: string
          declaration_accepted?: boolean
          evidence_urls?: string[]
          id?: string
          infringement_explanation?: string
          outcome?: string | null
          reference_id?: string
          respondent_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rights_holder_name?: string
          status?: string
          submitter_ip_hash?: string | null
          updated_at?: string
          work_description?: string
        }
        Relationships: []
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
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          download_count: number
          download_token: string | null
          error_message: string | null
          expires_at: string | null
          file_size: number | null
          id: string
          requested_at: string
          status: string
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          download_count?: number
          download_token?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          requested_at?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          download_count?: number
          download_token?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          requested_at?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_inventory: {
        Row: {
          created_at: string
          data_category: string
          deletion_behaviour: string
          field_name: string
          id: string
          is_required: boolean
          lawful_basis: string
          purpose: string
          retention: string
          security_classification: string
          storage_location: string
          table_name: string
          third_parties: string | null
          updated_at: string
          user_visible_label: string | null
          visibility: string
        }
        Insert: {
          created_at?: string
          data_category: string
          deletion_behaviour: string
          field_name: string
          id?: string
          is_required?: boolean
          lawful_basis: string
          purpose: string
          retention: string
          security_classification?: string
          storage_location?: string
          table_name: string
          third_parties?: string | null
          updated_at?: string
          user_visible_label?: string | null
          visibility: string
        }
        Update: {
          created_at?: string
          data_category?: string
          deletion_behaviour?: string
          field_name?: string
          id?: string
          is_required?: boolean
          lawful_basis?: string
          purpose?: string
          retention?: string
          security_classification?: string
          storage_location?: string
          table_name?: string
          third_parties?: string | null
          updated_at?: string
          user_visible_label?: string | null
          visibility?: string
        }
        Relationships: []
      }
      data_processors: {
        Row: {
          contract_status: string
          created_at: string
          data_accessed: string
          id: string
          is_active: boolean
          notes: string | null
          processing_location: string | null
          provider: string
          purpose: string
          retention: string | null
          security_documentation: string | null
          service: string
          transfer_mechanism: string | null
          updated_at: string
        }
        Insert: {
          contract_status?: string
          created_at?: string
          data_accessed: string
          id?: string
          is_active?: boolean
          notes?: string | null
          processing_location?: string | null
          provider: string
          purpose: string
          retention?: string | null
          security_documentation?: string | null
          service: string
          transfer_mechanism?: string | null
          updated_at?: string
        }
        Update: {
          contract_status?: string
          created_at?: string
          data_accessed?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          processing_location?: string | null
          provider?: string
          purpose?: string
          retention?: string | null
          security_documentation?: string | null
          service?: string
          transfer_mechanism?: string | null
          updated_at?: string
        }
        Relationships: []
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      function_run_logs: {
        Row: {
          context: Json
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          status: string
        }
        Insert: {
          context?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          status?: string
        }
        Update: {
          context?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          status?: string
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
      legal_document_versions: {
        Row: {
          change_note: string | null
          content: string
          created_at: string
          created_by: string | null
          document_id: string
          effective_date: string
          id: string
          published_at: string | null
          requires_reacceptance: boolean
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          change_note?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          document_id: string
          effective_date?: string
          id?: string
          published_at?: string | null
          requires_reacceptance?: boolean
          status?: string
          updated_at?: string
          version: number
        }
        Update: {
          change_note?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          effective_date?: string
          id?: string
          published_at?: string | null
          requires_reacceptance?: boolean
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          category: string
          created_at: string
          id: string
          is_acceptance_required: boolean
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_acceptance_required?: boolean
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_acceptance_required?: boolean
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string
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
      moderation_actions: {
        Row: {
          action: string
          content_id: string
          content_type: string
          created_at: string
          flag_id: string | null
          id: string
          is_bulk: boolean
          moderator_id: string
          new_status: string | null
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          created_at?: string
          flag_id?: string | null
          id?: string
          is_bulk?: boolean
          moderator_id: string
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          created_at?: string
          flag_id?: string | null
          id?: string
          is_bulk?: boolean
          moderator_id?: string
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "content_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_users: {
        Row: {
          created_at: string
          id: string
          muted_id: string
          muter_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          muted_id: string
          muter_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          muted_id?: string
          muter_id?: string
          reason?: string | null
        }
        Relationships: []
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
      privacy_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          contact_email: string
          created_at: string
          details: string | null
          id: string
          reference_id: string
          request_type: string
          resolution_notes: string | null
          response_due_at: string
          status: string
          updated_at: string
          user_id: string | null
          verification_status: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_email: string
          created_at?: string
          details?: string | null
          id?: string
          reference_id: string
          request_type: string
          resolution_notes?: string | null
          response_due_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          contact_email?: string
          created_at?: string
          details?: string | null
          id?: string
          reference_id?: string
          request_type?: string
          resolution_notes?: string | null
          response_due_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verification_status?: string
        }
        Relationships: []
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
          error_message: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_hidden: boolean
          project_id: string
          updated_at: string
          upload_progress: number
          upload_status: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_hidden?: boolean
          project_id: string
          updated_at?: string
          upload_progress?: number
          upload_status?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_hidden?: boolean
          project_id?: string
          updated_at?: string
          upload_progress?: number
          upload_status?: string
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
      project_invites: {
        Row: {
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          message: string | null
          project_id: string
          responded_at: string | null
          role: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          message?: string | null
          project_id: string
          responded_at?: string | null
          role?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          message?: string | null
          project_id?: string
          responded_at?: string | null
          role?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          can_approve_roles: boolean
          id: string
          joined_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          can_approve_roles?: boolean
          id?: string
          joined_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          can_approve_roles?: boolean
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
      project_role_changes: {
        Row: {
          auto_resolved: boolean
          created_at: string
          id: string
          member_id: string
          note: string | null
          previous_role: string | null
          project_id: string
          requested_by: string
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          sla_deadline: string | null
          sla_fallback: string
          sla_hours: number | null
          status: string
          updated_at: string
        }
        Insert: {
          auto_resolved?: boolean
          created_at?: string
          id?: string
          member_id: string
          note?: string | null
          previous_role?: string | null
          project_id: string
          requested_by: string
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_deadline?: string | null
          sla_fallback?: string
          sla_hours?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          auto_resolved?: boolean
          created_at?: string
          id?: string
          member_id?: string
          note?: string | null
          previous_role?: string | null
          project_id?: string
          requested_by?: string
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sla_deadline?: string | null
          sla_fallback?: string
          sla_hours?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_role_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          role_approval_fallback: string
          role_approval_sla_hours: number
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
          role_approval_fallback?: string
          role_approval_sla_hours?: number
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
          role_approval_fallback?: string
          role_approval_sla_hours?: number
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
      retention_policies: {
        Row: {
          category: string
          created_at: string
          deletion_behaviour: string
          description: string
          id: string
          is_automated: boolean
          justification: string
          last_deleted_count: number | null
          last_run_at: string | null
          retention_days: number | null
          retention_rule: string
          target_column: string | null
          target_condition: string | null
          target_table: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          deletion_behaviour: string
          description: string
          id?: string
          is_automated?: boolean
          justification: string
          last_deleted_count?: number | null
          last_run_at?: string | null
          retention_days?: number | null
          retention_rule: string
          target_column?: string | null
          target_condition?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          deletion_behaviour?: string
          description?: string
          id?: string
          is_automated?: boolean
          justification?: string
          last_deleted_count?: number | null
          last_run_at?: string | null
          retention_days?: number | null
          retention_rule?: string
          target_column?: string | null
          target_condition?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      retention_runs: {
        Row: {
          category: string
          created_at: string
          cutoff: string | null
          deleted_count: number
          error_message: string | null
          id: string
          policy_id: string | null
          status: string
          target: string
          triggered_by: string
        }
        Insert: {
          category: string
          created_at?: string
          cutoff?: string | null
          deleted_count?: number
          error_message?: string | null
          id?: string
          policy_id?: string | null
          status?: string
          target: string
          triggered_by?: string
        }
        Update: {
          category?: string
          created_at?: string
          cutoff?: string | null
          deleted_count?: number
          error_message?: string | null
          id?: string
          policy_id?: string | null
          status?: string
          target?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_runs_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "retention_policies"
            referencedColumns: ["id"]
          },
        ]
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
      saved_filter_presets: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          scope?: string
          updated_at?: string
          user_id?: string
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
      secure_integration_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      security_incident_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          incident_id: string
          notes: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          incident_id: string
          notes?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          incident_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          affected_user_estimate: number | null
          containment_status: string
          created_at: string
          created_by: string
          data_categories_affected: string[]
          description: string | null
          discovered_at: string
          id: string
          investigation_notes: string | null
          lessons_learned: string | null
          occurred_at: string | null
          reference_id: string
          regulator_notified: boolean
          regulator_notified_at: string | null
          resolution: string | null
          severity: string
          status: string
          systems_affected: string[]
          title: string
          updated_at: string
          users_notified: boolean
          users_notified_at: string | null
        }
        Insert: {
          affected_user_estimate?: number | null
          containment_status?: string
          created_at?: string
          created_by: string
          data_categories_affected?: string[]
          description?: string | null
          discovered_at?: string
          id?: string
          investigation_notes?: string | null
          lessons_learned?: string | null
          occurred_at?: string | null
          reference_id: string
          regulator_notified?: boolean
          regulator_notified_at?: string | null
          resolution?: string | null
          severity?: string
          status?: string
          systems_affected?: string[]
          title: string
          updated_at?: string
          users_notified?: boolean
          users_notified_at?: string | null
        }
        Update: {
          affected_user_estimate?: number | null
          containment_status?: string
          created_at?: string
          created_by?: string
          data_categories_affected?: string[]
          description?: string | null
          discovered_at?: string
          id?: string
          investigation_notes?: string | null
          lessons_learned?: string | null
          occurred_at?: string | null
          reference_id?: string
          regulator_notified?: boolean
          regulator_notified_at?: string | null
          resolution?: string | null
          severity?: string
          status?: string
          systems_affected?: string[]
          title?: string
          updated_at?: string
          users_notified?: boolean
          users_notified_at?: string | null
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
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
      service_subcategories: {
        Row: {
          category_label: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_label: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_label?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subcategories_category_label_fkey"
            columns: ["category_label"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["label"]
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
          subcategory: string | null
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
          subcategory?: string | null
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
          subcategory?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
      user_consents: {
        Row: {
          app_version: string | null
          consent_type: string
          context: string
          created_at: string
          document_slug: string | null
          document_version: number | null
          document_version_id: string | null
          granted: boolean
          id: string
          ip_hash: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          consent_type: string
          context?: string
          created_at?: string
          document_slug?: string | null
          document_version?: number | null
          document_version_id?: string | null
          granted?: boolean
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          consent_type?: string
          context?: string
          created_at?: string
          document_slug?: string | null
          document_version?: number | null
          document_version_id?: string | null
          granted?: boolean
          id?: string
          ip_hash?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
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
          ai_features_enabled: boolean
          allow_messages_from: string | null
          created_at: string
          discoverable_in_discovery: boolean
          discoverable_in_recommendations: boolean
          discoverable_in_search: boolean
          email_notifications: boolean | null
          force_password_change: boolean | null
          id: string
          last_digest_sent_at: string | null
          location_precision: string
          marketing_emails: boolean | null
          match_activity_digest: boolean
          match_notifications: boolean | null
          match_online_notifications: boolean
          message_notifications: boolean | null
          notify_email_discovery: boolean
          notify_email_likes: boolean
          notify_email_matches: boolean
          notify_email_messages: boolean
          notify_email_online: boolean
          notify_email_projects: boolean
          notify_inapp_discovery: boolean
          notify_inapp_likes: boolean
          notify_inapp_matches: boolean
          notify_inapp_messages: boolean
          notify_inapp_online: boolean
          notify_inapp_projects: boolean
          notify_inapp_room_activity: boolean
          notify_push_invite_responses: boolean
          notify_push_invites: boolean
          notify_push_role_requests: boolean
          notify_push_room_activity: boolean
          onboarding_completed: boolean | null
          personalisation_enabled: boolean
          profile_visibility: string | null
          project_notifications: boolean | null
          push_notifications: boolean | null
          show_online_status: boolean | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_features_enabled?: boolean
          allow_messages_from?: string | null
          created_at?: string
          discoverable_in_discovery?: boolean
          discoverable_in_recommendations?: boolean
          discoverable_in_search?: boolean
          email_notifications?: boolean | null
          force_password_change?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          location_precision?: string
          marketing_emails?: boolean | null
          match_activity_digest?: boolean
          match_notifications?: boolean | null
          match_online_notifications?: boolean
          message_notifications?: boolean | null
          notify_email_discovery?: boolean
          notify_email_likes?: boolean
          notify_email_matches?: boolean
          notify_email_messages?: boolean
          notify_email_online?: boolean
          notify_email_projects?: boolean
          notify_inapp_discovery?: boolean
          notify_inapp_likes?: boolean
          notify_inapp_matches?: boolean
          notify_inapp_messages?: boolean
          notify_inapp_online?: boolean
          notify_inapp_projects?: boolean
          notify_inapp_room_activity?: boolean
          notify_push_invite_responses?: boolean
          notify_push_invites?: boolean
          notify_push_role_requests?: boolean
          notify_push_room_activity?: boolean
          onboarding_completed?: boolean | null
          personalisation_enabled?: boolean
          profile_visibility?: string | null
          project_notifications?: boolean | null
          push_notifications?: boolean | null
          show_online_status?: boolean | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_features_enabled?: boolean
          allow_messages_from?: string | null
          created_at?: string
          discoverable_in_discovery?: boolean
          discoverable_in_recommendations?: boolean
          discoverable_in_search?: boolean
          email_notifications?: boolean | null
          force_password_change?: boolean | null
          id?: string
          last_digest_sent_at?: string | null
          location_precision?: string
          marketing_emails?: boolean | null
          match_activity_digest?: boolean
          match_notifications?: boolean | null
          match_online_notifications?: boolean
          message_notifications?: boolean | null
          notify_email_discovery?: boolean
          notify_email_likes?: boolean
          notify_email_matches?: boolean
          notify_email_messages?: boolean
          notify_email_online?: boolean
          notify_email_projects?: boolean
          notify_inapp_discovery?: boolean
          notify_inapp_likes?: boolean
          notify_inapp_matches?: boolean
          notify_inapp_messages?: boolean
          notify_inapp_online?: boolean
          notify_inapp_projects?: boolean
          notify_inapp_room_activity?: boolean
          notify_push_invite_responses?: boolean
          notify_push_invites?: boolean
          notify_push_role_requests?: boolean
          notify_push_room_activity?: boolean
          onboarding_completed?: boolean | null
          personalisation_enabled?: boolean
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
          granted_at: string | null
          granted_by: string | null
          id: string
          is_lifetime: boolean
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
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_lifetime?: boolean
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
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_lifetime?: boolean
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
      can_approve_project_roles: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_see_user: {
        Args: { _target_id: string; _viewer_id: string }
        Returns: boolean
      }
      claim_referral: { Args: { _code: string }; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_due_subscriptions: { Args: never; Returns: number }
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
      get_pending_legal_acceptances: {
        Args: { _user_id: string }
        Returns: {
          effective_date: string
          slug: string
          title: string
          version: number
          version_id: string
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
      get_public_profile: {
        Args: { _identifier: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          cover_image_url: string
          created_at: string
          full_name: string
          genres: string[]
          id: string
          is_verified: boolean
          location: string
          roles: string[]
          skills: string[]
          social_links: Json
          username: string
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
      is_discoverable: {
        Args: { _surface: string; _user_id: string }
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
      list_my_referrals: {
        Args: never
        Returns: {
          avatar_url: string
          completed_at: string
          created_at: string
          full_name: string
          referred_id: string
          status: string
          username: string
        }[]
      }
      list_opted_out_ids: {
        Args: { _surface: string }
        Returns: {
          user_id: string
        }[]
      }
      list_public_locations: {
        Args: { _min_creators?: number }
        Returns: {
          city: string
          country: string
          creator_count: number
        }[]
      }
      list_public_portfolio: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          created_at: string
          description: string
          id: string
          media_type: string
          media_url: string
          thumbnail_url: string
          title: string
        }[]
      }
      list_public_profiles: {
        Args: {
          _city?: string
          _limit?: number
          _offset?: number
          _role?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          country: string
          full_name: string
          id: string
          is_verified: boolean
          location: string
          roles: string[]
          username: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      resolve_overdue_role_changes: { Args: never; Returns: number }
      run_retention_purges: {
        Args: { _triggered_by?: string }
        Returns: {
          category: string
          deleted_count: number
          error_message: string
          status: string
          target: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "user"
        | "admin"
        | "master_admin"
        | "super_admin"
        | "compliance_admin"
        | "trust_safety_admin"
        | "moderator"
        | "support_agent"
        | "finance_admin"
        | "technical_admin"
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
      app_role: [
        "user",
        "admin",
        "master_admin",
        "super_admin",
        "compliance_admin",
        "trust_safety_admin",
        "moderator",
        "support_agent",
        "finance_admin",
        "technical_admin",
      ],
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
