// Multi-Platform Publishing Service
// Unified interface for publishing to Instagram, TikTok, LinkedIn, Facebook, YouTube

import { supabase } from '@/integrations/supabase/client'
import { instagramAPI } from './instagram-api'
import { captionRenderer } from './caption-renderer'
import type { 
  Tables, 
  Platform, 
  ContentType, 
  InstagramPublishResponse 
} from '@/integrations/supabase/types-enhanced'

interface PublishRequest {
  assetId: string
  destinationId: string
  mediaUrls: string | string[]
  contentType: ContentType
  caption?: string
  scheduledTime?: string
}

interface PublishResponse {
  success: boolean
  platformPostId?: string
  error?: string
  response?: any
}

interface PlatformAPI {
  validateAccount(accountId: string): Promise<boolean>
  publishContent(
    accountId: string, 
    mediaUrls: string | string[], 
    contentType: ContentType, 
    caption?: string
  ): Promise<PublishResponse>
  refreshToken?(accountId: string): Promise<boolean>
}

export class MultiPlatformPublisher {
  private platformAPIs: Record<Platform, PlatformAPI>

  constructor() {
    this.platformAPIs = {
      instagram: new InstagramPlatformAdapter(),
      tiktok: new TikTokPlatformAdapter(),
      linkedin: new LinkedInPlatformAdapter(),
      facebook: new FacebookPlatformAdapter(),
      youtube: new YouTubePlatformAdapter()
    }
  }

  /**
   * Publish content to specific platform
   */
  async publishToPlatform(request: PublishRequest): Promise<PublishResponse> {
    try {
      // Get destination and account info
      const { data: destination, error: destError } = await supabase
        .from('asset_destinations')
        .select(`
          *,
          accounts(*)
        `)
        .eq('id', request.destinationId)
        .single()

      if (destError || !destination) {
        throw new Error(`Destination not found: ${destError?.message}`)
      }

      const account = destination.accounts as Tables<'accounts'>
      const platform = account.platform as Platform

      // Update destination status to publishing
      await supabase
        .from('asset_destinations')
        .update({ status: 'publishing' })
        .eq('id', request.destinationId)

      // Get platform API
      const platformAPI = this.platformAPIs[platform]
      if (!platformAPI) {
        throw new Error(`Platform ${platform} not supported`)
      }

      // Validate account connection
      const isValid = await platformAPI.validateAccount(account.id)
      if (!isValid) {
        throw new Error(`${platform} account not connected or invalid`)
      }

      // Render caption if not provided
      let caption = request.caption
      if (!caption) {
        caption = await this.generateCaption(request.assetId, platform)
      }

      // Publish content
      const result = await platformAPI.publishContent(
        account.id,
        request.mediaUrls,
        request.contentType,
        caption
      )

      // Update destination with result
      await supabase
        .from('asset_destinations')
        .update({
          status: result.success ? 'published' : 'failed',
          platform_post_id: result.platformPostId,
          published_at: result.success ? new Date().toISOString() : null,
          error_message: result.error,
          platform_response: result.response,
          publishing_attempts: supabase.rpc('increment', { x: 1 }) as any
        })
        .eq('id', request.destinationId)

      // Create event
      await supabase
        .from('events')
        .insert({
          entity_type: 'destination',
          entity_id: request.destinationId,
          event_type: result.success ? 'publishing_succeeded' : 'publishing_failed',
          event_data: {
            platform,
            assetId: request.assetId,
            result
          }
        })

      return result

    } catch (error) {
      console.error('Platform publishing failed:', error)
      
      // Update destination status to failed
      await supabase
        .from('asset_destinations')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          publishing_attempts: supabase.rpc('increment', { x: 1 }) as any
        })
        .eq('id', request.destinationId)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Batch publish to multiple platforms
   */
  async batchPublish(requests: PublishRequest[]): Promise<PublishResponse[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.publishToPlatform(request))
    )

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: result.reason?.message || 'Unknown error' }
    )
  }

  /**
   * Generate platform-specific caption
   */
  private async generateCaption(assetId: string, platform: Platform): Promise<string> {
    try {
      const { data: asset, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single()

      if (error || !asset) {
        return 'Check this out!'
      }

      const suggestions = await captionRenderer.generateSuggestions(asset, platform, 1)
      return suggestions[0]?.text || 'Check this out!'

    } catch (error) {
      console.error('Caption generation failed:', error)
      return 'Check this out!'
    }
  }

  /**
   * Get publishing status for all destinations of an asset
   */
  async getPublishingStatus(assetId: string): Promise<Record<string, any>> {
    const { data: destinations, error } = await supabase
      .from('asset_destinations')
      .select(`
        *,
        accounts(platform, account_handle)
      `)
      .eq('asset_id', assetId)

    if (error) {
      throw new Error(`Failed to get publishing status: ${error.message}`)
    }

    return destinations?.reduce((acc, dest) => {
      const account = dest.accounts as Tables<'accounts'>
      acc[account.platform] = {
        status: dest.status,
        platformPostId: dest.platform_post_id,
        publishedAt: dest.published_at,
        error: dest.error_message,
        attempts: dest.publishing_attempts
      }
      return acc
    }, {} as Record<string, any>) || {}
  }
}

// Platform-specific adapters

class InstagramPlatformAdapter implements PlatformAPI {
  async validateAccount(accountId: string): Promise<boolean> {
    return instagramAPI.validateAccount(accountId)
  }

