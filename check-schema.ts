#!/usr/bin/env tsx
// Check actual database schema
import { supabase } from './src/integrations/supabase/client'

async function checkActualSchema() {
  console.log('🔍 Checking actual database schema...')
  
  try {
    // Get all tables and their columns using PostgreSQL system tables
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_table_info')
      
    if (tablesError) {
      console.log('❌ Could not query table info:', tablesError)
      
      // Fallback: try to select all columns from assets table
      console.log('🔄 Trying fallback method...')
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .limit(1)
      
      if (assetsError) {
        console.log('❌ Assets table error:', assetsError)
        
        // Try even simpler approach
        console.log('🔄 Trying minimal select...')
        const { data: minimalData, error: minimalError } = await supabase
          .from('assets')
          .select()
          .limit(1)
        
        if (minimalError) {
          console.log('❌ Minimal select error:', minimalError)
        } else {
          console.log('✅ Minimal select worked:', minimalData)
        }
      } else {
        console.log('✅ Assets table structure:', Object.keys(assetsData?.[0] || {}))
      }
    } else {
      console.log('✅ Table info:', tablesData)
    }
    
    // Test specific columns one by one
    console.log('\n🔍 Testing individual columns...')
    const testColumns = ['id', 'content_type', 'status', 'created_at', 'title', 'description', 'metadata']
    
    for (const column of testColumns) {
      try {
        const { error } = await supabase
          .from('assets')
          .select(column)
          .limit(1)
        
        if (error) {
          console.log(`❌ ${column}: ${error.message}`)
        } else {
          console.log(`✅ ${column}: exists`)
        }
      } catch (e) {
        console.log(`❌ ${column}: ${(e as Error).message}`)
      }
    }
    
  } catch (error) {
    console.log('💥 Unexpected error:', error)
  }
}

checkActualSchema().catch(console.error)