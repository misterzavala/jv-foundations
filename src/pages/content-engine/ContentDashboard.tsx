import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ContentEngineLayout from "@/components/content-engine/layout/ContentEngineLayout";
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
    change, 
    icon: Icon, 
    color = "text-primary",
    trend = "up" 
  }: {
    title: string;
    value: number | string;
    change?: string;
    icon: any;
    color?: string;
    trend?: "up" | "down" | "neutral";
  }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {change && (
              <p className={cn(
                "text-xs flex items-center mt-1",
                trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
              )}>
                <TrendingUp className={cn("h-3 w-3 mr-1", {
                  "rotate-180": trend === "down",
                  "rotate-0": trend === "up"
                })} />
                {change}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-full bg-muted/30", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ContentEngineLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Dashboard</h1>
            <p className="text-muted-foreground">Manage and monitor your content publishing pipeline</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              View Reports
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Asset
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Assets"
            value={stats?.totalAssets || 0}
            change="+12% this week"
            icon={FolderOpen}
            color="text-blue-600"
            trend="up"
          />
          <StatCard
            title="Scheduled"
            value={stats?.scheduledAssets || 0}
            change="+8% this week"
            icon={Clock}
            color="text-orange-600"
            trend="up"
          />
          <StatCard
            title="Published"
            value={stats?.publishedAssets || 0}
            change="+15% this week"
            icon={CheckCircle}
            color="text-green-600"
            trend="up"
          />
          <StatCard
            title="Queue Items"
            value={stats?.queuedItems || 0}
            change="Processing..."
            icon={BarChart3}
            color="text-purple-600"
            trend="neutral"
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
                <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90">
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
      </div>
    </ContentEngineLayout>
  );
}