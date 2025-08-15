// Enhanced types for the event-driven content management system
// Based on N8N workflow requirements and database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Asset content types
export type ContentType = 'reel' | 'carousel' | 'single_image' | 'story'

// Asset status states for the publishing workflow
export type AssetStatus = 'draft' | 'reviewing' | 'ready' | 'queued' | 'publishing' | 'published' | 'failed' | 'archived'

// Destination status states
export type DestinationStatus = 'draft' | 'ready' | 'queued' | 'publishing' | 'published' | 'failed' | 'cancelled'

// Social media platforms
export type Platform = 'instagram' | 'tiktok' | 'linkedin' | 'facebook' | 'youtube'

// Event types for event sourcing
export type EventType = 
  | 'asset_created'
  | 'status_changed' 
  | 'destination_created'
  | 'destination_status_changed'
  | 'workflow_started'
  | 'workflow_completed'
  | 'publishing_attempted'
  | 'publishing_succeeded'
  | 'publishing_failed'

// Workflow types
export type WorkflowType = 'publish_reel' | 'publish_carousel' | 'schedule_post' | 'batch_publish'

// Beat marker types for video processing
export type BeatMarkerType = 'beat' | 'cut' | 'highlight' | 'text_overlay'

// App roles
export type AppRole = 'admin' | 'staff' | 'partner' | 'user'

// Enhanced Database interface
export interface EnhancedDatabase {
  public: {
    Tables: {
      // Core content management
      assets: {
        Row: {
          id: string
          title: string
          description: string | null
          content_type: ContentType
          status: AssetStatus
          thumbnail_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          scheduled_at: string | null
          published_at: string | null
          metadata: Json
          workflow_id: string | null
          n8n_execution_id: string | null
          retry_count: number
          last_error: string | null
          preflight_checks: Json
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          content_type: ContentType
          status?: AssetStatus
          thumbnail_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          scheduled_at?: string | null
          published_at?: string | null
          metadata?: Json
          workflow_id?: string | null
          n8n_execution_id?: string | null
          retry_count?: number
          last_error?: string | null
          preflight_checks?: Json
        }
        Update: {
          title?: string
          description?: string | null
          content_type?: ContentType
          status?: AssetStatus
          thumbnail_url?: string | null
          updated_at?: string
          scheduled_at?: string | null
          published_at?: string | null
          metadata?: Json
          workflow_id?: string | null
          n8n_execution_id?: string | null
          retry_count?: number
          last_error?: string | null
          preflight_checks?: Json
        }
      }

      // Event sourcing
      events: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          event_type: EventType
          event_data: Json
          created_at: string
          created_by: string | null
          sequence_number: number
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          event_type: EventType
          event_data?: Json
          created_at?: string
          created_by?: string | null
        }
        Update: {
          event_data?: Json
        }
      }

      // Workflow execution tracking
      workflow_executions: {
        Row: {
          id: string
          asset_id: string | null
          workflow_type: WorkflowType
          n8n_execution_id: string | null
          status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
          input_data: Json
          output_data: Json
          error_details: string | null
          started_at: string
          completed_at: string | null
          duration_ms: number | null
        }
        Insert: {
          id?: string
          asset_id?: string | null
          workflow_type: WorkflowType
          n8n_execution_id?: string | null
          status?: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
          input_data?: Json
          output_data?: Json
          error_details?: string | null
          started_at?: string
          completed_at?: string | null
          duration_ms?: number | null
        }
        Update: {
          status?: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
          output_data?: Json
          error_details?: string | null
          completed_at?: string | null
          duration_ms?: number | null
        }
      }

      // Beat markers for video content
      beat_markers: {
        Row: {
          id: string
          asset_id: string
          timestamp_ms: number
          marker_type: BeatMarkerType
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          timestamp_ms: number
          marker_type: BeatMarkerType
          data?: Json
          created_at?: string
        }
        Update: {
          timestamp_ms?: number
          marker_type?: BeatMarkerType
          data?: Json
        }
      }

      // Caption management
      caption_templates: {
        Row: {
          id: string
          name: string
          template: string
          variables: Json
          platform: Platform | null
          content_type: ContentType | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          template: string
          variables?: Json
          platform?: Platform | null
          content_type?: ContentType | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          template?: string
          variables?: Json
          platform?: Platform | null
          content_type?: ContentType | null
          is_active?: boolean
          updated_at?: string
        }
      }

      rendered_captions: {
        Row: {
          id: string
          destination_id: string
          template_id: string | null
          rendered_text: string
          hashtags: string[]
          mentions: string[]
          character_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          destination_id: string
          template_id?: string | null
          rendered_text: string
          hashtags?: string[]
          mentions?: string[]
          character_count?: number | null
          created_at?: string
        }
        Update: {
          rendered_text?: string
          hashtags?: string[]
          mentions?: string[]
          character_count?: number | null
        }
      }

      // Scheduling system
      publishing_schedule: {
        Row: {
          id: string
          account_id: string
          asset_id: string
          scheduled_time: string
          time_slot_duration: number
          priority: number
          is_locked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          asset_id: string
          scheduled_time: string
          time_slot_duration?: number
          priority?: number
          is_locked?: boolean
          created_at?: string
        }
        Update: {
          scheduled_time?: string
          time_slot_duration?: number
          priority?: number
          is_locked?: boolean
        }
      }

