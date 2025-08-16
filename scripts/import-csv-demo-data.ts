#!/usr/bin/env tsx
// CSV Demo Data Import Script
// Imports demo data from misterzavala/nci-001 CSV into platform assets

import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const supabaseUrl = 'https://fassrytpmwgxwxrrnerk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY'

const supabase = createClient(supabaseUrl, supabaseKey)

interface CSVRow {
  owner: string
  status: string
  'Submit Time': string
  'serial number': string
  dlurl: string
  hook: string
  'gen caption': string
  'IG caption': string
  'TT caption': string
  CTA: string
  Notes: string
  Views: string
  Likes: string
  Comments: string
  Shares: string
}

interface AssetData {
  title: string
  description?: string
  content_type: 'reel' | 'carousel' | 'single_image' | 'story'
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'failed' | 'archived'
  metadata: Record<string, any>
  created_by?: string
  submit_time?: string
  serial_number?: string
  engagement_metrics?: Record<string, number>
}

/**
 * Download CSV data from GitHub
 */
async function downloadCSVData(): Promise<string> {
  console.log('📥 Downloading CSV data from GitHub...')
  
  const response = await fetch('https://raw.githubusercontent.com/misterzavala/nci-001/main/MASTER%20Creative%20Workflow%20-%20Upload.csv')
  
  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.statusText}`)
  }
  
  const csvContent = await response.text()
  console.log(`✅ Downloaded ${csvContent.split('\n').length - 1} rows of CSV data`)
  
  return csvContent
}

/**
 * Parse CSV content into structured data
 */
function parseCSVData(csvContent: string): CSVRow[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
    
    console.log(`🔍 Parsed ${records.length} CSV records`)
    return records
  } catch (error) {
    console.error('❌ Failed to parse CSV:', error)
    throw error
  }
}

/**
 * Parse submit time from CSV format
 */
function parseSubmitTime(submitTime?: string): string | null {
  if (!submitTime) return null
  
  try {
    // Handle different date formats from CSV
    // Example: "August 6, 2025 at 4:33 PM"
    const cleanTime = submitTime.replace(' at ', ' ')
    const date = new Date(cleanTime)
    
    if (isNaN(date.getTime())) {
      console.warn(`Could not parse date: ${submitTime}`)
      return null
    }
    
    return date.toISOString()
  } catch (error) {
    console.warn(`Error parsing date ${submitTime}:`, error)
    return null
  }
}

/**
 * Map CSV row to asset data
 */
function mapCSVRowToAsset(row: CSVRow): AssetData {
  // Map CSV status to asset status
  const statusMapping: Record<string, AssetData['status']> = {
    'ready': 'in_review',
    'published': 'published',
    'draft': 'draft',
    'queued': 'scheduled',
    'publishing': 'scheduled',
    'failed': 'failed'
  }
  
  // Determine content type from captions (basic heuristic)
  let contentType: AssetData['content_type'] = 'single_image'
  if (row['IG caption']?.toLowerCase().includes('reel') || row['TT caption']) {
    contentType = 'reel'
  } else if (row['IG caption']?.toLowerCase().includes('story')) {
    contentType = 'story'
  }
  
  // Extract engagement metrics
  const engagementMetrics: Record<string, number> = {}
  if (row.Views && !isNaN(Number(row.Views))) {
    engagementMetrics.views = Number(row.Views)
  }
  if (row.Likes && !isNaN(Number(row.Likes))) {
    engagementMetrics.likes = Number(row.Likes)
  }
  if (row.Comments && !isNaN(Number(row.Comments))) {
    engagementMetrics.comments = Number(row.Comments)
  }
  if (row.Shares && !isNaN(Number(row.Shares))) {
    engagementMetrics.shares = Number(row.Shares)
  }
  
  // Create title from hook or generate from serial number
  const title = row.hook || `Content ${row['serial number']}` || `Asset by ${row.owner}`
  
  return {
    title: title.substring(0, 255), // Ensure title fits database constraint
    description: row.Notes || undefined,
    content_type: contentType,
    status: statusMapping[row.status?.toLowerCase()] || 'draft',
    created_by: row.owner,
    submit_time: row['Submit Time'],
    serial_number: row['serial number'],
    engagement_metrics: Object.keys(engagementMetrics).length > 0 ? engagementMetrics : undefined,
    metadata: {
      source: 'csv_import',
      original_data: {
        dlurl: row.dlurl,
        hook: row.hook,
        gen_caption: row['gen caption'],
        ig_caption: row['IG caption'],
        tt_caption: row['TT caption'],
        cta: row.CTA,
        notes: row.Notes
      },
      captions: {
        generated: row['gen caption'],
        instagram: row['IG caption'],
        tiktok: row['TT caption'],
        cta: row.CTA
      },
      platforms: ['instagram', 'tiktok'] // Inferred from IG/TT captions
    }
  }
}

/**
 * Insert assets into database
 */
async function insertAssets(assets: AssetData[]): Promise<void> {
  console.log(`💾 Inserting ${assets.length} assets into database...`)
  
  const batchSize = 10
  let imported = 0
  let errors = 0
  
  for (let i = 0; i < assets.length; i += batchSize) {
    const batch = assets.slice(i, i + batchSize)
    
    try {
      const { data, error } = await supabase
        .from('assets')
        .insert(batch.map(asset => ({
          title: asset.title,
          description: asset.description,
          content_type: asset.content_type,
          status: asset.status,
          metadata: asset.metadata,
          created_at: parseSubmitTime(asset.submit_time) || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })))
        .select()
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error)
        errors += batch.length
      } else {
        imported += data.length
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Imported ${data.length} assets`)
        
        // Create engagement metrics for published assets
        for (const [index, asset] of batch.entries()) {
          if (asset.engagement_metrics && data[index]) {
            await insertEngagementMetrics(data[index].id, asset.engagement_metrics)
          }
        }
      }
    } catch (error) {
      console.error(`💥 Unexpected error in batch ${Math.floor(i / batchSize) + 1}:`, error)
      errors += batch.length
    }
  }
  
  console.log(`\n📊 Import Summary:`)
  console.log(`   ✅ Successfully imported: ${imported}`)
  console.log(`   ❌ Failed to import: ${errors}`)
  console.log(`   📈 Success rate: ${((imported / assets.length) * 100).toFixed(1)}%`)
}

