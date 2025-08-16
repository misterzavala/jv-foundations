#!/usr/bin/env tsx
// Debug Schema Script - Check what tables and columns actually exist

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fassrytpmwgxwxrrnerk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('🔍 Checking database schema...')
  
  // Try to query the assets table directly to see what columns exist
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Error querying assets table:', error)
  } else {
    console.log('✅ Assets table exists')
    if (data && data.length > 0) {
      console.log('📊 Available columns:', Object.keys(data[0]))
    } else {
      console.log('📊 Assets table exists but is empty')
    }
  }
  
  // Check other relevant tables
  const tableNames = ['asset_destinations', 'reel_meta', 'carousel_meta', 'events', 'workflow_executions']
  
  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`❌ Table ${tableName}: ${error.message}`)
    } else {
      console.log(`✅ Table ${tableName}: exists`)
      if (data && data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`)
      }
    }
  }
}

checkSchema().catch(console.error)