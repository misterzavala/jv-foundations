// Upload Page
// Tactical file upload interface integrated with asset management

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileUp, Image, Video, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import FileUploader from '@/components/shared/FileUploader'
import { type FileUploadResult } from '@/services/file-upload-service'

export default function UploadPage() {
  const navigate = useNavigate()
  const [uploadResults, setUploadResults] = useState<FileUploadResult[]>([])
  const [uploadError, setUploadError] = useState<string>('')
  const [activeTab, setActiveTab] = useState('asset')

  const handleUploadComplete = (results: FileUploadResult[]) => {
    setUploadResults(prev => [...prev, ...results])
    setUploadError('')
  }

  const handleUploadError = (error: string) => {
    setUploadError(error)
  }

  const successfulUploads = uploadResults.filter(r => r.success)
  const failedUploads = uploadResults.filter(r => !r.success)

  const viewAsset = (assetId: string) => {
    navigate(`/content-engine/assets`)
  }

  const clearResults = () => {
    setUploadResults([])
    setUploadError('')
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">File Upload</h1>
            <p className="text-muted-foreground">
              Upload files and create assets with automated workflow integration
            </p>
          </div>
        </div>
      </div>

      {/* Upload Stats */}
      {uploadResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{successfulUploads.length}</p>
                  <p className="text-sm text-muted-foreground">Successful uploads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{failedUploads.length}</p>
                  <p className="text-sm text-muted-foreground">Failed uploads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <FileUp className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {successfulUploads.filter(r => r.assetId).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Assets created</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Alert */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Upload Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="asset" className="gap-2">
            <Image className="h-4 w-4" />
            Create Asset
          </TabsTrigger>
          <TabsTrigger value="standalone" className="gap-2">
            <Upload className="h-4 w-4" />
            File Only
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Video className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="asset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload & Create Asset</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload files and automatically create content assets with workflow integration
              </p>
            </CardHeader>
            <CardContent>
              <FileUploader
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                autoCreateAsset={true}
                defaultPlatforms={['instagram']}
                maxFiles={5}
                acceptedFileTypes={['image/*', 'video/*']}
                folder="content-assets"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="standalone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Upload Only</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload files without creating assets - for documents, backups, or raw files
              </p>
            </CardHeader>
            <CardContent>
              <FileUploader
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                autoCreateAsset={false}
                maxFiles={20}
                acceptedFileTypes={['*/*']}
                folder="uploads"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Asset Creation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload multiple files and create individual assets or carousel from images
              </p>
            </CardHeader>
            <CardContent>
              <FileUploader
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                autoCreateAsset={true}
                defaultPlatforms={['instagram', 'linkedin']}
                maxFiles={50}
                acceptedFileTypes={['image/*', 'video/*']}
                folder="bulk-uploads"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Results</CardTitle>
              <Button variant="outline" size="sm" onClick={clearResults}>
                Clear Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {result.metadata?.fileName || `Upload ${index + 1}`}
                      </p>
                      {result.success ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {result.metadata?.fileSize && (
                            <span>
                              {(result.metadata.fileSize / 1024 / 1024).toFixed(1)}MB
                            </span>
                          )}
                          {result.assetId && <Badge variant="secondary">Asset Created</Badge>}
                          {result.workflowId && <Badge variant="outline">Workflow Active</Badge>}
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>

                  {result.success && result.assetId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewAsset(result.assetId!)}
                    >
                      View Asset
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Supported File Types</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Images: JPG, PNG, GIF, WebP</li>
                <li>• Videos: MP4, MOV, WebM</li>
                <li>• Documents: PDF, DOC, DOCX, TXT</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">File Limits</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Maximum file size: 100MB</li>
                <li>• Asset creation: 5 files max</li>
                <li>• Bulk upload: 50 files max</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}