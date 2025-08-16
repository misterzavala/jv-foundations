#!/usr/bin/env tsx
// Check Actual Schema - Use raw SQL to see what's really in the database

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fassrytpmwgxwxrrnerk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkActualSchema() {
  console.log('🔍 Checking actual database schema with raw SQL...')
  
  try {
    // Get table info for assets table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'assets' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    })
    
    if (error) {
      console.error('❌ SQL query failed:', error)
      
      // Try an alternative approach using a simple select
      console.log('🔄 Trying alternative method...')
      
      // Query all tables in public schema
      const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `
      })
      
      if (tablesError) {
        console.error('❌ Cannot query schema:', tablesError)
        
        // Last resort - check if any basic table exists
        console.log('🔄 Checking if any tables exist...')
        const basicTables = ['profiles', 'assets', 'accounts', 'events']
        
        for (const tableName of basicTables) {
          try {
            const { count } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
            
            console.log(`✅ Table ${tableName}: exists (${count} rows)`)
          } catch (e) {
            console.log(`❌ Table ${tableName}: ${e}`)
          }
        }
      } else {
        console.log('📋 Available tables:')
        tables?.forEach((table: any) => {
          console.log(`  - ${table.table_name}`)
        })
      }
    } else {
      console.log('📊 Assets table structure:')
      data?.forEach((column: any) => {
        console.log(`  ${column.column_name}: ${column.data_type} (nullable: ${column.is_nullable})`)
      })
    }
  } catch (error) {
    console.error('💥 Error:', error)
  }
}

checkActualSchema().catch(console.error)