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
    PostgrestVersion: "14.15"
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
          slug?: string
          sort_order?: number
          tagline?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          indexable: boolean
          is_private: boolean
          path: string
          updated_at: string
        }
        Insert: {
          indexable?: boolean
          is_private?: boolean
          path: string
          updated_at?: string
        }
        Update: {
          indexable?: boolean
          is_private?: boolean
          path?: string
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
          created_at: string
          device_type: string
          id: string
          path: string
          referrer: string
          share_token: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string
          id?: string
          path: string
          referrer?: string
          share_token?: string
          visitor_id?: string
        }
        Update: {
          created_at?: string
          device_type?: string
          id?: string
          path?: string
          referrer?: string
          share_token?: string
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
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          category_slug: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resolve_share_link: {
        Args: { _token: string }
        Returns: {
          category_slug: string
          include_private: boolean
          scope: string
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
