-- Content Management System Integration
-- Migrating schema-stream's advanced content management to existing wm-foundations Supabase
-- Created: 2025-08-14

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for app roles (staff vs partners)
CREATE TYPE app_role AS ENUM ('admin', 'staff', 'partner', 'user');

-- ============================================================================
-- ASSETS MANAGEMENT TABLES
-- ============================================================================

-- Main assets table for content management
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'carousel', 'single_image', 'story')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'scheduled', 'published', 'failed', 'archived')),
    thumbnail_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Reel-specific metadata
CREATE TABLE IF NOT EXISTS public.reel_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE UNIQUE,
    video_url TEXT NOT NULL,
    duration_seconds INTEGER,
    aspect_ratio TEXT DEFAULT '9:16',
    file_size_mb DECIMAL(10,2),
    video_codec TEXT,
    audio_codec TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carousel-specific metadata  
CREATE TABLE IF NOT EXISTS public.carousel_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE UNIQUE,
    image_urls TEXT[] NOT NULL,
    image_count INTEGER GENERATED ALWAYS AS (array_length(image_urls, 1)) STORED,
    aspect_ratio TEXT DEFAULT '1:1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SOCIAL MEDIA ACCOUNTS & DESTINATIONS
-- ============================================================================

-- Social media accounts management
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'x', 'linkedin', 'facebook', 'youtube')),
    account_name TEXT NOT NULL,
    account_handle TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    account_metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, account_handle)
);

-- Destination groups for bulk publishing
CREATE TABLE IF NOT EXISTS public.destination_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    account_ids UUID[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track publishing status for each asset-destination combination
CREATE TABLE IF NOT EXISTS public.asset_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'publishing', 'published', 'failed', 'cancelled')),
    external_post_id TEXT, -- Platform's post ID after publishing
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, account_id)
);

-- ============================================================================
-- WORKFLOW & QUEUE MANAGEMENT
-- ============================================================================

-- Publishing queue for automated workflows
CREATE TABLE IF NOT EXISTS public.publish_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_destination_id UUID REFERENCES public.asset_destinations(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event logging for audit trail
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    resource_type TEXT NOT NULL, -- 'asset', 'account', 'publish_queue', etc.
    resource_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error tracking
CREATE TABLE IF NOT EXISTS public.errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    resource_type TEXT,
    resource_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    additional_data JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- USER ROLES & PERMISSIONS
-- ============================================================================

-- User profiles with roles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role app_role NOT NULL DEFAULT 'user',
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reel_meta_updated_at BEFORE UPDATE ON public.reel_meta
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carousel_meta_updated_at BEFORE UPDATE ON public.carousel_meta
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_destination_groups_updated_at BEFORE UPDATE ON public.destination_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_destinations_updated_at BEFORE UPDATE ON public.asset_destinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publish_queue_updated_at BEFORE UPDATE ON public.publish_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(required_role app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = required_role AND is_active = true
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to check if user is staff (admin or staff role)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff') AND is_active = true
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Assets policies (staff only for content management)
CREATE POLICY "Staff can view all assets" ON public.assets FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage assets" ON public.assets FOR ALL USING (is_staff());

-- Reel meta policies
CREATE POLICY "Staff can view reel meta" ON public.reel_meta FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage reel meta" ON public.reel_meta FOR ALL USING (is_staff());

-- Carousel meta policies  
CREATE POLICY "Staff can view carousel meta" ON public.carousel_meta FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage carousel meta" ON public.carousel_meta FOR ALL USING (is_staff());

-- Accounts policies
CREATE POLICY "Staff can view accounts" ON public.accounts FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage accounts" ON public.accounts FOR ALL USING (is_staff());

-- Destination groups policies
CREATE POLICY "Staff can view destination groups" ON public.destination_groups FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage destination groups" ON public.destination_groups FOR ALL USING (is_staff());

-- Asset destinations policies
CREATE POLICY "Staff can view asset destinations" ON public.asset_destinations FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage asset destinations" ON public.asset_destinations FOR ALL USING (is_staff());

-- Publish queue policies
CREATE POLICY "Staff can view publish queue" ON public.publish_queue FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage publish queue" ON public.publish_queue FOR ALL USING (is_staff());

-- Events policies (read-only for staff)
CREATE POLICY "Staff can view events" ON public.events FOR SELECT USING (is_staff());
CREATE POLICY "System can insert events" ON public.events FOR INSERT WITH CHECK (true);

-- Errors policies
CREATE POLICY "Staff can view errors" ON public.errors FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage errors" ON public.errors FOR ALL USING (is_staff());

-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles FOR ALL USING (has_role('admin'));

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Assets indexes
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_content_type ON public.assets(content_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_by ON public.assets(created_by);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_scheduled_at ON public.assets(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Asset destinations indexes
CREATE INDEX IF NOT EXISTS idx_asset_destinations_status ON public.asset_destinations(status);
CREATE INDEX IF NOT EXISTS idx_asset_destinations_scheduled_at ON public.asset_destinations(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Publish queue indexes
CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON public.publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_publish_queue_scheduled_at ON public.publish_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_publish_queue_priority ON public.publish_queue(priority DESC);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_resource ON public.events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- Errors indexes
CREATE INDEX IF NOT EXISTS idx_errors_resolved ON public.errors(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_errors_created_at ON public.errors(created_at DESC);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON public.user_profiles(is_active) WHERE is_active = true;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Note: Keep existing card_preferences data intact
-- The content management system will be accessible only to staff users

COMMENT ON TABLE public.assets IS 'Main content assets for social media publishing';
COMMENT ON TABLE public.accounts IS 'Social media platform accounts for publishing';
COMMENT ON TABLE public.asset_destinations IS 'Tracks publishing status for each asset-account combination';
COMMENT ON TABLE public.publish_queue IS 'Queue system for automated publishing workflows';
COMMENT ON TABLE public.events IS 'Audit trail for all system events';
COMMENT ON TABLE public.user_profiles IS 'User profiles with role-based access control';