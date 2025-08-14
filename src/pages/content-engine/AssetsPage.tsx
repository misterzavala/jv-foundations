import { useState } from "react";
import ContentEngineLayout from "@/components/content-engine/layout/ContentEngineLayout";
import AssetTable from "@/components/content-engine/assets/AssetTable";
import CreateAssetModal from "@/components/content-engine/assets/CreateAssetModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Upload, 
  Filter, 
  MoreVertical,
  FolderOpen,
  Image,
  Play,
  Images,
  Calendar,
  BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AssetSummary {
  total: number;
  reels: number;
  carousels: number;
  images: number;
  stories: number;
  draft: number;
  scheduled: number;
  published: number;
  failed: number;
}

export default function AssetsPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch asset summary stats
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['asset-summary'],
    queryFn: async (): Promise<AssetSummary> => {
      const { data, error } = await supabase
        .from('assets')
        .select('content_type, status');

      if (error) throw error;

      const total = data.length;
      const reels = data.filter(a => a.content_type === 'reel').length;
      const carousels = data.filter(a => a.content_type === 'carousel').length;
      const images = data.filter(a => a.content_type === 'single_image').length;
      const stories = data.filter(a => a.content_type === 'story').length;
      const draft = data.filter(a => a.status === 'draft').length;
      const scheduled = data.filter(a => a.status === 'scheduled').length;
      const published = data.filter(a => a.status === 'published').length;
      const failed = data.filter(a => a.status === 'failed').length;

      return {
        total,
        reels,
        carousels,
        images,
        stories,
        draft,
        scheduled,
        published,
        failed
      };
    }
  });

  const handleCreateAsset = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    // Refetch asset data
    window.location.reload();
  };

  const handleBulkUpload = () => {
    // TODO: Open bulk upload modal
    console.log("Bulk upload clicked");
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAsset(assetId);
    // TODO: Open asset details modal or navigate to asset page
    console.log("Asset selected:", assetId);
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "text-muted-foreground",
    bgColor = "bg-muted/30"
  }: {
    title: string;
    value: number;
    icon: any;
    color?: string;
    bgColor?: string;
  }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-lg font-semibold text-foreground">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ContentEngineLayout 
      onCreateAsset={handleCreateAsset}
      onBulkUpload={handleBulkUpload}
    >
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center">
              <FolderOpen className="mr-3 h-6 w-6" />
              Assets
            </h1>
            <p className="text-muted-foreground">Manage your content assets and publishing pipeline</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkUpload}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreateAsset}>
              <Plus className="mr-2 h-4 w-4" />
              Create Asset
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <StatCard
            title="Total Assets"
            value={summary?.total || 0}
            icon={FolderOpen}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Reels"
            value={summary?.reels || 0}
            icon={Play}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
          <StatCard
            title="Carousels"
            value={summary?.carousels || 0}
            icon={Images}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            title="Images"
            value={summary?.images || 0}
            icon={Image}
            color="text-orange-600"
            bgColor="bg-orange-100"
          />
          <StatCard
            title="Draft"
            value={summary?.draft || 0}
            icon={Calendar}
            color="text-gray-600"
            bgColor="bg-gray-100"
          />
          <StatCard
            title="Scheduled"
            value={summary?.scheduled || 0}
            icon={Calendar}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Published"
            value={summary?.published || 0}
            icon={Calendar}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            title="Failed"
            value={summary?.failed || 0}
            icon={Calendar}
            color="text-red-600"
            bgColor="bg-red-100"
          />
        </div>

        {/* Assets Table */}
        <AssetTable onAssetSelect={handleAssetSelect} />

        {/* Bulk Actions Bar */}
        {selectedAsset && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm">
              <CardContent className="flex items-center space-x-4 p-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  1 asset selected
                </Badge>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" className="h-8">
                    <Calendar className="mr-1 h-3 w-3" />
                    Schedule
                  </Button>
                  <Button size="sm" variant="outline" className="h-8">
                    <Upload className="mr-1 h-3 w-3" />
                    Publish
                  </Button>
                  <Button size="sm" variant="outline" className="h-8">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedAsset(null)}
                >
                  ✕
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Asset Modal */}
        <CreateAssetModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </ContentEngineLayout>
  );
}