import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Filter, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Images,
  Image,
  MoreHorizontal,
  Edit,
  Clock,
  Trash2,
  Eye,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Asset = Tables<"assets"> & {
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

interface AssetTableProps {
  onAssetSelect?: (assetId: string) => void;
  selectedAssets?: string[];
  onAssetsSelectionChange?: (selectedAssets: string[]) => void;
  className?: string;
}

export default function AssetTable({ 
  onAssetSelect, 
  selectedAssets: externalSelectedAssets, 
  onAssetsSelectionChange, 
  className 
}: AssetTableProps) {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const limit = 25;

  const { data: assets, isLoading, error } = useQuery({
    queryKey: ['assets', limit, page * limit, statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('assets')
        .select(`
          *,
          reel_meta(*),
          carousel_meta(*),
          asset_destinations(
            id,
            status,
            scheduled_at,
            published_at,
            accounts(*)
          )
        `)
        .range(page * limit, (page + 1) * limit - 1)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('content_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Asset[];
    },
  });

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "draft", label: "Draft" },
    { value: "in_review", label: "In Review" },
    { value: "scheduled", label: "Scheduled" },
    { value: "published", label: "Published" },
    { value: "failed", label: "Failed" },
    { value: "archived", label: "Archived" }
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "reel", label: "Reels" },
    { value: "carousel", label: "Carousels" },
    { value: "single_image", label: "Single Images" },
    { value: "story", label: "Stories" }
  ];

  const toggleAssetSelection = (assetId: string) => {
    const newSelection = new Set(selectedAssets);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssets(newSelection);
    
    // Also update external state if callback provided
    if (onAssetsSelectionChange) {
      onAssetsSelectionChange(Array.from(newSelection));
    }
  };

  const toggleSelectAll = () => {
    let newSelection: Set<string>;
    if (selectedAssets.size === assets?.length) {
      newSelection = new Set();
    } else {
      newSelection = new Set(assets?.map(asset => asset.id) || []);
    }
    setSelectedAssets(newSelection);
    
    // Also update external state if callback provided
    if (onAssetsSelectionChange) {
      onAssetsSelectionChange(Array.from(newSelection));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Draft" },
      in_review: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "In Review" },
      scheduled: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "Scheduled" },
      published: { color: "bg-green-100 text-green-800 border-green-200", label: "Published" },
      failed: { color: "bg-red-100 text-red-800 border-red-200", label: "Failed" },
      archived: { color: "bg-gray-100 text-gray-600 border-gray-200", label: "Archived" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={cn("text-xs font-medium border", config.color)}>
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'reel':
        return <Play className="h-3 w-3" />;
      case 'carousel':
        return <Images className="h-3 w-3" />;
      case 'single_image':
        return <Image className="h-3 w-3" />;
      default:
        return <Image className="h-3 w-3" />;
    }
  };

  const getPlatformBadge = (platform: string) => {
    const platformConfig = {
      instagram: { color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white", label: "IG" },
      tiktok: { color: "bg-black text-white", label: "TT" },
      linkedin: { color: "bg-blue-600 text-white", label: "LI" },
      facebook: { color: "bg-blue-600 text-white", label: "FB" },
      youtube: { color: "bg-red-600 text-white", label: "YT" }
    };

    const config = platformConfig[platform as keyof typeof platformConfig] || { color: "bg-gray-500 text-white", label: platform.slice(0, 2).toUpperCase() };
    return (
      <div className={cn("w-6 h-6 rounded text-xs flex items-center justify-center font-medium", config.color)}>
        {config.label}
      </div>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
        <div className="text-destructive mb-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Trash2 className="h-6 w-6" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load assets</h3>
        <p className="text-muted-foreground">Please refresh the page and try again.</p>
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Images className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No assets found</h3>
        <p className="text-muted-foreground mb-4">Get started by creating your first content asset.</p>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Play className="mr-2 h-4 w-4" />
          Create Asset
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg shadow-sm border border-border overflow-hidden", className)}>
      {/* Table Controls */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs bg-background hover:bg-accent">
                  <Filter className="mr-2 h-3 w-3" />
                  {statusOptions.find(opt => opt.value === statusFilter)?.label}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card border-border">
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className="hover:bg-accent cursor-pointer"
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs bg-background hover:bg-accent">
                  {typeOptions.find(opt => opt.value === typeFilter)?.label}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card border-border">
                {typeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setTypeFilter(option.value)}
                    className="hover:bg-accent cursor-pointer"
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Pagination */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">
              Showing {page * limit + 1}-{Math.min((page + 1) * limit, assets.length)} of {assets.length}
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={assets.length < limit}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedAssets.size === assets.length && assets.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Destinations</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow
                key={asset.id}
                className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onAssetSelect?.(asset.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedAssets.has(asset.id)}
                    onCheckedChange={() => toggleAssetSelection(asset.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {asset.thumbnail_url ? (
                      <img
                        src={asset.thumbnail_url}
                        alt={`${asset.content_type} preview`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground">
                        {getTypeIcon(asset.content_type)}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs">
                    <p className="font-medium text-foreground truncate">{asset.title}</p>
                    {asset.description && (
                      <p className="text-xs text-muted-foreground truncate">{asset.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {getTypeIcon(asset.content_type)}
                    <span className="ml-1 capitalize">{asset.content_type.replace('_', ' ')}</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(asset.status)}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    {asset.asset_destinations?.slice(0, 3).map((dest) => (
                      <div
                        key={dest.id}
                        title={`${dest.accounts.platform}: ${dest.accounts.account_handle}`}
                      >
                        {getPlatformBadge(dest.accounts.platform)}
                      </div>
                    ))}
                    {(asset.asset_destinations?.length || 0) > 3 && (
                      <div className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center">
                        +{(asset.asset_destinations?.length || 0) - 3}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs">
                    {asset.scheduled_at ? (
                      <div className="text-foreground">
                        <div className="font-medium">{new Date(asset.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-muted-foreground">{new Date(asset.scheduled_at).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not scheduled</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(asset.updated_at)}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem className="hover:bg-accent cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-accent cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-accent cursor-pointer">
                        <Clock className="mr-2 h-4 w-4" />
                        Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem className="hover:bg-accent cursor-pointer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Publish
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="hover:bg-accent cursor-pointer text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}