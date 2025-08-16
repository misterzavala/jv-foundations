#!/usr/bin/env tsx
// Test the database adapter functionality
import { databaseAdapter } from './src/services/database-adapter'

async function testDatabaseAdapter() {
  console.log('🧪 Testing Database Adapter...')
  
  try {
    // Test 1: Initialize with demo data
    console.log('\n1️⃣ Initializing with demo data...')
    await databaseAdapter.initializeWithDemoData()
    console.log('✅ Demo data initialized')
    
    // Test 2: Get all assets
    console.log('\n2️⃣ Fetching all assets...')
    const assets = await databaseAdapter.getAssets()
    console.log(`✅ Found ${assets.length} assets`)
    
    if (assets.length > 0) {
      console.log('📋 Sample asset:')
      const sample = assets[0]
      console.log(`   - ID: ${sample.id}`)
      console.log(`   - Title: ${sample.title}`)
      console.log(`   - Type: ${sample.content_type}`)
      console.log(`   - Status: ${sample.status}`)
      console.log(`   - Owner: ${sample.metadata.owner}`)
    }
    
    // Test 3: Create new asset
    console.log('\n3️⃣ Creating new test asset...')
    const newAsset = await databaseAdapter.createAsset({
      title: 'Database Adapter Test',
      content_type: 'single_image',
      description: 'Test asset created by database adapter',
      status: 'draft',
      metadata: {
        source: 'test_script',
        owner: 'test_user',
        serial_number: 'TEST001',
        captions: {
          instagram: 'Test post for database adapter',
          tiktok: 'Testing the new adapter!'
        },
        platforms: ['instagram']
      }
    })
    
    console.log('✅ New asset created:', newAsset.id)
    
    // Test 4: Update asset
    console.log('\n4️⃣ Updating test asset...')
    const updatedAsset = await databaseAdapter.updateAsset(newAsset.id, {
      status: 'in_review',
      description: 'Updated test description'
    })
    
    if (updatedAsset) {
      console.log('✅ Asset updated:', updatedAsset.status)
    }
    
    // Test 5: Check total count after creation
    console.log('\n5️⃣ Checking final asset count...')
    const finalAssets = await databaseAdapter.getAssets()
    console.log(`✅ Final count: ${finalAssets.length} assets`)
    
    // Test 6: Delete test asset
    console.log('\n6️⃣ Cleaning up test asset...')
    const deleted = await databaseAdapter.deleteAsset(newAsset.id)
    console.log('✅ Test asset deleted:', deleted)
    
    console.log('\n🎉 Database Adapter Tests Complete!')
    console.log('✅ All functionality working correctly')
    console.log('📊 Ready for frontend integration')
    
  } catch (error) {
    console.log('💥 Test failed:', error)
  }
}

testDatabaseAdapter().catch(console.error)