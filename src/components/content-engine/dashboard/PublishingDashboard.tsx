// Publishing Dashboard Component
// Real-time workflow status tracking and publishing management

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Pause, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Calendar,
  Zap,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface WorkflowExecution {
  id: string;
  asset_id: string;
  workflow_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_details?: string;
  assets?: {
    id: string;
    title: string;
    content_type: string;
  };
}

interface DashboardStats {
  totalWorkflows: number;
  runningWorkflows: number;
  completedToday: number;
  failedToday: number;
  avgDurationMs: number;
  successRate: number;
}

export default function PublishingDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['publishing-stats', selectedPeriod],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      let startDate = new Date();

      switch (selectedPeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      const { data: workflows, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .gte('started_at', startDate.toISOString());

      if (error) throw error;

      const totalWorkflows = workflows.length;
      const runningWorkflows = workflows.filter(w => w.status === 'running' || w.status === 'started').length;
      const completedToday = workflows.filter(w => w.status === 'completed').length;
      const failedToday = workflows.filter(w => w.status === 'failed').length;
      
      const completedWithDuration = workflows.filter(w => w.status === 'completed' && w.duration_ms);
      const avgDurationMs = completedWithDuration.length > 0 
        ? completedWithDuration.reduce((sum, w) => sum + (w.duration_ms || 0), 0) / completedWithDuration.length
        : 0;

      const successRate = totalWorkflows > 0 ? (completedToday / totalWorkflows) * 100 : 0;

      return {
        totalWorkflows,
        runningWorkflows,
        completedToday,
        failedToday,
        avgDurationMs,
        successRate
      };
    },
    refetchInterval: autoRefresh ? 5000 : false, // Auto-refresh every 5 seconds
  });

  // Fetch recent workflows
  const { data: recentWorkflows, isLoading: workflowsLoading } = useQuery({
    queryKey: ['recent-workflows'],
    queryFn: async (): Promise<WorkflowExecution[]> => {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          assets(id, title, content_type)
        `)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: autoRefresh ? 3000 : false,
  });

  // Fetch queue status
  const { data: queueStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: async () => {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('status')
        .in('status', ['queued', 'publishing']);

      if (error) throw error;

      const queued = assets.filter(a => a.status === 'queued').length;
      const publishing = assets.filter(a => a.status === 'publishing').length;

      return { queued, publishing };
    },
    refetchInterval: autoRefresh ? 2000 : false,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      started: { color: "bg-blue-100 text-blue-800", label: "Started", icon: Play },
      running: { color: "bg-yellow-100 text-yellow-800", label: "Running", icon: Activity },
      completed: { color: "bg-green-100 text-green-800", label: "Completed", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-800", label: "Failed", icon: AlertTriangle },
      cancelled: { color: "bg-gray-100 text-gray-800", label: "Cancelled", icon: Pause }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.started;
    const IconComponent = config.icon;

    return (
      <Badge className={cn("text-xs font-medium border", config.color)}>
        <IconComponent className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = "text-primary",
    trend,
    subtitle
  }: {
    title: string;
    value: number | string;
    icon: any;
    color?: string;
    trend?: number;
    subtitle?: string;
  }) => (
    <Card className="hover:shadow-sm transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className={cn("text-xs mt-1", trend >= 0 ? "text-green-600" : "text-red-600")}>
                {trend >= 0 ? "↗" : "↘"} {Math.abs(trend)}%
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg bg-muted/20 flex-shrink-0", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Activity className="mr-3 h-6 w-6" />
            Publishing Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor workflow executions and publishing status in real-time
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs"
          >
            <RefreshCw className={cn("mr-2 h-3 w-3", autoRefresh && "animate-spin")} />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Period Filter */}
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
          variant={selectedPeriod === "7d" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPeriod("7d")}
          className="text-xs"
        >
          Last 7 Days
        </Button>
        <Button
          variant={selectedPeriod === "30d" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedPeriod("30d")}
          className="text-xs"
        >
          Last 30 Days
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Workflows"
          value={stats?.totalWorkflows || 0}
          icon={Zap}
          color="text-blue-600"
        />
        <StatCard
          title="Currently Running"
          value={stats?.runningWorkflows || 0}
          icon={Activity}
          color="text-yellow-600"
        />
        <StatCard
          title="Completed"
          value={stats?.completedToday || 0}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          title="Failed"
          value={stats?.failedToday || 0}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <StatCard
          title="Success Rate"
          value={`${(stats?.successRate || 0).toFixed(1)}%`}
          icon={BarChart3}
          color="text-purple-600"
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration(stats?.avgDurationMs)}
          icon={Clock}
          color="text-indigo-600"
        />
      </div>

      {/* Queue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Clock className="mr-2 h-4 w-4" />
              Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Queued</span>
                <span className="text-lg font-semibold text-foreground">
                  {queueStats?.queued || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Publishing</span>
                <span className="text-lg font-semibold text-yellow-600">
                  {queueStats?.publishing || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Success Rate Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={stats?.successRate || 0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats?.completedToday || 0} successful out of {stats?.totalWorkflows || 0} total workflows
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Workflows */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">Recent Workflows</TabsTrigger>
          <TabsTrigger value="failed">Failed Workflows</TabsTrigger>
          <TabsTrigger value="running">Running Workflows</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Workflow Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">Loading workflows...</p>
                  </div>
                ) : recentWorkflows && recentWorkflows.length > 0 ? (
                  recentWorkflows.map((workflow) => (
                    <div key={workflow.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        {workflow.workflow_type === 'publish_reel' ? (
                          <Play className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {workflow.assets?.title || `Workflow ${workflow.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {workflow.workflow_type} • Started {new Date(workflow.started_at).toLocaleTimeString()}
                        </p>
                        {workflow.error_details && (
                          <p className="text-xs text-red-600 truncate mt-1">
                            {workflow.error_details}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="text-sm font-medium">
                            {formatDuration(workflow.duration_ms)}
                          </p>
                        </div>
                        {getStatusBadge(workflow.status)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">No workflows found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Failed Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWorkflows?.filter(w => w.status === 'failed').map((workflow) => (
                  <div key={workflow.id} className="p-3 rounded-lg border-red-200 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-red-800">
                          {workflow.assets?.title || 'Unknown Asset'}
                        </p>
                        <p className="text-sm text-red-600">{workflow.workflow_type}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">Failed</Badge>
                    </div>
                    {workflow.error_details && (
                      <p className="text-sm text-red-700 mt-2">{workflow.error_details}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="running">
          <Card>
            <CardHeader>
              <CardTitle className="text-yellow-600">Running Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWorkflows?.filter(w => w.status === 'running' || w.status === 'started').map((workflow) => (
                  <div key={workflow.id} className="p-3 rounded-lg border-yellow-200 bg-yellow-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-yellow-800">
                          {workflow.assets?.title || 'Unknown Asset'}
                        </p>
                        <p className="text-sm text-yellow-600">{workflow.workflow_type}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Activity className="mr-1 h-3 w-3 animate-pulse" />
                        Running
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}