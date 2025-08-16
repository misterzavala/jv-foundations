#!/usr/bin/env tsx
// Direct Asset Creation - Create assets using the exact existing schema

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fassrytpmwgxwxrrnerk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createDemoAssets() {
  console.log('🎯 Creating demo assets directly...')
  
  // First, let's create some manual test assets to see what works
  const demoAssets = [
    {
      owner: 'rose',
      status: 'in_review',
      hook: 'The secret to wholesaling success: You don\'t buy houses. You flip contracts for checks! 💰',
      ig_caption: '🏠 Real Estate Wholesaling Truth: You\'re not buying houses - you\'re flipping contracts! Here\'s how I made $15K last month without using any of my own money. Comment "CONTRACTS" to learn more! #wholesaling #realestate #passiveincome',
      tt_caption: 'POV: You tell people you flip houses but you actually just flip contracts 📄💰 #wholesaling #realestate #entrepreneur',
      cta: 'DM for wholesale training',
      serial_number: 'RS001',
      views: 15420,
      likes: 890,
      comments: 67,
      shares: 23
    },
    {
      owner: 'matt',
      status: 'published',
      hook: 'I bought 6 houses this year without using a single dollar of my own money',
      ig_caption: '6 houses, $0 down! Here\'s the exact strategy I used 👆 Save this post and follow @mattrealestate for daily wholesaling tips! #realestate #wholesaling #nomoneydown',
      tt_caption: 'Bought 6 houses with $0 down 🏠💰 Here\'s how... #realestate #wholesaling',
      cta: 'Follow for daily tips',
      serial_number: 'MT002',
      views: 32100,
      likes: 1540,
      comments: 203,
      shares: 89
    },
    {
      owner: 'zavala',
      status: 'scheduled',
      hook: 'Most people think real estate investing requires tons of cash. I prove them wrong daily.',
      ig_caption: 'Breaking: You don\'t need money to make money in real estate! 🤯 This wholesale deal netted me $22K with zero cash invested. Swipe to see the numbers! #wholesaling #realestate #investing',
      tt_caption: 'When people say you need money for real estate investing 👀💰 #wholesaling #realestate',
      cta: 'Link in bio for course',
      serial_number: 'ZV003',
      views: 8750,
      likes: 445,
      comments: 34,
      shares: 12
    }
  ]
  
  console.log(`📋 Creating ${demoAssets.length} demo assets...`)
  
  for (const asset of demoAssets) {
    try {
      // Create the asset record using the simplest possible structure
      const assetRecord = {
        // Use whatever column names actually exist in the database
        content: asset.hook,
        author: asset.owner,
        state: asset.status,
        metadata: JSON.stringify({
          source: 'manual_demo',
          owner: asset.owner,
          serial_number: asset.serial_number,
          hook: asset.hook,
          captions: {
            instagram: asset.ig_caption,
            tiktok: asset.tt_caption,
            cta: asset.cta
          },
          engagement_metrics: {
            views: asset.views,
            likes: asset.likes,
            comments: asset.comments,
            shares: asset.shares
          },
          platforms: ['instagram', 'tiktok'],
          content_type: 'single_image'
        })
      }
      
      // Try multiple column name variations
      const variations = [
        // Variation 1: Standard names
        {
          title: asset.hook,
          description: `${asset.owner}'s content`,
          content_type: 'single_image',
          status: asset.status,
          metadata: assetRecord.metadata
        },
        // Variation 2: Alternative names
        {
          name: asset.hook,
          content: `${asset.owner}'s content`,
          type: 'single_image',
          state: asset.status,
          data: assetRecord.metadata
        },
        // Variation 3: Simple names
        {
          title: asset.hook,
          owner: asset.owner,
          status: asset.status
        }
      ]
      
      let inserted = false
      
      for (const [index, variation] of variations.entries()) {
        try {
          const { data, error } = await supabase
            .from('assets')
            .insert(variation)
            .select()
          
          if (error) {
            console.log(`❌ Variation ${index + 1} failed for ${asset.owner}: ${error.message}`)
          } else {
            console.log(`✅ Created asset for ${asset.owner} using variation ${index + 1}`)
            console.log(`   ID: ${data[0]?.id}`)
            inserted = true
            break
          }
        } catch (e) {
          console.log(`💥 Variation ${index + 1} threw error for ${asset.owner}:`, e)
        }
      }
      
      if (!inserted) {
        console.log(`❌ All variations failed for ${asset.owner}`)
      }
      
    } catch (error) {
      console.error(`💥 Failed to process ${asset.owner}:`, error)
    }
  }
  
  // Final check
  console.log('\n📊 Final verification...')
  try {
    const { data: allAssets, error } = await supabase
      .from('assets')
      .select('*')
    
    if (error) {
      console.error('❌ Could not verify assets:', error)
    } else {
      console.log(`✅ Total assets now: ${allAssets?.length || 0}`)
      
      if (allAssets && allAssets.length > 0) {
        console.log('\n📋 Sample asset structure:')
        const sample = allAssets[0]
        Object.keys(sample).forEach(key => {
          console.log(`   ${key}: ${typeof sample[key]} = ${sample[key]}`)
        })
      }
    }
  } catch (e) {
    console.error('💥 Verification failed:', e)
  }
}

createDemoAssets().catch(console.error)