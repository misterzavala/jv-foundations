// Caption Rendering Service
// Handles template-based caption generation for different platforms

import { supabase } from '@/integrations/supabase/client'
import type { 
  Tables, 
  Platform, 
  ContentType, 
  RenderedCaption,
  CaptionVariable 
} from '@/integrations/supabase/types-enhanced'

interface CaptionContext {
  asset: Tables<'assets'>
  creator?: {
    name: string
    handle?: string
  }
  business?: {
    name: string
    website?: string
    phone?: string
  }
  customVariables?: Record<string, any>
}

export class CaptionRenderingService {
  // Platform-specific character limits
  private readonly PLATFORM_LIMITS = {
    instagram: 2200,
    tiktok: 2200,
    linkedin: 3000,
    facebook: 63206,
    youtube: 5000
  }

  // Platform-specific hashtag limits
  private readonly HASHTAG_LIMITS = {
    instagram: 30,
    tiktok: 100,
    linkedin: 3,
    facebook: 30,
    youtube: 15
  }

  /**
   * Render caption from template
   */
  async renderCaption(
    templateId: string,
    context: CaptionContext,
    platform?: Platform
  ): Promise<RenderedCaption> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('caption_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        throw new Error('Caption template not found')
      }

      // Parse template variables
      const variables = this.parseTemplateVariables(template.template)
      const renderedText = this.processTemplate(template.template, context, variables)

      // Extract hashtags and mentions
      const hashtags = this.extractHashtags(renderedText)
      const mentions = this.extractMentions(renderedText)

      // Generate platform-specific versions
      const platformSpecific = this.generatePlatformSpecificVersions(
        renderedText, 
        hashtags, 
        platform
      )

