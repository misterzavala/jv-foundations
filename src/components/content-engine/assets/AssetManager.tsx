import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderOpen,
  Image,
  Video,
  Layout,
  Eye,
  Share2,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { assetManagementService } from "@/services/asset-management";
import CreateAssetModal from "./CreateAssetModal";
import WorkflowCreator from "../workflow/WorkflowCreator";
import type { AssetStatus, ContentType } from "@/integrations/supabase/types-enhanced";

interface AssetManagerProps {
  className?: string;
}

interface AssetFilters {
  status?: AssetStatus[];
  content_type?: ContentType[];
  search?: string;
  has_workflow?: boolean;
}

export default function AssetManager({ className }: AssetManagerProps) {
  const [filters, setFilters] = useState<AssetFilters>({});
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAssetForWorkflow, setSelectedAssetForWorkflow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const queryClient = useQueryClient();

  // Fetch assets with current filters
  const { data: assetsData, isLoading, error } = useQuery({
    queryKey: ['assets', filters, page],
    queryFn: () => assetManagementService.getAssets(filters, page, 20),
    keepPreviousData: true
  });

  // Fetch asset statistics
  const { data: stats } = useQuery({
    queryKey: ['asset-stats', filters],
    queryFn: () => assetManagementService.getAssetStatistics(filters)
  });

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      assetManagementService.updateAsset(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      queryClient.invalidateQueries(['asset-stats']);
    }
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => assetManagementService.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      queryClient.invalidateQueries(['asset-stats']);
    }
  });

  // Batch operations
  const batchUpdateMutation = useMutation({
    mutationFn: ({ assetIds, status }: { assetIds: string[]; status: AssetStatus }) =>
      assetManagementService.batchUpdateStatus(assetIds, status),
    onSuccess: () => {
      setSelectedAssets([]);
      queryClient.invalidateQueries(['assets']);
      queryClient.invalidateQueries(['asset-stats']);
    }
  });

  const handleAssetSelect = (assetId: string, selected: boolean) => {
    if (selected) {
      setSelectedAssets(prev => [...prev, assetId]);
    } else {
      setSelectedAssets(prev => prev.filter(id => id !== assetId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected && assetsData?.assets) {
      setSelectedAssets(assetsData.assets.map(asset => asset.id));
    } else {
      setSelectedAssets([]);
    }
  };

  const handleFilterChange = (key: keyof AssetFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const getStatusIcon = (status: AssetStatus) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4 text-gray-500" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'publishing':
        return <Play className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'archived':
        return <FolderOpen className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getContentTypeIcon = (contentType: ContentType) => {
    switch (contentType) {
      case 'reel':
        return <Video className="h-4 w-4" />;
      case 'carousel':
        return <Layout className="h-4 w-4" />;
      case 'single_image':
        return <Image className="h-4 w-4" />;
      case 'story':
        return <Eye className="h-4 w-4" />;
      default:
        return <FolderOpen className="h-4 w-4" />;
    }
  };

  const getStatusBadgeColor = (status: AssetStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      case 'publishing':
        return 'bg-yellow-100 text-yellow-800';
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Assets</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Published Today</p>
                  <p className="text-2xl font-bold text-green-600">{stats.published_today}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Failed Today</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed_today}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ready</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.by_status.ready || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">In Progress</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {(stats.by_status.queued || 0) + (stats.by_status.publishing || 0)}
                  </p>
                </div>
                <Play className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Asset Management</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              >
                {viewMode === 'grid' ? <Layout className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Asset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select 
              value={filters.status?.[0] || 'all'} 
              onValueChange={(value) => 
                handleFilterChange('status', value === 'all' ? undefined : [value as AssetStatus])
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="publishing">Publishing</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.content_type?.[0] || 'all'} 
              onValueChange={(value) => 
                handleFilterChange('content_type', value === 'all' ? undefined : [value as ContentType])
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="single_image">Single Image</SelectItem>
                <SelectItem value="story">Story</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch Actions */}
          {selectedAssets.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-4">
              <span className="text-sm font-medium">
                {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateMutation.mutate({ assetIds: selectedAssets, status: 'ready' })}
                >
                  Mark Ready
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateMutation.mutate({ assetIds: selectedAssets, status: 'archived' })}
                >
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete the selected assets?')) {
                      selectedAssets.forEach(id => deleteAssetMutation.mutate(id));
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Assets Grid/Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading assets...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-500">Failed to load assets</div>
            </div>
          ) : assetsData?.assets && assetsData.assets.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {assetsData.assets.map((asset) => (
                  <Card key={asset.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Checkbox
                          checked={selectedAssets.includes(asset.id)}
                          onCheckedChange={(checked) => handleAssetSelect(asset.id, !!checked)}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedAssetForWorkflow(asset.id)}>
                              <Share2 className="mr-2 h-4 w-4" />
                              Create Workflow
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => deleteAssetMutation.mutate(asset.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-3">
                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          {asset.thumbnail_url ? (
                            <img
                              src={asset.thumbnail_url}
                              alt={asset.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-muted-foreground">
                              {getContentTypeIcon(asset.content_type)}
                              <span className="text-xs mt-1 capitalize">{asset.content_type}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-medium text-sm line-clamp-2 mb-1">{asset.title}</h3>
                          {asset.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{asset.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge className={cn("text-xs", getStatusBadgeColor(asset.status))}>
                            {getStatusIcon(asset.status)}
                            <span className="ml-1 capitalize">{asset.status}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(asset.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {asset.destinations && asset.destinations.length > 0 && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Share2 className="h-3 w-3 mr-1" />
                            {asset.destinations.length} destination{asset.destinations.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Table view would go here
              <div className="text-muted-foreground text-center py-8">
                Table view coming soon...
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No assets found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first asset.</p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Asset
              </Button>
            </div>
          )}

          {/* Pagination */}
          {assetsData && assetsData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, assetsData.total)} of {assetsData.total} assets
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {assetsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= assetsData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Asset Modal */}
      <CreateAssetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries(['assets']);
          queryClient.invalidateQueries(['asset-stats']);
        }}
      />

      {/* Workflow Creator Modal */}
      {selectedAssetForWorkflow && (
        <Dialog open={!!selectedAssetForWorkflow} onOpenChange={() => setSelectedAssetForWorkflow(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Publishing Workflow</DialogTitle>
            </DialogHeader>
            <WorkflowCreator
              assetId={selectedAssetForWorkflow}
              contentType={assetsData?.assets.find(a => a.id === selectedAssetForWorkflow)?.content_type as ContentType}
              onWorkflowCreated={() => {
                setSelectedAssetForWorkflow(null);
                queryClient.invalidateQueries(['assets']);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}