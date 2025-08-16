// Notification Center - In-app notification display
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { notificationService, type Notification, type NotificationType } from '@/services/notification-service'

const typeIcons: Record<NotificationType, any> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  workflow: Workflow
}

const typeColors: Record<NotificationType, string> = {
  success: 'text-green-600 bg-green-50 border-green-200',
  error: 'text-red-600 bg-red-50 border-red-200',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  info: 'text-blue-600 bg-blue-50 border-blue-200',
  workflow: 'text-purple-600 bg-purple-50 border-purple-200'
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications)
    return unsubscribe
  }, [])

  const unreadCount = notificationService.getUnreadCount()

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id)
  }

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead()
  }

  const handleDelete = (id: string) => {
    notificationService.delete(id)
  }

  const handleClearAll = () => {
    notificationService.clear()
    setIsOpen(false)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative p-2"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        align="end" 
        className="w-96 p-0"
        sideOffset={8}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-xs mt-1">System alerts will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-1 p-2">
                  {notifications.map((notification) => {
                    const Icon = typeIcons[notification.type]
                    const colorClasses = typeColors[notification.type]
                    
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer',
                          colorClasses,
                          notification.read ? 'opacity-75' : 'opacity-100'
                        )}
                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {notification.title}
                              </h4>
                              <div className="flex items-center gap-1 ml-2">
                                {!notification.read && (
                                  <div className="h-2 w-2 bg-current rounded-full" />
                                )}
                                <span className="text-xs opacity-70">
                                  {formatTime(notification.timestamp)}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm opacity-90 leading-relaxed">
                              {notification.message}
                            </p>
                            
                            {notification.actionUrl && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto mt-2 text-current"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(notification.actionUrl, '_blank')
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkAsRead(notification.id)
                                }}
                                className="p-1 h-auto text-current opacity-70 hover:opacity-100"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(notification.id)
                              }}
                              className="p-1 h-auto text-current opacity-70 hover:opacity-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}