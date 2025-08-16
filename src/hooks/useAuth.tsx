/**
 * Authentication Hook
 * Provides authentication state and methods throughout the app
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authService, type AuthState, type UserRole } from '@/services/auth-service';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isStaff: () => boolean;
  isAdmin: () => boolean;
  canAccessContentEngine: () => boolean;
  canAccessDealTracker: () => boolean;
  canManageWorkflows: () => boolean;
  canManageAssets: () => boolean;
  canViewSystemEvents: () => boolean;
  canManageUsers: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    signIn: authService.signIn.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    hasPermission: authService.hasPermission.bind(authService),
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService),
    isStaff: authService.isStaff.bind(authService),
    isAdmin: authService.isAdmin.bind(authService),
    canAccessContentEngine: authService.canAccessContentEngine.bind(authService),
    canAccessDealTracker: authService.canAccessDealTracker.bind(authService),
    canManageWorkflows: authService.canManageWorkflows.bind(authService),
    canManageAssets: authService.canManageAssets.bind(authService),
    canViewSystemEvents: authService.canViewSystemEvents.bind(authService),
    canManageUsers: authService.canManageUsers.bind(authService),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireStaff?: boolean;
  requireAdmin?: boolean;
  requirePermission?: string;
  requireAnyRole?: UserRole[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireStaff = false,
  requireAdmin = false,
  requirePermission,
  requireAnyRole,
  fallback = <div>Access denied</div>,
}: ProtectedRouteProps) {
  const auth = useAuth();

  // Still loading
  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  // Check authentication
  if (requireAuth && !auth.isAuthenticated) {
    return fallback;
  }

  // Check staff requirement
  if (requireStaff && !auth.isStaff()) {
    return fallback;
  }

  // Check admin requirement
  if (requireAdmin && !auth.isAdmin()) {
    return fallback;
  }

  // Check specific permission
  if (requirePermission && !auth.hasPermission(requirePermission)) {
    return fallback;
  }

  // Check role requirement
  if (requireAnyRole && !auth.hasAnyRole(requireAnyRole)) {
    return fallback;
  }

  return <>{children}</>;
}

// Hook for conditional rendering based on permissions
export function usePermissions() {
  const auth = useAuth();

  return {
    hasPermission: auth.hasPermission,
    hasRole: auth.hasRole,
    hasAnyRole: auth.hasAnyRole,
    isStaff: auth.isStaff,
    isAdmin: auth.isAdmin,
    canAccessContentEngine: auth.canAccessContentEngine,
    canAccessDealTracker: auth.canAccessDealTracker,
    canManageWorkflows: auth.canManageWorkflows,
    canManageAssets: auth.canManageAssets,
    canViewSystemEvents: auth.canViewSystemEvents,
    canManageUsers: auth.canManageUsers,
  };
}