      // Webhook integration
      webhook_configs: {
        Row: {
          id: string
          name: string
          endpoint_url: string
          secret_key: string
          event_types: string[]
          is_active: boolean
          headers: Json
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          name: string
          endpoint_url: string
          secret_key: string
          event_types: string[]
          is_active?: boolean
          headers?: Json
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          name?: string
          endpoint_url?: string
          secret_key?: string
          event_types?: string[]
          is_active?: boolean
          headers?: Json
          last_used_at?: string | null
        }
      }

      webhook_deliveries: {
        Row: {
          id: string
          webhook_config_id: string
          event_id: string
          status: 'pending' | 'delivered' | 'failed' | 'retrying'
          http_status: number | null
          request_payload: Json
          response_body: string | null
          delivery_attempts: number
          next_retry_at: string | null
          delivered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          webhook_config_id: string
          event_id: string
          status?: 'pending' | 'delivered' | 'failed' | 'retrying'
          http_status?: number | null
          request_payload?: Json
          response_body?: string | null
          delivery_attempts?: number
          next_retry_at?: string | null
          delivered_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'delivered' | 'failed' | 'retrying'
          http_status?: number | null
          response_body?: string | null
          delivery_attempts?: number
          next_retry_at?: string | null
          delivered_at?: string | null
        }
      }

      // Enhanced asset destinations
      asset_destinations: {
        Row: {
          id: string
          asset_id: string | null
          account_id: string | null
          status: DestinationStatus
          scheduled_at: string | null
          published_at: string | null
          external_post_id: string | null
          error_message: string | null
          retry_count: number
          metadata: Json
          created_at: string
          updated_at: string
          platform_post_id: string | null
          platform_response: Json
          publishing_attempts: number
          next_retry_at: string | null
        }
        Insert: {
          id?: string
          asset_id?: string | null
          account_id?: string | null
          status?: DestinationStatus
          scheduled_at?: string | null
          published_at?: string | null
          external_post_id?: string | null
          error_message?: string | null
          retry_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
          platform_post_id?: string | null
          platform_response?: Json
          publishing_attempts?: number
          next_retry_at?: string | null
        }
        Update: {
          status?: DestinationStatus
          scheduled_at?: string | null
          published_at?: string | null
          external_post_id?: string | null
          error_message?: string | null
          retry_count?: number
          metadata?: Json
          updated_at?: string
          platform_post_id?: string | null
          platform_response?: Json
          publishing_attempts?: number
          next_retry_at?: string | null
        }
      }

      // Existing tables (abbreviated for space)
      accounts: {
        Row: {
          id: string
          platform: Platform
          account_name: string
          account_handle: string
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          account_metadata: Json
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform: Platform
          account_name: string
          account_handle: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          account_metadata?: Json
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          platform?: Platform
          account_name?: string
          account_handle?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          account_metadata?: Json
          is_active?: boolean
          updated_at?: string
        }
      }

      user_profiles: {
        Row: {
          user_id: string
          full_name: string | null
          avatar_url: string | null
          app_role: AppRole
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          app_role?: AppRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          app_role?: AppRole
          updated_at?: string
        }
      }
    }

    Functions: {
      get_asset_state: {
        Args: { asset_uuid: string }
        Returns: Json
      }
      check_scheduling_conflict: {
        Args: { 
          account_uuid: string
          scheduled_time: string
          duration_minutes?: number
        }
        Returns: boolean
      }
    }
  }
}

// Helper types for frontend usage
export type Tables<T extends keyof EnhancedDatabase['public']['Tables']> = 
  EnhancedDatabase['public']['Tables'][T]['Row']

export type Inserts<T extends keyof EnhancedDatabase['public']['Tables']> = 
  EnhancedDatabase['public']['Tables'][T]['Insert']

export type Updates<T extends keyof EnhancedDatabase['public']['Tables']> = 
  EnhancedDatabase['public']['Tables'][T]['Update']

// Composite types for complex queries
export type AssetWithDestinations = Tables<'assets'> & {
  asset_destinations: (Tables<'asset_destinations'> & {
    accounts: Tables<'accounts'>
  })[]
}

export type AssetWithMetadata = Tables<'assets'> & {
  reel_meta?: Tables<'reel_meta'>[]
  carousel_meta?: Tables<'carousel_meta'>[]
  beat_markers?: Tables<'beat_markers'>[]
}

export type WorkflowExecution = Tables<'workflow_executions'> & {
  assets?: Tables<'assets'>
}

export type EventWithEntity = Tables<'events'> & {
  asset?: Tables<'assets'>
  destination?: Tables<'asset_destinations'>
}

// N8N Workflow Integration Types
export interface N8NWorkflowPayload {
  assetId: string
  workflowType: WorkflowType
  destinations: string[]
  scheduledTime?: string
  metadata?: Json
}

export interface N8NWebhookResponse {
  executionId: string
  status: 'started' | 'completed' | 'failed'
  data?: Json
  error?: string
}

// Instagram Graph API Types
export interface InstagramMediaResponse {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  caption?: string
  timestamp: string
  permalink: string
}

export interface InstagramPublishResponse {
  id: string
  post_id?: string
  error?: {
    message: string
    type: string
    code: number
  }
}

// Caption Rendering Types
export interface CaptionVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'array'
  required: boolean
  default?: string
}

export interface RenderedCaption {
  text: string
  hashtags: string[]
  mentions: string[]
  characterCount: number
  platformSpecific: {
    [key in Platform]?: {
      text: string
      truncated: boolean
    }
  }
}