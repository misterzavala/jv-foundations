// Asset Management Service
// Comprehensive CRUD operations with status management and workflow integration

import { supabase } from '@/integrations/supabase/client'
import { EventEmitter, eventSourcingService } from './event-sourcing'
import type { 
  Tables, 
  ContentType, 
  AssetStatus, 
  DestinationStatus,
  Platform 
} from '@/integrations/supabase/types-enhanced'

interface CreateAssetData {
  title: string
  description?: string
  content_type: ContentType
  metadata?: Record<string, any>
  media_files?: File[]
  thumbnail?: File
  destinations?: string[] // Account IDs for publishing
}

interface UpdateAssetData {
  title?: string
  description?: string
  status?: AssetStatus
  metadata?: Record<string, any>
  scheduled_at?: string
  thumbnail_url?: string
}

interface AssetFilters {
  status?: AssetStatus[]
  content_type?: ContentType[]
  created_by?: string
  date_range?: {
    start: string
    end: string
  }
  has_workflow?: boolean
  search?: string
}

interface AssetWithRelations extends Tables<'assets'> {
  destinations?: Array<{
    id: string
    account_id: string
    status: DestinationStatus
    platform_post_id?: string
    scheduled_at?: string
    published_at?: string
    error_message?: string
    account: {
      platform: Platform
      account_name: string
      account_handle: string
    }
  }>
  workflow_execution?: {
    id: string
    status: string
    started_at: string
    completed_at?: string
    error_details?: string
  }
  media_files?: Array<{
    id: string
    file_url: string
    file_type: string
    file_size: number
    metadata: Record<string, any>
  }>
}

export class AssetManagementService {
  
  /**
   * Create a new asset with optional media files
   */
  async createAsset(data: CreateAssetData, createdBy?: string): Promise<AssetWithRelations> {
    try {
      // Start transaction-like operation
      const assetId = crypto.randomUUID()
      
      // 1. Create the asset record
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .insert({
          id: assetId,
          title: data.title,
          description: data.description,
          content_type: data.content_type,
          status: 'draft',
          metadata: {
            ...data.metadata,
            created_via: 'asset_management_service',
            has_media_files: !!data.media_files?.length,
            destination_count: data.destinations?.length || 0
          },
          created_by: createdBy
        })
        .select()
        .single()

      if (assetError) {
        throw new Error(`Failed to create asset: ${assetError.message}`)
      }

      // 2. Upload media files if provided
      if (data.media_files && data.media_files.length > 0) {
        await this.uploadMediaFiles(assetId, data.media_files)
      }

      // 3. Upload thumbnail if provided
      if (data.thumbnail) {
        const thumbnailUrl = await this.uploadThumbnail(assetId, data.thumbnail)
        await this.updateAsset(assetId, { thumbnail_url: thumbnailUrl })
      }

      // 4. Create destination records if provided
      if (data.destinations && data.destinations.length > 0) {
        await this.createAssetDestinations(assetId, data.destinations)
      }

      // 5. Log asset creation event using event sourcing
      await EventEmitter.asset.created(assetId, {
        title: data.title,
        content_type: data.content_type,
        destinations: data.destinations,
        created_by: createdBy,
        file_count: data.media_files?.length || 0
      }, {
        user_id: createdBy,
        source: 'asset_management_service'
      })

      // 6. Return the complete asset with relations
      return await this.getAssetById(assetId)

    } catch (error) {
      console.error('Failed to create asset:', error)
      throw error
    }
  }

  /**
   * Get asset by ID with all relations
   */
  async getAssetById(assetId: string): Promise<AssetWithRelations> {
    const { data: asset, error } = await supabase
      .from('assets')
      .select(`
        *,
        asset_destinations (
          id,
          account_id,
          status,
          platform_post_id,
          scheduled_at,
          published_at,
          error_message,
          accounts (
            platform,
            account_name,
            account_handle
          )
        ),
        workflow_executions (
          id,
          status,
          started_at,
          completed_at,
          error_details
        ),
        asset_media_files (
          id,
          file_url,
          file_type,
          file_size,
          metadata
        )
      `)
      .eq('id', assetId)
      .single()

    if (error) {
      throw new Error(`Asset not found: ${error.message}`)
    }

    return asset as AssetWithRelations
  }

