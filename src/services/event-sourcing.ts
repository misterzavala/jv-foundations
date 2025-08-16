// Event Sourcing Service
// Comprehensive event-driven architecture with structured logging for workflow monitoring

import { supabase } from '@/integrations/supabase/client'

export interface EventData {
  [key: string]: any
}

export interface EventMetadata {
  user_id?: string
  session_id?: string
  ip_address?: string
  user_agent?: string
  timestamp?: string
  correlation_id?: string
  trace_id?: string
  source?: string
  version?: string
}

export interface SystemEvent {
  id?: string
  entity_type: string
  entity_id: string
  event_type: string
  event_data: EventData
  metadata?: EventMetadata
  security_level?: 'info' | 'warning' | 'error' | 'critical'
  created_at?: string
  sequence_number?: number
}

export interface EventFilter {
  entity_type?: string[]
  entity_id?: string
  event_type?: string[]
  security_level?: string[]
  date_range?: {
    start: string
    end: string
  }
  correlation_id?: string
  trace_id?: string
  limit?: number
  offset?: number
}

export interface EventStream {
  events: SystemEvent[]
  total: number
  hasMore: boolean
  nextOffset?: number
}

export interface EventAggregation {
  entity_type: string
  event_type: string
  count: number
  latest_event: string
  first_event: string
}

export class EventSourcingService {
  private readonly maxBatchSize = 100
  private readonly retentionDays = 90
  private eventBuffer: SystemEvent[] = []
  private bufferFlushInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start buffer flush interval (every 5 seconds)
    this.bufferFlushInterval = setInterval(() => {
      this.flushEventBuffer()
    }, 5000)

    // Cleanup old events periodically (every hour)
    setInterval(() => {
      this.cleanupOldEvents()
    }, 60 * 60 * 1000)
  }

  /**
   * Emit a single event
   */
  async emit(event: Omit<SystemEvent, 'id' | 'created_at' | 'sequence_number'>): Promise<string> {
    const enrichedEvent: SystemEvent = {
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'event_sourcing_service',
        version: '1.0',
        ...event.metadata
      }
    }

    // Add to buffer for batch processing
    this.eventBuffer.push(enrichedEvent)

    // Flush buffer if it's getting full
    if (this.eventBuffer.length >= this.maxBatchSize) {
      await this.flushEventBuffer()
    }

    return enrichedEvent.id!
  }

  /**
   * Emit multiple events as a batch
   */
  async emitBatch(events: Omit<SystemEvent, 'id' | 'created_at' | 'sequence_number'>[]): Promise<string[]> {
    const enrichedEvents: SystemEvent[] = events.map(event => ({
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'event_sourcing_service',
        version: '1.0',
        ...event.metadata
      }
    }))

    // Add to buffer
    this.eventBuffer.push(...enrichedEvents)

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.maxBatchSize) {
      await this.flushEventBuffer()
    }

    return enrichedEvents.map(e => e.id!)
  }

  /**
   * Get events with filtering and pagination
   */
  async getEvents(filter: EventFilter = {}): Promise<EventStream> {
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filter.entity_type && filter.entity_type.length > 0) {
      query = query.in('entity_type', filter.entity_type)
    }

    if (filter.entity_id) {
      query = query.eq('entity_id', filter.entity_id)
    }

    if (filter.event_type && filter.event_type.length > 0) {
      query = query.in('event_type', filter.event_type)
    }

    if (filter.security_level && filter.security_level.length > 0) {
      query = query.in('security_level', filter.security_level)
    }

    if (filter.date_range) {
      query = query
        .gte('created_at', filter.date_range.start)
        .lte('created_at', filter.date_range.end)
    }

    if (filter.correlation_id) {
      query = query.eq('metadata->>correlation_id', filter.correlation_id)
    }

    if (filter.trace_id) {
      query = query.eq('metadata->>trace_id', filter.trace_id)
    }

    // Apply pagination
    const limit = Math.min(filter.limit || 50, 200) // Max 200 events per request
    const offset = filter.offset || 0

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: events, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`)
    }

    return {
      events: events || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
      nextOffset: (count || 0) > offset + limit ? offset + limit : undefined
    }
  }

  /**
   * Get event aggregations for analytics
   */
  async getEventAggregations(
    filter: Omit<EventFilter, 'limit' | 'offset'> = {}
  ): Promise<EventAggregation[]> {
    let baseQuery = supabase
      .from('events')
      .select('entity_type, event_type, created_at')

    // Apply filters (excluding pagination)
    if (filter.entity_type && filter.entity_type.length > 0) {
      baseQuery = baseQuery.in('entity_type', filter.entity_type)
    }

    if (filter.event_type && filter.event_type.length > 0) {
      baseQuery = baseQuery.in('event_type', filter.event_type)
    }

    if (filter.security_level && filter.security_level.length > 0) {
      baseQuery = baseQuery.in('security_level', filter.security_level)
    }

    if (filter.date_range) {
      baseQuery = baseQuery
        .gte('created_at', filter.date_range.start)
        .lte('created_at', filter.date_range.end)
    }

    const { data: events, error } = await baseQuery

    if (error) {
      throw new Error(`Failed to fetch events for aggregation: ${error.message}`)
    }

    // Aggregate in memory (for small datasets)
    const aggregations = new Map<string, EventAggregation>()

    events?.forEach(event => {
      const key = `${event.entity_type}:${event.event_type}`
      const existing = aggregations.get(key)

      if (existing) {
        existing.count++
        existing.latest_event = event.created_at > existing.latest_event ? event.created_at : existing.latest_event
        existing.first_event = event.created_at < existing.first_event ? event.created_at : existing.first_event
      } else {
        aggregations.set(key, {
          entity_type: event.entity_type,
          event_type: event.event_type,
          count: 1,
          latest_event: event.created_at,
          first_event: event.created_at
        })
      }
    })

    return Array.from(aggregations.values()).sort((a, b) => b.count - a.count)
  }

  /**
   * Get event timeline for a specific entity
   */
  async getEntityTimeline(
    entityType: string,
    entityId: string,
    limit = 50
  ): Promise<SystemEvent[]> {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to fetch entity timeline: ${error.message}`)
    }

    return events || []
  }

  /**
   * Get real-time event stream
   */
  subscribeToEvents(
    filter: Omit<EventFilter, 'limit' | 'offset'> = {},
    callback: (event: SystemEvent) => void
  ): () => void {
    let channel = supabase
      .channel('events_stream')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'events'
      }, (payload) => {
        const event = payload.new as SystemEvent
        
        // Apply client-side filtering
        if (this.eventMatchesFilter(event, filter)) {
          callback(event)
        }
      })

    channel.subscribe()

    // Return unsubscribe function
    return () => {
      channel.unsubscribe()
    }
  }

  /**
   * Get system health metrics from events
   */
  async getSystemHealthMetrics(hoursBack = 24): Promise<{
    total_events: number
    error_rate: number
    critical_events: number
    top_error_types: Array<{ event_type: string; count: number }>
    hourly_distribution: Array<{ hour: string; count: number }>
  }> {
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

    const { data: events, error } = await supabase
      .from('events')
      .select('event_type, security_level, created_at')
      .gte('created_at', startTime)

    if (error) {
      throw new Error(`Failed to fetch health metrics: ${error.message}`)
    }

    const totalEvents = events?.length || 0
    const errorEvents = events?.filter(e => e.security_level === 'error' || e.security_level === 'critical') || []
    const criticalEvents = events?.filter(e => e.security_level === 'critical') || []

    // Calculate error rate
    const errorRate = totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0

    // Top error types
    const errorTypes = new Map<string, number>()
    errorEvents.forEach(event => {
      errorTypes.set(event.event_type, (errorTypes.get(event.event_type) || 0) + 1)
    })

    const topErrorTypes = Array.from(errorTypes.entries())
      .map(([event_type, count]) => ({ event_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Hourly distribution
    const hourlyDist = new Map<string, number>()
    events?.forEach(event => {
      const hour = new Date(event.created_at).toISOString().slice(0, 13) + ':00:00.000Z'
      hourlyDist.set(hour, (hourlyDist.get(hour) || 0) + 1)
    })

    const hourlyDistribution = Array.from(hourlyDist.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour))

    return {
      total_events: totalEvents,
      error_rate: Math.round(errorRate * 100) / 100,
      critical_events: criticalEvents.length,
      top_error_types: topErrorTypes,
      hourly_distribution: hourlyDistribution
    }
  }

  /**
   * Correlate events across entities
   */
  async getCorrelatedEvents(correlationId: string): Promise<SystemEvent[]> {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('metadata->>correlation_id', correlationId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch correlated events: ${error.message}`)
    }

    return events || []
  }

  /**
   * Search events by text content
   */
  async searchEvents(
    query: string,
    filter: EventFilter = {}
  ): Promise<SystemEvent[]> {
    let baseQuery = supabase
      .from('events')
      .select('*')

    // Apply filters
    if (filter.entity_type && filter.entity_type.length > 0) {
      baseQuery = baseQuery.in('entity_type', filter.entity_type)
    }

    if (filter.date_range) {
      baseQuery = baseQuery
        .gte('created_at', filter.date_range.start)
        .lte('created_at', filter.date_range.end)
    }

    // Text search in event_data (PostgreSQL JSONB search)
    baseQuery = baseQuery.or(
      `event_type.ilike.%${query}%,` +
      `entity_id.ilike.%${query}%,` +
      `event_data->>description.ilike.%${query}%,` +
      `event_data->>title.ilike.%${query}%,` +
      `event_data->>error.ilike.%${query}%`
    )

    const { data: events, error } = await baseQuery
      .order('created_at', { ascending: false })
      .limit(filter.limit || 100)

    if (error) {
      throw new Error(`Failed to search events: ${error.message}`)
    }

    return events || []
  }

  /**
   * Private helper methods
   */

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return

    const eventsToFlush = [...this.eventBuffer]
    this.eventBuffer = []

    try {
      const { error } = await supabase
        .from('events')
        .insert(eventsToFlush.map(event => ({
          id: event.id,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          event_type: event.event_type,
          event_data: event.event_data,
          security_level: event.security_level || 'info',
          client_ip: event.metadata?.ip_address,
          user_agent: event.metadata?.user_agent,
          created_at: event.created_at,
          created_by: event.metadata?.user_id
        })))

      if (error) {
        console.error('Failed to flush event buffer:', error)
        // Re-add events to buffer for retry
        this.eventBuffer.unshift(...eventsToFlush)
      }
    } catch (error) {
      console.error('Error flushing event buffer:', error)
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush)
    }
  }

  private eventMatchesFilter(event: SystemEvent, filter: Omit<EventFilter, 'limit' | 'offset'>): boolean {
    if (filter.entity_type && !filter.entity_type.includes(event.entity_type)) {
      return false
    }

    if (filter.entity_id && event.entity_id !== filter.entity_id) {
      return false
    }

    if (filter.event_type && !filter.event_type.includes(event.event_type)) {
      return false
    }

    if (filter.security_level && !filter.security_level.includes(event.security_level || 'info')) {
      return false
    }

    if (filter.correlation_id && event.metadata?.correlation_id !== filter.correlation_id) {
      return false
    }

    if (filter.trace_id && event.metadata?.trace_id !== filter.trace_id) {
      return false
    }

    return true
  }

  private async cleanupOldEvents(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000).toISOString()
      
      const { error } = await supabase
        .from('events')
        .delete()
        .lt('created_at', cutoffDate)

      if (error) {
        console.error('Failed to cleanup old events:', error)
      }
    } catch (error) {
      console.error('Error cleaning up old events:', error)
    }
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval)
      this.bufferFlushInterval = null
    }

    // Flush any remaining events
    this.flushEventBuffer()
  }
}

// Event type constants for consistency
export const EventTypes = {
  // Asset events
  ASSET_CREATED: 'asset.created',
  ASSET_UPDATED: 'asset.updated',
  ASSET_DELETED: 'asset.deleted',
  ASSET_STATUS_CHANGED: 'asset.status_changed',
  ASSET_PUBLISHED: 'asset.published',
  ASSET_FAILED: 'asset.failed',

  // Workflow events
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_FAILED: 'workflow.failed',
  WORKFLOW_CANCELLED: 'workflow.cancelled',

  // Publishing events
  PUBLISHING_STARTED: 'publishing.started',
  PUBLISHING_COMPLETED: 'publishing.completed',
  PUBLISHING_FAILED: 'publishing.failed',
  PUBLISHING_RETRIED: 'publishing.retried',

  // Security events
  SECURITY_VIOLATION: 'security.violation',
  AUTH_SUCCESS: 'auth.success',
  AUTH_FAILED: 'auth.failed',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',

  // System events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',
  BACKUP_COMPLETED: 'system.backup_completed',

  // User events
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_ACTION: 'user.action'
} as const

// Export singleton instance
export const eventSourcingService = new EventSourcingService()

// Convenience functions for common event types
export const EventEmitter = {
  asset: {
    created: (assetId: string, data: EventData, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'asset',
        entity_id: assetId,
        event_type: EventTypes.ASSET_CREATED,
        event_data: data,
        metadata
      }),

    statusChanged: (assetId: string, fromStatus: string, toStatus: string, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'asset',
        entity_id: assetId,
        event_type: EventTypes.ASSET_STATUS_CHANGED,
        event_data: { from_status: fromStatus, to_status: toStatus },
        metadata
      }),

    published: (assetId: string, platforms: string[], metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'asset',
        entity_id: assetId,
        event_type: EventTypes.ASSET_PUBLISHED,
        event_data: { platforms },
        metadata
      }),

    failed: (assetId: string, error: string, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'asset',
        entity_id: assetId,
        event_type: EventTypes.ASSET_FAILED,
        event_data: { error },
        security_level: 'error',
        metadata
      })
  },

  workflow: {
    created: (workflowId: string, workflowType: string, assetId: string, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'workflow',
        entity_id: workflowId,
        event_type: EventTypes.WORKFLOW_CREATED,
        event_data: { workflow_type: workflowType, asset_id: assetId },
        metadata
      }),

    completed: (workflowId: string, duration: number, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'workflow',
        entity_id: workflowId,
        event_type: EventTypes.WORKFLOW_COMPLETED,
        event_data: { duration_ms: duration },
        metadata
      }),

    failed: (workflowId: string, error: string, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'workflow',
        entity_id: workflowId,
        event_type: EventTypes.WORKFLOW_FAILED,
        event_data: { error },
        security_level: 'error',
        metadata
      })
  },

  security: {
    violation: (type: string, details: EventData, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'security',
        entity_id: `violation_${Date.now()}`,
        event_type: EventTypes.SECURITY_VIOLATION,
        event_data: { violation_type: type, ...details },
        security_level: 'critical',
        metadata
      }),

    rateLimitExceeded: (identifier: string, details: EventData, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'security',
        entity_id: identifier,
        event_type: EventTypes.RATE_LIMIT_EXCEEDED,
        event_data: details,
        security_level: 'warning',
        metadata
      })
  },

  system: {
    error: (component: string, error: string, metadata?: EventMetadata) =>
      eventSourcingService.emit({
        entity_type: 'system',
        entity_id: component,
        event_type: EventTypes.SYSTEM_ERROR,
        event_data: { error, component },
        security_level: 'error',
        metadata
      })
  }
}