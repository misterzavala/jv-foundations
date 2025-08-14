// API Route: /api/webhook/n8n/callback
// Handles webhook callbacks from N8N workflows

import type { NextApiRequest, NextApiResponse } from 'next'
import { n8nService } from '@/services/n8n-integration'
import { securityService } from '@/services/security'
import { supabase } from '@/integrations/supabase/client'

const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET || 'dev-secret-key'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify webhook signature
    const signature = req.headers['x-signature'] as string
    const timestamp = req.headers['x-timestamp'] as string
    
    if (!signature || !timestamp) {
      return res.status(401).json({ error: 'Missing signature or timestamp' })
    }

    const payload = JSON.stringify(req.body)
    const isValid = securityService.verifyHMAC(
      `${timestamp}.${payload}`,
      signature,
      WEBHOOK_SECRET
    )

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Check timestamp to prevent replay attacks
    const requestTime = parseInt(timestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    
    if (Math.abs(now - requestTime) > 300) { // 5 minutes tolerance
      return res.status(401).json({ error: 'Request too old' })
    }

    // Process webhook data
    const {
      executionId,
      status,
      assetId,
      workflowType,
      destinations,
      error,
      metadata
    } = req.body

    // Validate required fields
    if (!executionId || !status || !assetId) {
      return res.status(400).json({ 
        error: 'Missing required fields: executionId, status, assetId' 
      })
    }

    // Handle the workflow callback
    await n8nService.handleWorkflowCallback({
      executionId,
      status,
      assetId,
      destinations,
      error
    })

    // Log the webhook for debugging
    await supabase
      .from('events')
      .insert({
        entity_type: 'workflow',
        entity_id: assetId,
        event_type: 'n8n_webhook_received',
        event_data: {
          executionId,
          status,
          workflowType,
          destinations: destinations?.length || 0,
          error
        }
      })

    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    })

  } catch (error) {
    console.error('N8N webhook error:', error)
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Disable body parsing to handle raw body for signature verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}