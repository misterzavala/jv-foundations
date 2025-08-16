import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Clock, 
  User, 
  Hash, 
  MessageSquare, 
  Instagram, 
  Play, 
  MoreHorizontal,
  ExternalLink,
  Edit,
  Copy,
  Trash2,
  Eye,
  Calendar,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface EnhancedAssetCardProps {
  asset: Asset;
  onSelect?: (assetId: string) => void;
  onEdit?: (assetId: string) => void;
  onPublish?: (assetId: string) => void;
  onSchedule?: (assetId: string) => void;
  onDelete?: (assetId: string) => void;
  isSelected?: boolean;
  className?: string;
}

export default function EnhancedAssetCard({
  asset,
  onSelect,
  onEdit,
  onPublish,
  onSchedule, 
  onDelete,
  isSelected = false,
  className
}: EnhancedAssetCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200'; 
      case 'in_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'failed': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'reel': return <Play className="h-4 w-4" />;
      case 'carousel': return <Play className="h-4 w-4" />;
      case 'single_image': return <Play className="h-4 w-4" />;
      case 'story': return <Play className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  // Extract metadata from asset
  const metadata = asset.metadata as any || {};
  const originalData = metadata.original_data || {};
  const captions = metadata.captions || {};
  
  // Extract owner from created_by or metadata
  const owner = metadata.owner || originalData.owner || 'Unknown';
  const serialNumber = metadata.serial_number || originalData.serial_number || asset.id?.slice(0, 8);
  const hook = originalData.hook || captions.hook || asset.title;
  const igCaption = captions.instagram || originalData.ig_caption;
  const ttCaption = captions.tiktok || originalData.tt_caption;
  const cta = captions.cta || originalData.cta;

  return (
    <Card 
      className={cn(
        "group transition-all duration-200 hover:shadow-lg border-2",
        isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30",
        "cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(asset.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs", getStatusColor(asset.status))}
              >
                {asset.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getContentTypeIcon(asset.content_type)}
                <span className="ml-1 capitalize">{asset.content_type.replace('_', ' ')}</span>
              </Badge>
            </div>
            
            <CardTitle className="text-lg font-semibold text-foreground mb-1 line-clamp-2">
              {hook || asset.title}
            </CardTitle>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span className="font-medium">{owner}</span>
              </div>
              <div className="flex items-center">
                <Hash className="h-3 w-3 mr-1" />
                <span>{serialNumber}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{new Date(asset.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 w-8 p-0 opacity-0 transition-opacity",
                  isHovered && "opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(asset.id); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Asset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect?.(asset.id); }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSchedule?.(asset.id); }}>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublish?.(asset.id); }}>
                <Zap className="h-4 w-4 mr-2" />
                Publish Now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(asset.id); }}>
                <Copy className="h-4 w-4 mr-2" />
                Copy ID
              </DropdownMenuItem>
              <Separator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete?.(asset.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Hook/Description */}
        {asset.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {asset.description}
          </p>
        )}

        {/* Caption Previews */}
        <div className="space-y-2 mb-4">
          {igCaption && (
            <div className="flex items-start space-x-2">
              <Instagram className="h-4 w-4 mt-0.5 text-pink-600 flex-shrink-0" />
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                {igCaption.length > 100 ? `${igCaption.substring(0, 100)}...` : igCaption}
              </p>
            </div>
          )}
          
          {ttCaption && (
            <div className="flex items-start space-x-2">
              <MessageSquare className="h-4 w-4 mt-0.5 text-black flex-shrink-0" />
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                {ttCaption.length > 100 ? `${ttCaption.substring(0, 100)}...` : ttCaption}
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        {cta && (
          <div className="mb-3">
            <Badge variant="secondary" className="text-xs">
              CTA: {cta}
            </Badge>
          </div>
        )}

        {/* Publishing Destinations */}
        {asset.asset_destinations && asset.asset_destinations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {asset.asset_destinations.map((dest, index) => (
              <Badge 
                key={index}
                variant="outline" 
                className="text-xs"
              >
                {dest.accounts.platform} 
                <span className={cn(
                  "ml-1 w-2 h-2 rounded-full",
                  dest.status === 'published' ? "bg-green-500" : 
                  dest.status === 'scheduled' ? "bg-blue-500" : "bg-gray-400"
                )} />
              </Badge>
            ))}
          </div>
        )}

        {/* Engagement Metrics (if available) */}
        {metadata.engagement_metrics && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>👁 {metadata.engagement_metrics.views || 0}</span>
            <span>❤️ {metadata.engagement_metrics.likes || 0}</span>
            <span>💬 {metadata.engagement_metrics.comments || 0}</span>
            <span>🔄 {metadata.engagement_metrics.shares || 0}</span>
          </div>
        )}

        {/* Quick Actions */}
        <div className={cn(
          "flex items-center justify-between mt-3 pt-3 border-t transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Preview
            </Button>
          </div>
          
          <Button 
            size="sm" 
            className="h-7 text-xs"
            disabled={asset.status === 'published'}
          >
            <Zap className="h-3 w-3 mr-1" />
            {asset.status === 'published' ? 'Published' : 'Publish'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}