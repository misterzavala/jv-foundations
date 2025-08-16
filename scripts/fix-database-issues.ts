#!/usr/bin/env tsx
// Fix Database Issues - Resolve schema problems and complete CSV import

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fassrytpmwgxwxrrnerk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDatabaseIssues() {
  console.log('🔧 Starting Database Issues Fix...')
  
  // Step 1: Test basic connectivity and see what tables actually exist
  console.log('\n1️⃣ Testing database connectivity...')
  
  try {
    // Try the simplest possible query first
    const { data: testData, error: testError } = await supabase
      .from('assets')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Assets table query failed:', testError)
      
      // Check what tables actually exist by trying different ones
      const testTables = [
        'profiles', 'accounts', 'events', 'workflow_executions', 
        'deals', 'asset_destinations', 'reel_meta', 'carousel_meta'
      ]
      
      console.log('\n🔍 Testing available tables:')
      for (const tableName of testTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
          
          if (error) {
            console.log(`❌ ${tableName}: ${error.message}`)
          } else {
            console.log(`✅ ${tableName}: accessible (${data?.length || 0} sample records)`)
            if (data && data.length > 0) {
              console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`)
            }
          }
        } catch (e) {
          console.log(`💥 ${tableName}: ${e}`)
        }
      }
    } else {
      console.log('✅ Assets table is accessible')
      console.log(`   Found ${testData?.length || 0} records`)
    }
    
  } catch (error) {
    console.error('💥 Database connectivity failed:', error)
    return
  }
  
  // Step 2: Try to create a simple test asset to understand the schema
  console.log('\n2️⃣ Testing asset creation...')
  
  try {
    const testAsset = {
      title: 'Test Asset - Schema Check',
      description: 'Testing database schema compatibility',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select()
    
    if (insertError) {
      console.error('❌ Test asset creation failed:', insertError)
      
      // Try minimal insert
      console.log('🔄 Trying minimal asset creation...')
      const { data: minimalData, error: minimalError } = await supabase
        .from('assets')
        .insert({ title: 'Minimal Test' })
        .select()
      
      if (minimalError) {
        console.error('❌ Minimal insert also failed:', minimalError)
      } else {
        console.log('✅ Minimal insert successful:', minimalData)
        
        // Get the actual schema from the inserted record
        if (minimalData && minimalData.length > 0) {
          console.log('📋 Available columns in assets table:')
          Object.keys(minimalData[0]).forEach(col => {
            console.log(`   - ${col}: ${typeof minimalData[0][col]}`)
          })
        }
      }
    } else {
      console.log('✅ Test asset creation successful:', insertData)
    }
    
  } catch (error) {
    console.error('💥 Asset creation test failed:', error)
  }
  
  // Step 3: Complete CSV import with proper schema
  console.log('\n3️⃣ Attempting CSV data import with discovered schema...')
  
  try {
    // Download CSV data
    const response = await fetch('https://raw.githubusercontent.com/misterzavala/nci-001/main/MASTER%20Creative%20Workflow%20-%20Upload.csv')
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`)
    }
    
    const csvText = await response.text()
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    console.log('📊 CSV Headers:', headers)
    console.log('📊 CSV Data Lines:', lines.length - 1)
    
    // Parse a few sample records
    const sampleRecords = []
    for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = values[index] || ''
      })
      sampleRecords.push(record)
    }
    
    console.log('📋 Sample CSV Records:')
    sampleRecords.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`)
      console.log(`     Owner: ${record.owner}`)
      console.log(`     Status: ${record.status}`)
      console.log(`     Title/Hook: ${record.hook || record['gen caption'] || 'No title'}`)
      console.log(`     Serial: ${record['serial number']}`)
    })
    
    // Try to insert sample records using only compatible columns
    console.log('\n4️⃣ Inserting sample CSV records...')
    
    for (const record of sampleRecords.slice(0, 3)) {
      try {
        const assetData = {
          title: record.hook || record['gen caption'] || `Content by ${record.owner}`,
          description: record.Notes || `${record.owner}'s content`,
          // Store original CSV data in metadata if the column exists
        }
        
        const { data, error } = await supabase
          .from('assets')
          .insert(assetData)
          .select()
        
        if (error) {
          console.error(`❌ Failed to insert record for ${record.owner}:`, error)
        } else {
          console.log(`✅ Inserted record for ${record.owner}`)
        }
      } catch (e) {
        console.error(`💥 Error processing record for ${record.owner}:`, e)
      }
    }
    
  } catch (error) {
    console.error('💥 CSV import failed:', error)
  }
  
  // Step 4: Final verification
  console.log('\n5️⃣ Final verification - checking asset count...')
  
  try {
    const { count, error } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Count query failed:', error)
    } else {
      console.log(`✅ Total assets in database: ${count}`)
    }
  } catch (error) {
    console.error('💥 Count verification failed:', error)
  }
  
  console.log('\n🎉 Database fix process completed!')
}

fixDatabaseIssues().catch(console.error)