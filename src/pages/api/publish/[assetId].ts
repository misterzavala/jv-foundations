// API Route: /api/publish/[assetId]
// Manual publishing endpoint for assets

import type { NextApiRequest, NextApiResponse } from 'next'
import { n8nService } from '@/services/n8n-integration'
import { multiPlatformPublisher } from '@/services/platform-publisher'
import { supabase } from '@/integrations/supabase/client'
import type { WorkflowType } from '@/integrations/supabase/types-enhanced'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { assetId } = req.query

  if (!assetId || typeof assetId !== 'string') {
    return res.status(400).json({ error: 'Asset ID is required' })
  }

  switch (req.method) {
    case 'POST':
      return handlePublish(req, res, assetId)
    case 'GET':
      return handleGetStatus(req, res, assetId)
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handlePublish(req: NextApiRequest, res: NextApiResponse, assetId: string) {
  try {
    const {
      publishMethod = 'n8n', // 'n8n' | 'direct'
      destinations,
      scheduledTime,
      priority = 0
    } = req.body

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        *,
        asset_destinations(
          id,
          account_id,
          accounts(platform, account_handle)
        )
      `)
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return res.status(404).json({ error: 'Asset not found' })
    }

    // Check if asset is ready for publishing
    if (asset.status !== 'draft' && asset.status !== 'ready') {
      return res.status(400).json({ 
        error: `Asset status is ${asset.status}, cannot publish` 
      })
    }

    let result: any

    if (publishMethod === 'n8n') {
      // Use N8N workflow
      const workflowType: WorkflowType = asset.content_type === 'reel' ? 'publish_reel' : 'publish_carousel'
      
      result = await n8nService.triggerWorkflow(assetId, workflowType, {
        destinations,
        scheduledTime,
        priority
      })

      res.status(200).json({
        success: true,
        message: 'Publishing workflow started',
        executionId: result,
        method: 'n8n'
      })

    } else {
      // Direct publishing
      const destinationsToPublish = destinations || 
        asset.asset_destinations?.map((d: any) => d.id) || []

      if (destinationsToPublish.length === 0) {
        return res.status(400).json({ error: 'No destinations specified' })
      }

      // Get media URLs from metadata
      const mediaUrls = asset.metadata?.files || []
      if (mediaUrls.length === 0) {
        return res.status(400).json({ error: 'No media files found' })
      }

      const publishResults = []

      for (const destinationId of destinationsToPublish) {
        try {
          const publishResult = await multiPlatformPublisher.publishToPlatform({
            assetId,
            destinationId,
            mediaUrls: asset.content_type === 'carousel' ? mediaUrls : mediaUrls[0],
            contentType: asset.content_type,
            caption: asset.description
          })

          publishResults.push({
            destinationId,
            ...publishResult
          })
        } catch (error) {
          publishResults.push({
            destinationId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Update asset status based on results
      const allSuccessful = publishResults.every(r => r.success)
      const anySuccessful = publishResults.some(r => r.success)

      await supabase
        .from('assets')
        .update({
          status: allSuccessful ? 'published' : anySuccessful ? 'published' : 'failed',
          published_at: anySuccessful ? new Date().toISOString() : null
        })
        .eq('id', assetId)

      res.status(200).json({
        success: anySuccessful,
        message: allSuccessful 
          ? 'All destinations published successfully'
          : anySuccessful 
            ? 'Some destinations published successfully'
            : 'Publishing failed for all destinations',
        results: publishResults,
        method: 'direct'
      })
    }

  } catch (error) {
    console.error('Publishing error:', error)
    
    res.status(500).json({
      error: 'Publishing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleGetStatus(req: NextApiRequest, res: NextApiResponse, assetId: string) {
  try {
    // Get asset and its destinations
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        *,
        asset_destinations(
          *,
          accounts(platform, account_handle)
        )
      `)
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return res.status(404).json({ error: 'Asset not found' })
    }

    // Get recent workflow executions
    const { data: workflows, error: workflowError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get recent events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('entity_id', assetId)
      .eq('entity_type', 'asset')
      .order('created_at', { ascending: false })
      .limit(10)

    const status = {
      asset: {
        id: asset.id,
        title: asset.title,
        status: asset.status,
        content_type: asset.content_type,
        created_at: asset.created_at,
        published_at: asset.published_at,
        retry_count: asset.retry_count,
        last_error: asset.last_error
      },
      destinations: asset.asset_destinations?.map((dest: any) => ({
        id: dest.id,
        platform: dest.accounts.platform,
        account: dest.accounts.account_handle,
        status: dest.status,
        platform_post_id: dest.platform_post_id,
        published_at: dest.published_at,
        error: dest.error_message,
        attempts: dest.publishing_attempts
      })) || [],
      workflows: workflows || [],
      recent_events: events || []
    }

    res.status(200).json(status)

  } catch (error) {
    console.error('Status check error:', error)
    
    res.status(500).json({
      error: 'Failed to get status',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}