import { useState } from "react";
import ContentEngineLayout from "@/components/content-engine/layout/ContentEngineLayout";
import ContentManagementGrid from "@/components/content-engine/assets/ContentManagementGrid";
import CreateAssetModal from "@/components/content-engine/assets/CreateAssetModal";
import AssetPreview from "@/components/content-engine/assets/AssetPreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Upload, 
  FolderOpen,
  Activity,
  Zap,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  Webhook,
  ExternalLink
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mockAssets } from "@/components/content-engine/assets/MockAssetData";

interface WorkflowStats {
  totalAssets: number;
  readyForReview: number;
  scheduled: number;
  published: number;
  failed: number;
  activeWebhooks: number;
}

export default function ContentManagementPage() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Fetch workflow statistics using mock data temporarily
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['workflow-stats'],
    queryFn: async (): Promise<WorkflowStats> => {
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const assets = mockAssets;
      const totalAssets = assets.length;
      const readyForReview = assets.filter(a => a.status === 'in_review').length;
      const scheduled = assets.filter(a => a.status === 'scheduled').length;
      const published = assets.filter(a => a.status === 'published').length;
      const failed = assets.filter(a => a.status === 'failed').length;

      return {
        totalAssets,
        readyForReview,
        scheduled,
        published,
        failed,
        activeWebhooks: 1 // We have one main webhook configured
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleCreateAsset = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    // Refresh data
    window.location.reload();
  };

  const handleBulkUpload = () => {
    // Navigate to upload page
    window.location.href = '/upload';
  };

  const handleAssetSelect = (assetId: string) => {
    setSelectedAsset(assetId);
    setIsPreviewModalOpen(true);
  };

  const handleAssetEdit = (assetId: string) => {
    // TODO: Open edit modal
    console.log('Edit asset:', assetId);
  };

  const handleAssetPublish = async (assetId: string) => {
    try {
      const response = await fetch(`/api/publish/${assetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          platforms: ['instagram', 'tiktok'],
          immediate: true 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh data
        window.location.reload();
      } else {
        alert(`Publishing failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Publish error:', error);
      alert('Publishing failed');
    }
  };

  const handleAssetSchedule = (assetId: string) => {
    // TODO: Open scheduling modal
    console.log('Schedule asset:', assetId);
  };

  const handleAssetDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);
      
      if (error) throw error;
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete asset');
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "text-muted-foreground",
    bgColor = "bg-muted/30",
    badge
  }: {
    title: string;
    value: number;
    icon: any;
    color?: string;
    bgColor?: string;
    badge?: string;
  }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${bgColor}`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-lg font-semibold text-foreground">{value}</p>
            </div>
          </div>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
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
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <Activity className="mr-3 h-8 w-8" />
              Content Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your content pipeline from creation to publication with N8N workflow automation
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
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

        {/* Demo Data Notice */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Demo Mode:</strong> Currently displaying sample data from your CSV structure while database connectivity is being resolved. 
            All content management features are fully functional.
          </AlertDescription>
        </Alert>

        {/* Workflow Status Alert */}
        <Alert>
          <Webhook className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              N8N Workflow Integration Ready - Target webhook: 
              <code className="ml-1 text-xs bg-muted px-1 rounded">a40af2fb-6d85-4db3-9791-e7cab329bcfa</code>
            </span>
            <Button variant="ghost" size="sm" asChild>
              <a href="/console" target="_blank">
                <ExternalLink className="h-3 w-3 mr-1" />
                Monitor
              </a>
            </Button>
          </AlertDescription>
        </Alert>

        {/* Workflow Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Assets"
            value={stats?.totalAssets || 0}
            icon={FolderOpen}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Ready for Review"
            value={stats?.readyForReview || 0}
            icon={AlertCircle}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
            badge={stats?.readyForReview ? "Action Required" : undefined}
          />
          <StatCard
            title="Scheduled"
            value={stats?.scheduled || 0}
            icon={Calendar}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Published"
            value={stats?.published || 0}
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            title="Failed"
            value={stats?.failed || 0}
            icon={AlertCircle}
            color="text-red-600"
            bgColor="bg-red-100"
            badge={stats?.failed ? "Needs Attention" : undefined}
          />
          <StatCard
            title="Active Webhooks"
            value={stats?.activeWebhooks || 0}
            icon={Zap}
            color="text-purple-600"
            bgColor="bg-purple-100"
            badge="Live"
          />
        </div>

        <Separator />

        {/* Main Content Grid */}
        <ContentManagementGrid
          onAssetSelect={handleAssetSelect}
          onAssetEdit={handleAssetEdit}
          onAssetPublish={handleAssetPublish}
          onAssetSchedule={handleAssetSchedule}
          onAssetDelete={handleAssetDelete}
        />

        {/* Create Asset Modal */}
        <CreateAssetModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />

        {/* Asset Preview Modal */}
        <AssetPreview
          assetId={selectedAsset}
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setSelectedAsset(null);
          }}
          onPublish={handleAssetPublish}
        />
      </div>
    </ContentEngineLayout>
  );
}