// File Upload Service
// Handles file uploads with automatic workflow trigger integration

import { supabase } from '@/integrations/supabase/client'
import { EventEmitter } from './event-sourcing'

export interface FileUploadOptions {
  file: File
  assetId?: string // If provided, attach to existing asset
  createAsset?: {
    title: string
    description?: string
    contentType: 'reel' | 'carousel' | 'single_image' | 'story'
    platforms?: string[]
  }
  folder?: string // Custom folder path
  onProgress?: (progress: number) => void
}

export interface FileUploadResult {
  success: boolean
  fileUrl?: string
  filePath?: string
  assetId?: string
  workflowId?: string
  error?: string
  metadata?: {
    fileSize: number
    fileName: string
    mimeType: string
    dimensions?: { width: number; height: number }
    duration?: number // For videos
  }
}

export class FileUploadService {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]

  /**
   * Upload file with optional asset creation and workflow triggering
   */
  async uploadFile(options: FileUploadOptions): Promise<FileUploadResult> {
    const { file, assetId, createAsset, folder, onProgress } = options

    try {
      // Validate file
      const validation = this.validateFile(file)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // Generate file path
      const filePath = this.generateFilePath(file, folder)
      
      // Get file metadata
      const metadata = await this.extractFileMetadata(file)

      // Upload to Supabase Storage
      const uploadResult = await this.uploadToStorage(file, filePath, onProgress)
      if (!uploadResult.success) {
        return uploadResult
      }

      // Create or update asset if requested
      let finalAssetId = assetId
      let workflowId: string | undefined

      if (createAsset) {
        const assetResult = await this.createAssetFromFile(
          uploadResult.filePath!,
          uploadResult.fileUrl!,
          file,
          createAsset,
          metadata
        )
        
        if (!assetResult.success) {
          // Clean up uploaded file on asset creation failure
          await this.deleteFile(uploadResult.filePath!)
          return assetResult
        }

        finalAssetId = assetResult.assetId

        // Note: Workflow triggering will be handled by existing N8N webhook
      } else if (assetId) {
        // Update existing asset with file
        await this.updateAssetWithFile(assetId, uploadResult.filePath!, uploadResult.fileUrl!, metadata)
      }

      // Log file upload event
      await EventEmitter.asset.fileUploaded(
        finalAssetId || 'standalone',
        uploadResult.filePath!,
        {
          source: 'file_upload_service',
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          workflow_id: workflowId,
          metadata
        }
      )

      return {
        success: true,
        fileUrl: uploadResult.fileUrl,
        filePath: uploadResult.filePath,
        assetId: finalAssetId,
        workflowId,
        metadata
      }

    } catch (error) {
      console.error('File upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      }
    }
  }

  /**
   * Upload multiple files in batch
   */
  async uploadMultipleFiles(
    files: File[],
    options: Omit<FileUploadOptions, 'file'> & {
      createCarousel?: boolean // Auto-create carousel asset from multiple images
    }
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = []

    // Handle carousel creation
    if (options.createCarousel && files.every(f => f.type.startsWith('image/'))) {
      return this.createCarouselFromFiles(files, options)
    }

    // Upload files individually
    for (const file of files) {
      const result = await this.uploadFile({ ...options, file })
      results.push(result)
    }

    return results
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      }
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      }
    }

    return { valid: true }
  }

  /**
   * Generate unique file path
   */
  private generateFilePath(file: File, folder?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split('.').pop()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    
    const basePath = folder || 'uploads'
    return `${basePath}/${timestamp}_${randomSuffix}_${sanitizedName}`
  }

  /**
   * Upload file to Supabase Storage
   */
  private async uploadToStorage(
    file: File,
    filePath: string,
    onProgress?: (progress: number) => void
  ): Promise<FileUploadResult> {
    try {
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath)

      // Simulate progress callback
      if (onProgress) {
        onProgress(100)
      }

      return {
        success: true,
        fileUrl: publicUrl,
        filePath: data.path
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  /**
   * Extract file metadata
   */
  private async extractFileMetadata(file: File): Promise<any> {
    const metadata: any = {
      fileSize: file.size,
      fileName: file.name,
      mimeType: file.type,
      uploadedAt: new Date().toISOString()
    }

    // Extract image dimensions
    if (file.type.startsWith('image/')) {
      try {
        const dimensions = await this.getImageDimensions(file)
        metadata.dimensions = dimensions
      } catch (error) {
        console.warn('Failed to extract image dimensions:', error)
      }
    }

    // Extract video metadata
    if (file.type.startsWith('video/')) {
      try {
        const videoMetadata = await this.getVideoMetadata(file)
        metadata.duration = videoMetadata.duration
        metadata.dimensions = videoMetadata.dimensions
      } catch (error) {
        console.warn('Failed to extract video metadata:', error)
      }
    }

    return metadata
  }

  /**
   * Get image dimensions
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Get video metadata
   */
  private getVideoMetadata(file: File): Promise<{ duration: number; dimensions: { width: number; height: number } }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          dimensions: {
            width: video.videoWidth,
            height: video.videoHeight
          }
        })
      }
      video.onerror = reject
      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * Create asset from uploaded file
   */
  private async createAssetFromFile(
    filePath: string,
    fileUrl: string,
    file: File,
    createAsset: NonNullable<FileUploadOptions['createAsset']>,
    metadata: any
  ): Promise<FileUploadResult> {
    try {
      const { data: asset, error } = await supabase
        .from('assets')
        .insert({
          title: createAsset.title,
          description: createAsset.description,
          content_type: createAsset.contentType,
          status: 'draft',
          thumbnail_url: file.type.startsWith('image/') ? fileUrl : null,
          metadata: {
            ...metadata,
            file_path: filePath,
            file_url: fileUrl,
            platforms: createAsset.platforms || []
          }
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Asset creation failed: ${error.message}`)
      }

      // Create content-type specific metadata
      if (createAsset.contentType === 'reel' && file.type.startsWith('video/')) {
        await this.createReelMetadata(asset.id, fileUrl, metadata)
      } else if (createAsset.contentType === 'single_image' && file.type.startsWith('image/')) {
        // Single images store metadata in the main asset record
      }

      return {
        success: true,
        assetId: asset.id,
        fileUrl,
        filePath,
        metadata
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Asset creation failed'
      }
    }
  }

  /**
   * Update existing asset with file
   */
  private async updateAssetWithFile(
    assetId: string,
    filePath: string,
    fileUrl: string,
    metadata: any
  ): Promise<void> {
    await supabase
      .from('assets')
      .update({
        thumbnail_url: fileUrl,
        metadata: {
          file_path: filePath,
          file_url: fileUrl,
          ...metadata
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)
  }

  /**
   * Create reel metadata
   */
  private async createReelMetadata(assetId: string, videoUrl: string, metadata: any): Promise<void> {
    await supabase
      .from('reel_meta')
      .insert({
        asset_id: assetId,
        video_url: videoUrl,
        duration_seconds: metadata.duration ? Math.round(metadata.duration) : null,
        aspect_ratio: metadata.dimensions ? 
          `${metadata.dimensions.width}:${metadata.dimensions.height}` : '9:16',
        file_size_mb: metadata.fileSize ? (metadata.fileSize / 1024 / 1024) : null
      })
  }

  /**
   * Create carousel from multiple files
   */
  private async createCarouselFromFiles(
    files: File[],
    options: any
  ): Promise<FileUploadResult[]> {
    try {
      // Upload all files first
      const uploadPromises = files.map(file => 
        this.uploadToStorage(
          file,
          this.generateFilePath(file, options.folder),
          options.onProgress
        )
      )

      const uploadResults = await Promise.all(uploadPromises)
      
      // Check if all uploads succeeded
      const failedUploads = uploadResults.filter(r => !r.success)
      if (failedUploads.length > 0) {
        // Clean up successful uploads
        const successfulUploads = uploadResults.filter(r => r.success)
        await Promise.all(
          successfulUploads.map(r => this.deleteFile(r.filePath!))
        )
        
        return [{
          success: false,
          error: `${failedUploads.length} file uploads failed`
        }]
      }

      // Create carousel asset
      const imageUrls = uploadResults.map(r => r.fileUrl!)
      const { data: asset, error } = await supabase
        .from('assets')
        .insert({
          title: options.createAsset?.title || 'Carousel Asset',
          description: options.createAsset?.description,
          content_type: 'carousel',
          status: 'draft',
          thumbnail_url: imageUrls[0], // Use first image as thumbnail
          metadata: {
            image_urls: imageUrls,
            image_count: imageUrls.length,
            platforms: options.createAsset?.platforms || []
          }
        })
        .select()
        .single()

      if (error) {
        // Clean up uploaded files
        await Promise.all(
          uploadResults.map(r => this.deleteFile(r.filePath!))
        )
        throw new Error(`Carousel asset creation failed: ${error.message}`)
      }

      // Create carousel metadata
      await supabase
        .from('carousel_meta')
        .insert({
          asset_id: asset.id,
          image_urls: imageUrls
        })

      return [{
        success: true,
        assetId: asset.id,
        fileUrl: imageUrls[0],
        filePath: uploadResults[0].filePath,
        metadata: {
          fileSize: files.reduce((total, file) => total + file.size, 0),
          fileName: `${files.length}_image_carousel`,
          mimeType: 'image/carousel',
          imageCount: files.length
        }
      }]

    } catch (error) {
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Carousel creation failed'
      }]
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('assets')
        .remove([filePath])

      if (error) {
        console.error('File deletion failed:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('File deletion error:', error)
      return false
    }
  }

  /**
   * Get file download URL
   */
  async getDownloadUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('assets')
        .createSignedUrl(filePath, expiresIn)

      if (error) {
        console.error('Failed to create signed URL:', error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error('Error creating download URL:', error)
      return null
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folder: string = 'uploads'): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from('assets')
        .list(folder)

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error listing files:', error)
      return []
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService()