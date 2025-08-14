export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          account_handle: string
          account_metadata: Json
          account_name: string
          access_token: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          account_handle: string
          account_metadata?: Json
          account_name: string
          access_token?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          account_handle?: string
          account_metadata?: Json
          account_name?: string
          access_token?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      asset_destinations: {
        Row: {
          account_id: string | null
          asset_id: string | null
          created_at: string
          error_message: string | null
          external_post_id: string | null
          id: string
          metadata: Json
          published_at: string | null
          retry_count: number
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          asset_id?: string | null
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          retry_count?: number
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          asset_id?: string | null
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          retry_count?: number
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_destinations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_destinations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          }
        ]
      }
      assets: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          published_at: string | null
          scheduled_at: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      card_preferences: {
        Row: {
          card_type: string
          created_at: string
          id: string
          is_visible: boolean
          position: number | null
          size: string | null
          updated_at: string
        }
        Insert: {
          card_type: string
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number | null
          size?: string | null
          updated_at?: string
        }
        Update: {
          card_type?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          position?: number | null
          size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      carousel_meta: {
        Row: {
          aspect_ratio: string
          asset_id: string | null
          created_at: string
          id: string
          image_count: number | null
          image_urls: string[]
          updated_at: string
        }
        Insert: {
          aspect_ratio?: string
          asset_id?: string | null
          created_at?: string
          id?: string
          image_urls: string[]
          updated_at?: string
        }
        Update: {
          aspect_ratio?: string
          asset_id?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carousel_meta_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          }
        ]
      }
      deals: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          media_links: string[] | null
          motivation: string | null
          notes: string | null
          partner_email: string | null
          partner_name: string | null
          property_address: string | null
          seller_email: string | null
          seller_name: string | null
          seller_phone: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          media_links?: string[] | null
          motivation?: string | null
          notes?: string | null
          partner_email?: string | null
          partner_name?: string | null
          property_address?: string | null
          seller_email?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          media_links?: string[] | null
          motivation?: string | null
          notes?: string | null
          partner_email?: string | null
          partner_name?: string | null
          property_address?: string | null
          seller_email?: string | null
          seller_name?: string | null
          seller_phone?: string | null
          status?: string | null
        }
        Relationships: []
      }
      destination_groups: {
        Row: {
          account_ids: string[]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_ids: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_ids?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      errors: {
        Row: {
          additional_data: Json
          created_at: string
          error_message: string
          error_type: string
          id: string
          resource_id: string | null
          resource_type: string | null
          resolved: boolean
          resolved_at: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          additional_data?: Json
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          resolved?: boolean
          resolved_at?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          additional_data?: Json
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          resolved?: boolean
          resolved_at?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          resource_id: string
          resource_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          resource_id: string
          resource_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          resource_id?: string
          resource_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      publish_queue: {
        Row: {
          asset_destination_id: string | null
          attempts: number
          created_at: string
          error_details: Json | null
          id: string
          max_attempts: number
          priority: number
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          asset_destination_id?: string | null
          attempts?: number
          created_at?: string
          error_details?: Json | null
          id?: string
          max_attempts?: number
          priority?: number
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          asset_destination_id?: string | null
          attempts?: number
          created_at?: string
          error_details?: Json | null
          id?: string
          max_attempts?: number
          priority?: number
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_queue_asset_destination_id_fkey"
            columns: ["asset_destination_id"]
            isOneToOne: false
            referencedRelation: "asset_destinations"
            referencedColumns: ["id"]
          }
        ]
      }
      reel_meta: {
        Row: {
          aspect_ratio: string
          asset_id: string | null
          audio_codec: string | null
          created_at: string
          duration_seconds: number | null
          file_size_mb: number | null
          id: string
          updated_at: string
          video_codec: string | null
          video_url: string
        }
        Insert: {
          aspect_ratio?: string
          asset_id?: string | null
          audio_codec?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          updated_at?: string
          video_codec?: string | null
          video_url: string
        }
        Update: {
          aspect_ratio?: string
          asset_id?: string | null
          audio_codec?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_mb?: number | null
          id?: string
          updated_at?: string
          video_codec?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_meta_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          required_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_staff: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "partner" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff", "partner", "user"] as const,
    },
  },
} as const
