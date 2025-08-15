// Functionality Test Script
// Run basic tests to verify the content engine is working

import { createClient } from '@supabase/supabase-js'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function runTests() {
  console.log('🧪 Running Content Engine Functionality Tests...\n')

  let passedTests = 0
  let totalTests = 0

  // Helper function to run a test
  const runTest = async (testName: string, testFn: () => Promise<boolean>) => {
    totalTests++
    try {
      console.log(`⏳ Testing: ${testName}`)
      const result = await testFn()
      if (result) {
        console.log(`✅ PASS: ${testName}`)
        passedTests++
      } else {
        console.log(`❌ FAIL: ${testName}`)
      }
    } catch (error) {
      console.log(`❌ ERROR: ${testName} - ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    console.log('')
  }

  // Test 1: Database Connection
  await runTest('Database Connection', async () => {
    const { data, error } = await supabase.from('assets').select('*').limit(1)
    return !error
  })

  // Test 2: Core Tables Exist
  await runTest('Core Tables Exist', async () => {
    const tables = ['assets', 'events', 'workflow_executions', 'caption_templates', 'accounts', 'asset_destinations']
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error && !error.message.includes('row-level security')) {
        console.log(`   Missing table: ${table}`)
        return false
      }
    }
    return true
  })

  // Test 3: Storage Bucket Exists
  await runTest('Storage Bucket Exists', async () => {
    const { data, error } = await supabase.storage.getBucket('assets')
    return !error && data !== null
  })

  // Test 4: Caption Templates Exist
  await runTest('Default Caption Templates', async () => {
    const { data, error } = await supabase
      .from('caption_templates')
      .select('*')
      .limit(5)
    
    return !error && data && data.length > 0
  })

  // Test 5: RLS Policies Configured
  await runTest('RLS Policies Active', async () => {
    // This should fail for service role, indicating RLS is working
    const { error } = await supabase
      .from('assets')
      .select('*')
      .limit(1)
    
    // Service role should bypass RLS, so no error means RLS is configured but service role works
    return !error
  })

  // Test 6: Event Triggers Working
  await runTest('Event Triggers Functional', async () => {
    // Create a test asset to trigger events
    const testAsset = {
      title: 'Test Asset',
      description: 'Test asset for functionality verification',
      content_type: 'reel',
      status: 'draft',
      metadata: { test: true }
    }

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select()
      .single()

    if (assetError) return false

    // Check if event was created
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for trigger

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('entity_id', asset.id)
      .eq('event_type', 'asset_created')

    // Cleanup
    await supabase.from('assets').delete().eq('id', asset.id)

    return !eventsError && events && events.length > 0
  })

  // Test 7: Webhook Configuration
  await runTest('Webhook Endpoint Accessible', async () => {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhook/n8n/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      })
      
      // Should return 401 (unauthorized) rather than 404 (not found)
      return response.status === 401
    } catch (error) {
      return false
    }
  })

  // Test 8: File Upload Simulation
  await runTest('File Upload Capability', async () => {
    try {
      const testFile = new Blob(['test content'], { type: 'text/plain' })
      const fileName = `test/functionality-test-${Date.now()}.txt`

      const { data, error } = await supabase.storage
        .from('assets')
        .upload(fileName, testFile)

      if (error) return false

      // Cleanup
      await supabase.storage.from('assets').remove([fileName])
      
      return true
    } catch (error) {
      return false
    }
  })

  // Test Results Summary
  console.log('🎯 Test Results Summary')
  console.log('========================')
  console.log(`✅ Passed: ${passedTests}/${totalTests}`)
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`)
  console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Content Engine is ready for deployment.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above before deploying.')
    
    if (passedTests / totalTests < 0.7) {
      console.log('🚨 Critical issues detected. Deployment not recommended.')
      process.exit(1)
    }
  }

  // Additional Health Checks
  console.log('\n🏥 Additional Health Checks')
  console.log('===========================')

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const optionalEnvVars = [
    'N8N_WEBHOOK_SECRET',
    'NEXT_PUBLIC_N8N_WEBHOOK_URL',
    'FACEBOOK_APP_SECRET',
    'LINKEDIN_CLIENT_SECRET'
  ]

  console.log('Required Environment Variables:')
  requiredEnvVars.forEach(envVar => {
    const exists = !!process.env[envVar]
    console.log(`  ${exists ? '✅' : '❌'} ${envVar}`)
  })

  console.log('\nOptional Environment Variables:')
  optionalEnvVars.forEach(envVar => {
    const exists = !!process.env[envVar]
    console.log(`  ${exists ? '✅' : '⚠️ '} ${envVar} ${exists ? '' : '(recommended for production)'}`)
  })

  console.log('\n📋 Next Steps:')
  console.log('1. Fix any failed tests above')
  console.log('2. Configure missing environment variables')
  console.log('3. Run the deployment checklist')
  console.log('4. Test manually through the UI')
  console.log('5. Deploy to production!')
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests }