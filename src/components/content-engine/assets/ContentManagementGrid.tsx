import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  SortAsc, 
  Grid3X3, 
  List, 
  Calendar,
  User,
  Hash,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { databaseAdapter, type ExtendedAsset } from "@/services/database-adapter";
import EnhancedAssetCard from "./EnhancedAssetCard";
import type { Tables } from "@/integrations/supabase/types";

// Use extended asset type with database adapter
type Asset = ExtendedAsset & {
  reel_meta?: Tables<"reel_meta">[];
  carousel_meta?: Tables<"carousel_meta">[];
  asset_destinations?: Array<{
    id: string;
    status: string;
    scheduled_at: string | null;
    published_at: string | null;
    accounts: Tables<"accounts">;
  }>;
};

interface ContentManagementGridProps {
  onAssetSelect?: (assetId: string) => void;
  onAssetEdit?: (assetId: string) => void;
  onAssetPublish?: (assetId: string) => void;
  onAssetSchedule?: (assetId: string) => void;
  onAssetDelete?: (assetId: string) => void;
  className?: string;
}

export default function ContentManagementGrid({
  onAssetSelect,
  onAssetEdit,
  onAssetPublish,
  onAssetSchedule,
  onAssetDelete,
  className
}: ContentManagementGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const limit = 24;

  // Use mock data temporarily while database issues are resolved
  const { data: assets, isLoading, error, refetch } = useQuery({
    queryKey: ['assets-enhanced', page, limit, searchQuery, statusFilter, ownerFilter, contentTypeFilter, sortBy, sortOrder],
    queryFn: async () => {
      // Initialize demo data if needed
      await databaseAdapter.initializeWithDemoData();
      
      // Get assets from database adapter
      const assets = await databaseAdapter.getAssets();
      
      // Apply filters
      let filtered = assets;
      
      if (statusFilter !== 'all') {
        filtered = filtered.filter(asset => asset.status === statusFilter);
      }
      
      if (contentTypeFilter !== 'all') {
        filtered = filtered.filter(asset => asset.content_type === contentTypeFilter);
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(asset => 
          asset.title.toLowerCase().includes(query) ||
          asset.description?.toLowerCase().includes(query) ||
          asset.metadata.owner.toLowerCase().includes(query) ||
          asset.metadata.captions.instagram?.toLowerCase().includes(query) ||
          asset.metadata.captions.tiktok?.toLowerCase().includes(query)
        );
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;
        
        if (sortBy === 'created_at') {
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
        } else if (sortBy === 'title') {
          aVal = a.title;
          bVal = b.title;
        } else if (sortBy === 'status') {
          aVal = a.status;
          bVal = b.status;
        } else {
          aVal = a[sortBy as keyof Asset];
          bVal = b[sortBy as keyof Asset];
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      // Apply pagination
      const start = page * limit;
      const end = start + limit;
      
      return filtered.slice(start, end) as Asset[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds to keep data fresh
  });

  // Extract unique owners from assets for filter
  const uniqueOwners = useMemo(() => {
    if (!assets) return [];
    const owners = new Set<string>();
    assets.forEach(asset => {
      const metadata = asset.metadata as any || {};
      const owner = metadata.owner || metadata.original_data?.owner || 'Unknown';
      owners.add(owner);
    });
    return Array.from(owners);
  }, [assets]);

  // Filter assets based on owner filter
  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    
    let filtered = assets;
    
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(asset => {
        const metadata = asset.metadata as any || {};
        const owner = metadata.owner || metadata.original_data?.owner || 'Unknown';
        return owner === ownerFilter;
      });
    }
    
    return filtered;
  }, [assets, ownerFilter]);

  const handleRefresh = () => {
    refetch();
  };

  const StatusFilterTabs = () => (
    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="draft">Draft</TabsTrigger>
        <TabsTrigger value="in_review">Review</TabsTrigger>
        <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        <TabsTrigger value="published">Published</TabsTrigger>
        <TabsTrigger value="failed">Failed</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  if (error) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load assets</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets, hooks, captions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Owner Filter */}
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-32">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {uniqueOwners.map(owner => (
                <SelectItem key={owner} value={owner}>
                  {owner}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Content Type Filter */}
          <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="reel">Reels</SelectItem>
              <SelectItem value="carousel">Carousels</SelectItem>
              <SelectItem value="single_image">Images</SelectItem>
              <SelectItem value="story">Stories</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Options */}
          <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('_');
            setSortBy(field);
            setSortOrder(order as 'asc' | 'desc');
          }}>
            <SelectTrigger className="w-40">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">Latest First</SelectItem>
              <SelectItem value="created_at_asc">Oldest First</SelectItem>
              <SelectItem value="title_asc">Title A-Z</SelectItem>
              <SelectItem value="title_desc">Title Z-A</SelectItem>
              <SelectItem value="status_asc">Status</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <StatusFilterTabs />

      {/* Asset Summary */}
      {filteredAssets && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredAssets.length} assets
            {searchQuery && ` matching "${searchQuery}"`}
            {ownerFilter !== 'all' && ` by ${ownerFilter}`}
          </span>
          <Badge variant="outline">
            Page {page + 1}
          </Badge>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assets Grid */}
      {!isLoading && filteredAssets && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <EnhancedAssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={onAssetSelect}
                  onEdit={onAssetEdit}
                  onPublish={onAssetPublish}
                  onSchedule={onAssetSchedule}
                  onDelete={onAssetDelete}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssets.map((asset) => (
                <EnhancedAssetCard
                  key={asset.id}
                  asset={asset}
                  onSelect={onAssetSelect}
                  onEdit={onAssetEdit}
                  onPublish={onAssetPublish}
                  onSchedule={onAssetSchedule}
                  onDelete={onAssetDelete}
                  className="w-full"
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && filteredAssets && filteredAssets.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No assets match your search "${searchQuery}"`
                : 'No assets available with current filters'
              }
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setOwnerFilter('all');
                setContentTypeFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && filteredAssets && filteredAssets.length === limit && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={filteredAssets.length < limit}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}