#!/usr/bin/env tsx
// Test Insert - Try inserting one simple record to see what columns work

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fassrytpmwgxwxrrnerk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log('🧪 Testing basic asset insertion...')
  
  // Try the simplest possible insert
  const { data, error } = await supabase
    .from('assets')
    .insert({
      title: 'Test Asset',
      description: 'Testing CSV import preparation',
    })
    .select()
  
  if (error) {
    console.error('❌ Basic insert failed:', error)
    
    // Try with minimal data
    console.log('🔄 Trying with just title...')
    const { data: data2, error: error2 } = await supabase
      .from('assets')
      .insert({
        title: 'Test Asset 2'
      })
      .select()
    
    if (error2) {
      console.error('❌ Minimal insert also failed:', error2)
    } else {
      console.log('✅ Minimal insert succeeded:', data2)
    }
  } else {
    console.log('✅ Basic insert succeeded:', data)
  }
  
  // Check what columns are actually available by trying each one individually
  const columnsToTest = [
    'content_type',
    'status', 
    'metadata',
    'created_by',
    'created_at',
    'updated_at'
  ]
  
  for (const column of columnsToTest) {
    console.log(`\n🔍 Testing column: ${column}`)
    
    const testData: any = {
      title: `Test ${column}`
    }
    
    // Add the specific column we're testing
    if (column === 'content_type') {
      testData[column] = 'single_image'
    } else if (column === 'status') {
      testData[column] = 'draft'
    } else if (column === 'metadata') {
      testData[column] = { test: true }
    } else if (column === 'created_at' || column === 'updated_at') {
      testData[column] = new Date().toISOString()
    } else {
      testData[column] = 'test-value'
    }
    
    const { data, error } = await supabase
      .from('assets')
      .insert(testData)
      .select()
    
    if (error) {
      console.log(`❌ Column ${column}: ${error.message}`)
    } else {
      console.log(`✅ Column ${column}: works`)
      if (data && data.length > 0) {
        console.log(`   Available fields: ${Object.keys(data[0]).join(', ')}`)
      }
    }
  }
}

testInsert().catch(console.error)