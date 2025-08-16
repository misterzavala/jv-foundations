#!/usr/bin/env tsx
// Debug the database adapter issue
import { databaseAdapter } from './src/services/database-adapter'

async function debugAdapter() {
  console.log('🐛 Debugging Database Adapter...')
  
  try {
    // Check memory cache directly
    console.log('\n1️⃣ Checking memory cache...')
    console.log('Memory cache length:', (databaseAdapter as any).memoryCache?.length || 'undefined')
    console.log('Memory cache sample:', (databaseAdapter as any).memoryCache?.[0]?.title || 'none')
    
    // Check getCachedAssets method
    console.log('\n2️⃣ Checking getCachedAssets...')
    const cached = (databaseAdapter as any).getCachedAssets()
    console.log('getCachedAssets length:', cached.length)
    console.log('getCachedAssets sample:', cached[0]?.title || 'none')
    
    // Check getAssets method
    console.log('\n3️⃣ Checking getAssets...')
    const assets = await databaseAdapter.getAssets()
    console.log('getAssets length:', assets.length)
    console.log('getAssets sample:', assets[0]?.title || 'none')
    
    // Force initialize demo data
    console.log('\n4️⃣ Force initializing demo data...')
    await databaseAdapter.initializeWithDemoData()
    
    // Check again after initialization
    console.log('\n5️⃣ Checking after initialization...')
    const assetsAfter = await databaseAdapter.getAssets()
    console.log('getAssets length after init:', assetsAfter.length)
    console.log('getAssets sample after init:', assetsAfter[0]?.title || 'none')
    
  } catch (error) {
    console.log('💥 Debug error:', error)
  }
}

debugAdapter().catch(console.error)