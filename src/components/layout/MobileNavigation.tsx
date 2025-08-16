/**
 * Mobile Navigation Component
 * Provides mobile-optimized navigation with touch-friendly interactions
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Menu,
  Home,
  Image,
  BarChart3,
  Settings,
  User,
  Bell,
  Search,
  Plus,
  X,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, usePermissions } from '@/hooks/useAuth';
import { useRealTimeStatus, useRealTimeNotifications } from '@/hooks/useRealTime';

interface MobileNavigationProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

export function MobileNavigation({ currentPath = '/', onNavigate }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { profile, isAuthenticated, signOut } = useAuth();
  const permissions = usePermissions();
  const realtimeStatus = useRealTimeStatus();
  const { notifications, dismissNotification } = useRealTimeNotifications();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [currentPath]);

  const navigationItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      show: isAuthenticated,
    },
    {
      label: 'Content Engine',
      path: '/content-engine',
      icon: Image,
      show: permissions.canAccessContentEngine(),
    },
    {
      label: 'Deal Tracker',
      path: '/deal-tracker',
      icon: BarChart3,
      show: permissions.canAccessDealTracker(),
    },
    {
      label: 'System Console',
      path: '/console',
      icon: Settings,
      show: permissions.canViewSystemEvents(),
    },
    {
      label: 'Profile',
      path: '/profile',
      icon: User,
      show: isAuthenticated,
    },
  ].filter(item => item.show);

  const handleNavigation = (path: string) => {
    onNavigate?.(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    onNavigate?.('/');
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="text-left">
                    Zavala AI Platform
                  </SheetTitle>
                  {profile && (
                    <div className="flex items-center gap-3 mt-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {profile.full_name?.[0] || profile.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{profile.full_name || 'User'}</div>
                        <div className="text-xs text-muted-foreground">{profile.email}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {profile.role}
                        </Badge>
                      </div>
                    </div>
                  )}
                </SheetHeader>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto">
                  <nav className="p-4 space-y-2">
                    {navigationItems.map((item) => (
                      <Button
                        key={item.path}
                        variant={currentPath === item.path ? "default" : "ghost"}
                        className="w-full justify-start h-12"
                        onClick={() => handleNavigation(item.path)}
                      >
                        <item.icon className="h-5 w-5 mr-3" />
                        {item.label}
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      </Button>
                    ))}
                  </nav>

                  {/* Connection Status */}
                  <div className="p-4 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      {realtimeStatus.isConnected ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-muted-foreground">
                        {realtimeStatus.isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                    {realtimeStatus.isConnected && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {realtimeStatus.activeChannels} channels, {realtimeStatus.totalSubscriptions} subscriptions
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                {isAuthenticated && (
                  <div className="p-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Title */}
          <div className="text-lg font-semibold truncate">
            Zavala AI
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {notifications.length}
                  </Badge>
                )}
              </Button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b flex items-center justify-between">
                    <span className="font-medium">Notifications</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotifications(false)}
                      className="p-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="p-2 space-y-2">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id}
                            className="p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{notification.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {notification.message}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {notification.timestamp.toLocaleTimeString()}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => dismissNotification(notification.id)}
                                className="p-1 ml-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground">
                        No notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <Button variant="ghost" size="sm" className="p-2">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
        <div className="grid grid-cols-4 h-16">
          {navigationItems.slice(0, 4).map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "h-full rounded-none flex-col gap-1 text-xs",
                currentPath === item.path && "bg-muted"
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Spacers for fixed navigation */}
      <div className="lg:hidden h-16" /> {/* Top spacer */}
      <div className="lg:hidden h-16" /> {/* Bottom spacer */}
    </>
  );
}

// Quick Actions FAB
export function MobileFAB({ onAction }: { onAction?: (action: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'create-asset', label: 'Create Asset', icon: Plus },
    { id: 'create-deal', label: 'Create Deal', icon: Plus },
  ];

  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-50">
      {isOpen && (
        <div className="mb-4 space-y-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              className="w-full shadow-lg"
              onClick={() => {
                onAction?.(action.id);
                setIsOpen(false);
              }}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      )}
      
      <Button
        size="sm"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}