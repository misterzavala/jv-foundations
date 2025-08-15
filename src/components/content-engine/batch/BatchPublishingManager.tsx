// Batch Publishing Manager Component
// Handle bulk operations and scheduling for multiple assets

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar,
  Upload,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Settings,
  RefreshCw,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { n8nService } from "@/services/n8n-integration";
import type { Tables, WorkflowType } from "@/integrations/supabase/types-enhanced";

interface BatchPublishingManagerProps {
  selectedAssets: string[];
  isOpen?: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface AssetWithDestinations extends Tables<'assets'> {
  asset_destinations: Array<{
    id: string;
    account_id: string;
    accounts: {
      platform: string;
      account_handle: string;
    };
  }>;
}

interface BatchJob {
  id: string;
  assetId: string;
  asset: AssetWithDestinations;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executionId?: string;
  error?: string;
  scheduledTime?: string;
}

export default function BatchPublishingManager({ 
  selectedAssets, 
  isOpen = false,
  onClose, 
  onComplete 
}: BatchPublishingManagerProps) {
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [publishMethod, setPublishMethod] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledTime, setScheduledTime] = useState('');
  const [staggerMinutes, setStaggerMinutes] = useState(5);
  const [workflowType, setWorkflowType] = useState<WorkflowType>('publish_reel');
  const [isRunning, setIsRunning] = useState(false);

