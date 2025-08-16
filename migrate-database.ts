#!/usr/bin/env tsx
// Database Migration - Add missing columns to assets table
import { supabase } from './src/integrations/supabase/client'

async function migrateDatabase() {
  console.log('🔧 Starting database migration...')
  console.log('Adding missing columns to assets table')
  
  try {
    // Add missing columns one by one
    const migrations = [
      {
        name: 'Add content_type column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'single_image';`
      },
      {
        name: 'Add title column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Untitled';`
      },
      {
        name: 'Add description column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS description TEXT;`
      },
      {
        name: 'Add metadata column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`
      },
      {
        name: 'Add thumbnail_url column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;`
      },
      {
        name: 'Add published_at column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;`
      },
      {
        name: 'Add scheduled_at column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;`
      },
      {
        name: 'Add updated_at column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`
      },
      {
        name: 'Add created_by column',
        sql: `ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_by TEXT;`
      }
    ]
    
    console.log(`\n📋 Running ${migrations.length} migrations...`)
    
    for (const migration of migrations) {
      console.log(`\n🔧 ${migration.name}...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: migration.sql 
      })
      
      if (error) {
        console.log(`❌ Failed: ${error.message}`)
        
        // Try alternative approach using direct SQL
        console.log('🔄 Trying alternative approach...')
        
        // For content_type specifically, let's ensure it exists
        if (migration.name.includes('content_type')) {
          const { error: altError } = await supabase
            .from('assets')
            .update({ content_type: 'single_image' })
            .eq('id', 'nonexistent-id') // This will fail but test if column exists
          
          if (altError && altError.message.includes('does not exist')) {
            console.log('❌ Column definitely needs to be created')
          } else {
            console.log('✅ Column might already exist')
          }
        }
      } else {
        console.log('✅ Success')
      }
    }
    
    // Test the schema after migration
    console.log('\n🧪 Testing schema after migration...')
    const { data: testData, error: testError } = await supabase
      .from('assets')
      .select('id, content_type, title, description, metadata, status')
      .limit(1)
    
    if (testError) {
      console.log('❌ Post-migration test failed:', testError)
    } else {
      console.log('✅ Post-migration test passed')
      console.log('📊 Available columns:', Object.keys(testData?.[0] || {}))
    }
    
    console.log('\n🎉 Database migration attempt complete!')
    
  } catch (error) {
    console.log('💥 Migration error:', error)
  }
}

migrateDatabase().catch(console.error)