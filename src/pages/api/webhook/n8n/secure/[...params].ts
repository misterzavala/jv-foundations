// Secure N8N Webhook Endpoint
// Handles all incoming webhook communications from N8N workflows with full security validation

import { webhookSecurityService } from '@/services/webhook-security'
import { EventEmitter } from '@/services/event-sourcing'
import { supabase } from '@/integrations/supabase/client'

interface N8NWebhookPayload {
  executionId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  assetId: string
  workflowType: string
  destinations?: Array<{
    id: string
    platform: string
    status: string
    platformPostId?: string
    error?: string
    publishedAt?: string
  }>
  error?: string
  metadata?: Record<string, any>
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Extract webhook parameters
    const url = new URL(req.url!)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const workflowType = pathSegments[pathSegments.length - 2] // e.g., 'instagram_post'
    const webhookId = pathSegments[pathSegments.length - 1]   // e.g., webhook ID

    if (!workflowType || !webhookId) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook URL format' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Get request payload
    const payload = await req.text()
    
    // Validate webhook security
    const validation = await webhookSecurityService.validateWebhookRequest(
      req,
      webhookId,
      payload
    )

    if (!validation.valid) {
      console.error('Webhook validation failed:', validation.error)
      
      return new Response(
        JSON.stringify({ 
          error: 'Webhook validation failed',
          details: validation.error 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse the validated payload
    let webhookData: N8NWebhookPayload
    try {
      webhookData = JSON.parse(payload)
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate required fields
    if (!webhookData.executionId || !webhookData.status || !webhookData.assetId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: executionId, status, assetId' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Process the webhook based on workflow type
    const result = await processWorkflowWebhook(workflowType, webhookData, validation.metadata!)

    // Log successful webhook processing using event sourcing
    await EventEmitter.workflow.completed(
      webhookData.executionId,
      0, // Duration will be calculated elsewhere
      {
        source: 'webhook_endpoint',
        webhook_id: webhookId,
        workflow_type: workflowType,
        asset_id: webhookData.assetId,
        ip_address: validation.metadata?.ip,
        user_agent: validation.metadata?.userAgent
      }
    )

    return new Response(
      JSON.stringify({ 
        success: true,
        executionId: webhookData.executionId,
        processed: true,
        result
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    
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

/**
 * Process webhook based on workflow type
 */
async function processWorkflowWebhook(
  workflowType: string,
  webhookData: N8NWebhookPayload,
  metadata: any
): Promise<any> {
  const { executionId, status, assetId, destinations, error } = webhookData

  // Update workflow execution record
  await updateWorkflowExecution(executionId, {
    status,
    completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
    output_data: webhookData,
    error_details: error,
    metadata: {
      ...metadata,
      workflowType,
      processedAt: new Date().toISOString()
    }
  })

  // Update asset status based on workflow result
  await updateAssetStatus(assetId, status, error)

  // Process destinations if provided
  if (destinations && destinations.length > 0) {
    await processDestinations(assetId, destinations)
  }

  // Handle specific workflow types
  switch (workflowType) {
    case 'instagram_post':
    case 'instagram_story':
      return await processInstagramWorkflow(webhookData)
    
    case 'linkedin_post':
      return await processLinkedInWorkflow(webhookData)
    
    case 'facebook_post':
      return await processFacebookWorkflow(webhookData)
    
    case 'multi_platform':
      return await processMultiPlatformWorkflow(webhookData)
    
    default:
      return await processGenericWorkflow(webhookData)
  }
}

/**
 * Update workflow execution record
 */
async function updateWorkflowExecution(
  executionId: string,
  updates: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('workflow_executions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', executionId)

    if (error) {
      console.error('Failed to update workflow execution:', error)
    }
  } catch (error) {
    console.error('Error updating workflow execution:', error)
  }
}

/**
 * Update asset status
 */
async function updateAssetStatus(
  assetId: string,
  status: string,
  error?: string
): Promise<void> {
  try {
    const assetStatus = mapWorkflowStatusToAssetStatus(status)
    
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        status: assetStatus,
        published_at: status === 'completed' ? new Date().toISOString() : null,
        last_error: error || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)

    if (updateError) {
      console.error('Failed to update asset status:', updateError)
    }
  } catch (error) {
    console.error('Error updating asset status:', error)
  }
}

/**
 * Process destination publishing results
 */
async function processDestinations(
  assetId: string,
  destinations: Array<{
    id: string
    platform: string
    status: string
    platformPostId?: string
    error?: string
    publishedAt?: string
  }>
): Promise<void> {
  try {
    for (const destination of destinations) {
      const { error } = await supabase
        .from('asset_destinations')
        .update({
          status: destination.status,
          platform_post_id: destination.platformPostId,
          published_at: destination.publishedAt || (destination.status === 'published' ? new Date().toISOString() : null),
          error_message: destination.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', destination.id)

      if (error) {
        console.error(`Failed to update destination ${destination.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error processing destinations:', error)
  }
}

/**
 * Map workflow status to asset status
 */
function mapWorkflowStatusToAssetStatus(workflowStatus: string): string {
  switch (workflowStatus) {
    case 'completed':
      return 'published'
    case 'running':
      return 'publishing'
    case 'failed':
    case 'cancelled':
      return 'failed'
    default:
      return 'queued'
  }
}

/**
 * Process Instagram-specific workflow
 */
async function processInstagramWorkflow(webhookData: N8NWebhookPayload): Promise<any> {
  const { assetId, status, destinations } = webhookData

  if (status === 'completed' && destinations) {
    // Extract Instagram-specific data
    const instagramPosts = destinations.filter(d => d.platform === 'instagram')
    
    for (const post of instagramPosts) {
      if (post.platformPostId) {
        // Store Instagram post ID for future reference
        await logWorkflowEvent(assetId, 'instagram_post_created', {
          postId: post.platformPostId,
          publishedAt: post.publishedAt
        })
      }
    }
  }

  return { platform: 'instagram', processed: true }
}

/**
 * Process LinkedIn-specific workflow
 */
async function processLinkedInWorkflow(webhookData: N8NWebhookPayload): Promise<any> {
  const { assetId, status, destinations } = webhookData

  if (status === 'completed' && destinations) {
    const linkedinPosts = destinations.filter(d => d.platform === 'linkedin')
    
    for (const post of linkedinPosts) {
      if (post.platformPostId) {
        await logWorkflowEvent(assetId, 'linkedin_post_created', {
          postId: post.platformPostId,
          publishedAt: post.publishedAt
        })
      }
    }
  }

  return { platform: 'linkedin', processed: true }
}

/**
 * Process Facebook-specific workflow
 */
async function processFacebookWorkflow(webhookData: N8NWebhookPayload): Promise<any> {
  const { assetId, status, destinations } = webhookData

  if (status === 'completed' && destinations) {
    const facebookPosts = destinations.filter(d => d.platform === 'facebook')
    
    for (const post of facebookPosts) {
      if (post.platformPostId) {
        await logWorkflowEvent(assetId, 'facebook_post_created', {
          postId: post.platformPostId,
          publishedAt: post.publishedAt
        })
      }
    }
  }

  return { platform: 'facebook', processed: true }
}

/**
 * Process multi-platform workflow
 */
async function processMultiPlatformWorkflow(webhookData: N8NWebhookPayload): Promise<any> {
  const { assetId, destinations } = webhookData

  const platformSummary: Record<string, any> = {}

  if (destinations) {
    destinations.forEach(dest => {
      if (!platformSummary[dest.platform]) {
        platformSummary[dest.platform] = { success: 0, failed: 0, posts: [] }
      }
      
      if (dest.status === 'published') {
        platformSummary[dest.platform].success++
        if (dest.platformPostId) {
          platformSummary[dest.platform].posts.push(dest.platformPostId)
        }
      } else {
        platformSummary[dest.platform].failed++
      }
    })
  }

  await logWorkflowEvent(assetId, 'multi_platform_completed', {
    platformSummary,
    totalDestinations: destinations?.length || 0
  })

  return { type: 'multi_platform', platformSummary, processed: true }
}

/**
 * Process generic workflow
 */
async function processGenericWorkflow(webhookData: N8NWebhookPayload): Promise<any> {
  // Generic processing for custom workflow types
  await logWorkflowEvent(webhookData.assetId, 'generic_workflow_completed', {
    workflowType: webhookData.workflowType,
    status: webhookData.status
  })

  return { type: 'generic', processed: true }
}

/**
 * Log workflow events
 */
async function logWorkflowEvent(
  assetId: string,
  eventType: string,
  eventData: any
): Promise<void> {
  try {
    await supabase
      .from('events')
      .insert({
        entity_type: 'asset',
        entity_id: assetId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log workflow event:', error)
  }
}

/**
 * Log webhook events
 */
async function logWebhookEvent(
  webhookId: string,
  eventType: string,
  eventData: any
): Promise<void> {
  try {
    await supabase
      .from('events')
      .insert({
        entity_type: 'webhook',
        entity_id: webhookId,
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log webhook event:', error)
  }
}