      return {
        text: renderedText,
        hashtags,
        mentions,
        characterCount: renderedText.length,
        platformSpecific
      }

    } catch (error) {
      console.error('Caption rendering failed:', error)
      throw error
    }
  }

  /**
   * Process template with context variables
   */
  private processTemplate(
    template: string, 
    context: CaptionContext, 
    variables: string[]
  ): string {
    let processed = template

    // Define available variables
    const variableMap: Record<string, any> = {
      // Asset variables
      'asset.title': context.asset.title,
      'asset.description': context.asset.description,
      'asset.type': context.asset.content_type,
      
      // Creator variables
      'creator.name': context.creator?.name || 'Creator',
      'creator.handle': context.creator?.handle || '',
      
      // Business variables
      'business.name': context.business?.name || 'Wholesale Mastery',
      'business.website': context.business?.website || 'wholesalemastery.com',
      'business.phone': context.business?.phone || '',
      
      // Date/time variables
      'date.today': new Date().toLocaleDateString(),
      'date.year': new Date().getFullYear().toString(),
      'date.month': new Date().toLocaleDateString('en-US', { month: 'long' }),
      'date.day': new Date().getDate().toString(),
      
      // Custom variables
      ...context.customVariables
    }

    // Process each variable
    for (const variable of variables) {
      const value = variableMap[variable]
      if (value !== undefined) {
        const regex = new RegExp(`{{\\s*${variable.replace(/\./g, '\\.')}\\s*}}`, 'g')
        processed = processed.replace(regex, String(value))
      }
    }

    // Clean up any remaining unprocessed variables
    processed = processed.replace(/{{[^}]+}}/g, '')

    return processed.trim()
  }

  /**
   * Parse template to find variables
   */
  private parseTemplateVariables(template: string): string[] {
    const variableRegex = /{{([^}]+)}}/g
    const variables: string[] = []
    let match

    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1].trim()
      if (!variables.includes(variable)) {
        variables.push(variable)
      }
    }

    return variables
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g
    const matches = text.match(hashtagRegex) || []
    return matches.map(tag => tag.substring(1)) // Remove # symbol
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@[\w.]+/g
    const matches = text.match(mentionRegex) || []
    return matches.map(mention => mention.substring(1)) // Remove @ symbol
  }

  /**
   * Generate platform-specific versions
   */
  private generatePlatformSpecificVersions(
    text: string,
    hashtags: string[],
    targetPlatform?: Platform
  ): RenderedCaption['platformSpecific'] {
    const platformSpecific: RenderedCaption['platformSpecific'] = {}

    const platforms: Platform[] = targetPlatform ? [targetPlatform] : 
      ['instagram', 'tiktok', 'linkedin', 'facebook', 'youtube']

    for (const platform of platforms) {
      const limit = this.PLATFORM_LIMITS[platform]
      const hashtagLimit = this.HASHTAG_LIMITS[platform]

      let platformText = text
      let platformHashtags = hashtags.slice(0, hashtagLimit)
      let truncated = false

      // Add hashtags back to text for platforms that include them in character count
      if (platform === 'instagram' || platform === 'tiktok') {
        const hashtagText = platformHashtags.map(tag => `#${tag}`).join(' ')
        platformText = `${text}\n\n${hashtagText}`
      }

      // Truncate if needed
      if (platformText.length > limit) {
        const truncateLength = limit - 3 // Account for "..."
        platformText = platformText.substring(0, truncateLength).trim() + '...'
        truncated = true
      }

      // Platform-specific adjustments
      switch (platform) {
        case 'linkedin':
          // LinkedIn prefers professional tone
          platformText = platformText.replace(/🔥|💪|🚀/g, '') // Remove some emojis
          break
        case 'tiktok':
          // TikTok likes trending hashtags
          if (!platformHashtags.includes('fyp')) {
            platformHashtags.unshift('fyp')
          }
          if (!platformHashtags.includes('viral')) {
            platformHashtags.push('viral')
          }
          break
      }

      platformSpecific[platform] = {
        text: platformText,
        truncated
      }
    }

    return platformSpecific
  }

  /**
   * Create caption template
   */
  async createTemplate(data: {
    name: string
    template: string
    platform?: Platform
    contentType?: ContentType
    variables?: CaptionVariable[]
  }): Promise<string> {
    const { data: template, error } = await supabase
      .from('caption_templates')
      .insert({
        name: data.name,
        template: data.template,
        platform: data.platform,
        content_type: data.contentType,
        variables: data.variables || [],
        is_active: true
      })
      .select()
      .single()

    if (error || !template) {
      throw new Error(`Failed to create template: ${error?.message}`)
    }

    return template.id
  }

  /**
   * Get templates for platform and content type
   */
  async getTemplates(
    platform?: Platform,
    contentType?: ContentType
  ): Promise<Tables<'caption_templates'>[]> {
    let query = supabase
      .from('caption_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (platform) {
      query = query.or(`platform.eq.${platform},platform.is.null`)
    }

    if (contentType) {
      query = query.or(`content_type.eq.${contentType},content_type.is.null`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get templates: ${error.message}`)
    }

    return data || []
  }

  /**
   * Save rendered caption to database
   */
  async saveRenderedCaption(
    destinationId: string,
    templateId: string | null,
    renderedCaption: RenderedCaption
  ): Promise<string> {
    const { data, error } = await supabase
      .from('rendered_captions')
      .insert({
        destination_id: destinationId,
        template_id: templateId,
        rendered_text: renderedCaption.text,
        hashtags: renderedCaption.hashtags,
        mentions: renderedCaption.mentions,
        character_count: renderedCaption.characterCount
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to save rendered caption: ${error?.message}`)
    }

    return data.id
  }

  /**
   * Generate caption suggestions based on asset content
   */
  async generateSuggestions(
    asset: Tables<'assets'>,
    platform: Platform,
    count = 3
  ): Promise<RenderedCaption[]> {
    try {
      // Get templates that match the platform and content type
      const templates = await this.getTemplates(platform, asset.content_type)
      
      if (templates.length === 0) {
        // Create a simple default caption
        const defaultText = this.generateDefaultCaption(asset, platform)
        return [this.createSimpleCaption(defaultText)]
      }

      const suggestions: RenderedCaption[] = []
      const context: CaptionContext = {
        asset,
        creator: { name: 'Creator' },
        business: { name: 'Wholesale Mastery' }
      }

      // Render different templates
      for (let i = 0; i < Math.min(count, templates.length); i++) {
        try {
          const rendered = await this.renderCaption(templates[i].id, context, platform)
          suggestions.push(rendered)
        } catch (error) {
          console.error(`Failed to render template ${templates[i].id}:`, error)
        }
      }

      return suggestions

    } catch (error) {
      console.error('Failed to generate caption suggestions:', error)
      // Return a simple default
      const defaultText = this.generateDefaultCaption(asset, platform)
      return [this.createSimpleCaption(defaultText)]
    }
  }

  /**
   * Generate a default caption when no templates are available
   */
  private generateDefaultCaption(asset: Tables<'assets'>, platform: Platform): string {
    const title = asset.title || 'Check this out!'
    const description = asset.description || ''
    
    let caption = title
    if (description) {
      caption += `\n\n${description}`
    }

    // Add platform-specific elements
    switch (platform) {
      case 'instagram':
        caption += '\n\n#realestate #wholesale #investment #entrepreneur'
        break
      case 'tiktok':
        caption += '\n\n#realestate #wholesale #fyp #viral #entrepreneur'
        break
      case 'linkedin':
        caption += '\n\n#RealEstate #Wholesale #Investment #Entrepreneur'
        break
    }

    return caption
  }

  /**
   * Create a simple rendered caption object
   */
  private createSimpleCaption(text: string): RenderedCaption {
    return {
      text,
      hashtags: this.extractHashtags(text),
      mentions: this.extractMentions(text),
      characterCount: text.length,
      platformSpecific: this.generatePlatformSpecificVersions(
        text,
        this.extractHashtags(text)
      )
    }
  }

  /**
   * Validate caption against platform rules
   */
  validateCaption(caption: string, platform: Platform): {
    valid: boolean
    issues: string[]
  } {
    const issues: string[] = []
    const limit = this.PLATFORM_LIMITS[platform]
    const hashtagLimit = this.HASHTAG_LIMITS[platform]

    // Check character limit
    if (caption.length > limit) {
      issues.push(`Caption exceeds ${limit} character limit (${caption.length} characters)`)
    }

    // Check hashtag limit
    const hashtags = this.extractHashtags(caption)
    if (hashtags.length > hashtagLimit) {
      issues.push(`Too many hashtags: ${hashtags.length}/${hashtagLimit}`)
    }

    // Platform-specific validations
    switch (platform) {
      case 'instagram':
        if (caption.includes('tiktok') || caption.includes('TikTok')) {
          issues.push('Instagram content should not reference TikTok')
        }
        break
      case 'linkedin':
        // Check for professional tone
        const unprofessionalWords = ['lit', 'fire', 'sick', 'dope']
        for (const word of unprofessionalWords) {
          if (caption.toLowerCase().includes(word)) {
            issues.push(`Consider more professional language instead of "${word}"`)
          }
        }
        break
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }
}

