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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string
          form_endpoint: string
          id: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_endpoint?: string
          id?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_endpoint?: string
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          cover: string
          hero: string
          id: string
          label: string
          show_in_hero: boolean
          slug: string
          sort_order: number
          tagline: string
          title: string
          updated_at: string
        }
        Insert: {
          cover?: string
          hero?: string
          id?: string
          label: string
          show_in_hero?: boolean
          slug: string
          sort_order?: number
          tagline?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover?: string
          hero?: string
          id?: string
          label?: string
          show_in_hero?: boolean
          slug?: string
          sort_order?: number
          tagline?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_changes: {
        Row: {
          after: Json | null
          before: Json | null
          changed_by: string | null
          created_at: string
          id: string
          op: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          after?: Json | null
          before?: Json | null
          changed_by?: string | null
          created_at?: string
          id?: string
          op: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          after?: Json | null
          before?: Json | null
          changed_by?: string | null
          created_at?: string
          id?: string
          op?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      content_cursor: {
        Row: {
          change_at: string | null
          change_id: string | null
          id: boolean
          updated_at: string
        }
        Insert: {
          change_at?: string | null
          change_id?: string | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          change_at?: string | null
          change_id?: string | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crm_activity: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string
          id: string
          kind: string
          message: string
          meta: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          kind?: string
          message?: string
          meta?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          kind?: string
          message?: string
          meta?: Json
        }
        Relationships: []
      }
      crm_bookings: {
        Row: {
          contact_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          lead_id: string | null
          location: string
          notes: string
          package: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          lead_id?: string | null
          location?: string
          notes?: string
          package?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          lead_id?: string | null
          location?: string
          notes?: string
          package?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_bookings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address: string
          archived: boolean
          company: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
          source: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string
          archived?: boolean
          company?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string
          archived?: boolean
          company?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          phone?: string
          source?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      crm_contract_fields: {
        Row: {
          bold: boolean
          contract_id: string
          created_at: string
          font_size: number
          h: number
          id: string
          kind: string
          label: string
          page: number
          placeholder: string
          required: boolean
          role: string
          sort_order: number
          updated_at: string
          value: string
          w: number
          x: number
          y: number
        }
        Insert: {
          bold?: boolean
          contract_id: string
          created_at?: string
          font_size?: number
          h?: number
          id?: string
          kind?: string
          label?: string
          page?: number
          placeholder?: string
          required?: boolean
          role?: string
          sort_order?: number
          updated_at?: string
          value?: string
          w?: number
          x?: number
          y?: number
        }
        Update: {
          bold?: boolean
          contract_id?: string
          created_at?: string
          font_size?: number
          h?: number
          id?: string
          kind?: string
          label?: string
          page?: number
          placeholder?: string
          required?: boolean
          role?: string
          sort_order?: number
          updated_at?: string
          value?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_contract_fields_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "crm_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contracts: {
        Row: {
          access_code: string
          booking_id: string | null
          contact_id: string | null
          created_at: string
          drive_file_id: string
          drive_link: string
          expires_at: string | null
          file_path: string
          id: string
          message: string
          opened_at: string | null
          page_count: number
          password_hash: string
          signed_at: string | null
          signed_ip: string
          signed_path: string
          signed_user_agent: string
          signer_email: string
          signer_name: string
          signer_phone: string
          status: string
          timezone: string
          title: string
          token: string
          updated_at: string
        }
        Insert: {
          access_code?: string
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string
          drive_file_id?: string
          drive_link?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          message?: string
          opened_at?: string | null
          page_count?: number
          password_hash?: string
          signed_at?: string | null
          signed_ip?: string
          signed_path?: string
          signed_user_agent?: string
          signer_email?: string
          signer_name?: string
          signer_phone?: string
          status?: string
          timezone?: string
          title?: string
          token: string
          updated_at?: string
        }
        Update: {
          access_code?: string
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string
          drive_file_id?: string
          drive_link?: string
          expires_at?: string | null
          file_path?: string
          id?: string
          message?: string
          opened_at?: string | null
          page_count?: number
          password_hash?: string
          signed_at?: string | null
          signed_ip?: string
          signed_path?: string
          signed_user_agent?: string
          signer_email?: string
          signer_name?: string
          signer_phone?: string
          status?: string
          timezone?: string
          title?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "crm_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_galleries: {
        Row: {
          access_code: string
          allow_client_password: boolean
          allow_download: boolean
          booking_id: string | null
          client_password_hash: string
          compression: string
          contact_id: string | null
          cover_image_id: string | null
          cover_mode: string
          cover_path: string
          cover_url: string
          created_at: string
          default_sort: string
          delivery_folder_id: string
          delivery_folder_link: string
          downscale_previews: boolean
          drive_folder_id: string
          expires_at: string | null
          grid_desktop: string
          grid_mobile: string
          grid_tablet: string
          id: string
          kind: string
          last_opened_at: string | null
          max_picks: number
          message: string
          og_image_id: string | null
          password_hash: string
          pick_pin_hash: string
          preview_max_bytes: number
          preview_max_px: number
          raw_folder_id: string
          show_message: boolean
          source: string
          status: string
          submitted_at: string | null
          title: string
          token: string
          updated_at: string
          watermark: boolean
        }
        Insert: {
          access_code?: string
          allow_client_password?: boolean
          allow_download?: boolean
          booking_id?: string | null
          client_password_hash?: string
          compression?: string
          contact_id?: string | null
          cover_image_id?: string | null
          cover_mode?: string
          cover_path?: string
          cover_url?: string
          created_at?: string
          default_sort?: string
          delivery_folder_id?: string
          delivery_folder_link?: string
          downscale_previews?: boolean
          drive_folder_id?: string
          expires_at?: string | null
          grid_desktop?: string
          grid_mobile?: string
          grid_tablet?: string
          id?: string
          kind?: string
          last_opened_at?: string | null
          max_picks?: number
          message?: string
          og_image_id?: string | null
          password_hash?: string
          pick_pin_hash?: string
          preview_max_bytes?: number
          preview_max_px?: number
          raw_folder_id?: string
          show_message?: boolean
          source?: string
          status?: string
          submitted_at?: string | null
          title?: string
          token: string
          updated_at?: string
          watermark?: boolean
        }
        Update: {
          access_code?: string
          allow_client_password?: boolean
          allow_download?: boolean
          booking_id?: string | null
          client_password_hash?: string
          compression?: string
          contact_id?: string | null
          cover_image_id?: string | null
          cover_mode?: string
          cover_path?: string
          cover_url?: string
          created_at?: string
          default_sort?: string
          delivery_folder_id?: string
          delivery_folder_link?: string
          downscale_previews?: boolean
          drive_folder_id?: string
          expires_at?: string | null
          grid_desktop?: string
          grid_mobile?: string
          grid_tablet?: string
          id?: string
          kind?: string
          last_opened_at?: string | null
          max_picks?: number
          message?: string
          og_image_id?: string | null
          password_hash?: string
          pick_pin_hash?: string
          preview_max_bytes?: number
          preview_max_px?: number
          raw_folder_id?: string
          show_message?: boolean
          source?: string
          status?: string
          submitted_at?: string | null
          title?: string
          token?: string
          updated_at?: string
          watermark?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "crm_galleries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "crm_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_galleries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_galleries_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "crm_gallery_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_galleries_og_image_id_fkey"
            columns: ["og_image_id"]
            isOneToOne: false
            referencedRelation: "crm_gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_gallery_images: {
        Row: {
          bytes: number
          created_at: string
          drive_file_id: string
          drive_raw_file_id: string
          gallery_id: string
          height: number
          id: string
          name: string
          original_name: string
          original_path: string
          preview_path: string
          sort_order: number
          thumb_path: string
          updated_at: string
          width: number
        }
        Insert: {
          bytes?: number
          created_at?: string
          drive_file_id?: string
          drive_raw_file_id?: string
          gallery_id: string
          height?: number
          id?: string
          name?: string
          original_name?: string
          original_path?: string
          preview_path?: string
          sort_order?: number
          thumb_path?: string
          updated_at?: string
          width?: number
        }
        Update: {
          bytes?: number
          created_at?: string
          drive_file_id?: string
          drive_raw_file_id?: string
          gallery_id?: string
          height?: number
          id?: string
          name?: string
          original_name?: string
          original_path?: string
          preview_path?: string
          sort_order?: number
          thumb_path?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_gallery_images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "crm_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_gallery_picks: {
        Row: {
          comment: string
          created_at: string
          done: boolean
          gallery_id: string
          id: string
          image_id: string
          label: string
          picked: boolean
          rating: number
          starred: boolean
          updated_at: string
        }
        Insert: {
          comment?: string
          created_at?: string
          done?: boolean
          gallery_id: string
          id?: string
          image_id: string
          label?: string
          picked?: boolean
          rating?: number
          starred?: boolean
          updated_at?: string
        }
        Update: {
          comment?: string
          created_at?: string
          done?: boolean
          gallery_id?: string
          id?: string
          image_id?: string
          label?: string
          picked?: boolean
          rating?: number
          starred?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_gallery_picks_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "crm_galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_gallery_picks_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "crm_gallery_images"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_google_account: {
        Row: {
          access_token: string
          connected_at: string | null
          connected_by: string | null
          email: string
          expires_at: string | null
          id: boolean
          refresh_token: string
          scope: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          connected_at?: string | null
          connected_by?: string | null
          email?: string
          expires_at?: string | null
          id?: boolean
          refresh_token?: string
          scope?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          connected_by?: string | null
          email?: string
          expires_at?: string | null
          id?: boolean
          refresh_token?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_invoices: {
        Row: {
          amount: number
          booking_id: string | null
          contact_id: string | null
          created_at: string
          currency: string
          due_on: string | null
          id: string
          issued_on: string | null
          line_items: Json
          notes: string
          number: string
          paid_on: string | null
          status: string
          tax: number
          updated_at: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          due_on?: string | null
          id?: string
          issued_on?: string | null
          line_items?: Json
          notes?: string
          number?: string
          paid_on?: string | null
          status?: string
          tax?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          due_on?: string | null
          id?: string
          issued_on?: string | null
          line_items?: Json
          notes?: string
          number?: string
          paid_on?: string | null
          status?: string
          tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "crm_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          contact_id: string | null
          created_at: string
          currency: string
          expected_date: string | null
          id: string
          notes: string
          sort_order: number
          source: string
          stage: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string
          sort_order?: number
          source?: string
          stage?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string
          sort_order?: number
          source?: string
          stage?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_preview_jobs: {
        Row: {
          done: number
          failed: number
          gallery_id: string
          message: string
          started_at: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          done?: number
          failed?: number
          gallery_id: string
          message?: string
          started_at?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          done?: number
          failed?: number
          gallery_id?: string
          message?: string
          started_at?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_preview_jobs_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: true
            referencedRelation: "crm_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          contract_date_font_size: number
          contract_field_font_size: number
          contract_footer_note: string
          contract_timezone: string
          cull_allow_comments: boolean
          cull_allow_labels: boolean
          cull_allow_rating: boolean
          currency: string
          drive_contracts_folder_id: string
          drive_final_parent_folder_id: string
          drive_raw_parent_folder_id: string
          gallery_accent: string
          gallery_grid_desktop: string
          gallery_grid_mobile: string
          gallery_grid_tablet: string
          gallery_show_filenames: boolean
          gallery_welcome: string
          id: boolean
          invoice_next_number: number
          invoice_prefix: string
          lead_sources: string[]
          pipeline_stages: string[]
          preview_max_px: number
          preview_quality: number
          thumb_max_px: number
          updated_at: string
          watermark_opacity: number
          watermark_size: number
          watermark_text: string
        }
        Insert: {
          contract_date_font_size?: number
          contract_field_font_size?: number
          contract_footer_note?: string
          contract_timezone?: string
          cull_allow_comments?: boolean
          cull_allow_labels?: boolean
          cull_allow_rating?: boolean
          currency?: string
          drive_contracts_folder_id?: string
          drive_final_parent_folder_id?: string
          drive_raw_parent_folder_id?: string
          gallery_accent?: string
          gallery_grid_desktop?: string
          gallery_grid_mobile?: string
          gallery_grid_tablet?: string
          gallery_show_filenames?: boolean
          gallery_welcome?: string
          id?: boolean
          invoice_next_number?: number
          invoice_prefix?: string
          lead_sources?: string[]
          pipeline_stages?: string[]
          preview_max_px?: number
          preview_quality?: number
          thumb_max_px?: number
          updated_at?: string
          watermark_opacity?: number
          watermark_size?: number
          watermark_text?: string
        }
        Update: {
          contract_date_font_size?: number
          contract_field_font_size?: number
          contract_footer_note?: string
          contract_timezone?: string
          cull_allow_comments?: boolean
          cull_allow_labels?: boolean
          cull_allow_rating?: boolean
          currency?: string
          drive_contracts_folder_id?: string
          drive_final_parent_folder_id?: string
          drive_raw_parent_folder_id?: string
          gallery_accent?: string
          gallery_grid_desktop?: string
          gallery_grid_mobile?: string
          gallery_grid_tablet?: string
          gallery_show_filenames?: boolean
          gallery_welcome?: string
          id?: boolean
          invoice_next_number?: number
          invoice_prefix?: string
          lead_sources?: string[]
          pipeline_stages?: string[]
          preview_max_px?: number
          preview_quality?: number
          thumb_max_px?: number
          updated_at?: string
          watermark_opacity?: number
          watermark_size?: number
          watermark_text?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          booking_id: string | null
          contact_id: string | null
          created_at: string
          detail: string
          done: boolean
          due_at: string | null
          id: string
          lead_id: string | null
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string
          detail?: string
          done?: boolean
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          contact_id?: string | null
          created_at?: string
          detail?: string
          done?: boolean
          due_at?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "crm_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_fonts: {
        Row: {
          css_url: string
          family: string
          id: string
          sort_order: number
          source: string
          styles: string[]
          updated_at: string
          weights: string[]
        }
        Insert: {
          css_url?: string
          family: string
          id?: string
          sort_order?: number
          source?: string
          styles?: string[]
          updated_at?: string
          weights?: string[]
        }
        Update: {
          css_url?: string
          family?: string
          id?: string
          sort_order?: number
          source?: string
          styles?: string[]
          updated_at?: string
          weights?: string[]
        }
        Relationships: []
      }
      edit_samples: {
        Row: {
          id: string
          note: string
          sort_order: number
          src: string
          src_before: string
          title: string
          updated_at: string
        }
        Insert: {
          id?: string
          note?: string
          sort_order?: number
          src: string
          src_before?: string
          title: string
          updated_at?: string
        }
        Update: {
          id?: string
          note?: string
          sort_order?: number
          src?: string
          src_before?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      experience: {
        Row: {
          detail: string
          id: string
          period: string
          place: string
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          detail?: string
          id?: string
          period: string
          place?: string
          role: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          detail?: string
          id?: string
          period?: string
          place?: string
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      image_settings: {
        Row: {
          glow_color_dark: string
          glow_color_light: string
          glow_spread: number
          glow_strength_dark: number
          glow_strength_light: number
          indexable: boolean
          is_private: boolean
          path: string
          shadow_dark: boolean
          shadow_light: boolean
          updated_at: string
        }
        Insert: {
          glow_color_dark?: string
          glow_color_light?: string
          glow_spread?: number
          glow_strength_dark?: number
          glow_strength_light?: number
          indexable?: boolean
          is_private?: boolean
          path: string
          shadow_dark?: boolean
          shadow_light?: boolean
          updated_at?: string
        }
        Update: {
          glow_color_dark?: string
          glow_color_light?: string
          glow_spread?: number
          glow_strength_dark?: number
          glow_strength_light?: number
          indexable?: boolean
          is_private?: boolean
          path?: string
          shadow_dark?: boolean
          shadow_light?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          enabled: boolean
          eyebrow: string
          heading: string
          heading_accent: string
          id: string
          intro: string
          label: string
          page: string
          section_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          eyebrow?: string
          heading?: string
          heading_accent?: string
          id?: string
          intro?: string
          label: string
          page: string
          section_key: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          eyebrow?: string
          heading?: string
          heading_accent?: string
          id?: string
          intro?: string
          label?: string
          page?: string
          section_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          browser: string
          city: string
          country: string
          created_at: string
          device_type: string
          duration_seconds: number
          id: string
          is_bot: boolean
          language: string
          os: string
          path: string
          referrer: string
          region: string
          screen_size: string
          share_token: string
          timezone: string
          visitor_id: string
        }
        Insert: {
          browser?: string
          city?: string
          country?: string
          created_at?: string
          device_type?: string
          duration_seconds?: number
          id?: string
          is_bot?: boolean
          language?: string
          os?: string
          path: string
          referrer?: string
          region?: string
          screen_size?: string
          share_token?: string
          timezone?: string
          visitor_id?: string
        }
        Update: {
          browser?: string
          city?: string
          country?: string
          created_at?: string
          device_type?: string
          duration_seconds?: number
          id?: string
          is_bot?: boolean
          language?: string
          os?: string
          path?: string
          referrer?: string
          region?: string
          screen_size?: string
          share_token?: string
          timezone?: string
          visitor_id?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string
          category_slug: string
          featured: boolean
          featured_order: number
          id: string
          in_gallery: boolean
          photo_key: string
          sort_order: number
          src: string
          updated_at: string
        }
        Insert: {
          caption?: string
          category_slug: string
          featured?: boolean
          featured_order?: number
          id?: string
          in_gallery?: boolean
          photo_key: string
          sort_order?: number
          src: string
          updated_at?: string
        }
        Update: {
          caption?: string
          category_slug?: string
          featured?: boolean
          featured_order?: number
          id?: string
          in_gallery?: boolean
          photo_key?: string
          sort_order?: number
          src?: string
          updated_at?: string
        }
        Relationships: []
      }
      process_steps: {
        Row: {
          detail: string
          id: string
          section_key: string
          sort_order: number
          step: string
          title: string
          updated_at: string
        }
        Insert: {
          detail?: string
          id?: string
          section_key?: string
          sort_order?: number
          step: string
          title: string
          updated_at?: string
        }
        Update: {
          detail?: string
          id?: string
          section_key?: string
          sort_order?: number
          step?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          canonical: string
          description: string
          id: string
          keywords: string
          label: string
          og_description: string
          og_image: string
          og_title: string
          path: string
          robots: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          canonical?: string
          description?: string
          id?: string
          keywords?: string
          label?: string
          og_description?: string
          og_image?: string
          og_title?: string
          path: string
          robots?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          canonical?: string
          description?: string
          id?: string
          keywords?: string
          label?: string
          og_description?: string
          og_image?: string
          og_title?: string
          path?: string
          robots?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category_slug: string
          description: string
          id: string
          image: string
          includes: string[]
          price_from: string
          slug: string
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          category_slug?: string
          description?: string
          id?: string
          image?: string
          includes?: string[]
          price_from?: string
          slug: string
          sort_order?: number
          subtitle?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_slug?: string
          description?: string
          id?: string
          image?: string
          includes?: string[]
          price_from?: string
          slug?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          about_image: string
          about_long: string[]
          about_short: string
          budget_ranges: string[]
          email: string
          font_body: string
          font_heading: string
          font_scale_desktop: number
          font_scale_mobile: number
          font_scale_tablet: number
          glow_blend: string
          glow_size: number
          glow_softness: number
          grid_category_desktop: string
          grid_category_mobile: string
          grid_category_tablet: string
          grid_gallery_desktop: string
          grid_gallery_mobile: string
          grid_gallery_tablet: string
          grid_home_desktop: string
          grid_home_mobile: string
          grid_home_tablet: string
          hour_options: string[]
          id: boolean
          loader_fade: string
          loader_pulse_scale: number
          loader_shape: string
          loader_size: number
          location: string
          logo_favicon: string
          logo_footer: string
          logo_footer_height: number
          logo_footer_offset_x: number
          logo_footer_offset_y: number
          logo_header: string
          logo_header_height: number
          logo_header_offset_x: number
          logo_header_offset_y: number
          logo_invert: boolean
          logo_loader: string
          logo_loader_height: number
          logo_loader_offset_x: number
          logo_loader_offset_y: number
          logo_mobile: string
          logo_mobile_height: number
          logo_mobile_offset_x: number
          logo_mobile_offset_y: number
          name: string
          og_image: string
          phone: string
          show_view_label: boolean
          tagline: string
          updated_at: string
        }
        Insert: {
          about_image?: string
          about_long?: string[]
          about_short?: string
          budget_ranges?: string[]
          email?: string
          font_body?: string
          font_heading?: string
          font_scale_desktop?: number
          font_scale_mobile?: number
          font_scale_tablet?: number
          glow_blend?: string
          glow_size?: number
          glow_softness?: number
          grid_category_desktop?: string
          grid_category_mobile?: string
          grid_category_tablet?: string
          grid_gallery_desktop?: string
          grid_gallery_mobile?: string
          grid_gallery_tablet?: string
          grid_home_desktop?: string
          grid_home_mobile?: string
          grid_home_tablet?: string
          hour_options?: string[]
          id?: boolean
          loader_fade?: string
          loader_pulse_scale?: number
          loader_shape?: string
          loader_size?: number
          location?: string
          logo_favicon?: string
          logo_footer?: string
          logo_footer_height?: number
          logo_footer_offset_x?: number
          logo_footer_offset_y?: number
          logo_header?: string
          logo_header_height?: number
          logo_header_offset_x?: number
          logo_header_offset_y?: number
          logo_invert?: boolean
          logo_loader?: string
          logo_loader_height?: number
          logo_loader_offset_x?: number
          logo_loader_offset_y?: number
          logo_mobile?: string
          logo_mobile_height?: number
          logo_mobile_offset_x?: number
          logo_mobile_offset_y?: number
          name?: string
          og_image?: string
          phone?: string
          show_view_label?: boolean
          tagline?: string
          updated_at?: string
        }
        Update: {
          about_image?: string
          about_long?: string[]
          about_short?: string
          budget_ranges?: string[]
          email?: string
          font_body?: string
          font_heading?: string
          font_scale_desktop?: number
          font_scale_mobile?: number
          font_scale_tablet?: number
          glow_blend?: string
          glow_size?: number
          glow_softness?: number
          grid_category_desktop?: string
          grid_category_mobile?: string
          grid_category_tablet?: string
          grid_gallery_desktop?: string
          grid_gallery_mobile?: string
          grid_gallery_tablet?: string
          grid_home_desktop?: string
          grid_home_mobile?: string
          grid_home_tablet?: string
          hour_options?: string[]
          id?: boolean
          loader_fade?: string
          loader_pulse_scale?: number
          loader_shape?: string
          loader_size?: number
          location?: string
          logo_favicon?: string
          logo_footer?: string
          logo_footer_height?: number
          logo_footer_offset_x?: number
          logo_footer_offset_y?: number
          logo_header?: string
          logo_header_height?: number
          logo_header_offset_x?: number
          logo_header_offset_y?: number
          logo_invert?: boolean
          logo_loader?: string
          logo_loader_height?: number
          logo_loader_offset_x?: number
          logo_loader_offset_y?: number
          logo_mobile?: string
          logo_mobile_height?: number
          logo_mobile_offset_x?: number
          logo_mobile_offset_y?: number
          name?: string
          og_image?: string
          phone?: string
          show_view_label?: boolean
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          category_slug: string
          code: string
          created_at: string
          id: string
          include_private: boolean
          label: string
          og_image: string
          path: string
          scope: string
          token: string
          updated_at: string
        }
        Insert: {
          category_slug?: string
          code?: string
          created_at?: string
          id?: string
          include_private?: boolean
          label?: string
          og_image?: string
          path?: string
          scope?: string
          token: string
          updated_at?: string
        }
        Update: {
          category_slug?: string
          code?: string
          created_at?: string
          id?: string
          include_private?: boolean
          label?: string
          og_image?: string
          path?: string
          scope?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      short_links: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          og_image: string
          target_url: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label?: string
          og_image?: string
          target_url?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          og_image?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_copy: {
        Row: {
          group_label: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          group_label?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Update: {
          group_label?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      site_versions: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          kind: string
          label: string
          scope: string
          tables: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind?: string
          label?: string
          scope?: string
          tables?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          kind?: string
          label?: string
          scope?: string
          tables?: string[]
        }
        Relationships: []
      }
      socials: {
        Row: {
          href: string
          icon: string
          icon_url: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          href: string
          icon?: string
          icon_url?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          href?: string
          icon?: string
          icon_url?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      stats: {
        Row: {
          id: string
          label: string
          sort_order: number
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          email: string
          id: string
          images: string[]
          name: string
          occasion: string
          quote: string
          rating: number
          role: string
          sort_order: number
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          email?: string
          id?: string
          images?: string[]
          name: string
          occasion?: string
          quote: string
          rating?: number
          role?: string
          sort_order?: number
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          id?: string
          images?: string[]
          name?: string
          occasion?: string
          quote?: string
          rating?: number
          role?: string
          sort_order?: number
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      text_inverts: {
        Row: {
          created_at: string
          group_label: string
          hint: string
          inverted: boolean
          key: string
          label: string
          shadow_dark: boolean
          shadow_light: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_label?: string
          hint?: string
          inverted?: boolean
          key: string
          label?: string
          shadow_dark?: boolean
          shadow_light?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_label?: string
          hint?: string
          inverted?: boolean
          key?: string
          label?: string
          shadow_dark?: boolean
          shadow_light?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      theme_tokens: {
        Row: {
          dark_opacity: number
          dark_value: string
          default_dark_opacity: number | null
          default_dark_value: string | null
          default_light_opacity: number | null
          default_light_value: string | null
          group_label: string
          hint: string
          id: string
          label: string
          light_opacity: number
          light_value: string
          sort_order: number
          token: string
          updated_at: string
        }
        Insert: {
          dark_opacity?: number
          dark_value?: string
          default_dark_opacity?: number | null
          default_dark_value?: string | null
          default_light_opacity?: number | null
          default_light_value?: string | null
          group_label?: string
          hint?: string
          id?: string
          label: string
          light_opacity?: number
          light_value?: string
          sort_order?: number
          token: string
          updated_at?: string
        }
        Update: {
          dark_opacity?: number
          dark_value?: string
          default_dark_opacity?: number | null
          default_dark_value?: string | null
          default_light_opacity?: number | null
          default_light_value?: string | null
          group_label?: string
          hint?: string
          id?: string
          label?: string
          light_opacity?: number
          light_value?: string
          sort_order?: number
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      type_tokens: {
        Row: {
          font_family: string
          group_label: string
          hint: string
          id: string
          label: string
          letter_spacing: string
          line_height: string
          role: string
          sample_text: string
          selector: string
          size_desktop: string
          size_mobile: string
          size_tablet: string
          sort_order: number
          text_transform: string
          updated_at: string
          weight: string
        }
        Insert: {
          font_family?: string
          group_label?: string
          hint?: string
          id?: string
          label: string
          letter_spacing?: string
          line_height?: string
          role: string
          sample_text?: string
          selector: string
          size_desktop?: string
          size_mobile?: string
          size_tablet?: string
          sort_order?: number
          text_transform?: string
          updated_at?: string
          weight?: string
        }
        Update: {
          font_family?: string
          group_label?: string
          hint?: string
          id?: string
          label?: string
          letter_spacing?: string
          line_height?: string
          role?: string
          sample_text?: string
          selector?: string
          size_desktop?: string
          size_mobile?: string
          size_tablet?: string
          sort_order?: number
          text_transform?: string
          updated_at?: string
          weight?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_row: { Args: { _row: Json; _table: string }; Returns: undefined }
      content_snapshot: { Args: { _tables?: string[] }; Returns: Json }
      content_tables: { Args: never; Returns: string[] }
      delete_row: { Args: { _row: Json; _table: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pk_where_clause: { Args: { _table: string }; Returns: string }
      record_view_duration: {
        Args: { _id: string; _seconds: number }
        Returns: undefined
      }
      resolve_share_link: {
        Args: { _token: string }
        Returns: {
          category_slug: string
          include_private: boolean
          scope: string
        }[]
      }
      restore_snapshot: {
        Args: { _data: Json; _tables?: string[] }
        Returns: undefined
      }
      share_link_og_image: { Args: { _token: string }; Returns: string }
      timeline_goto: { Args: { _change_id: string }; Returns: undefined }
      timeline_state: {
        Args: never
        Returns: {
          change_at: string
          change_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
