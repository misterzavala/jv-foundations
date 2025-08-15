import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ContentEngineLayout from "@/components/content-engine/layout/ContentEngineLayout";
import CreateAssetModal from "@/components/content-engine/assets/CreateAssetModal";
import PublishingDashboard from "@/components/content-engine/dashboard/PublishingDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Users,
  FolderOpen,
  Calendar,
  Plus,
  Eye,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalAssets: number;
  scheduledAssets: number;
  publishedAssets: number;
  failedAssets: number;
  activeAccounts: number;
  queuedItems: number;
}

interface RecentAsset {
  id: string;
  title: string;
  content_type: string;
  status: string;
  created_at: string;
  thumbnail_url?: string;
}

export default function ContentDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedPeriod],
    queryFn: async (): Promise<DashboardStats> => {
      const [assetsResult, accountsResult, queueResult] = await Promise.all([
        supabase.from('assets').select('status', { count: 'exact' }),
        supabase.from('accounts').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('publish_queue').select('id', { count: 'exact' }).eq('status', 'pending')
      ]);

      const totalAssets = assetsResult.count || 0;
      const scheduledAssets = assetsResult.data?.filter(a => a.status === 'scheduled').length || 0;
      const publishedAssets = assetsResult.data?.filter(a => a.status === 'published').length || 0;
      const failedAssets = assetsResult.data?.filter(a => a.status === 'failed').length || 0;
      const activeAccounts = accountsResult.count || 0;
      const queuedItems = queueResult.count || 0;

      return {
        totalAssets,
        scheduledAssets,
        publishedAssets,
        failedAssets,
        activeAccounts,
        queuedItems
      };
    }
  });

  // Fetch recent assets
  const { data: recentAssets } = useQuery({
    queryKey: ['recent-assets'],
    queryFn: async (): Promise<RecentAsset[]> => {
      const { data, error } = await supabase
        .from('assets')
        .select('id, title, content_type, status, created_at, thumbnail_url')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      scheduled: { color: "bg-blue-100 text-blue-800", label: "Scheduled" },
      published: { color: "bg-green-100 text-green-800", label: "Published" },
      failed: { color: "bg-red-100 text-red-800", label: "Failed" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={cn("text-xs", config.color)}>{config.label}</Badge>;
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "text-primary"
  }: {
    title: string;
    value: number | string;
    icon: any;
    color?: string;
  }) => (
    <Card className="hover:shadow-sm transition-shadow duration-200 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-xl font-bold text-foreground mt-1">{value}</p>
          </div>
          <div className={cn("p-2 rounded-lg bg-muted/20 flex-shrink-0", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const handleCreateAsset = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSuccess = () => {
    // Refetch dashboard stats and recent assets
    window.location.reload();
  };

  return (
    <ContentEngineLayout onCreateAsset={handleCreateAsset}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="p-6 pb-2">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="publishing">Publishing Workflows</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0">
          <div className="p-6 pt-4 space-y-6">

        {/* Time Period Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedPeriod === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("today")}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant={selectedPeriod === "3d" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("3d")}
              className="text-xs"
            >
              Last 3 Days
            </Button>
            <Button
              variant={selectedPeriod === "7d" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("7d")}
              className="text-xs"
            >
              Last 7 Days
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Drafted Today"
            value={stats?.totalAssets || 0}
            icon={FolderOpen}
            color="text-gray-600"
          />
          <StatCard
            title="Total Scheduled Today"
            value={stats?.scheduledAssets || 0}
            icon={Clock}
            color="text-blue-600"
          />
          <StatCard
            title="Total Published Today"
            value={stats?.publishedAssets || 0}
            icon={CheckCircle}
            color="text-green-600"
          />
          <StatCard
            title="Queue Items"
            value={stats?.queuedItems || 0}
            icon={BarChart3}
            color="text-purple-600"
          />
          <StatCard
            title="Failed Items"
            value={stats?.failedAssets || 0}
            icon={AlertTriangle}
            color="text-red-600"
          />
          <StatCard
            title="Active Accounts"
            value={stats?.activeAccounts || 0}
            icon={Users}
            color="text-indigo-600"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Publishing Pipeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Publishing Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">Draft</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {stats ? stats.totalAssets - stats.publishedAssets - stats.scheduledAssets - stats.failedAssets : 0}
                    </span>
                  </div>
                  <Progress value={30} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium">Scheduled</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{stats?.scheduledAssets || 0}</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Published</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{stats?.publishedAssets || 0}</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>

                {stats?.failedAssets && stats.failedAssets > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm font-medium">Failed</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{stats.failedAssets}</span>
                    </div>
                    <Progress value={10} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share2 className="mr-2 h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleCreateAsset}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Asset
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Content
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Accounts
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAssets?.map((asset) => (
                <div key={asset.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    {asset.thumbnail_url ? (
                      <img
                        src={asset.thumbnail_url}
                        alt={asset.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{asset.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {asset.content_type.replace('_', ' ')} • {new Date(asset.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(asset.status)}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

            {/* Create Asset Modal */}
            <CreateAssetModal
              isOpen={isCreateModalOpen}
              onClose={() => setIsCreateModalOpen(false)}
              onSuccess={handleCreateSuccess}
            />
          </div>
        </TabsContent>

        <TabsContent value="publishing" className="mt-0">
          <PublishingDashboard />
        </TabsContent>
      </Tabs>
    </ContentEngineLayout>
  );
}