#!/usr/bin/env tsx
// Test Supabase Database Connection and Schema
import { supabase } from './src/integrations/supabase/client'

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase Database Connection...')
  
  try {
    // Test 1: Basic connection
    console.log('\n1️⃣ Testing basic connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('assets')
      .select('count', { count: 'exact', head: true })
    
    if (connectionError) {
      console.log('❌ Connection Error:', connectionError)
      return
    }
    
    console.log('✅ Database connected successfully')
    console.log(`📊 Total assets in database: ${connectionTest}`)
    
    // Test 2: Schema validation
    console.log('\n2️⃣ Testing schema validation...')
    const { data: schemaTest, error: schemaError } = await supabase
      .from('assets')
      .select('id, title, content_type, status, created_at')
      .limit(1)
    
    if (schemaError) {
      console.log('❌ Schema Error:', schemaError)
      return
    }
    
    console.log('✅ Schema validation passed')
    console.log('📋 Sample data structure:', schemaTest?.[0] || 'No data found')
    
    // Test 3: Check all tables
    console.log('\n3️⃣ Testing all tables...')
    const tables = ['assets', 'accounts', 'executions', 'workflows']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: ${count} records`)
        }
      } catch (e) {
        console.log(`❌ ${table}: ${(e as Error).message}`)
      }
    }
    
    // Test 4: Insert/Update capabilities
    console.log('\n4️⃣ Testing write operations...')
    const testAsset = {
      title: 'DB Connection Test',
      content_type: 'single_image',
      status: 'draft',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select()
    
    if (insertError) {
      console.log('❌ Insert Error:', insertError)
    } else {
      console.log('✅ Insert test passed')
      
      // Clean up test record
      if (insertData?.[0]?.id) {
        await supabase
          .from('assets')
          .delete()
          .eq('id', insertData[0].id)
        console.log('🧹 Test record cleaned up')
      }
    }
    
    console.log('\n🎉 Database connectivity test complete!')
    
  } catch (error) {
    console.log('💥 Unexpected error:', error)
  }
}

testDatabaseConnection().catch(console.error)