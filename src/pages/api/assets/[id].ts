// Asset Retrieval API Endpoint
// Provides asset data for N8N workflows

import { supabase } from '@/integrations/supabase/client'

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
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
    const assetId = pathSegments[pathSegments.length - 1] // assets/[id]

    if (!assetId) {
      return new Response(
        JSON.stringify({ error: 'Asset ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get asset with related data
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        *,
        reel_meta(*),
        carousel_meta(*),
        asset_destinations(*)
      `)
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return new Response(
        JSON.stringify({ error: 'Asset not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get workflow execution data if exists
    const { data: workflowExecution } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Prepare response with all relevant data for N8N
    const response = {
      id: asset.id,
      title: asset.title,
      description: asset.description,
      content_type: asset.content_type,
      status: asset.status,
      thumbnail_url: asset.thumbnail_url,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
      scheduled_at: asset.scheduled_at,
      published_at: asset.published_at,
      metadata: asset.metadata,
      
      // Content-specific metadata
      reel_meta: asset.reel_meta?.[0] || null,
      carousel_meta: asset.carousel_meta?.[0] || null,
      
      // Publishing destinations
      destinations: asset.asset_destinations || [],
      
      // Workflow information
      workflow_execution: workflowExecution || null,
      
      // Additional computed fields for N8N workflows
      is_ready_for_publishing: asset.status === 'scheduled' || asset.status === 'draft',
      has_thumbnail: !!asset.thumbnail_url,
      content_validation: {
        has_title: !!asset.title,
        has_description: !!asset.description,
        has_content: !!asset.thumbnail_url || 
                     !!(asset.reel_meta?.[0]?.video_url) || 
                     !!(asset.carousel_meta?.[0]?.image_urls?.length),
        is_valid: !!asset.title && !!asset.thumbnail_url
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Asset retrieval error:', error)
    
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