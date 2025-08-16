// Enhanced Webhook Security Service
// Specialized security layer for N8N workflow webhook communications

import { securityService } from './security'
import { supabase } from '@/integrations/supabase/client'

interface WebhookConfig {
  id: string
  workflowType: string
  secret: string
  active: boolean
  allowedOrigins: string[]
  rateLimit: {
    requests: number
    windowMinutes: number
  }
  created_at: string
  expires_at?: string
}

interface WebhookValidationResult {
  valid: boolean
  webhookConfig?: WebhookConfig
  error?: string
  metadata?: {
    ip: string
    userAgent: string
    timestamp: number
  }
}

export class WebhookSecurityService {
  private readonly defaultSecret = import.meta.env.VITE_N8N_WEBHOOK_SECRET || 'dev-webhook-secret'
  private readonly webhookConfigs = new Map<string, WebhookConfig>()

  constructor() {
    // Load webhook configurations from database
    this.loadWebhookConfigs()
    
    // Cleanup expired configs every hour
    setInterval(() => this.cleanupExpiredConfigs(), 60 * 60 * 1000)
  }

  /**
   * Load webhook configurations from database
   */
  private async loadWebhookConfigs(): Promise<void> {
    try {
      const { data: configs, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .eq('active', true)

      if (error) {
        console.error('Failed to load webhook configs:', error)
        return
      }

      configs?.forEach(config => {
        this.webhookConfigs.set(config.id, config)
      })

    } catch (error) {
      console.error('Error loading webhook configs:', error)
    }
  }

  /**
   * Create secure webhook configuration
   */
  async createWebhookConfig(
    workflowType: string,
    options: {
      customSecret?: string
      allowedOrigins?: string[]
      rateLimit?: { requests: number; windowMinutes: number }
      expiresInHours?: number
    } = {}
  ): Promise<WebhookConfig> {
    const secret = options.customSecret || securityService.generateAPIKey(32)
    const webhookId = securityService.generateSecureRandom(16)
    
    const config: WebhookConfig = {
      id: webhookId,
      workflowType,
      secret,
      active: true,
      allowedOrigins: options.allowedOrigins || ['*'],
      rateLimit: options.rateLimit || { requests: 100, windowMinutes: 15 },
      created_at: new Date().toISOString(),
      expires_at: options.expiresInHours 
        ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
        : undefined
    }

    // Store in database
    const { error } = await supabase
      .from('webhook_configs')
      .insert({
        id: config.id,
        workflow_type: config.workflowType,
        secret_hash: securityService.hashSensitiveData(config.secret).hash,
        secret_salt: securityService.hashSensitiveData(config.secret).salt,
        allowed_origins: config.allowedOrigins,
        rate_limit_requests: config.rateLimit.requests,
        rate_limit_window_minutes: config.rateLimit.windowMinutes,
        active: config.active,
        expires_at: config.expires_at
      })

    if (error) {
      throw new Error(`Failed to create webhook config: ${error.message}`)
    }

    // Cache in memory
    this.webhookConfigs.set(webhookId, config)

    return config
  }

  /**
   * Validate incoming webhook request
   */
  async validateWebhookRequest(
    request: Request,
    webhookId: string,
    payload: string
  ): Promise<WebhookValidationResult> {
    try {
      // Get webhook configuration
      const config = this.webhookConfigs.get(webhookId)
      if (!config) {
        return { valid: false, error: 'Webhook configuration not found' }
      }

      // Check if webhook is active
      if (!config.active) {
        return { valid: false, error: 'Webhook is disabled' }
      }

      // Check expiration
      if (config.expires_at && new Date() > new Date(config.expires_at)) {
        return { valid: false, error: 'Webhook has expired' }
      }

      // Extract request metadata
      const metadata = {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: Math.floor(Date.now() / 1000)
      }

      // Origin validation
      const origin = request.headers.get('origin')
      if (config.allowedOrigins.length > 0 && !config.allowedOrigins.includes('*')) {
        if (!origin || !config.allowedOrigins.includes(origin)) {
          return { 
            valid: false, 
            error: 'Origin not allowed',
            metadata
          }
        }
      }

      // Rate limiting
      const rateLimitKey = `webhook:${webhookId}:${metadata.ip}`
      const rateLimit = securityService.checkRateLimit(
        rateLimitKey,
        config.rateLimit.requests,
        config.rateLimit.windowMinutes
      )

      if (!rateLimit.allowed) {
        return {
          valid: false,
          error: 'Rate limit exceeded',
          metadata
        }
      }

      // HMAC signature validation
      const signatureHeader = request.headers.get('x-hub-signature-256') || 
                              request.headers.get('x-signature') ||
                              request.headers.get('x-n8n-signature')

      if (!signatureHeader) {
        return {
          valid: false,
          error: 'Missing signature header',
          metadata
        }
      }

      // Validate signature using webhook's secret
      const isValidSignature = this.validateSignature(payload, signatureHeader, config.secret)
      
      if (!isValidSignature) {
        // Log security violation
        await this.logSecurityEvent(webhookId, 'signature_validation_failed', {
          metadata,
          signatureHeader,
          payloadLength: payload.length
        })

        return {
          valid: false,
          error: 'Invalid signature',
          metadata
        }
      }

      // All validations passed
      await this.logSecurityEvent(webhookId, 'webhook_validated', {
        metadata,
        payloadLength: payload.length
      })

      return {
        valid: true,
        webhookConfig: config,
        metadata
      }

    } catch (error) {
      console.error('Webhook validation error:', error)
      return {
        valid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Validate signature with multiple signature formats
   */
  private validateSignature(payload: string, signatureHeader: string, secret: string): boolean {
    try {
      // GitHub/Standard webhook format: sha256=<signature>
      if (signatureHeader.startsWith('sha256=')) {
        const signature = signatureHeader.substring(7)
        const expectedSignature = securityService.generateHMAC(payload, secret)
        return securityService.verifyHMAC(payload, signature, secret)
      }

      // Stripe-style format: t=timestamp,v1=signature
      if (signatureHeader.includes('t=') && signatureHeader.includes('v1=')) {
        return securityService.verifyWebhookSignature(payload, signatureHeader, secret)
      }

      // Simple HMAC format (just the signature)
      return securityService.verifyHMAC(payload, signatureHeader, secret)

    } catch (error) {
      console.error('Signature validation error:', error)
      return false
    }
  }

  /**
   * Generate secure webhook URL
   */
  generateSecureWebhookURL(
    baseUrl: string,
    workflowType: string,
    webhookId: string
  ): string {
    const config = this.webhookConfigs.get(webhookId)
    if (!config) {
      throw new Error('Webhook configuration not found')
    }

    // Generate URL with embedded security token
    const timestamp = Math.floor(Date.now() / 1000)
    const token = securityService.generateHMAC(`${webhookId}.${timestamp}`, config.secret)
    
    return `${baseUrl}/api/webhook/n8n/${workflowType}/${webhookId}?t=${timestamp}&token=${token}`
  }

  /**
   * Validate webhook URL token
   */
  validateWebhookURL(url: string, webhookId: string): boolean {
    try {
      const config = this.webhookConfigs.get(webhookId)
      if (!config) return false

      const urlObj = new URL(url)
      const timestamp = urlObj.searchParams.get('t')
      const token = urlObj.searchParams.get('token')

      if (!timestamp || !token) return false

      // Check timestamp (prevent replay attacks)
      const now = Math.floor(Date.now() / 1000)
      const ts = parseInt(timestamp, 10)
      
      if (Math.abs(now - ts) > 300) { // 5 minutes tolerance
        return false
      }

      // Validate token
      const expectedToken = securityService.generateHMAC(`${webhookId}.${timestamp}`, config.secret)
      return securityService.verifyHMAC(`${webhookId}.${timestamp}`, token, config.secret)

    } catch (error) {
      return false
    }
  }

  /**
   * Sign outgoing webhook request
   */
  signOutgoingRequest(
    payload: string,
    webhookId: string,
    additionalHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const config = this.webhookConfigs.get(webhookId)
    if (!config) {
      throw new Error('Webhook configuration not found')
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const signature = securityService.generateHMAC(`${timestamp}.${payload}`, config.secret)

    return {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp.toString(),
      'X-Hub-Signature-256': `sha256=${signature}`,
      'X-Webhook-ID': webhookId,
      'User-Agent': 'Zavala-AI-Platform/2.0',
      ...additionalHeaders
    }
  }

  /**
   * Revoke webhook configuration
   */
  async revokeWebhook(webhookId: string): Promise<boolean> {
    try {
      // Update database
      const { error } = await supabase
        .from('webhook_configs')
        .update({ active: false })
        .eq('id', webhookId)

      if (error) {
        console.error('Failed to revoke webhook:', error)
        return false
      }

      // Remove from cache
      this.webhookConfigs.delete(webhookId)

      // Log security event
      await this.logSecurityEvent(webhookId, 'webhook_revoked', {
        timestamp: new Date().toISOString()
      })

      return true

    } catch (error) {
      console.error('Error revoking webhook:', error)
      return false
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
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
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Clean up expired webhook configurations
   */
  private async cleanupExpiredConfigs(): Promise<void> {
    try {
      const now = new Date().toISOString()
      
      // Get expired configs
      const { data: expiredConfigs } = await supabase
        .from('webhook_configs')
        .select('id')
        .lt('expires_at', now)
        .eq('active', true)

      if (expiredConfigs && expiredConfigs.length > 0) {
        // Deactivate expired configs
        await supabase
          .from('webhook_configs')
          .update({ active: false })
          .lt('expires_at', now)

        // Remove from cache
        expiredConfigs.forEach(config => {
          this.webhookConfigs.delete(config.id)
        })

        console.log(`Cleaned up ${expiredConfigs.length} expired webhook configs`)
      }

    } catch (error) {
      console.error('Error cleaning up expired configs:', error)
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string): Promise<any> {
    try {
      const { data: events } = await supabase
        .from('events')
        .select('event_type, created_at, event_data')
        .eq('entity_type', 'webhook')
        .eq('entity_id', webhookId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })

      const stats = {
        totalRequests: 0,
        validRequests: 0,
        failedRequests: 0,
        rateLimitHits: 0,
        signatureFailures: 0,
        lastActivity: null as string | null
      }

      events?.forEach(event => {
        stats.totalRequests++
        if (!stats.lastActivity) stats.lastActivity = event.created_at

        switch (event.event_type) {
          case 'webhook_validated':
            stats.validRequests++
            break
          case 'signature_validation_failed':
            stats.signatureFailures++
            stats.failedRequests++
            break
          case 'rate_limit_exceeded':
            stats.rateLimitHits++
            stats.failedRequests++
            break
          default:
            if (event.event_type.includes('failed')) {
              stats.failedRequests++
            }
        }
      })

      return stats

    } catch (error) {
      console.error('Error getting webhook stats:', error)
      return null
    }
  }
}

// Export singleton instance
export const webhookSecurityService = new WebhookSecurityService()