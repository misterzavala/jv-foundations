// Database Adapter - Bridge between current schema and expected interface
import { supabase } from '@/integrations/supabase/client'

// Extended asset interface that includes all needed fields
export interface ExtendedAsset {
  id: string
  title: string
  content_type: 'reel' | 'carousel' | 'single_image' | 'story'
  description?: string
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'failed' | 'archived'
  metadata: {
    source: string
    owner: string
    serial_number: string
    captions?: {
      instagram?: string
      tiktok?: string
      cta?: string
    }
    platforms?: string[]
    [key: string]: any
  }
  thumbnail_url?: string
  published_at?: string
  scheduled_at?: string
  created_at: string
  updated_at: string
  created_by?: string
}

// Asset storage using JSON in an existing column or localStorage fallback
class DatabaseAdapter {
  private storageKey = 'wm_assets_cache'
  
  // Get all assets - use cache primarily since DB schema is incomplete
  async getAssets(): Promise<ExtendedAsset[]> {
    // Start with cached assets
    const cachedAssets = this.getCachedAssets()
    
    try {
      // Try to fetch from database to sync status
      const { data, error } = await supabase
        .from('assets')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.warn('Database fetch failed, using cache only:', error.message)
        return cachedAssets
      }
      
      // If database has data, sync status with cached assets
      if (data && data.length > 0) {
        const syncedAssets = cachedAssets.map(cached => {
          const dbAsset = data.find(db => db.id === cached.id)
          return dbAsset ? { ...cached, status: dbAsset.status } : cached
        })
        return syncedAssets
      }
      
      // Return cached assets if no DB data
      return cachedAssets
      
    } catch (error) {
      console.warn('Database error, using cache only:', error)
      return cachedAssets
    }
  }
  
  // Create new asset
  async createAsset(asset: Omit<ExtendedAsset, 'id' | 'created_at' | 'updated_at'>): Promise<ExtendedAsset> {
    const newAsset: ExtendedAsset = {
      ...asset,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    try {
      // Try to insert minimal data into database
      const { data, error } = await supabase
        .from('assets')
        .insert({
          id: newAsset.id,
          status: newAsset.status,
          created_at: newAsset.created_at
        })
        .select()
      
      if (error) {
        console.warn('Database insert failed, using cache only:', error)
      }
      
      // Always cache the full data
      this.cacheAsset(newAsset)
      return newAsset
      
    } catch (error) {
      console.warn('Database error, using cache only:', error)
      this.cacheAsset(newAsset)
      return newAsset
    }
  }
  
  // Update existing asset
  async updateAsset(id: string, updates: Partial<ExtendedAsset>): Promise<ExtendedAsset | null> {
    const assets = this.getCachedAssets()
    const existingIndex = assets.findIndex(a => a.id === id)
    
    if (existingIndex === -1) {
      return null
    }
    
    const updatedAsset = {
      ...assets[existingIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    try {
      // Try to update database with limited fields
      const { error } = await supabase
        .from('assets')
        .update({
          status: updatedAsset.status
        })
        .eq('id', id)
      
      if (error) {
        console.warn('Database update failed, using cache only:', error)
      }
      
    } catch (error) {
      console.warn('Database error during update:', error)
    }
    
    // Always update cache
    assets[existingIndex] = updatedAsset
    this.setCachedAssets(assets)
    
    return updatedAsset
  }
  
  // Delete asset
  async deleteAsset(id: string): Promise<boolean> {
    try {
      // Try to delete from database
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.warn('Database delete failed:', error)
      }
      
    } catch (error) {
      console.warn('Database error during delete:', error)
    }
    
    // Always remove from cache
    const assets = this.getCachedAssets()
    const filteredAssets = assets.filter(a => a.id !== id)
    this.setCachedAssets(filteredAssets)
    
    return true
  }
  
  // Cache management (works in both browser and Node.js environments)
  private getCachedAssets(): ExtendedAsset[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem(this.storageKey)
        return cached ? JSON.parse(cached) : []
      }
      // Node.js fallback - use memory cache
      return this.memoryCache || []
    } catch {
      return []
    }
  }
  
  private setCachedAssets(assets: ExtendedAsset[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(assets))
      } else {
        // Node.js fallback - use memory cache
        this.memoryCache = assets
      }
    } catch (error) {
      console.warn('Failed to cache assets:', error)
    }
  }
  
  // Memory cache for Node.js environment
  private memoryCache: ExtendedAsset[] = []
  
  private cacheAsset(asset: ExtendedAsset): void {
    const assets = this.getCachedAssets()
    const existingIndex = assets.findIndex(a => a.id === asset.id)
    
    if (existingIndex >= 0) {
      assets[existingIndex] = asset
    } else {
      assets.unshift(asset)
    }
    
    this.setCachedAssets(assets)
  }
  
  // Initialize with demo data if empty
  async initializeWithDemoData(): Promise<void> {
    const assets = this.getCachedAssets()
    
    if (assets.length === 0) {
      console.log('Initializing with demo data...')
      
      // Use the pre-defined demo assets
      this.setCachedAssets(defaultDemoAssets)
      
      console.log('Demo data initialized successfully')
    }
  }
}