  /**
   * Update asset with status management
   */
  async updateAsset(assetId: string, updates: UpdateAssetData): Promise<AssetWithRelations> {
    try {
      // Get current asset for comparison
      const currentAsset = await this.getAssetById(assetId)
      
      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Update the asset
      const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', assetId)

      if (error) {
        throw new Error(`Failed to update asset: ${error.message}`)
      }

      // Log status change if status was updated
      if (updates.status && updates.status !== currentAsset.status) {
        await EventEmitter.asset.statusChanged(
          assetId, 
          currentAsset.status, 
          updates.status,
          {
            source: 'asset_management_service',
            updated_fields: Object.keys(updates)
          }
        )

        // Handle status-specific logic
        await this.handleStatusChange(assetId, currentAsset.status, updates.status)
      }

      // Return updated asset
      return await this.getAssetById(assetId)

    } catch (error) {
      console.error('Failed to update asset:', error)
      throw error
    }
  }

  /**
   * Delete asset and all related data
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      // Note: Workflow cancellation will be handled by existing N8N webhook

      // Delete asset (cascade will handle relations)
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId)

      if (error) {
        throw new Error(`Failed to delete asset: ${error.message}`)
      }

      // Log deletion event
      await this.logAssetEvent(assetId, 'asset_deleted', {
        deleted_at: new Date().toISOString()
      })

      return true

    } catch (error) {
      console.error('Failed to delete asset:', error)
      return false
    }
  }

  /**
   * Get assets with filtering and pagination
   */
  async getAssets(
    filters: AssetFilters = {},
    page = 1,
    limit = 20
  ): Promise<{
    assets: AssetWithRelations[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    let query = supabase
      .from('assets')
      .select(`
        *,
        asset_destinations (
          id,
          account_id,
          status,
          platform_post_id,
          accounts (
            platform,
            account_name
          )
        ),
        workflow_executions (
          id,
          status,
          started_at,
          completed_at
        )
      `, { count: 'exact' })

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters.content_type && filters.content_type.length > 0) {
      query = query.in('content_type', filters.content_type)
    }

    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    if (filters.date_range) {
      query = query
        .gte('created_at', filters.date_range.start)
        .lte('created_at', filters.date_range.end)
    }

    if (filters.has_workflow !== undefined) {
      if (filters.has_workflow) {
        query = query.not('workflow_id', 'is', null)
      } else {
        query = query.is('workflow_id', null)
      }
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: assets, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch assets: ${error.message}`)
    }

    return {
      assets: assets as AssetWithRelations[] || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    }
  }

  // Note: Publishing workflow creation will be handled by existing N8N webhook

  /**
   * Duplicate asset with new title
   */
  async duplicateAsset(assetId: string, newTitle: string): Promise<AssetWithRelations> {
    try {
      const originalAsset = await this.getAssetById(assetId)
      
      // Create new asset based on original
      const duplicatedAsset = await this.createAsset({
        title: newTitle,
        description: originalAsset.description || undefined,
        content_type: originalAsset.content_type,
        metadata: {
          ...originalAsset.metadata as Record<string, any>,
          duplicated_from: assetId,
          duplicated_at: new Date().toISOString()
        }
      })

      // Log duplication event
      await this.logAssetEvent(duplicatedAsset.id, 'asset_duplicated', {
        original_asset_id: assetId,
        new_title: newTitle
      })

      return duplicatedAsset

    } catch (error) {
      console.error('Failed to duplicate asset:', error)
      throw error
    }
  }

  /**
   * Get asset publishing status summary
   */
  async getAssetPublishingStatus(assetId: string): Promise<{
    overall_status: AssetStatus
    destinations: Array<{
      platform: Platform
      status: DestinationStatus
      published_at?: string
      error?: string
    }>
    workflow_status?: string
    last_updated: string
  }> {
    const asset = await this.getAssetById(assetId)
    
    const destinations = asset.destinations?.map(dest => ({
      platform: dest.account.platform,
      status: dest.status,
      published_at: dest.published_at,
      error: dest.error_message
    })) || []

    return {
      overall_status: asset.status,
      destinations,
      workflow_status: asset.workflow_execution?.status,
      last_updated: asset.updated_at
    }
  }

  /**
   * Private helper methods
   */

  private async uploadMediaFiles(assetId: string, files: File[]): Promise<void> {
    // TODO: Implement file upload to Supabase Storage
    // This will be implemented in the file upload system
    console.log(`Uploading ${files.length} media files for asset ${assetId}`)
  }

  private async uploadThumbnail(assetId: string, thumbnail: File): Promise<string> {
    // TODO: Implement thumbnail upload
    // Return placeholder URL for now
    return `https://placeholder.com/300x300?text=Thumbnail+${assetId}`
  }

  private async createAssetDestinations(assetId: string, accountIds: string[]): Promise<void> {
    const destinations = accountIds.map(accountId => ({
      asset_id: assetId,
      account_id: accountId,
      status: 'draft' as DestinationStatus
    }))

    const { error } = await supabase
      .from('asset_destinations')
      .insert(destinations)

    if (error) {
      throw new Error(`Failed to create destinations: ${error.message}`)
    }
  }

  private async logAssetEvent(
    assetId: string, 
    eventType: string, 
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('events')
        .insert({
          entity_type: 'asset',
          entity_id: assetId,
          event_type: eventType as any,
          event_data: eventData
        })
    } catch (error) {
      console.error('Failed to log asset event:', error)
    }
  }

