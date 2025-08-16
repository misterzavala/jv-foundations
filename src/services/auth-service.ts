/**
 * Comprehensive Authentication and Authorization Service
 * Provides role-based access control across the entire platform
 */

import { supabase } from '@/integrations/supabase/client';
import { eventSourceService } from './event-sourcing';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'staff' | 'user' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

class AuthService {
  private currentUser: User | null = null;
  private currentProfile: UserProfile | null = null;
  private authStateListeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state and listen for changes
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return;
      }

      if (session?.user) {
        await this.setCurrentUser(session.user);
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        await eventSourceService.logEvent(
          'auth',
          session?.user?.id || 'anonymous',
          'auth.state_changed',
          { event, user_id: session?.user?.id },
          'info'
        );

        if (session?.user) {
          await this.setCurrentUser(session.user);
        } else {
          this.currentUser = null;
          this.currentProfile = null;
          this.notifyListeners();
        }
      });

    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  /**
   * Set current user and fetch their profile
   */
  private async setCurrentUser(user: User): Promise<void> {
    this.currentUser = user;
    
    try {
      const profile = await this.getUserProfile(user.id);
      this.currentProfile = profile;
      this.notifyListeners();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      this.currentProfile = null;
      this.notifyListeners();
    }
  }

  /**
   * Get user profile with role and permissions
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        await eventSourceService.logEvent(
          'auth',
          email,
          'auth.signin_failed',
          { error: error.message },
          'warning'
        );
        return { success: false, error: error.message };
      }

      await eventSourceService.logEvent(
        'auth',
        data.user.id,
        'auth.signin_success',
        { email },
        'info'
      );

      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, fullName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        await eventSourceService.logEvent(
          'auth',
          email,
          'auth.signup_failed',
          { error: error.message },
          'warning'
        );
        return { success: false, error: error.message };
      }

      await eventSourceService.logEvent(
        'auth',
        data.user?.id || 'unknown',
        'auth.signup_success',
        { email },
        'info'
      );

      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      const userId = this.currentUser?.id;
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return;
      }

      if (userId) {
        await eventSourceService.logEvent(
          'auth',
          userId,
          'auth.signout',
          {},
          'info'
        );
      }

    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    return {
      user: this.currentUser,
      profile: this.currentProfile,
      session: null, // Session is managed internally
      isLoading: false,
      isAuthenticated: !!this.currentUser,
    };
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    if (!this.currentProfile) return false;
    return this.currentProfile.permissions.includes(permission);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    if (!this.currentProfile) return false;
    return this.currentProfile.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    if (!this.currentProfile) return false;
    return roles.includes(this.currentProfile.role);
  }

  /**
   * Check if user is staff (staff or admin)
   */
  isStaff(): boolean {
    return this.hasAnyRole(['staff', 'admin']);
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user can access content engine
   */
  canAccessContentEngine(): boolean {
    return this.hasAnyRole(['admin', 'staff', 'user']) || 
           this.hasPermission('content_engine.access');
  }

  /**
   * Check if user can access deal tracker
   */
  canAccessDealTracker(): boolean {
    return this.hasAnyRole(['admin', 'staff', 'user']) || 
           this.hasPermission('deal_tracker.access');
  }

  /**
   * Check if user can manage workflows
   */
  canManageWorkflows(): boolean {
    return this.hasAnyRole(['admin', 'staff']) || 
           this.hasPermission('workflows.manage');
  }

  /**
   * Check if user can manage assets
   */
  canManageAssets(): boolean {
    return this.hasAnyRole(['admin', 'staff', 'user']) || 
           this.hasPermission('assets.manage');
  }

  /**
   * Check if user can view system events
   */
  canViewSystemEvents(): boolean {
    return this.hasAnyRole(['admin', 'staff']) || 
           this.hasPermission('system.events.view');
  }

  /**
   * Check if user can manage users
   */
  canManageUsers(): boolean {
    return this.hasRole('admin') || 
           this.hasPermission('users.manage');
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(listener: (state: AuthState) => void): () => void {
    this.authStateListeners.push(listener);
    
    // Immediately call with current state
    listener(this.getAuthState());
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(listener);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of auth state changes
   */
  private notifyListeners(): void {
    const state = this.getAuthState();
    this.authStateListeners.forEach(listener => listener(state));
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', this.currentUser.id);

      if (error) {
        await eventSourceService.logEvent(
          'auth',
          this.currentUser.id,
          'auth.profile_update_failed',
          { error: error.message },
          'warning'
        );
        return { success: false, error: error.message };
      }

      // Refresh profile
      await this.setCurrentUser(this.currentUser);

      await eventSourceService.logEvent(
        'auth',
        this.currentUser.id,
        'auth.profile_updated',
        { updates },
        'info'
      );

      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        await eventSourceService.logEvent(
          'auth',
          email,
          'auth.password_reset_failed',
          { error: error.message },
          'warning'
        );
        return { success: false, error: error.message };
      }

      await eventSourceService.logEvent(
        'auth',
        email,
        'auth.password_reset_requested',
        {},
        'info'
      );

      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Helper functions for common permission checks
export const requireAuth = () => {
  const state = authService.getAuthState();
  if (!state.isAuthenticated) {
    throw new Error('Authentication required');
  }
  return state;
};

export const requireStaff = () => {
  const state = requireAuth();
  if (!authService.isStaff()) {
    throw new Error('Staff privileges required');
  }
  return state;
};

export const requireAdmin = () => {
  const state = requireAuth();
  if (!authService.isAdmin()) {
    throw new Error('Admin privileges required');
  }
  return state;
};

export const requirePermission = (permission: string) => {
  const state = requireAuth();
  if (!authService.hasPermission(permission)) {
    throw new Error(`Permission required: ${permission}`);
  }
  return state;
};