// Create default demo data
const defaultDemoAssets: ExtendedAsset[] = [
  {
    id: 'demo-001',
    title: 'Real Estate Investment Guide',
    content_type: 'single_image',
    description: 'Complete guide to real estate investing for beginners',
    status: 'published',
    metadata: {
      source: 'content_creation',
      owner: 'ben_allgeyer',
      serial_number: 'WM001',
      captions: {
        instagram: 'Master real estate investing with our proven strategies! 💰🏠 #RealEstate #Investment #WealthBuilding',
        tiktok: 'Real estate investing secrets revealed! 🤫💰 #RealEstate #MoneyTips #Investing',
        cta: 'Join our investment masterclass'
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    published_at: '2025-01-15T12:00:00Z'
  },
  {
    id: 'demo-002',
    title: 'Wholesale Deal Breakdown',
    content_type: 'reel',
    description: 'Step-by-step analysis of a profitable wholesale transaction',
    status: 'scheduled',
    metadata: {
      source: 'video_production',
      owner: 'ben_allgeyer',
      serial_number: 'WM002',
      captions: {
        instagram: 'Watch me analyze a $20K wholesale deal! 📊💡 #Wholesaling #RealEstate #DealAnalysis',
        tiktok: 'How I made $20K wholesaling in one month! 💰📈 #Wholesaling #RealEstate #Success'
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-01-16T09:00:00Z',
    updated_at: '2025-01-16T09:00:00Z',
    scheduled_at: '2025-01-17T14:00:00Z'
  },
  {
    id: 'demo-003',
    title: 'Market Analysis Q1 2025',
    content_type: 'carousel',
    description: 'Quarterly market insights and predictions',
    status: 'draft',
    metadata: {
      source: 'market_research',
      owner: 'ben_allgeyer',
      serial_number: 'WM003',
      captions: {
        instagram: 'Q1 2025 Real Estate Market Analysis 📈📊 Swipe for insights! #MarketAnalysis #RealEstate #Trends',
        tiktok: 'Real estate market predictions for 2025! 🔮📊 #RealEstate #MarketTrends #Predictions'
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-01-16T15:30:00Z',
    updated_at: '2025-01-16T16:45:00Z'
  }
]

export const databaseAdapter = new DatabaseAdapter()

// Initialize with demo data immediately for both environments
if (typeof window !== 'undefined') {
  // Browser environment - check localStorage
  const cached = localStorage.getItem('wm_assets_cache')
  if (!cached) {
    localStorage.setItem('wm_assets_cache', JSON.stringify(defaultDemoAssets))
  }
} else {
  // Node.js environment - use memory cache
  databaseAdapter['memoryCache'] = defaultDemoAssets
}