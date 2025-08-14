// Asset Preview Component
// Preview and edit assets with platform-specific formatting

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Edit,
  Save,
  X,
  Calendar,
  Send,
  Eye,
  Download,
  Share2,
  Instagram,
  Linkedin,
  MessageCircle,
  Copy,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { captionRenderer } from "@/services/caption-renderer";
import type { Tables, Platform } from "@/integrations/supabase/types-enhanced";

interface AssetPreviewProps {
  assetId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPublish?: (assetId: string, options: any) => void;
}

interface AssetWithDestinations extends Tables<'assets'> {
  asset_destinations: Array<{
    id: string;
    status: string;
    account_id: string;
    accounts: {
      id: string;
      platform: Platform;
      account_handle: string;
      account_name: string;
    };
  }>;
}

export default function AssetPreview({ assetId, isOpen, onClose, onPublish }: AssetPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram');
  const [generatedCaption, setGeneratedCaption] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch asset details
  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async (): Promise<AssetWithDestinations | null> => {
      if (!assetId) return null;

      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          asset_destinations(
            id,
            status,
            account_id,
            accounts(
              id,
              platform,
              account_handle,
              account_name
            )
          )
        `)
        .eq('id', assetId)
        .single();

      if (error) throw error;
      return data as AssetWithDestinations;
    },
    enabled: !!assetId && isOpen
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async (updates: { title?: string; description?: string }) => {
      if (!assetId) throw new Error('No asset ID');

      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', assetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      setIsEditing(false);
    }
  });

  // Generate caption mutation
  const generateCaptionMutation = useMutation({
    mutationFn: async (platform: Platform) => {
      if (!asset) throw new Error('No asset data');

      const suggestions = await captionRenderer.generateSuggestions(asset, platform, 1);
      return suggestions[0]?.text || '';
    },
    onSuccess: (caption) => {
      setGeneratedCaption(caption);
    }
  });

  useEffect(() => {
    if (asset) {
      setEditedTitle(asset.title);
      setEditedDescription(asset.description || '');
    }
  }, [asset]);

  const handleSave = () => {
    updateAssetMutation.mutate({
      title: editedTitle,
      description: editedDescription
    });
  };

  const handleGenerateCaption = () => {
    generateCaptionMutation.mutate(selectedPlatform);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      reviewing: { color: "bg-yellow-100 text-yellow-800", label: "Reviewing" },
      ready: { color: "bg-blue-100 text-blue-800", label: "Ready" },
      queued: { color: "bg-purple-100 text-purple-800", label: "Queued" },
      publishing: { color: "bg-orange-100 text-orange-800", label: "Publishing" },
      published: { color: "bg-green-100 text-green-800", label: "Published" },
      failed: { color: "bg-red-100 text-red-800", label: "Failed" },
      archived: { color: "bg-gray-100 text-gray-600", label: "Archived" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={cn("text-xs font-medium", config.color)}>{config.label}</Badge>;
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />;
      case 'tiktok':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Share2 className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const mediaUrls = asset?.metadata?.files as string[] || [];

  if (!isOpen || !assetId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Asset Preview</span>
              {asset && getStatusBadge(asset.status)}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs"
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading asset...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 mb-2">Failed to load asset</div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : !asset ? (
          <div className="text-center py-12 text-muted-foreground">
            Asset not found
          </div>
        ) : (
          <div className="space-y-6">
            {/* Asset Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Media Preview */}
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {mediaUrls.length > 0 ? (
                    asset.content_type === 'reel' ? (
                      <video 
                        src={mediaUrls[0]} 
                        controls 
                        className="w-full h-full object-cover"
                        poster={asset.thumbnail_url || undefined}
                      />
                    ) : (
                      <img 
                        src={asset.thumbnail_url || mediaUrls[0]} 
                        alt={asset.title}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Play className="h-8 w-8" />
                    </div>
                  )}
                </div>

                {/* Media Files */}
                {mediaUrls.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {mediaUrls.slice(1, 5).map((url, index) => (
                      <div key={index} className="aspect-square bg-muted rounded overflow-hidden">
                        <img 
                          src={url} 
                          alt={`Media ${index + 2}`}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </div>
                    ))}
                    {mediaUrls.length > 5 && (
                      <div className="aspect-square bg-muted rounded flex items-center justify-center text-muted-foreground">
                        +{mediaUrls.length - 4} more
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Asset Details */}
              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={handleSave}
                        disabled={updateAssetMutation.isPending}
                        size="sm"
                      >
                        {updateAssetMutation.isPending ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedTitle(asset.title);
                          setEditedDescription(asset.description || '');
                        }}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{asset.title}</h3>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {asset.content_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    {asset.description && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Description</Label>
                        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                          {asset.description}
                        </p>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Created: {formatDate(asset.created_at)}</p>
                      <p>Updated: {formatDate(asset.updated_at)}</p>
                      {asset.published_at && (
                        <p>Published: {formatDate(asset.published_at)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="destinations" className="w-full">
              <TabsList>
                <TabsTrigger value="destinations">Destinations</TabsTrigger>
                <TabsTrigger value="captions">Captions</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="destinations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Publishing Destinations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {asset.asset_destinations && asset.asset_destinations.length > 0 ? (
                      <div className="space-y-3">
                        {asset.asset_destinations.map((destination) => (
                          <div key={destination.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center space-x-3">
                              {getPlatformIcon(destination.accounts.platform)}
                              <div>
                                <p className="text-sm font-medium">
                                  {destination.accounts.account_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @{destination.accounts.account_handle}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(destination.status)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No publishing destinations configured</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="captions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Caption Generation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Label className="text-xs">Platform:</Label>
                      <select
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="facebook">Facebook</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateCaption}
                        disabled={generateCaptionMutation.isPending}
                      >
                        {generateCaptionMutation.isPending ? (
                          <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-3 w-3" />
                        )}
                        Generate
                      </Button>
                    </div>
                    
                    {generatedCaption && (
                      <div className="space-y-2">
                        <Label className="text-xs">Generated Caption:</Label>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{generatedCaption}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(generatedCaption)}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Publishing Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {asset.scheduled_at ? (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Scheduled for: {formatDate(asset.scheduled_at)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No schedule set</p>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => onPublish?.(asset.id, { method: 'n8n' })}
                          disabled={asset.status === 'published'}
                          size="sm"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Publish Now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}