  private async handleStatusChange(
    assetId: string,
    fromStatus: AssetStatus,
    toStatus: AssetStatus
  ): Promise<void> {
    // Handle specific status transitions
    switch (toStatus) {
      case 'ready':
        // Asset is ready for workflow creation
        await this.validateAssetForPublishing(assetId)
        break
      
      case 'published':
        // Update published timestamp
        await supabase
          .from('assets')
          .update({ published_at: new Date().toISOString() })
          .eq('id', assetId)
        break
      
      case 'failed':
        // Handle failure cleanup if needed
        break
      
      case 'archived':
        // Archive related data if needed
        break
    }
  }

  private async validateAssetForPublishing(assetId: string): Promise<void> {
    const asset = await this.getAssetById(assetId)
    
    const checks = {
      has_title: !!asset.title,
      has_media: !!asset.media_files?.length,
      has_destinations: !!asset.destinations?.length,
      content_type_valid: ['reel', 'carousel', 'single_image', 'story'].includes(asset.content_type)
    }

    // Update preflight checks
    await supabase
      .from('assets')
      .update({ 
        preflight_checks: checks,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)

    // Log validation result
    await this.logAssetEvent(assetId, 'preflight_validation', {
      checks,
      passed: Object.values(checks).every(Boolean)
    })
  }

  private isAssetReadyForPublishing(asset: AssetWithRelations): boolean {
    return (
      asset.status === 'ready' &&
      !!asset.title &&
      !!asset.destinations?.length &&
      ['reel', 'carousel', 'single_image', 'story'].includes(asset.content_type)
    )
  }

  /**
   * Batch operations
   */

  async batchUpdateStatus(assetIds: string[], status: AssetStatus): Promise<number> {
    const { error, count } = await supabase
      .from('assets')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', assetIds)

    if (error) {
      throw new Error(`Failed to batch update: ${error.message}`)
    }

    // Log batch operation
    await this.logAssetEvent('batch_operation', 'batch_status_update', {
      asset_ids: assetIds,
      new_status: status,
      affected_count: count
    })

    return count || 0
  }

  async batchDelete(assetIds: string[]): Promise<number> {
    const { error, count } = await supabase
      .from('assets')
      .delete()
      .in('id', assetIds)

    if (error) {
      throw new Error(`Failed to batch delete: ${error.message}`)
    }

    return count || 0
  }

  /**
   * Statistics and analytics
   */

  async getAssetStatistics(filters: AssetFilters = {}): Promise<{
    total: number
    by_status: Record<AssetStatus, number>
    by_content_type: Record<ContentType, number>
    published_today: number
    failed_today: number
  }> {
    // Get total count with filters
    let totalQuery = supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })

    if (filters.created_by) {
      totalQuery = totalQuery.eq('created_by', filters.created_by)
    }

    const { count: total } = await totalQuery

    // Get status breakdown
    const { data: statusData } = await supabase
      .from('assets')
      .select('status')
      .eq('created_by', filters.created_by || '')

    // Get content type breakdown
    const { data: contentTypeData } = await supabase
      .from('assets')
      .select('content_type')
      .eq('created_by', filters.created_by || '')

    // Get today's stats
    const today = new Date().toISOString().split('T')[0]
    const { data: todayData } = await supabase
      .from('assets')
      .select('status, published_at')
      .gte('published_at', today)
      .eq('created_by', filters.created_by || '')

    // Process results
    const by_status = statusData?.reduce((acc, item) => {
      acc[item.status as AssetStatus] = (acc[item.status as AssetStatus] || 0) + 1
      return acc
    }, {} as Record<AssetStatus, number>) || {}

    const by_content_type = contentTypeData?.reduce((acc, item) => {
      acc[item.content_type as ContentType] = (acc[item.content_type as ContentType] || 0) + 1
      return acc
    }, {} as Record<ContentType, number>) || {}

    const published_today = todayData?.filter(item => item.status === 'published').length || 0
    const failed_today = todayData?.filter(item => item.status === 'failed').length || 0

    return {
      total: total || 0,
      by_status,
      by_content_type,
      published_today,
      failed_today
    }
  }
}

// Export singleton instance
export const assetManagementService = new AssetManagementService()