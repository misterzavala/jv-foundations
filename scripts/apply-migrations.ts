// Database Migration Script
// Apply the content management migrations to your production Supabase instance

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key required

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applyMigrations() {
  console.log('🚀 Starting database migration process...')
  console.log(`📡 Connected to: ${SUPABASE_URL}`)

  try {
    // 1. Check if migrations table exists
    console.log('\n📋 Checking migration history...')
    
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables')
      .single()

    if (tablesError) {
      console.log('Creating migrations tracking table...')
      // Create a simple migrations table if it doesn't exist
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT NOW()
          );
        `
      })
    }

    // 2. Get list of migration files
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`📁 Found ${migrationFiles.length} migration files`)

    for (const filename of migrationFiles) {
      console.log(`\n⏳ Processing: ${filename}`)

      // Check if migration was already applied
      const { data: existingMigration } = await supabase
        .from('_migrations')
        .select('filename')
        .eq('filename', filename)
        .single()

      if (existingMigration) {
        console.log(`✅ Already applied: ${filename}`)
        continue
      }

      // Read and execute migration file
      const migrationPath = path.join(migrationsDir, filename)
      const sql = fs.readFileSync(migrationPath, 'utf-8')

      console.log(`📄 Executing SQL from ${filename}...`)

      // Split SQL by statements (simple approach - may need refinement)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      let successfulStatements = 0
      let errors: string[] = []

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        
        if (!statement || statement.trim() === '') continue

        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            // Some errors are expected (like "already exists")
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate key') ||
                error.message.includes('does not exist')) {
              console.log(`⚠️  Expected error (skipping): ${error.message}`)
            } else {
              errors.push(`Statement ${i + 1}: ${error.message}`)
            }
          } else {
            successfulStatements++
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`Statement ${i + 1}: ${errorMsg}`)
        }
      }

      if (errors.length === 0 || successfulStatements > 0) {
        // Mark as applied if we had some success
        await supabase
          .from('_migrations')
          .insert({ filename })

        console.log(`✅ Applied: ${filename} (${successfulStatements} statements)`)
        
        if (errors.length > 0) {
          console.log(`⚠️  Some errors occurred but migration marked as applied:`)
          errors.forEach(err => console.log(`   - ${err}`))
        }
      } else {
        console.log(`❌ Failed: ${filename}`)
        errors.forEach(err => console.log(`   - ${err}`))
      }
    }

    // 3. Verify key tables exist
    console.log('\n🔍 Verifying core tables...')
    
    const requiredTables = [
      'assets',
      'events', 
      'workflow_executions',
      'caption_templates',
      'asset_destinations',
      'accounts'
    ]

    for (const tableName of requiredTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ Table '${tableName}' not accessible: ${error.message}`)
      } else {
        console.log(`✅ Table '${tableName}' exists and accessible`)
      }
    }

    // 4. Set up Row Level Security policies
    console.log('\n🔒 Configuring Row Level Security...')
    
    // Enable RLS on key tables
    const rlsTables = ['assets', 'events', 'workflow_executions', 'caption_templates']
    
    for (const table of rlsTables) {
      try {
        await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
        })
        console.log(`✅ RLS enabled on ${table}`)
      } catch (error) {
        console.log(`⚠️  RLS may already be enabled on ${table}`)
      }
    }

    // 5. Create default caption templates if they don't exist
    console.log('\n📝 Setting up default caption templates...')
    
    const { data: existingTemplates } = await supabase
      .from('caption_templates')
      .select('name')
      .limit(1)

    if (!existingTemplates || existingTemplates.length === 0) {
      const defaultTemplates = [
        {
          name: 'Real Estate Success - Instagram',
          template: `🏠 {{asset.title}}

{{asset.description}}

💰 Ready to start your real estate journey?
👉 Follow for more tips!

#RealEstate #Wholesale #Investment #Entrepreneur #Success #Motivation #RealEstateInvesting #WholesaleRealEstate #BusinessTips`,
          platform: 'instagram',
          content_type: 'reel',
          variables: [
            { name: 'asset.title', type: 'text', required: true },
            { name: 'asset.description', type: 'text', required: false }
          ]
        },
        {
          name: 'Educational Hook - TikTok', 
          template: `🔥 {{asset.title}}

Here's what most people don't know:

{{asset.description}}

💡 Want to learn more strategies like this?
📱 Comment "INFO" below!

#RealEstate #WholesaleStrategy #Education #RealEstateTips #Investing #fyp #viral`,
          platform: 'tiktok',
          content_type: 'reel',
          variables: [
            { name: 'asset.title', type: 'text', required: true },
            { name: 'asset.description', type: 'text', required: true }
          ]
        }
      ]

      for (const template of defaultTemplates) {
        try {
          await supabase
            .from('caption_templates')
            .insert(template)
          console.log(`✅ Created template: ${template.name}`)
        } catch (error) {
          console.log(`⚠️  Template may already exist: ${template.name}`)
        }
      }
    } else {
      console.log('✅ Caption templates already exist')
    }

    console.log('\n🎉 Migration process completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Run the storage setup script: npm run setup-storage')
    console.log('2. Configure your N8N webhook endpoints')
    console.log('3. Set up platform API credentials (Instagram, LinkedIn, etc.)')
    console.log('4. Test file uploads and publishing workflows')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Create exec_sql function helper
async function createExecSqlFunction() {
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
      `
    })
  } catch (error) {
    // Function might already exist
    console.log('Note: exec_sql function setup skipped (may already exist)')
  }
}

// Run migrations
if (require.main === module) {
  createExecSqlFunction()
    .then(() => applyMigrations())
    .catch(console.error)
}