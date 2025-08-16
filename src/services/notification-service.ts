// In-App Notification Service - Replaces Slack notifications
import { EventEmitter } from './event-sourcing'

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'workflow'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  metadata?: {
    workflowId?: string
    assetId?: string
    platform?: string
    [key: string]: any
  }
}

class NotificationService {
  private notifications: Notification[] = []
  private subscribers: ((notifications: Notification[]) => void)[] = []
  private storageKey = 'wm_notifications'

  constructor() {
    this.loadNotifications()
    this.setupEventListeners()
  }

  // Subscribe to notification updates
  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.subscribers.push(callback)
    callback(this.notifications) // Send current notifications immediately
    
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  // Add new notification
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    }

    this.notifications.unshift(newNotification) // Add to beginning
    this.saveNotifications()
    this.notifySubscribers()

    // Log to console for development
    console.log(`🔔 Notification: ${notification.title}`, notification.message)

    // Emit event for external systems
    EventEmitter.notification.created('notification_created', {
      source: 'notification_service',
      notification: newNotification
    })
  }

  // Mark notification as read
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.read = true
      this.saveNotifications()
      this.notifySubscribers()
    }
  }

  // Mark all as read
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true)
    this.saveNotifications()
    this.notifySubscribers()
  }

  // Delete notification
  delete(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.saveNotifications()
    this.notifySubscribers()
  }

  // Clear all notifications
  clear(): void {
    this.notifications = []
    this.saveNotifications()
    this.notifySubscribers()
  }

  // Get notifications with filtering
  getNotifications(options?: {
    unreadOnly?: boolean
    type?: NotificationType
    limit?: number
  }): Notification[] {
    let filtered = [...this.notifications]

    if (options?.unreadOnly) {
      filtered = filtered.filter(n => !n.read)
    }

    if (options?.type) {
      filtered = filtered.filter(n => n.type === options.type)
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }

    return filtered
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  // Notification helpers for common scenarios
  success(title: string, message: string, metadata?: any): void {
    this.add({ type: 'success', title, message, metadata })
  }

  error(title: string, message: string, metadata?: any): void {
    this.add({ type: 'error', title, message, metadata })
  }

  warning(title: string, message: string, metadata?: any): void {
    this.add({ type: 'warning', title, message, metadata })
  }

  info(title: string, message: string, metadata?: any): void {
    this.add({ type: 'info', title, message, metadata })
  }

  // Workflow-specific notifications (replaces Slack workflow notifications)
  workflowStarted(workflowId: string, workflowName: string): void {
    this.add({
      type: 'workflow',
      title: 'Workflow Started',
      message: `${workflowName} has been initiated`,
      metadata: { workflowId, event: 'started' }
    })
  }

  workflowCompleted(workflowId: string, workflowName: string, results: any): void {
    this.add({
      type: 'success',
      title: 'Workflow Completed',
      message: `${workflowName} finished successfully`,
      metadata: { workflowId, event: 'completed', results }
    })
  }

  workflowFailed(workflowId: string, workflowName: string, error: string): void {
    this.add({
      type: 'error',
      title: 'Workflow Failed',
      message: `${workflowName} encountered an error: ${error}`,
      metadata: { workflowId, event: 'failed', error }
    })
  }

  // Content processing notifications (replaces Slack content notifications)
  contentProcessingStarted(assetId: string, assetTitle: string): void {
    this.add({
      type: 'info',
      title: 'Content Processing Started',
      message: `Processing "${assetTitle}" for publication`,
      metadata: { assetId, event: 'processing_started' }
    })
  }

  contentPublished(assetId: string, assetTitle: string, platforms: string[]): void {
    this.add({
      type: 'success',
      title: 'Content Published',
      message: `"${assetTitle}" published to ${platforms.join(', ')}`,
      metadata: { assetId, platforms, event: 'published' }
    })
  }

  contentFailed(assetId: string, assetTitle: string, error: string): void {
    this.add({
      type: 'error',
      title: 'Content Publication Failed',
      message: `Failed to publish "${assetTitle}": ${error}`,
      metadata: { assetId, event: 'failed', error }
    })
  }

  // MCP notifications (replaces Slack MCP notifications)
  mcpWorkflowDeployed(workflowId: string, webhookUrl: string): void {
    this.add({
      type: 'success',
      title: 'MCP Workflow Deployed',
      message: `Enhanced workflow deployed successfully`,
      actionUrl: webhookUrl,
      metadata: { workflowId, webhookUrl, event: 'mcp_deployed' }
    })
  }

  mcpEnhancementActive(features: string[]): void {
    this.add({
      type: 'info',
      title: 'MCP Enhancements Active',
      message: `Enhanced features: ${features.join(', ')}`,
      metadata: { features, event: 'mcp_active' }
    })
  }

  // Private methods
  private loadNotifications(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.storageKey)
        if (stored) {
          this.notifications = JSON.parse(stored)
        }
      }
    } catch (error) {
      console.warn('Failed to load notifications:', error)
    }
  }

  private saveNotifications(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Keep only last 100 notifications
        const toStore = this.notifications.slice(0, 100)
        localStorage.setItem(this.storageKey, JSON.stringify(toStore))
      }
    } catch (error) {
      console.warn('Failed to save notifications:', error)
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback(this.notifications)
      } catch (error) {
        console.warn('Notification subscriber error:', error)
      }
    })
  }

  private setupEventListeners(): void {
    // Listen for workflow events and create notifications
    // This replaces Slack webhook integrations
    
    // Note: In a real implementation, you would set up actual event listeners
    // For now, we'll rely on explicit calls from the workflow systems
  }
}

export const notificationService = new NotificationService()

// Initialize with a welcome notification
notificationService.info(
  'Notification System Active',
  'In-app notifications are now handling all system alerts (replacing Slack)',
  { event: 'system_initialized' }
)