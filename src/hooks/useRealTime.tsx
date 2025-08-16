/**
 * Real-time Hooks for Live Updates
 * Provides easy-to-use hooks for real-time subscriptions
 */

import { useEffect, useState, useCallback } from 'react';
import { realTimeService, type SubscriptionCallback, type AssetUpdate, type WorkflowUpdate, type EventUpdate } from '@/services/real-time-service';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook for real-time asset updates
 */
export function useAssetUpdates(onUpdate?: SubscriptionCallback<AssetUpdate>) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!onUpdate) return;

    setIsSubscribed(true);
    const unsubscribe = realTimeService.subscribeToAssets(onUpdate);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [onUpdate]);

  return { isSubscribed };
}

/**
 * Hook for real-time workflow updates
 */
export function useWorkflowUpdates(onUpdate?: SubscriptionCallback<WorkflowUpdate>) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!onUpdate) return;

    setIsSubscribed(true);
    const unsubscribe = realTimeService.subscribeToWorkflows(onUpdate);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [onUpdate]);

  return { isSubscribed };
}

/**
 * Hook for real-time system events
 */
export function useEventUpdates(onUpdate?: SubscriptionCallback<EventUpdate>) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!onUpdate) return;

    setIsSubscribed(true);
    const unsubscribe = realTimeService.subscribeToEvents(onUpdate);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [onUpdate]);

  return { isSubscribed };
}

/**
 * Hook for real-time connection status
 */
export function useRealTimeStatus() {
  const [status, setStatus] = useState({
    isConnected: realTimeService.isConnectionActive(),
    activeChannels: realTimeService.getActiveChannelsCount(),
    totalSubscriptions: realTimeService.getActiveSubscriptionsCount(),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus({
        isConnected: realTimeService.isConnectionActive(),
        activeChannels: realTimeService.getActiveChannelsCount(),
        totalSubscriptions: realTimeService.getActiveSubscriptionsCount(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

/**
 * Hook for live asset list with real-time updates
 */
export function useLiveAssets(initialAssets: any[] = []) {
  const [assets, setAssets] = useState(initialAssets);

  const handleAssetUpdate = useCallback((payload: RealtimePostgresChangesPayload<AssetUpdate>) => {
    setAssets(prevAssets => {
      switch (payload.eventType) {
        case 'INSERT':
          return [...prevAssets, payload.new];
          
        case 'UPDATE':
          return prevAssets.map(asset => 
            asset.id === payload.new.id ? { ...asset, ...payload.new } : asset
          );
          
        case 'DELETE':
          return prevAssets.filter(asset => asset.id !== payload.old.id);
          
        default:
          return prevAssets;
      }
    });
  }, []);

  useAssetUpdates(handleAssetUpdate);

  return { assets, setAssets };
}

/**
 * Hook for live workflow list with real-time updates
 */
export function useLiveWorkflows(initialWorkflows: any[] = []) {
  const [workflows, setWorkflows] = useState(initialWorkflows);

  const handleWorkflowUpdate = useCallback((payload: RealtimePostgresChangesPayload<WorkflowUpdate>) => {
    setWorkflows(prevWorkflows => {
      switch (payload.eventType) {
        case 'INSERT':
          return [...prevWorkflows, payload.new];
          
        case 'UPDATE':
          return prevWorkflows.map(workflow => 
            workflow.id === payload.new.id ? { ...workflow, ...payload.new } : workflow
          );
          
        case 'DELETE':
          return prevWorkflows.filter(workflow => workflow.id !== payload.old.id);
          
        default:
          return prevWorkflows;
      }
    });
  }, []);

  useWorkflowUpdates(handleWorkflowUpdate);

  return { workflows, setWorkflows };
}

/**
 * Hook for live event stream
 */
export function useLiveEventStream(maxEvents: number = 100) {
  const [events, setEvents] = useState<any[]>([]);

  const handleEventUpdate = useCallback((payload: RealtimePostgresChangesPayload<EventUpdate>) => {
    if (payload.eventType === 'INSERT') {
      setEvents(prevEvents => {
        const newEvents = [payload.new, ...prevEvents];
        // Keep only the most recent events
        return newEvents.slice(0, maxEvents);
      });
    }
  }, [maxEvents]);

  useEventUpdates(handleEventUpdate);

  return { events, setEvents };
}

/**
 * Hook for custom table subscription
 */
export function useTableSubscription(
  table: string,
  callback: SubscriptionCallback,
  filter?: { column: string; value: string }
) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSubscribed(true);
    const unsubscribe = realTimeService.subscribeToTable(table, callback, filter);

    return () => {
      unsubscribe();
      setIsSubscribed(false);
    };
  }, [table, callback, filter]);

  return { isSubscribed };
}

/**
 * Hook for monitoring specific asset
 */
export function useAssetMonitor(assetId: string) {
  const [asset, setAsset] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<AssetUpdate>) => {
    if (payload.new?.id === assetId || payload.old?.id === assetId) {
      if (payload.eventType === 'DELETE') {
        setAsset(null);
      } else {
        setAsset(payload.new);
      }
      setLastUpdate(new Date());
    }
  }, [assetId]);

  useAssetUpdates(handleUpdate);

  return { asset, lastUpdate };
}

/**
 * Hook for monitoring specific workflow
 */
export function useWorkflowMonitor(workflowId: string) {
  const [workflow, setWorkflow] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleUpdate = useCallback((payload: RealtimePostgresChangesPayload<WorkflowUpdate>) => {
    if (payload.new?.id === workflowId || payload.old?.id === workflowId) {
      if (payload.eventType === 'DELETE') {
        setWorkflow(null);
      } else {
        setWorkflow(payload.new);
      }
      setLastUpdate(new Date());
    }
  }, [workflowId]);

  useWorkflowUpdates(handleUpdate);

  return { workflow, lastUpdate };
}

/**
 * Hook for real-time notifications
 */
export function useRealTimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleEventUpdate = useCallback((payload: RealtimePostgresChangesPayload<EventUpdate>) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const event = payload.new;
      
      // Only show notifications for important events
      if (event.security_level === 'error' || event.security_level === 'warning') {
        const notification = {
          id: event.id,
          type: event.security_level,
          title: event.event_type,
          message: event.event_data?.message || 'System event occurred',
          timestamp: new Date(event.created_at),
        };

        setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10

        // Auto-remove after 5 seconds for warnings, keep errors
        if (event.security_level === 'warning') {
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, 5000);
        }
      }
    }
  }, []);

  useEventUpdates(handleEventUpdate);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { 
    notifications, 
    dismissNotification, 
    clearAllNotifications 
  };
}