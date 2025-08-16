// File Uploader Component
// Tactical file upload interface with workflow integration

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Upload, X, FileIcon, ImageIcon, VideoIcon, CheckCircle } from 'lucide-react'
import { fileUploadService, type FileUploadOptions, type FileUploadResult } from '@/services/file-upload-service'

interface FileUploaderProps {
  onUploadComplete?: (results: FileUploadResult[]) => void
  onUploadError?: (error: string) => void
  maxFiles?: number
  acceptedFileTypes?: string[]
  autoCreateAsset?: boolean
  defaultPlatforms?: string[]
  folder?: string
  className?: string
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  result?: FileUploadResult
  error?: string
}

export default function FileUploader({
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  acceptedFileTypes = ['image/*', 'video/*'],
  autoCreateAsset = false,
  defaultPlatforms = [],
  folder,
  className
}: FileUploaderProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [assetMetadata, setAssetMetadata] = useState({
    title: '',
    description: '',
    contentType: 'single_image' as 'reel' | 'carousel' | 'single_image' | 'story',
    platforms: defaultPlatforms
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length + uploadQueue.length > maxFiles) {
      onUploadError?.(`Maximum ${maxFiles} files allowed`)
      return
    }

    const newUploads: UploadProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setUploadQueue(prev => [...prev, ...newUploads])

    // Start upload process
    if (autoCreateAsset) {
      handleAssetCreationUpload(acceptedFiles)
    } else {
      handleStandaloneUpload(acceptedFiles)
    }
  }, [uploadQueue, maxFiles, autoCreateAsset, assetMetadata])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    maxFiles,
    disabled: isUploading
  })

  const handleStandaloneUpload = async (files: File[]) => {
    setIsUploading(true)
    const results: FileUploadResult[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        const result = await fileUploadService.uploadFile({
          file,
          folder,
          onProgress: (progress) => {
            setUploadQueue(prev => prev.map(upload => 
              upload.file === file 
                ? { ...upload, progress }
                : upload
            ))
          }
        })

        // Update upload status
        setUploadQueue(prev => prev.map(upload => 
          upload.file === file 
            ? { 
                ...upload, 
                status: result.success ? 'completed' : 'error',
                result: result.success ? result : undefined,
                error: result.success ? undefined : result.error
              }
            : upload
        ))

        results.push(result)
      }

      onUploadComplete?.(results)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleAssetCreationUpload = async (files: File[]) => {
    setIsUploading(true)

    try {
      // Determine if we should create a carousel
      const shouldCreateCarousel = files.length > 1 && 
        files.every(f => f.type.startsWith('image/')) &&
        assetMetadata.contentType === 'carousel'

      let results: FileUploadResult[]

      if (shouldCreateCarousel) {
        results = await fileUploadService.uploadMultipleFiles(files, {
          createCarousel: true,
          createAsset: {
            title: assetMetadata.title || `Carousel - ${new Date().toLocaleDateString()}`,
            description: assetMetadata.description,
            contentType: 'carousel',
            platforms: assetMetadata.platforms
          },
          folder,
          onProgress: (progress) => {
            setUploadQueue(prev => prev.map(upload => 
              ({ ...upload, progress })
            ))
          }
        })
      } else {
        // Upload files individually with asset creation
        results = []
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          
          const result = await fileUploadService.uploadFile({
            file,
            createAsset: {
              title: assetMetadata.title || `${file.name} - ${new Date().toLocaleDateString()}`,
              description: assetMetadata.description,
              contentType: assetMetadata.contentType,
              platforms: assetMetadata.platforms
            },
            folder,
            onProgress: (progress) => {
              setUploadQueue(prev => prev.map(upload => 
                upload.file === file 
                  ? { ...upload, progress }
                  : upload
              ))
            }
          })

          setUploadQueue(prev => prev.map(upload => 
            upload.file === file 
              ? { 
                  ...upload, 
                  status: result.success ? 'completed' : 'error',
                  result: result.success ? result : undefined,
                  error: result.success ? undefined : result.error
                }
              : upload
          ))

          results.push(result)
        }
      }

      onUploadComplete?.(results)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Asset creation failed'
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileToRemove: File) => {
    setUploadQueue(prev => prev.filter(upload => upload.file !== fileToRemove))
  }

  const clearCompleted = () => {
    setUploadQueue(prev => prev.filter(upload => upload.status !== 'completed'))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    if (file.type.startsWith('video/')) return <VideoIcon className="h-4 w-4" />
    return <FileIcon className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Asset Creation Form - Only show if autoCreateAsset is true */}
      {autoCreateAsset && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold">Asset Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asset-title">Title</Label>
                <Input
                  id="asset-title"
                  value={assetMetadata.title}
                  onChange={(e) => setAssetMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Asset title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-type">Content Type</Label>
                <Select 
                  value={assetMetadata.contentType} 
                  onValueChange={(value: any) => setAssetMetadata(prev => ({ ...prev, contentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_image">Single Image</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-description">Description</Label>
              <Textarea
                id="asset-description"
                value={assetMetadata.description}
                onChange={(e) => setAssetMetadata(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Asset description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Publishing Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {['instagram', 'linkedin', 'facebook', 'youtube'].map(platform => (
                  <label key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      checked={assetMetadata.platforms.includes(platform)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAssetMetadata(prev => ({
                            ...prev,
                            platforms: [...prev.platforms, platform]
                          }))
                        } else {
                          setAssetMetadata(prev => ({
                            ...prev,
                            platforms: prev.platforms.filter(p => p !== platform)
                          }))
                        }
                      }}
                    />
                    <span className="text-sm capitalize">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Note: Workflow triggering will be handled by existing N8N webhook */}
          </CardContent>
        </Card>
      )}

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Maximum {maxFiles} files • {acceptedFileTypes.join(', ')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Upload Queue ({uploadQueue.length})</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompleted}
                disabled={!uploadQueue.some(u => u.status === 'completed')}
              >
                Clear Completed
              </Button>
            </div>

            <div className="space-y-3">
              {uploadQueue.map((upload, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getFileIcon(upload.file)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{upload.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(upload.file.size)}
                        </span>
                        {upload.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {upload.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {upload.status === 'uploading' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(upload.file)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {upload.status === 'uploading' && (
                      <Progress value={upload.progress} className="h-2" />
                    )}

                    {upload.status === 'completed' && upload.result && (
                      <div className="flex items-center gap-2 mt-1">
                        {upload.result.assetId && (
                          <Badge variant="secondary" className="text-xs">
                            Asset Created
                          </Badge>
                        )}
                        {upload.result.workflowId && (
                          <Badge variant="outline" className="text-xs">
                            Workflow Triggered
                          </Badge>
                        )}
                      </div>
                    )}

                    {upload.status === 'error' && (
                      <p className="text-xs text-red-500 mt-1">{upload.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}