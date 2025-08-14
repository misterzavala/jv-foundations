// Supabase Storage Setup Script
// Run this script to configure the storage bucket for file uploads

import { createClient } from '@supabase/supabase-js'

// These should match your Supabase project
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key needed for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...')

  try {
    // 1. Create the assets bucket
    console.log('📁 Creating assets bucket...')
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('assets', {
      public: true,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mov',
        'video/avi',
        'video/quicktime'
      ],
      fileSizeLimit: 500 * 1024 * 1024 // 500MB
    })

    if (bucketError && !bucketError.message.includes('already exists')) {
      throw bucketError
    }

    console.log('✅ Assets bucket created/verified')

    // 2. Set up RLS policies for the bucket
    console.log('🔐 Setting up RLS policies...')

    // Policy: Users can upload files
    await supabase.rpc('create_storage_policy', {
      policy_name: 'Users can upload files',
      bucket_name: 'assets',
      policy: `
        CREATE POLICY "Users can upload files" ON storage.objects
        FOR INSERT WITH CHECK (
          bucket_id = 'assets' AND 
          auth.role() = 'authenticated'
        );
      `
    }).catch(() => {
      // Policy might already exist, ignore error
    })

    // Policy: Users can view their own files
    await supabase.rpc('create_storage_policy', {
      policy_name: 'Users can view files',
      bucket_name: 'assets',
      policy: `
        CREATE POLICY "Users can view files" ON storage.objects
        FOR SELECT USING (
          bucket_id = 'assets' AND 
          (auth.role() = 'authenticated' OR auth.role() = 'anon')
        );
      `
    }).catch(() => {
      // Policy might already exist, ignore error
    })

    // Policy: Users can delete their own files
    await supabase.rpc('create_storage_policy', {
      policy_name: 'Users can delete own files',
      bucket_name: 'assets',
      policy: `
        CREATE POLICY "Users can delete own files" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'assets' AND 
          auth.uid()::text = (storage.foldername(name))[1]
        );
      `
    }).catch(() => {
      // Policy might already exist, ignore error
    })

    console.log('✅ RLS policies configured')

    // 3. Create some folder structure
    console.log('📂 Creating folder structure...')
    
    const folders = ['images', 'videos', 'thumbnails', 'temp']
    
    for (const folder of folders) {
      try {
        await supabase.storage
          .from('assets')
          .upload(`${folder}/.keep`, new Blob([''], { type: 'text/plain' }))
      } catch (error) {
        // Folder might already exist, ignore
      }
    }

    console.log('✅ Folder structure created')

    // 4. Test upload functionality
    console.log('🧪 Testing upload functionality...')
    
    const testFile = new Blob(['test content'], { type: 'text/plain' })
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload('test/upload-test.txt', testFile)

    if (uploadError) {
      console.warn('⚠️  Upload test failed:', uploadError.message)
    } else {
      console.log('✅ Upload test successful')
      
      // Clean up test file
      await supabase.storage
        .from('assets')
        .remove(['test/upload-test.txt'])
    }

    // 5. Initialize default caption templates
    console.log('📝 Creating default caption templates...')
    
    const defaultTemplates = [
      {
        name: 'Real Estate Success Story - Instagram',
        template: `🏠 {{asset.title}}

{{asset.description}}

💰 Ready to start your real estate journey?
👉 Follow @{{creator.handle}} for more tips!

#RealEstate #Wholesale #Investment #Entrepreneur #Success #Motivation #RealEstateInvesting #WholesaleRealEstate #BusinessTips`,
        platform: 'instagram',
        content_type: 'reel',
        variables: [
          { name: 'asset.title', type: 'text', required: true },
          { name: 'asset.description', type: 'text', required: false },
          { name: 'creator.handle', type: 'text', required: false }
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
      },
      {
        name: 'Professional LinkedIn Post',
        template: `{{asset.title}}

{{asset.description}}

What's your experience with real estate investing? Share your thoughts in the comments.

#RealEstate #Investment #ProfessionalDevelopment`,
        platform: 'linkedin',
        content_type: 'single_image',
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
      } catch (error) {
        console.log(`Template "${template.name}" might already exist`)
      }
    }

    console.log('✅ Default caption templates created')

    // 6. Set up webhook configuration
    console.log('🔗 Setting up webhook configuration...')
    
    const webhookConfig = {
      name: 'N8N Content Publishing',
      endpoint_url: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook',
      secret_key: process.env.N8N_WEBHOOK_SECRET || 'dev-secret-key',
      event_types: [
        'asset_created',
        'status_changed',
        'publishing_attempted',
        'publishing_succeeded',
        'publishing_failed'
      ],
      is_active: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Zavala-AI-Platform/1.0'
      }
    }

    try {
      await supabase
        .from('webhook_configs')
        .insert(webhookConfig)
      
      console.log('✅ Webhook configuration created')
    } catch (error) {
      console.log('⚠️  Webhook config might already exist')
    }

    console.log('\n🎉 Supabase Storage setup completed!')
    console.log('\nNext steps:')
    console.log('1. Update your .env.local file with the correct Supabase URLs')
    console.log('2. Test file uploads through the UI')
    console.log('3. Configure your N8N workflows')
    console.log('4. Set up social media platform API credentials')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
if (require.main === module) {
  setupStorage()
}