# N8N Cloud Integration Setup

This guide helps you connect your platform to the N8N cloud instance at `lifemastery.app.n8n.cloud`.

## Step 1: Get N8N API Key

1. Go to your N8N cloud instance: https://lifemastery.app.n8n.cloud
2. Log in to your account
3. Navigate to **Settings** → **API Keys**
4. Click **"Create API Key"**
5. Give it a name like "Platform Integration"
6. Copy the generated API key

## Step 2: Update Environment Variables

Add these to your `.env.local` file:

```bash
# N8N Cloud Integration
N8N_BASE_URL=https://lifemastery.app.n8n.cloud
N8N_API_KEY=your_copied_api_key_here

# Your existing Supabase config
VITE_SUPABASE_URL=https://fassrytpmwgxwxrrnerk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY

# Your existing webhook config
VITE_N8N_WEBHOOK_URL=https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa
VITE_N8N_JWT_SECRET=Z@V@L@
VITE_N8N_WEBHOOK_SECRET=zbyHNp38TAvoGpTKP2MZzVdfJKWAxEc

# App configuration
VITE_APP_ENV=production
VITE_DEBUG_MODE=false
VITE_STORAGE_BUCKET=assets
```

## Step 3: Test the Connection

1. Start your development server: `npm run dev`
2. Go to `/console` in your browser
3. Click the **"Workflow Testing"** tab
4. Click **"Run Instagram Test"**

This will:
- Create a test asset in your platform
- Deploy a real 7-node workflow to your N8N cloud instance
- Test the complete integration pipeline
- Show you the workflow ID and webhook URL

## Step 4: View Workflows in N8N

1. After running a test, go to the **"N8N Workflows"** tab
2. You'll see deployed workflows with "View in N8N" buttons
3. Click to open them in your N8N cloud interface
4. You can see the actual workflow nodes and execution history

## Workflow Structure

The test workflow includes these nodes:
1. **Webhook Trigger** - Receives platform events
2. **Get Asset Data** - Calls your platform API
3. **Update Status: Processing** - Updates asset status
4. **Instagram API (Simulated)** - Simulates Instagram publishing
5. **Update Status: Published** - Success status update
6. **Update Status: Failed** - Error handling
7. **Send Response** - Returns execution results

## Real-Time Testing

You can now:
- **Deploy real workflows** to your N8N cloud instance
- **Test webhook integrations** with actual API calls
- **Monitor execution** in real-time through both platforms
- **View logs and errors** in N8N's execution history
- **Clean up test data** automatically

## Troubleshooting

### API Key Issues
- Make sure your API key has proper permissions
- Check that the key isn't expired
- Verify you're using the correct N8N cloud URL

### Webhook Testing
- Your existing webhook `a40af2fb-6d85-4db3-9791-e7cab329bcfa` will continue to work
- New workflows get unique webhook URLs automatically
- Test webhooks are called directly from the platform

### CORS Issues
- N8N cloud should allow API calls from your domain
- If you see CORS errors, check your N8N cloud settings

This integration gives you **real workflow deployment and testing** with your actual N8N cloud instance!