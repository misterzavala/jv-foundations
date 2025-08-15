// Instagram Graph API Integration Service
// Handles publishing to Instagram (Reels, Posts, Stories)

import { supabase } from '@/integrations/supabase/client'
import type { 
  Tables, 
  InstagramMediaResponse, 
  InstagramPublishResponse,
  ContentType 
} from '@/integrations/supabase/types-enhanced'

interface InstagramAccount {
  id: string
  access_token: string
  account_handle: string
}

interface MediaUploadResponse {
  id: string
  status: 'IN_PROGRESS' | 'FINISHED' | 'ERROR'
  error?: {
    message: string
    type: string
    code: number
  }
}

export class InstagramAPIService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0'

  /**
   * Upload media to Instagram
   */
  async uploadMedia(
    account: InstagramAccount,
    mediaUrl: string,
    contentType: ContentType,
    caption?: string
  ): Promise<string> {
    const endpoint = `${this.baseUrl}/${account.id}/media`
    
    let mediaType: string
    let additionalParams: Record<string, any> = {}

    switch (contentType) {
      case 'reel':
        mediaType = 'REELS'
        additionalParams = {
          video_url: mediaUrl,
          media_type: 'REELS'
        }
        break
      case 'single_image':
        mediaType = 'IMAGE'
        additionalParams = {
          image_url: mediaUrl
        }
        break
      case 'carousel':
        mediaType = 'CAROUSEL'
        // For carousel, we need to upload each item separately first
        throw new Error('Carousel uploads require special handling - use uploadCarousel method')
      case 'story':
        mediaType = 'STORIES'
        additionalParams = {
          image_url: mediaUrl,
          media_type: 'STORIES'
        }
        break
      default:
        throw new Error(`Unsupported content type: ${contentType}`)
    }

    const params = new URLSearchParams({
      access_token: account.access_token,
      caption: caption || '',
      ...additionalParams
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    })

    const data: MediaUploadResponse = await response.json()

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || `Upload failed: ${response.statusText}`)
    }

    // Wait for processing to complete for videos
    if (contentType === 'reel') {
      await this.waitForMediaProcessing(account, data.id)
    }

    return data.id
  }

  /**
   * Upload carousel media (multiple items)
   */
  async uploadCarousel(
    account: InstagramAccount,
    mediaUrls: string[],
    caption?: string
  ): Promise<string> {
    if (mediaUrls.length < 2 || mediaUrls.length > 10) {
      throw new Error('Carousel must contain 2-10 media items')
    }

    // Upload each media item first
    const mediaIds: string[] = []
    
    for (const mediaUrl of mediaUrls) {
      const isVideo = mediaUrl.toLowerCase().includes('.mp4') || 
                     mediaUrl.toLowerCase().includes('.mov')
      
      const endpoint = `${this.baseUrl}/${account.id}/media`
      const params = new URLSearchParams({
        access_token: account.access_token,
        [isVideo ? 'video_url' : 'image_url']: mediaUrl,
        is_carousel_item: 'true'
      })

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      })

      const data: MediaUploadResponse = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `Carousel item upload failed: ${response.statusText}`)
      }

      mediaIds.push(data.id)
    }

    // Create carousel container
    const containerEndpoint = `${this.baseUrl}/${account.id}/media`
    const containerParams = new URLSearchParams({
      access_token: account.access_token,
      media_type: 'CAROUSEL',
      children: mediaIds.join(','),
      caption: caption || ''
    })

    const containerResponse = await fetch(containerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: containerParams
    })

    const containerData: MediaUploadResponse = await containerResponse.json()

    if (!containerResponse.ok || containerData.error) {
      throw new Error(containerData.error?.message || `Carousel container creation failed`)
    }

    return containerData.id
  }

  /**
   * Publish uploaded media
   */
  async publishMedia(
    account: InstagramAccount,
    creationId: string
  ): Promise<InstagramPublishResponse> {
    const endpoint = `${this.baseUrl}/${account.id}/media_publish`
    
    const params = new URLSearchParams({
      access_token: account.access_token,
      creation_id: creationId
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        id: '',
        error: {
          message: data.error?.message || 'Publishing failed',
          type: data.error?.type || 'api_error',
          code: data.error?.code || response.status
        }
      }
    }

    return {
      id: data.id,
      post_id: data.id
    }
  }

  /**
   * Complete upload and publish flow
   */
  async uploadAndPublish(
    accountId: string,
    mediaUrls: string | string[],
    contentType: ContentType,
    caption?: string
  ): Promise<InstagramPublishResponse> {
    try {
      // Get account details
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('platform', 'instagram')
        .single()

      if (accountError || !account) {
        throw new Error('Instagram account not found or not connected')
      }

      const instagramAccount: InstagramAccount = {
        id: account.account_metadata?.instagram_business_id || account.id,
        access_token: account.access_token!,
        account_handle: account.account_handle
      }

      // Upload media
      let creationId: string

      if (contentType === 'carousel' && Array.isArray(mediaUrls)) {
        creationId = await this.uploadCarousel(instagramAccount, mediaUrls, caption)
      } else if (typeof mediaUrls === 'string') {
        creationId = await this.uploadMedia(instagramAccount, mediaUrls, contentType, caption)
      } else {
        throw new Error('Invalid media URLs for content type')
      }

      // Publish media
      const publishResult = await this.publishMedia(instagramAccount, creationId)

      // Log the result
      await this.logPublishingAttempt(accountId, {
        creation_id: creationId,
        content_type: contentType,
        media_urls: Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls],
        caption,
        result: publishResult
      })

      return publishResult

    } catch (error) {
      console.error('Instagram publish failed:', error)
      
      await this.logPublishingAttempt(accountId, {
        content_type: contentType,
        media_urls: Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls],
        caption,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }

  /**
   * Wait for media processing to complete (for videos)
   */
  private async waitForMediaProcessing(
    account: InstagramAccount,
    creationId: string,
    maxAttempts = 30,
    intervalMs = 2000
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const endpoint = `${this.baseUrl}/${creationId}`
      const params = new URLSearchParams({
        access_token: account.access_token,
        fields: 'status_code,status'
      })

      const response = await fetch(`${endpoint}?${params}`)
      const data = await response.json()

      if (data.status_code === 'FINISHED') {
        return
      }

      if (data.status_code === 'ERROR') {
        throw new Error(`Media processing failed: ${data.status}`)
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new Error('Media processing timeout')
  }

  /**
   * Get media information
   */
  async getMedia(
    account: InstagramAccount,
    mediaId: string
  ): Promise<InstagramMediaResponse> {
    const endpoint = `${this.baseUrl}/${mediaId}`
    const params = new URLSearchParams({
      access_token: account.access_token,
      fields: 'id,media_type,media_url,thumbnail_url,caption,timestamp,permalink'
    })

    const response = await fetch(`${endpoint}?${params}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to get media info')
    }

    return data
  }

  /**
   * Validate account connection
   */
  async validateAccount(accountId: string): Promise<boolean> {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('platform', 'instagram')
        .single()

      if (error || !account) {
        return false
      }

      const instagramAccount: InstagramAccount = {
        id: account.account_metadata?.instagram_business_id || account.id,
        access_token: account.access_token!,
        account_handle: account.account_handle
      }

      // Test API call
      const endpoint = `${this.baseUrl}/${instagramAccount.id}`
      const params = new URLSearchParams({
        access_token: instagramAccount.access_token,
        fields: 'id,username'
      })

      const response = await fetch(`${endpoint}?${params}`)
      return response.ok

    } catch (error) {
      console.error('Account validation failed:', error)
      return false
    }
  }

  /**
   * Log publishing attempts for debugging and analytics
   */
  private async logPublishingAttempt(
    accountId: string,
    data: {
      creation_id?: string
      content_type: ContentType
      media_urls: string[]
      caption?: string
      result?: InstagramPublishResponse
      error?: string
    }
  ): Promise<void> {
    try {
      await supabase
        .from('events')
        .insert({
          entity_type: 'destination',
          entity_id: accountId,
          event_type: data.error ? 'publishing_failed' : 'publishing_attempted',
          event_data: data
        })
    } catch (error) {
      console.error('Failed to log publishing attempt:', error)
    }
  }

  /**
   * Refresh access token (for long-lived tokens)
   */
  async refreshAccessToken(accountId: string): Promise<boolean> {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (error || !account || !account.refresh_token) {
        return false
      }

      const endpoint = 'https://graph.facebook.com/v18.0/oauth/access_token'
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        fb_exchange_token: account.access_token!
      })

      const response = await fetch(endpoint, {
        method: 'POST',
        body: params
      })

      const data = await response.json()

      if (response.ok && data.access_token) {
        // Update token in database
        await supabase
          .from('accounts')
          .update({
            access_token: data.access_token,
            token_expires_at: data.expires_in ? 
              new Date(Date.now() + data.expires_in * 1000).toISOString() : 
              null
          })
          .eq('id', accountId)

        return true
      }

      return false

    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const instagramAPI = new InstagramAPIService()