/**
 * Authenticated Navigation Component
 * Provides role-based navigation and user controls
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth, usePermissions } from '@/hooks/useAuth';
import { UserProfile } from './UserProfile';

interface AuthenticatedNavProps {
  onNavigate?: (path: string) => void;
}

export function AuthenticatedNav({ onNavigate }: AuthenticatedNavProps) {
  const { profile, signOut } = useAuth();
  const permissions = usePermissions();
  const [showProfile, setShowProfile] = useState(false);

  if (!profile) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.('/');
  };

  const handleNavigation = (path: string) => {
    onNavigate?.(path);
  };

  const getInitials = (name: string | undefined, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'staff':
        return 'default';
      case 'user':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Navigation Links */}
      <nav className="hidden md:flex items-center gap-4">
        {permissions.canAccessContentEngine() && (
          <Button
            variant="ghost"
            onClick={() => handleNavigation('/content-engine')}
          >
            Content Engine
          </Button>
        )}
        
        {permissions.canAccessDealTracker() && (
          <Button
            variant="ghost"
            onClick={() => handleNavigation('/deal-tracker')}
          >
            Deal Tracker
          </Button>
        )}
        
        {permissions.canViewSystemEvents() && (
          <Button
            variant="ghost"
            onClick={() => handleNavigation('/console')}
          >
            System Console
          </Button>
        )}
        
        {permissions.canManageUsers() && (
          <Button
            variant="ghost"
            onClick={() => handleNavigation('/admin/users')}
          >
            User Management
          </Button>
        )}
      </nav>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {getInitials(profile.full_name, profile.email)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium leading-none">
                {profile.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {profile.email}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                </Badge>
                {profile.is_active && (
                  <Badge variant="outline" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            View Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/settings')}>
            Settings
          </DropdownMenuItem>
          
          {permissions.canViewSystemEvents() && (
            <DropdownMenuItem onClick={() => handleNavigation('/console')}>
              System Console
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="text-red-600 focus:text-red-600"
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Modal/Sidebar */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">User Profile</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(false)}
                >
                  ✕
                </Button>
              </div>
              <UserProfile />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile navigation component
export function MobileAuthenticatedNav({ onNavigate }: AuthenticatedNavProps) {
  const permissions = usePermissions();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    onNavigate?.(path);
  };

  return (
    <div className="md:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        Menu
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b shadow-lg z-40">
          <nav className="flex flex-col p-4 space-y-2">
            {permissions.canAccessContentEngine() && (
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavigation('/content-engine')}
              >
                Content Engine
              </Button>
            )}
            
            {permissions.canAccessDealTracker() && (
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavigation('/deal-tracker')}
              >
                Deal Tracker
              </Button>
            )}
            
            {permissions.canViewSystemEvents() && (
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavigation('/console')}
              >
                System Console
              </Button>
            )}
            
            {permissions.canManageUsers() && (
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => handleNavigation('/admin/users')}
              >
                User Management
              </Button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}