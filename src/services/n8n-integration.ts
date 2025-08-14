// N8N Workflow Integration Service
// Handles communication with N8N workflows for automated content publishing

import { supabase } from '@/integrations/supabase/client'
import type { 
  N8NWorkflowPayload, 
  N8NWebhookResponse, 
  Tables, 
  WorkflowType,
  AssetStatus 
} from '@/integrations/supabase/types-enhanced'

export class N8NIntegrationService {
  private baseUrl: string
  private webhookSecret: string

  constructor() {
    // These would come from environment variables in production
    // Using import.meta.env for Vite instead of process.env
    this.baseUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'
    this.webhookSecret = import.meta.env.VITE_N8N_WEBHOOK_SECRET || 'dev-secret-key'
  }

  /**
   * Trigger a publishing workflow in N8N
   */
  async triggerWorkflow(
    assetId: string, 
    workflowType: WorkflowType,
    options: {
      destinations?: string[]
      scheduledTime?: string
      priority?: number
    } = {}
  ): Promise<string | null> {
    try {
      // First, get the asset details
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select(`
          *,
          asset_destinations(
            id,
            account_id,
            accounts(*)
          )
        `)
        .eq('id', assetId)
        .single()

      if (assetError || !asset) {
        throw new Error(`Asset not found: ${assetError?.message}`)
      }

      // Create workflow execution record
      const { data: execution, error: executionError } = await supabase
        .from('workflow_executions')
        .insert({
          asset_id: assetId,
          workflow_type: workflowType,
          status: 'started',
          input_data: {
            assetId,
            workflowType,
            destinations: options.destinations,
            scheduledTime: options.scheduledTime,
            priority: options.priority
          }
        })
        .select()
        .single()

      if (executionError || !execution) {
        throw new Error(`Failed to create workflow execution: ${executionError?.message}`)
      }

      // Update asset status to queued
      await supabase
        .from('assets')
        .update({ 
          status: 'queued' as AssetStatus,
          workflow_id: execution.id 
        })
        .eq('id', assetId)

      // Prepare N8N webhook payload
      const payload: N8NWorkflowPayload = {
        assetId,
        workflowType,
        destinations: options.destinations || asset.asset_destinations?.map(d => d.id) || [],
        scheduledTime: options.scheduledTime,
        metadata: {
          executionId: execution.id,
          asset: asset,
          destinations: asset.asset_destinations
        }
      }

      // Send to N8N webhook
      const response = await this.sendWebhookRequest(workflowType, payload)
      
      // Update execution with N8N execution ID
      if (response.executionId) {
        await supabase
          .from('workflow_executions')
          .update({
            n8n_execution_id: response.executionId,
            status: 'running'
          })
          .eq('id', execution.id)

        await supabase
          .from('assets')
          .update({ n8n_execution_id: response.executionId })
          .eq('id', assetId)
      }

      return execution.id

    } catch (error) {
      console.error('Failed to trigger N8N workflow:', error)
      
      // Update asset status to failed
      await supabase
        .from('assets')
        .update({ 
          status: 'failed' as AssetStatus,
          last_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', assetId)

      throw error
    }
  }

  /**
   * Send webhook request to N8N
   */
  private async sendWebhookRequest(
    workflowType: WorkflowType, 
    payload: N8NWorkflowPayload
  ): Promise<N8NWebhookResponse> {
    const url = `${this.baseUrl}/${workflowType}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': this.webhookSecret,
        'User-Agent': 'Zavala-AI-Platform/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`N8N webhook failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Handle webhook responses from N8N workflows
   */
  async handleWorkflowCallback(data: {
    executionId: string
    status: 'completed' | 'failed'
    assetId: string
    destinations?: Array<{
      id: string
      status: string
      platformPostId?: string
      error?: string
    }>
    error?: string
  }): Promise<void> {
    try {
      const { executionId, status, assetId, destinations, error } = data

      // Update workflow execution
      const { error: executionError } = await supabase
        .from('workflow_executions')
        .update({
          status: status,
          completed_at: new Date().toISOString(),
          output_data: data,
          error_details: error
        })
        .eq('n8n_execution_id', executionId)

      if (executionError) {
        console.error('Failed to update workflow execution:', executionError)
      }

      // Update asset status
      const newAssetStatus: AssetStatus = status === 'completed' ? 'published' : 'failed'
      await supabase
        .from('assets')
        .update({
          status: newAssetStatus,
          published_at: status === 'completed' ? new Date().toISOString() : null,
          last_error: error
        })
        .eq('id', assetId)

      // Update destination statuses
      if (destinations) {
        for (const dest of destinations) {
          await supabase
            .from('asset_destinations')
            .update({
              status: dest.status as any,
              platform_post_id: dest.platformPostId,
              published_at: dest.status === 'published' ? new Date().toISOString() : null,
              error_message: dest.error,
              publishing_attempts: supabase.rpc('increment', { x: 1 }) as any
            })
            .eq('id', dest.id)
        }
      }

      console.log(`Workflow ${executionId} completed with status: ${status}`)

    } catch (error) {
      console.error('Failed to handle workflow callback:', error)
      throw error
    }
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(executionId: string): Promise<Tables<'workflow_executions'> | null> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('n8n_execution_id', executionId)
      .single()

    if (error) {
      console.error('Failed to get workflow status:', error)
      return null
    }

    return data
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(executionId: string): Promise<boolean> {
    try {
      // Call N8N API to cancel execution
      const response = await fetch(`${this.baseUrl}/executions/${executionId}/stop`, {
        method: 'POST',
        headers: {
          'X-Webhook-Secret': this.webhookSecret
        }
      })

      if (response.ok) {
        // Update local status
        await supabase
          .from('workflow_executions')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
          })
          .eq('n8n_execution_id', executionId)

        return true
      }

      return false
    } catch (error) {
      console.error('Failed to cancel workflow:', error)
      return false
    }
  }

  /**
   * Retry a failed workflow
   */
  async retryWorkflow(assetId: string): Promise<string | null> {
    try {
      // Get the last failed execution
      const { data: lastExecution, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('asset_id', assetId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !lastExecution) {
        throw new Error('No failed execution found for retry')
      }

      // Increment retry count
      await supabase
        .from('assets')
        .update({ 
          retry_count: supabase.rpc('increment', { x: 1 }) as any
        })
        .eq('id', assetId)

      // Trigger new workflow with same parameters
      const inputData = lastExecution.input_data as any
      return this.triggerWorkflow(
        assetId, 
        lastExecution.workflow_type,
        {
          destinations: inputData.destinations,
          scheduledTime: inputData.scheduledTime,
          priority: inputData.priority
        }
      )

    } catch (error) {
      console.error('Failed to retry workflow:', error)
      throw error
    }
  }

  /**
   * Batch trigger multiple assets
   */
  async batchTriggerWorkflows(
    assetIds: string[],
    workflowType: WorkflowType,
    options: {
      scheduledTime?: string
      staggerMinutes?: number
    } = {}
  ): Promise<string[]> {
    const executionIds: string[] = []
    const { staggerMinutes = 5 } = options

    for (let i = 0; i < assetIds.length; i++) {
      const assetId = assetIds[i]
      
      // Stagger scheduled times if provided
      let scheduledTime = options.scheduledTime
      if (scheduledTime && staggerMinutes > 0) {
        const baseTime = new Date(scheduledTime)
        baseTime.setMinutes(baseTime.getMinutes() + (i * staggerMinutes))
        scheduledTime = baseTime.toISOString()
      }

      try {
        const executionId = await this.triggerWorkflow(assetId, workflowType, {
          scheduledTime
        })
        
        if (executionId) {
          executionIds.push(executionId)
        }
      } catch (error) {
        console.error(`Failed to trigger workflow for asset ${assetId}:`, error)
      }

      // Small delay between requests to avoid overwhelming N8N
      if (i < assetIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return executionIds
  }
}

// Export singleton instance with lazy initialization
let _n8nService: N8NIntegrationService | null = null

export const n8nService = {
  getInstance(): N8NIntegrationService {
    if (!_n8nService) {
      _n8nService = new N8NIntegrationService()
    }
    return _n8nService
  }
}

// Webhook endpoint handler for Next.js API routes
export async function handleN8NWebhook(req: Request): Promise<Response> {
  try {
    const data = await req.json()
    await n8nService.handleWorkflowCallback(data)
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    
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