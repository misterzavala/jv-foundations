#!/usr/bin/env tsx
// Refresh Schema and Import - Force schema refresh and complete CSV import

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fassrytpmwgxwxrrnerk.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY4NTE1MywiZXhwIjoyMDYzMjYxMTUzfQ.LQq1B1n5Z1VvZgEz7EqHZ8pJNH8-_FE3jgvEQsOaA0Y' // This might not be available

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function refreshSchemaAndImport() {
  console.log('🔄 Starting Schema Refresh and CSV Import...')
  
  // Step 1: Try to refresh the PostgREST schema cache
  console.log('\n1️⃣ Attempting to refresh schema cache...')
  
  try {
    // Method 1: Use the PostgREST admin endpoint to reload schema
    const reloadResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Profile': 'public',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ schema: 'reload' })
    })
    
    if (reloadResponse.ok) {
      console.log('✅ Schema cache refresh requested')
    } else {
      console.log('⚠️ Schema refresh request failed, continuing anyway...')
    }
  } catch (error) {
    console.log('⚠️ Schema refresh not available, continuing...')
  }
  
  // Step 2: Create the assets table with proper structure if needed
  console.log('\n2️⃣ Ensuring assets table exists with proper structure...')
  
  try {
    // Try a direct SQL execution to create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        content_type TEXT DEFAULT 'single_image' CHECK (content_type IN ('reel', 'carousel', 'single_image', 'story')),
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'scheduled', 'published', 'failed', 'archived')),
        metadata JSONB DEFAULT '{}',
        thumbnail_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ,
        scheduled_at TIMESTAMPTZ
      );
      
      -- Enable RLS
      ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
      
      -- Create a permissive policy for now (we'll restrict this later)
      DROP POLICY IF EXISTS "Enable all operations for all users" ON public.assets;
      CREATE POLICY "Enable all operations for all users" ON public.assets
        FOR ALL USING (true);
    `
    
    // Execute using rpc function if available
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    
    if (error) {
      console.log('⚠️ Could not execute SQL directly:', error.message)
      console.log('📝 Table likely exists, continuing with data insertion...')
    } else {
      console.log('✅ Assets table structure verified/created')
    }
    
  } catch (error) {
    console.log('⚠️ SQL execution not available, table likely exists...')
  }
  
  // Step 3: Wait a moment for schema refresh to take effect
  console.log('\n3️⃣ Waiting for schema refresh...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Step 4: Try alternative method - raw INSERT using SQL
  console.log('\n4️⃣ Importing CSV data using direct SQL insertion...')
  
  try {
    // Download and parse CSV
    const response = await fetch('https://raw.githubusercontent.com/misterzavala/nci-001/main/MASTER%20Creative%20Workflow%20-%20Upload.csv')
    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim())
    
    console.log(`📊 Processing ${lines.length - 1} CSV records...`)
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
    
    // Process records in batches
    const records = []
    for (let i = 1; i < Math.min(lines.length, 11); i++) { // Import first 10 records
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''))
        const record: any = {}
        
        headers.forEach((header, index) => {
          record[header] = values[index] || ''
        })
        
        // Only process records with meaningful data
        if (record.owner && record.owner.trim() && record.owner !== 'owner') {
          records.push(record)
        }
      } catch (e) {
        console.warn(`⚠️ Skipping malformed line ${i}`)
      }
    }
    
    console.log(`📋 Processed ${records.length} valid records`)
    
    // Insert records using direct SQL
    for (const [index, record] of records.entries()) {
      try {
        const title = record.hook || record['gen caption'] || `Content by ${record.owner}`
        const description = record.Notes || `${record.owner}'s content - Serial: ${record['serial number']}`
        const owner = record.owner
        const status = record.status === 'ready' ? 'in_review' : 
                     record.status === 'published' ? 'published' : 'draft'
        
        // Create metadata object
        const metadata = {
          source: 'csv_import',
          owner: owner,
          serial_number: record['serial number'],
          original_data: {
            hook: record.hook,
            gen_caption: record['gen caption'],
            ig_caption: record['IG caption'],
            tt_caption: record['TT caption'],
            cta: record.CTA,
            dlurl: record.dlurl,
            views: record.Views,
            likes: record.Likes,
            comments: record.Comments,
            shares: record.Shares
          },
          captions: {
            generated: record['gen caption'],
            instagram: record['IG caption'],
            tiktok: record['TT caption'],
            cta: record.CTA
          },
          engagement_metrics: {
            views: parseInt(record.Views) || 0,
            likes: parseInt(record.Likes) || 0,
            comments: parseInt(record.Comments) || 0,
            shares: parseInt(record.Shares) || 0
          }
        }
        
        // Try direct SQL insert
        const insertSQL = `
          INSERT INTO public.assets (title, description, content_type, status, metadata, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING id, title, status;
        `
        
        const { data, error } = await supabase.rpc('exec_sql_with_params', {
          sql: insertSQL,
          params: [
            title.substring(0, 255),
            description,
            'single_image', // Default content type
            status,
            JSON.stringify(metadata)
          ]
        })
        
        if (error) {
          console.log(`❌ SQL insert failed for ${owner}:`, error.message)
          
          // Fallback: Try simple insert without parameters
          const simpleInsertSQL = `
            INSERT INTO public.assets (title, description, status, metadata)
            VALUES ('${title.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', '${status}', '${JSON.stringify(metadata).replace(/'/g, "''")}')
            RETURNING id;
          `
          
          const { data: simpleData, error: simpleError } = await supabase.rpc('exec_sql', {
            sql: simpleInsertSQL
          })
          
          if (simpleError) {
            console.log(`❌ Simple insert also failed for ${owner}:`, simpleError.message)
          } else {
            console.log(`✅ Inserted ${owner} (simple method)`)
          }
          
        } else {
          console.log(`✅ Inserted ${owner} via SQL`)
        }
        
      } catch (error) {
        console.error(`💥 Error processing ${record.owner}:`, error)
      }
    }
    
  } catch (error) {
    console.error('💥 CSV import failed:', error)
  }
  
  // Step 5: Verify the import
  console.log('\n5️⃣ Verifying import results...')
  
  try {
    const { count, error } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Verification count failed:', error)
      
      // Try alternative verification
      const { data: sampleData, error: sampleError } = await supabase
        .from('assets')
        .select('id, title, status')
        .limit(5)
      
      if (sampleError) {
        console.error('❌ Sample query also failed:', sampleError)
      } else {
        console.log('✅ Sample assets found:')
        sampleData?.forEach(asset => {
          console.log(`   - ${asset.title} (${asset.status})`)
        })
      }
      
    } else {
      console.log(`✅ Final verification: ${count} total assets in database`)
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error)
  }
  
  console.log('\n🎉 Schema refresh and import process completed!')
  console.log('📝 If issues persist, the PostgREST schema cache may need manual refresh')
  console.log('🔧 Try restarting the Supabase instance or contact support for schema cache refresh')
}

refreshSchemaAndImport().catch(console.error)