  // Fetch selected assets
  const { data: assets, isLoading } = useQuery({
    queryKey: ['batch-assets', selectedAssets],
    queryFn: async (): Promise<AssetWithDestinations[]> => {
      if (selectedAssets.length === 0) return [];

      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          asset_destinations(
            id,
            account_id,
            accounts(platform, account_handle)
          )
        `)
        .in('id', selectedAssets);

      if (error) throw error;
      return data as AssetWithDestinations[];
    },
    enabled: selectedAssets.length > 0
  });

  // Initialize batch jobs when assets are loaded
  useState(() => {
    if (assets) {
      const jobs: BatchJob[] = assets.map(asset => ({
        id: `job-${asset.id}`,
        assetId: asset.id,
        asset,
        status: 'pending'
      }));
      setBatchJobs(jobs);
    }
  });

  // Batch publishing mutation
  const batchPublishMutation = useMutation({
    mutationFn: async (jobs: BatchJob[]) => {
      const results: BatchJob[] = [];
      
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        
        try {
          // Update job status
          setBatchJobs(prev => 
            prev.map(j => j.id === job.id ? { ...j, status: 'running' } : j)
          );

          // Calculate scheduled time with staggering
          let jobScheduledTime = scheduledTime;
          if (publishMethod === 'scheduled' && scheduledTime && staggerMinutes > 0) {
            const baseTime = new Date(scheduledTime);
            baseTime.setMinutes(baseTime.getMinutes() + (i * staggerMinutes));
            jobScheduledTime = baseTime.toISOString();
          }

          // Trigger workflow
          const executionId = await n8nService.getInstance().triggerWorkflow(
            job.assetId,
            workflowType,
            {
              scheduledTime: jobScheduledTime,
              priority: 1
            }
          );

          // Update job with success
          const updatedJob: BatchJob = {
            ...job,
            status: 'completed',
            executionId,
            scheduledTime: jobScheduledTime
          };
          
          results.push(updatedJob);
          
          setBatchJobs(prev => 
            prev.map(j => j.id === job.id ? updatedJob : j)
          );

        } catch (error) {
          // Update job with error
          const failedJob: BatchJob = {
            ...job,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          
          results.push(failedJob);
          
          setBatchJobs(prev => 
            prev.map(j => j.id === job.id ? failedJob : j)
          );
        }

        // Small delay between jobs to avoid overwhelming the system
        if (i < jobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(j => j.status === 'completed').length;
      const failed = results.filter(j => j.status === 'failed').length;
      
      console.log(`Batch publishing completed: ${successful} successful, ${failed} failed`);
    },
    onSettled: () => {
      setIsRunning(false);
    }
  });

  const handleStartBatch = () => {
    if (publishMethod === 'scheduled' && !scheduledTime) {
      alert('Please select a scheduled time');
      return;
    }

    setIsRunning(true);
    batchPublishMutation.mutate(batchJobs);
  };

  const getStatusBadge = (status: BatchJob['status']) => {
    const statusConfig = {
      pending: { color: "bg-gray-100 text-gray-800", icon: Clock },
      running: { color: "bg-yellow-100 text-yellow-800", icon: RefreshCw },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-800", icon: AlertTriangle }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <Badge className={cn("text-xs font-medium", config.color)}>
        <IconComponent className={cn("mr-1 h-3 w-3", status === 'running' && "animate-spin")} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const completedJobs = batchJobs.filter(j => j.status === 'completed').length;
  const failedJobs = batchJobs.filter(j => j.status === 'failed').length;
  const progressPercentage = batchJobs.length > 0 ? 
    ((completedJobs + failedJobs) / batchJobs.length) * 100 : 0;

  return (
    <Dialog open={isOpen && selectedAssets.length > 0} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Batch Publishing Manager</span>
              <Badge variant="secondary">{selectedAssets.length} assets</Badge>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isRunning}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Publishing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Publishing Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Publishing Method</Label>
                  <Select
                    value={publishMethod}
                    onValueChange={(value: 'immediate' | 'scheduled') => setPublishMethod(value)}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Publish Immediately</SelectItem>
                      <SelectItem value="scheduled">Schedule Publishing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Workflow Type</Label>
                  <Select
                    value={workflowType}
                    onValueChange={(value: WorkflowType) => setWorkflowType(value)}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publish_reel">Publish Reel</SelectItem>
                      <SelectItem value="publish_carousel">Publish Carousel</SelectItem>
                      <SelectItem value="batch_publish">Batch Publish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {publishMethod === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Scheduled Time</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      disabled={isRunning}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Stagger Interval (minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      value={staggerMinutes}
                      onChange={(e) => setStaggerMinutes(parseInt(e.target.value) || 0)}
                      disabled={isRunning}
                      className="mt-1"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Time between each asset publish
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress */}
          {isRunning && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{completedJobs + failedJobs} of {batchJobs.length} processed</span>
                    <span>{completedJobs} successful, {failedJobs} failed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Asset List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assets to Publish</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading assets...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {batchJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {job.asset.thumbnail_url ? (
                          <img
                            src={job.asset.thumbnail_url}
                            alt={job.asset.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.asset.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.asset.content_type.replace('_', ' ')} • 
                          {job.asset.asset_destinations?.length || 0} destinations
                        </p>
                        {job.error && (
                          <p className="text-xs text-red-600 truncate mt-1">
                            {job.error}
                          </p>
                        )}
                        {job.scheduledTime && (
                          <p className="text-xs text-blue-600 mt-1">
                            Scheduled: {new Date(job.scheduledTime).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {getStatusBadge(job.status)}
                        {job.executionId && (
                          <Badge variant="outline" className="text-xs">
                            {job.executionId.slice(0, 8)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedAssets.length} asset{selectedAssets.length === 1 ? '' : 's'} selected
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isRunning}>
                Cancel
              </Button>
              
              <Button
                onClick={handleStartBatch}
                disabled={isRunning || selectedAssets.length === 0}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isRunning ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : publishMethod === 'immediate' ? (
                  <Play className="mr-2 h-4 w-4" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                {isRunning 
                  ? 'Publishing...' 
                  : publishMethod === 'immediate' 
                    ? 'Publish Now' 
                    : 'Schedule Batch'
                }
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Batch Scheduling Calendar Component (for future enhancement)
export function BatchSchedulingCalendar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          Publishing Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Calendar view coming soon...
        </div>
      </CardContent>
    </Card>
  );
}