// Export singleton instance
export const captionRenderer = new CaptionRenderingService()

// Default caption templates for getting started
export const DEFAULT_CAPTION_TEMPLATES = [
  {
    name: 'Real Estate Success Story',
    template: `{{asset.title}}

{{asset.description}}

💰 Ready to start your real estate journey?
👉 Follow {{creator.handle}} for more tips!

#RealEstate #Wholesale #Investment #Entrepreneur #Success #Motivation #RealEstateInvesting #WholesaleReal Estate #BusinessTips`,
    platform: 'instagram' as Platform,
    contentType: 'reel' as ContentType
  },
  {
    name: 'Educational Hook',
    template: `🔥 {{asset.title}}

Here's what most people don't know about {{asset.type}}:

{{asset.description}}

💡 Want to learn more strategies like this?
📱 Comment "INFO" below!

#RealEstate #WholesaleStrategy #Education #RealEstateTips #Investing #fyp #viral`,
    platform: 'tiktok' as Platform,
    contentType: 'reel' as ContentType
  },
  {
    name: 'LinkedIn Professional',
    template: `{{asset.title}}

{{asset.description}}

What's your experience with real estate investing? Share your thoughts in the comments.

#RealEstate #Investment #ProfessionalDevelopment`,
    platform: 'linkedin' as Platform,
    contentType: 'single_image' as ContentType
  }
]