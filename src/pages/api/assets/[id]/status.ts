// Asset Status Update API Endpoint
// Handles status updates from N8N workflows

import { supabase } from '@/integrations/supabase/client'
import { EventEmitter } from '@/services/event-sourcing'

interface StatusUpdateRequest {
  status: 'draft' | 'in_review' | 'scheduled' | 'processing' | 'published' | 'failed' | 'archived'
  message?: string
  platformPostId?: string
  error?: string
  metadata?: Record<string, any>
}

export default async function handler(req: Request) {
  if (req.method !== 'PATCH') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Extract asset ID from URL
    const url = new URL(req.url!)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const assetId = pathSegments[pathSegments.length - 2] // assets/[id]/status

    if (!assetId) {
      return new Response(
        JSON.stringify({ error: 'Asset ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const updateData: StatusUpdateRequest = await req.json()

    if (!updateData.status) {
      return new Response(
        JSON.stringify({ error: 'Status is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current asset
    const { data: currentAsset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (fetchError || !currentAsset) {
      return new Response(
        JSON.stringify({ error: 'Asset not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare update data
    const updatePayload: any = {
      status: updateData.status,
      updated_at: new Date().toISOString()
    }

    // Handle status-specific updates
    if (updateData.status === 'published') {
      updatePayload.published_at = new Date().toISOString()
      if (updateData.platformPostId) {
        updatePayload.metadata = {
          ...currentAsset.metadata,
          platform_post_id: updateData.platformPostId
        }
      }
    }

    if (updateData.status === 'failed' && updateData.error) {
      updatePayload.last_error = updateData.error
    }

    if (updateData.metadata) {
      updatePayload.metadata = {
        ...currentAsset.metadata,
        ...updateData.metadata
      }
    }

    // Update asset in database
    const { data: updatedAsset, error: updateError } = await supabase
      .from('assets')
      .update(updatePayload)
      .eq('id', assetId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update asset: ${updateError.message}`)
    }

    // Log status change event
    await EventEmitter.asset.statusChanged(
      assetId,
      currentAsset.status,
      updateData.status,
      {
        source: 'status_api',
        message: updateData.message,
        platform_post_id: updateData.platformPostId,
        error: updateData.error,
        previous_status: currentAsset.status,
        workflow_triggered: true
      }
    )

    // Update asset destinations if platform post ID provided
    if (updateData.platformPostId && updateData.status === 'published') {
      await supabase
        .from('asset_destinations')
        .update({
          status: 'published',
          platform_post_id: updateData.platformPostId,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('asset_id', assetId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        asset: updatedAsset,
        previousStatus: currentAsset.status,
        newStatus: updateData.status,
        message: updateData.message
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Asset status update error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}