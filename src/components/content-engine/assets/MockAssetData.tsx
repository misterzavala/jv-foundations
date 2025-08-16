// Mock Asset Data - Temporary data source while database issues are resolved

export interface MockAsset {
  id: string;
  title: string;
  description?: string;
  content_type: 'reel' | 'carousel' | 'single_image' | 'story';
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'failed' | 'archived';
  metadata: {
    source: string;
    owner: string;
    serial_number: string;
    original_data: {
      hook?: string;
      gen_caption?: string;
      ig_caption?: string;
      tt_caption?: string;
      cta?: string;
      dlurl?: string;
      views?: string;
      likes?: string;
      comments?: string;
      shares?: string;
    };
    captions: {
      generated?: string;
      instagram?: string;
      tiktok?: string;
      cta?: string;
    };
    engagement_metrics: {
      views: number;
      likes: number;
      comments: number;
      shares: number;
    };
    platforms: string[];
  };
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  scheduled_at?: string;
}

export const mockAssets: MockAsset[] = [
  {
    id: '1',
    title: 'The secret to wholesaling success: You don\'t buy houses. You flip contracts for checks! 💰',
    description: 'Real estate wholesaling educational content',
    content_type: 'reel',
    status: 'in_review',
    metadata: {
      source: 'csv_import',
      owner: 'rose',
      serial_number: 'RS001',
      original_data: {
        hook: 'The secret to wholesaling success: You don\'t buy houses. You flip contracts for checks! 💰',
        gen_caption: 'Educational content about real estate wholesaling contracts',
        ig_caption: '🏠 Real Estate Wholesaling Truth: You\'re not buying houses - you\'re flipping contracts! Here\'s how I made $15K last month without using any of my own money. Comment "CONTRACTS" to learn more! #wholesaling #realestate #passiveincome',
        tt_caption: 'POV: You tell people you flip houses but you actually just flip contracts 📄💰 #wholesaling #realestate #entrepreneur',
        cta: 'DM for wholesale training',
        dlurl: 'https://example.com/video1.mp4',
        views: '15420',
        likes: '890',
        comments: '67',
        shares: '23'
      },
      captions: {
        generated: 'Educational content about real estate wholesaling contracts',
        instagram: '🏠 Real Estate Wholesaling Truth: You\'re not buying houses - you\'re flipping contracts! Here\'s how I made $15K last month without using any of my own money. Comment "CONTRACTS" to learn more! #wholesaling #realestate #passiveincome',
        tiktok: 'POV: You tell people you flip houses but you actually just flip contracts 📄💰 #wholesaling #realestate #entrepreneur',
        cta: 'DM for wholesale training'
      },
      engagement_metrics: {
        views: 15420,
        likes: 890,
        comments: 67,
        shares: 23
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-08-15T10:30:00Z',
    updated_at: '2025-08-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'I bought 6 houses this year without using a single dollar of my own money',
    description: 'Success story about no-money-down real estate investing',
    content_type: 'single_image',
    status: 'published',
    metadata: {
      source: 'csv_import',
      owner: 'matt',
      serial_number: 'MT002',
      original_data: {
        hook: 'I bought 6 houses this year without using a single dollar of my own money',
        gen_caption: 'Success story about no-money-down investing',
        ig_caption: '6 houses, $0 down! Here\'s the exact strategy I used 👆 Save this post and follow @mattrealestate for daily wholesaling tips! #realestate #wholesaling #nomoneydown',
        tt_caption: 'Bought 6 houses with $0 down 🏠💰 Here\'s how... #realestate #wholesaling',
        cta: 'Follow for daily tips',
        dlurl: 'https://example.com/image2.jpg',
        views: '32100',
        likes: '1540',
        comments: '203',
        shares: '89'
      },
      captions: {
        generated: 'Success story about no-money-down investing',
        instagram: '6 houses, $0 down! Here\'s the exact strategy I used 👆 Save this post and follow @mattrealestate for daily wholesaling tips! #realestate #wholesaling #nomoneydown',
        tiktok: 'Bought 6 houses with $0 down 🏠💰 Here\'s how... #realestate #wholesaling',
        cta: 'Follow for daily tips'
      },
      engagement_metrics: {
        views: 32100,
        likes: 1540,
        comments: 203,
        shares: 89
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-08-14T15:20:00Z',
    updated_at: '2025-08-15T09:45:00Z',
    published_at: '2025-08-15T09:45:00Z'
  },
  {
    id: '3',
    title: 'Most people think real estate investing requires tons of cash. I prove them wrong daily.',
    description: 'Educational content debunking real estate investing myths',
    content_type: 'carousel',
    status: 'scheduled',
    metadata: {
      source: 'csv_import',
      owner: 'zavala',
      serial_number: 'ZV003',
      original_data: {
        hook: 'Most people think real estate investing requires tons of cash. I prove them wrong daily.',
        gen_caption: 'Debunking real estate investing myths',
        ig_caption: 'Breaking: You don\'t need money to make money in real estate! 🤯 This wholesale deal netted me $22K with zero cash invested. Swipe to see the numbers! #wholesaling #realestate #investing',
        tt_caption: 'When people say you need money for real estate investing 👀💰 #wholesaling #realestate',
        cta: 'Link in bio for course',
        dlurl: 'https://example.com/carousel3.jpg',
        views: '8750',
        likes: '445',
        comments: '34',
        shares: '12'
      },
      captions: {
        generated: 'Debunking real estate investing myths',
        instagram: 'Breaking: You don\'t need money to make money in real estate! 🤯 This wholesale deal netted me $22K with zero cash invested. Swipe to see the numbers! #wholesaling #realestate #investing',
        tiktok: 'When people say you need money for real estate investing 👀💰 #wholesaling #realestate',
        cta: 'Link in bio for course'
      },
      engagement_metrics: {
        views: 8750,
        likes: 445,
        comments: 34,
        shares: 12
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-08-13T12:15:00Z',
    updated_at: '2025-08-15T08:30:00Z',
    scheduled_at: '2025-08-16T14:00:00Z'
  },
  {
    id: '4',
    title: 'Stop chasing motivated sellers. Start creating them instead! 🎯',
    description: 'Marketing strategy for wholesalers',
    content_type: 'story',
    status: 'draft',
    metadata: {
      source: 'csv_import', 
      owner: 'rose',
      serial_number: 'RS004',
      original_data: {
        hook: 'Stop chasing motivated sellers. Start creating them instead! 🎯',
        gen_caption: 'Marketing strategy for real estate wholesalers',
        ig_caption: 'Everyone is chasing motivated sellers... but I CREATE them! Here\'s my $50/day Facebook ad strategy that generates 20+ leads daily. Story time 👆 #realestate #marketing #wholesaling',
        tt_caption: 'When everyone is chasing motivated sellers but you create them 😎💰 #realestate #marketing',
        cta: 'DM "ADS" for strategy',
        dlurl: 'https://example.com/story4.jpg',
        views: '5430',
        likes: '287',
        comments: '19',
        shares: '8'
      },
      captions: {
        generated: 'Marketing strategy for real estate wholesalers',
        instagram: 'Everyone is chasing motivated sellers... but I CREATE them! Here\'s my $50/day Facebook ad strategy that generates 20+ leads daily. Story time 👆 #realestate #marketing #wholesaling',
        tiktok: 'When everyone is chasing motivated sellers but you create them 😎💰 #realestate #marketing',
        cta: 'DM "ADS" for strategy'
      },
      engagement_metrics: {
        views: 5430,
        likes: 287,
        comments: 19,
        shares: 8
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-08-15T16:45:00Z',
    updated_at: '2025-08-15T16:45:00Z'
  },
  {
    id: '5',
    title: 'My first wholesale deal was a disaster. My 100th made me $45K. Here\'s what changed.',
    description: 'Experience-based learning content',
    content_type: 'reel',
    status: 'failed',
    metadata: {
      source: 'csv_import',
      owner: 'matt',
      serial_number: 'MT005',
      original_data: {
        hook: 'My first wholesale deal was a disaster. My 100th made me $45K. Here\'s what changed.',
        gen_caption: 'Learning from wholesale failures and successes',
        ig_caption: 'First deal: Lost $2K and my confidence 😅 100th deal: Made $45K and gained clarity! Here are the 3 things that changed everything for me. Save this post! #wholesaling #realestate #entrepreneurship',
        tt_caption: 'First wholesale deal vs 100th wholesale deal 📈💰 #realestate #entrepreneur',
        cta: 'Comment for full story',
        dlurl: 'https://example.com/video5.mp4',
        views: '890',
        likes: '45',
        comments: '3',
        shares: '1'
      },
      captions: {
        generated: 'Learning from wholesale failures and successes',
        instagram: 'First deal: Lost $2K and my confidence 😅 100th deal: Made $45K and gained clarity! Here are the 3 things that changed everything for me. Save this post! #wholesaling #realestate #entrepreneurship',
        tiktok: 'First wholesale deal vs 100th wholesale deal 📈💰 #realestate #entrepreneur',
        cta: 'Comment for full story'
      },
      engagement_metrics: {
        views: 890,
        likes: 45,
        comments: 3,
        shares: 1
      },
      platforms: ['instagram', 'tiktok']
    },
    created_at: '2025-08-12T11:20:00Z',
    updated_at: '2025-08-15T14:10:00Z'
  }
];

// Mock asset destinations for published content
export const mockAssetDestinations = [
  {
    id: 'd1',
    asset_id: '2',
    status: 'published',
    scheduled_at: null,
    published_at: '2025-08-15T09:45:00Z',
    accounts: {
      id: 'acc1',
      platform: 'instagram',
      account_name: '@mattrealestate',
      is_active: true
    }
  },
  {
    id: 'd2', 
    asset_id: '2',
    status: 'published',
    scheduled_at: null,
    published_at: '2025-08-15T09:47:00Z',
    accounts: {
      id: 'acc2',
      platform: 'tiktok',
      account_name: '@matt_wholesale',
      is_active: true
    }
  }
];