  async publishContent(
    accountId: string,
    mediaUrls: string | string[],
    contentType: ContentType,
    caption?: string
  ): Promise<PublishResponse> {
    try {
      const result = await instagramAPI.uploadAndPublish(
        accountId,
        mediaUrls,
        contentType,
        caption
      )

      return {
        success: !result.error,
        platformPostId: result.id,
        error: result.error?.message,
        response: result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Instagram publish failed'
      }
    }
  }

  async refreshToken(accountId: string): Promise<boolean> {
    return instagramAPI.refreshAccessToken(accountId)
  }
}

class TikTokPlatformAdapter implements PlatformAPI {
  async validateAccount(accountId: string): Promise<boolean> {
    // TODO: Implement TikTok account validation
    console.log('TikTok validation not implemented yet')
    return false
  }

  async publishContent(
    accountId: string,
    mediaUrls: string | string[],
    contentType: ContentType,
    caption?: string
  ): Promise<PublishResponse> {
    // TODO: Implement TikTok publishing via API
    // TikTok API is more restrictive and may require different approach
    
    return {
      success: false,
      error: 'TikTok publishing not implemented yet'
    }
  }
}

class LinkedInPlatformAdapter implements PlatformAPI {
  async validateAccount(accountId: string): Promise<boolean> {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('platform', 'linkedin')
        .single()

      if (error || !account?.access_token) {
        return false
      }

      // Test LinkedIn API connection
      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  async publishContent(
    accountId: string,
    mediaUrls: string | string[],
    contentType: ContentType,
    caption?: string
  ): Promise<PublishResponse> {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (error || !account) {
        throw new Error('LinkedIn account not found')
      }

      // LinkedIn publishing logic
      const personURN = account.account_metadata?.person_urn || 
                       `urn:li:person:${account.account_metadata?.linkedin_id}`

      let sharePayload: any = {
        author: personURN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: caption || ''
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }

      // Add media if provided (simplified - LinkedIn media upload is complex)
      if (typeof mediaUrls === 'string' && contentType === 'single_image') {
        sharePayload.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE'
        // Media upload would require additional API calls
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(sharePayload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'LinkedIn publish failed')
      }

      return {
        success: true,
        platformPostId: result.id,
        response: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LinkedIn publish failed'
      }
    }
  }
}

class FacebookPlatformAdapter implements PlatformAPI {
  async validateAccount(accountId: string): Promise<boolean> {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('platform', 'facebook')
        .single()

      if (error || !account?.access_token) {
        return false
      }

      // Test Facebook Graph API
      const pageId = account.account_metadata?.page_id
      if (!pageId) return false

      const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}?access_token=${account.access_token}`)
      return response.ok

    } catch (error) {
      return false
    }
  }

  async publishContent(
    accountId: string,
    mediaUrls: string | string[],
    contentType: ContentType,
    caption?: string
  ): Promise<PublishResponse> {
    try {
      const { data: account, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (error || !account) {
        throw new Error('Facebook account not found')
      }

      const pageId = account.account_metadata?.page_id
      if (!pageId) {
        throw new Error('Facebook page ID not configured')
      }

      let endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`
      let payload: any = {
        message: caption || '',
        access_token: account.access_token
      }

      // Handle media posts
      if (typeof mediaUrls === 'string') {
        if (contentType === 'single_image') {
          endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`
          payload = {
            url: mediaUrls,
            caption: caption || '',
            access_token: account.access_token
          }
        } else if (contentType === 'reel') {
          endpoint = `https://graph.facebook.com/v18.0/${pageId}/videos`
          payload = {
            file_url: mediaUrls,
            description: caption || '',
            access_token: account.access_token
          }
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Facebook publish failed')
      }

      return {
        success: true,
        platformPostId: result.id,
        response: result
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Facebook publish failed'
      }
    }
  }
}

class YouTubePlatformAdapter implements PlatformAPI {
  async validateAccount(accountId: string): Promise<boolean> {
    // YouTube API validation would be implemented here
    console.log('YouTube validation not implemented yet')
    return false
  }

  async publishContent(
    accountId: string,
    mediaUrls: string | string[],
    contentType: ContentType,
    caption?: string
  ): Promise<PublishResponse> {
    // YouTube Shorts API would be implemented here
    return {
      success: false,
      error: 'YouTube publishing not implemented yet'
    }
  }
}

// Export singleton instance
export const multiPlatformPublisher = new MultiPlatformPublisher()

// Supported platforms and their capabilities
export const PLATFORM_CAPABILITIES = {
  instagram: {
    contentTypes: ['reel', 'single_image', 'carousel', 'story'],
    maxVideoLength: 90, // seconds
    maxImageSize: 8 * 1024 * 1024, // 8MB
    maxCarouselItems: 10
  },
  tiktok: {
    contentTypes: ['reel'],
    maxVideoLength: 180, // seconds
    maxVideoSize: 500 * 1024 * 1024 // 500MB
  },
  linkedin: {
    contentTypes: ['single_image', 'carousel'],
    maxImageSize: 5 * 1024 * 1024, // 5MB
    maxCarouselItems: 9
  },
  facebook: {
    contentTypes: ['reel', 'single_image', 'carousel'],
    maxVideoLength: 240, // seconds
    maxImageSize: 4 * 1024 * 1024, // 4MB
    maxCarouselItems: 10
  },
  youtube: {
    contentTypes: ['reel'], // YouTube Shorts
    maxVideoLength: 60, // seconds
    maxVideoSize: 256 * 1024 * 1024 // 256MB
  }
} as const