/**
 * Insert engagement metrics for an asset
 */
async function insertEngagementMetrics(assetId: string, metrics: Record<string, number>): Promise<void> {
  try {
    const { error } = await supabase
      .from('asset_analytics')
      .insert({
        asset_id: assetId,
        views: metrics.views || 0,
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        recorded_at: new Date().toISOString()
      })
    
    if (error) {
      console.warn(`⚠️ Failed to insert engagement metrics for asset ${assetId}:`, error)
    }
  } catch (error) {
    console.warn(`⚠️ Error inserting engagement metrics for asset ${assetId}:`, error)
  }
}

/**
 * Clear existing demo data
 */
async function clearExistingDemoData(): Promise<void> {
  console.log('🧹 Clearing existing demo data...')
  
  try {
    // Delete assets with CSV import source
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('metadata->>source', 'csv_import')
    
    if (error) {
      console.warn('⚠️ Warning clearing existing data:', error)
    } else {
      console.log('✅ Cleared existing CSV import data')
    }
  } catch (error) {
    console.warn('⚠️ Warning clearing existing data:', error)
  }
}

/**
 * Main import function
 */
async function main() {
  try {
    console.log('🚀 Starting CSV Demo Data Import')
    console.log('=====================================')
    
    // Clear existing demo data
    await clearExistingDemoData()
    
    // Download and parse CSV data
    const csvContent = await downloadCSVData()
    const csvRows = parseCSVData(csvContent)
    
    // Convert to asset data
    console.log('🔄 Converting CSV rows to asset data...')
    const assets = csvRows.map(mapCSVRowToAsset)
    
    // Filter out invalid rows
    const validAssets = assets.filter(asset => asset.title && asset.title.trim().length > 0)
    console.log(`📝 Converted ${validAssets.length} valid assets from ${csvRows.length} CSV rows`)
    
    // Insert into database
    await insertAssets(validAssets)
    
    console.log('\n🎉 CSV Demo Data Import Completed!')
    console.log('=====================================')
    console.log('✅ Demo data is now available in the platform')
    console.log('🔗 You can view the imported assets in the Assets page')
    
  } catch (error) {
    console.error('\n💥 Import failed:', error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)

export { main as importCSVDemoData }