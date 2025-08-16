/**
 * Real-time Service for Live Updates
 * Provides real-time subscriptions for workflow and asset updates
 */

import { supabase } from '@/integrations/supabase/client';
import { eventSourceService } from './event-sourcing';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type SubscriptionCallback<T = any> = (payload: RealtimePostgresChangesPayload<T>) => void;

export interface AssetUpdate {
  id: string;
  status: string;
  updated_at: string;
  [key: string]: any;
}

export interface WorkflowUpdate {
  id: string;
  status: string;
  asset_id: string;
  workflow_type: string;
  updated_at: string;
  [key: string]: any;
}

export interface EventUpdate {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  security_level: string;
  created_at: string;
  [key: string]: any;
}

class RealTimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, Set<SubscriptionCallback>> = new Map();
  private isConnected = false;

  constructor() {
    this.initializeConnection();
  }

  /**
   * Initialize real-time connection
   */
  private initializeConnection(): void {
    // Listen for connection state changes
    supabase.realtime.onConnect(() => {
      this.isConnected = true;
      console.log('Real-time connection established');
      
      eventSourceService.logEvent(
        'realtime',
        'system',
        'realtime.connected',
        { timestamp: new Date().toISOString() },
        'info'
      );
    });

    supabase.realtime.onDisconnect(() => {
      this.isConnected = false;
      console.log('Real-time connection lost');
      
      eventSourceService.logEvent(
        'realtime',
        'system',
        'realtime.disconnected',
        { timestamp: new Date().toISOString() },
        'warning'
      );
    });
  }

  /**
   * Subscribe to asset updates
   */
  subscribeToAssets(callback: SubscriptionCallback<AssetUpdate>): () => void {
    const channelName = 'assets_updates';
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'assets',
          },
          (payload) => {
            this.notifySubscribers(channelName, payload);
            
            // Log asset update
            eventSourceService.logEvent(
              'asset',
              payload.new?.id || payload.old?.id || 'unknown',
              `asset.${payload.eventType}`,
              {
                table: 'assets',
                event: payload.eventType,
                old: payload.old,
                new: payload.new,
              },
              'info'
            );
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Add callback to subscribers
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channelName);
      if (subs) {
        subs.delete(callback);
        
        // If no more subscribers, close channel
        if (subs.size === 0) {
          const channel = this.channels.get(channelName);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
            this.subscriptions.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Subscribe to workflow execution updates
   */
  subscribeToWorkflows(callback: SubscriptionCallback<WorkflowUpdate>): () => void {
    const channelName = 'workflow_updates';
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'workflow_executions',
          },
          (payload) => {
            this.notifySubscribers(channelName, payload);
            
            // Log workflow update
            eventSourceService.logEvent(
              'workflow',
              payload.new?.id || payload.old?.id || 'unknown',
              `workflow.${payload.eventType}`,
              {
                table: 'workflow_executions',
                event: payload.eventType,
                old: payload.old,
                new: payload.new,
                workflow_type: payload.new?.workflow_type || payload.old?.workflow_type,
              },
              'info'
            );
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Add callback to subscribers
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channelName);
      if (subs) {
        subs.delete(callback);
        
        if (subs.size === 0) {
          const channel = this.channels.get(channelName);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
            this.subscriptions.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Subscribe to system events
   */
  subscribeToEvents(callback: SubscriptionCallback<EventUpdate>): () => void {
    const channelName = 'events_updates';
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'events',
          },
          (payload) => {
            this.notifySubscribers(channelName, payload);
            
            // Don't log events about events to avoid recursion
            if (payload.new?.entity_type !== 'event') {
              console.log('New system event:', payload.new);
            }
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Add callback to subscribers
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channelName);
      if (subs) {
        subs.delete(callback);
        
        if (subs.size === 0) {
          const channel = this.channels.get(channelName);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
            this.subscriptions.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Subscribe to user profile updates
   */
  subscribeToUserProfiles(callback: SubscriptionCallback): () => void {
    const channelName = 'user_profiles_updates';
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
          },
          (payload) => {
            this.notifySubscribers(channelName, payload);
            
            eventSourceService.logEvent(
              'user_profile',
              payload.new?.id || payload.old?.id || 'unknown',
              `user_profile.${payload.eventType}`,
              {
                table: 'user_profiles',
                event: payload.eventType,
                email: payload.new?.email || payload.old?.email,
              },
              'info'
            );
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Add callback to subscribers
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channelName);
      if (subs) {
        subs.delete(callback);
        
        if (subs.size === 0) {
          const channel = this.channels.get(channelName);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
            this.subscriptions.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Subscribe to webhook configuration updates
   */
  subscribeToWebhookConfigs(callback: SubscriptionCallback): () => void {
    const channelName = 'webhook_configs_updates';
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'webhook_configs',
          },
          (payload) => {
            this.notifySubscribers(channelName, payload);
            
            eventSourceService.logEvent(
              'webhook_config',
              payload.new?.id || payload.old?.id || 'unknown',
              `webhook_config.${payload.eventType}`,
              {
                table: 'webhook_configs',
                event: payload.eventType,
                webhook_type: payload.new?.webhook_type || payload.old?.webhook_type,
              },
              'info'
            );
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Add callback to subscribers
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channelName);
      if (subs) {
        subs.delete(callback);
        
        if (subs.size === 0) {
          const channel = this.channels.get(channelName);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
            this.subscriptions.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Custom subscription for specific table and filters
   */
  subscribeToTable(
    table: string,
    callback: SubscriptionCallback,
    filter?: { column: string; value: string }
  ): () => void {
    const channelName = filter 
      ? `${table}_${filter.column}_${filter.value}`
      : `${table}_all`;
    
    if (!this.channels.has(channelName)) {
      let channelBuilder = supabase.channel(channelName);
      
      const config: any = {
        event: '*',
        schema: 'public',
        table: table,
      };
      
      if (filter) {
        config.filter = `${filter.column}=eq.${filter.value}`;
      }
      
      const channel = channelBuilder
        .on('postgres_changes', config, (payload) => {
          this.notifySubscribers(channelName, payload);
          
          eventSourceService.logEvent(
            'realtime_subscription',
            payload.new?.id || payload.old?.id || 'unknown',
            `${table}.${payload.eventType}`,
            {
              table,
              event: payload.eventType,
              filter,
              channel: channelName,
            },
            'info'
          );
        })
        .subscribe();

      this.channels.set(channelName, channel);
    }

    // Add callback to subscribers
    if (!this.subscriptions.has(channelName)) {
      this.subscriptions.set(channelName, new Set());
    }
    this.subscriptions.get(channelName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channelName);
      if (subs) {
        subs.delete(callback);
        
        if (subs.size === 0) {
          const channel = this.channels.get(channelName);
          if (channel) {
            supabase.removeChannel(channel);
            this.channels.delete(channelName);
            this.subscriptions.delete(channelName);
          }
        }
      }
    };
  }

  /**
   * Notify all subscribers of a channel
   */
  private notifySubscribers(channelName: string, payload: any): void {
    const subscribers = this.subscriptions.get(channelName);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error('Error in real-time subscription callback:', error);
          eventSourceService.logEvent(
            'realtime',
            channelName,
            'realtime.callback_error',
            { error: error instanceof Error ? error.message : 'Unknown error' },
            'error'
          );
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Get active channels count
   */
  getActiveChannelsCount(): number {
    return this.channels.size;
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptionsCount(): number {
    let total = 0;
    this.subscriptions.forEach(subs => {
      total += subs.size;
    });
    return total;
  }

  /**
   * Close all connections and clean up
   */
  disconnect(): void {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
      console.log(`Closed channel: ${channelName}`);
    });
    
    this.channels.clear();
    this.subscriptions.clear();
    this.isConnected = false;
    
    eventSourceService.logEvent(
      'realtime',
      'system',
      'realtime.disconnected_all',
      { timestamp: new Date().toISOString() },
      'info'
    );
  }

  /**
   * Get channel and subscription statistics
   */
  getStatistics() {
    return {
      isConnected: this.isConnected,
      activeChannels: this.channels.size,
      totalSubscriptions: this.getActiveSubscriptionsCount(),
      channels: Array.from(this.channels.keys()),
    };
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realTimeService.disconnect();
  });
}