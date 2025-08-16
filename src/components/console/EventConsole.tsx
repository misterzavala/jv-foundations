import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Terminal,
  Play,
  Pause,
  RotateCcw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  Database,
  Shield,
  Users,
  Settings,
  TrendingUp,
  AlertCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  eventSourcingService, 
  EventTypes,
  type SystemEvent, 
  type EventFilter,
  type EventAggregation 
} from "@/services/event-sourcing";

interface EventConsoleProps {
  className?: string;
}

export default function EventConsole({ className }: EventConsoleProps) {
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all");
  const [selectedSecurityLevel, setSelectedSecurityLevel] = useState<string>("all");
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Fetch initial events
  const { data: initialEvents, refetch: refetchEvents } = useQuery({
    queryKey: ['console-events', selectedEntityType, selectedSecurityLevel],
    queryFn: () => {
      const filter: EventFilter = {
        limit: 100,
        ...(selectedEntityType !== "all" && { entity_type: [selectedEntityType] }),
        ...(selectedSecurityLevel !== "all" && { security_level: [selectedSecurityLevel] })
      };
      return eventSourcingService.getEvents(filter);
    },
    enabled: !isLiveMode
  });

  // Fetch system health metrics
  const { data: healthMetrics } = useQuery({
    queryKey: ['health-metrics'],
    queryFn: () => eventSourcingService.getSystemHealthMetrics(24),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch event aggregations
  const { data: aggregations } = useQuery({
    queryKey: ['event-aggregations', selectedEntityType],
    queryFn: () => {
      const filter = selectedEntityType !== "all" ? { entity_type: [selectedEntityType] } : {};
      return eventSourcingService.getEventAggregations(filter);
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Set up real-time subscription
  useEffect(() => {
    if (isLiveMode) {
      const filter: EventFilter = {
        ...(selectedEntityType !== "all" && { entity_type: [selectedEntityType] }),
        ...(selectedSecurityLevel !== "all" && { security_level: [selectedSecurityLevel] })
      };

      const unsubscribe = eventSourcingService.subscribeToEvents(filter, (newEvent) => {
        setEvents(prev => {
          const updated = [newEvent, ...prev].slice(0, 500); // Keep last 500 events
          return updated;
        });

        // Auto-scroll to bottom if enabled
        if (autoScroll && scrollAreaRef.current) {
          setTimeout(() => {
            const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
              scrollContainer.scrollTop = 0; // Scroll to top since we prepend new events
            }
          }, 100);
        }
      });

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }
  }, [isLiveMode, selectedEntityType, selectedSecurityLevel, autoScroll]);

  // Load initial events when switching to live mode
  useEffect(() => {
    if (isLiveMode && initialEvents) {
      setEvents(initialEvents.events);
    }
  }, [isLiveMode, initialEvents]);

  // Load events when not in live mode
  useEffect(() => {
    if (!isLiveMode && initialEvents) {
      setEvents(initialEvents.events);
    }
  }, [initialEvents, isLiveMode]);

  const toggleLiveMode = () => {
    if (isLiveMode && unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsLiveMode(!isLiveMode);
  };

  const refreshEvents = async () => {
    if (!isLiveMode) {
      await refetchEvents();
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('asset')) return <Database className="h-4 w-4" />;
    if (eventType.includes('workflow')) return <Activity className="h-4 w-4" />;
    if (eventType.includes('security')) return <Shield className="h-4 w-4" />;
    if (eventType.includes('user')) return <Users className="h-4 w-4" />;
    if (eventType.includes('system')) return <Settings className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  const getSecurityLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  const formatEventData = (data: any): string => {
    if (!data || typeof data !== 'object') return String(data || '');
    
    // Extract key information for display
    const keyFields = ['error', 'message', 'title', 'status', 'platform', 'workflow_type', 'from_status', 'to_status'];
    const relevantData: any = {};
    
    keyFields.forEach(field => {
      if (data[field] !== undefined) {
        relevantData[field] = data[field];
      }
    });

    return Object.keys(relevantData).length > 0 
      ? JSON.stringify(relevantData, null, 2) 
      : JSON.stringify(data, null, 2);
  };

  const filteredEvents = events.filter(event => {
    if (searchQuery && !JSON.stringify(event).toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className={cn("space-y-6", className)}>
      {/* Health Metrics Dashboard */}
      {healthMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Events</p>
                  <p className="text-2xl font-bold">{healthMetrics.total_events}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Error Rate</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    healthMetrics.error_rate > 5 ? "text-red-600" : 
                    healthMetrics.error_rate > 2 ? "text-yellow-600" : "text-green-600"
                  )}>
                    {healthMetrics.error_rate}%
                  </p>
                </div>
                <TrendingUp className={cn(
                  "h-8 w-8",
                  healthMetrics.error_rate > 5 ? "text-red-500" : 
                  healthMetrics.error_rate > 2 ? "text-yellow-500" : "text-green-500"
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Critical Events</p>
                  <p className="text-2xl font-bold text-red-600">{healthMetrics.critical_events}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Status</p>
                  <p className={cn(
                    "text-sm font-bold",
                    healthMetrics.critical_events === 0 && healthMetrics.error_rate < 2 
                      ? "text-green-600" : "text-red-600"
                  )}>
                    {healthMetrics.critical_events === 0 && healthMetrics.error_rate < 2 ? "Healthy" : "Issues"}
                  </p>
                </div>
                {healthMetrics.critical_events === 0 && healthMetrics.error_rate < 2 ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Console */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Terminal className="mr-2 h-5 w-5" />
              System Event Console
              {isLiveMode && (
                <Badge variant="outline" className="ml-2 text-green-600 border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  LIVE
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant={autoScroll ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
                className="text-xs"
              >
                Auto Scroll
              </Button>
              <Button
                variant={isLiveMode ? "default" : "outline"}
                size="sm"
                onClick={toggleLiveMode}
              >
                {isLiveMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isLiveMode ? "Pause" : "Start"} Live
              </Button>
              <Button variant="outline" size="sm" onClick={refreshEvents} disabled={isLiveMode}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={clearEvents}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="events" className="w-full">
            <TabsList>
              <TabsTrigger value="events">Events Stream</TabsTrigger>
              <TabsTrigger value="aggregations">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="asset">Assets</SelectItem>
                    <SelectItem value="workflow">Workflows</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedSecurityLevel} onValueChange={setSelectedSecurityLevel}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="outline" className="text-xs">
                  {filteredEvents.length} events
                </Badge>
              </div>

              {/* Events List */}
              <ScrollArea className="h-[600px] w-full border rounded-lg" ref={scrollAreaRef}>
                <div className="p-4 space-y-2">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Terminal className="mx-auto h-12 w-12 mb-4" />
                      <p>No events to display</p>
                      <p className="text-sm">
                        {isLiveMode ? "Waiting for events..." : "Adjust filters or refresh to load events"}
                      </p>
                    </div>
                  ) : (
                    filteredEvents.map((event, index) => (
                      <div
                        key={`${event.id}-${index}`}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg border text-sm",
                          getSecurityLevelColor(event.security_level || 'info')
                        )}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getSecurityLevelIcon(event.security_level || 'info')}
                        </div>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              {new Date(event.created_at || '').toLocaleTimeString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {event.entity_type}
                            </Badge>
                            <span className="text-xs font-medium">{event.event_type}</span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            Entity: {event.entity_id}
                          </div>
                          
                          {event.event_data && Object.keys(event.event_data).length > 0 && (
                            <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto">
                              {formatEventData(event.event_data)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="aggregations" className="space-y-4">
              {aggregations && aggregations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aggregations.slice(0, 20).map((agg, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getEventIcon(agg.event_type)}
                            <div>
                              <p className="text-sm font-medium">{agg.event_type}</p>
                              <p className="text-xs text-muted-foreground">{agg.entity_type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{agg.count}</p>
                            <p className="text-xs text-muted-foreground">events</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Latest: {new Date(agg.latest_event).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 mb-4" />
                  <p>No event aggregations available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}