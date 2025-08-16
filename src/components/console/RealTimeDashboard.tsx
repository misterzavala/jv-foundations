/**
 * Real-time Dashboard Component
 * Shows live system updates and connection status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealTimeStatus, useLiveEventStream, useRealTimeNotifications } from '@/hooks/useRealTime';
import { realTimeService } from '@/services/real-time-service';

export function RealTimeDashboard() {
  const status = useRealTimeStatus();
  const { events } = useLiveEventStream(50);
  const { notifications, dismissNotification, clearAllNotifications } = useRealTimeNotifications();
  const [statistics, setStatistics] = useState(realTimeService.getStatistics());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatistics(realTimeService.getStatistics());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventBadgeVariant = (securityLevel: string) => {
    switch (securityLevel) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getNotificationVariant = (type: string) => {
    return type === 'error' ? 'destructive' : 'default';
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">
                {status.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.activeChannels}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status.totalSubscriptions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Live Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Real-time Notifications</CardTitle>
              <Button variant="outline" size="sm" onClick={clearAllNotifications}>
                Clear All
              </Button>
            </div>
            <CardDescription>Important system events and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Alert 
                  key={notification.id} 
                  variant={getNotificationVariant(notification.type)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{notification.title}</div>
                      <AlertDescription>{notification.message}</AlertDescription>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      ✕
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Event Stream */}
      <Card>
        <CardHeader>
          <CardTitle>Live Event Stream</CardTitle>
          <CardDescription>Real-time system events as they happen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No events yet. System events will appear here in real-time.
              </div>
            ) : (
              events.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getEventBadgeVariant(event.security_level)}>
                        {event.security_level}
                      </Badge>
                      <span className="font-medium">{event.event_type}</span>
                      <span className="text-sm text-muted-foreground">
                        {event.entity_type}:{event.entity_id}
                      </span>
                    </div>
                    {event.event_data?.message && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {event.event_data.message}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(event.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Channel Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Details</CardTitle>
          <CardDescription>Active real-time channels and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {statistics.channels.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No active channels
              </div>
            ) : (
              statistics.channels.map((channel) => (
                <div 
                  key={channel} 
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="font-mono text-sm">{channel}</span>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}