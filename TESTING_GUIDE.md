# 🚀 Complete Testing Guide - N8N Cloud Integration

Your platform is now fully set up and ready to test with your N8N cloud instance! Here's how to test the complete workflow system.

## ✅ What's Ready to Test

**Database**: All migrations applied to your Supabase instance
**N8N Integration**: Configured for `lifemastery.app.n8n.cloud`
**File Upload System**: Ready with workflow triggers
**Event Sourcing**: Real-time monitoring and logging
**Webhook Security**: HMAC verification and rate limiting

## 🔧 Setup Steps

### 1. Configure N8N API Access

You need to get an API key from your N8N cloud instance:

1. Go to: https://lifemastery.app.n8n.cloud
2. Login to your account
3. Navigate to **Settings** → **API Keys**
4. Click **"Create API Key"**
5. Name it "Platform Integration"
6. Copy the API key

### 2. Update Environment Variables

Create/update your `.env.local` file:

```bash
# N8N Cloud Integration
N8N_BASE_URL=https://lifemastery.app.n8n.cloud
N8N_API_KEY=your_copied_api_key_here

# Your existing config (already working)
VITE_SUPABASE_URL=https://fassrytpmwgxwxrrnerk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhc3NyeXRwbXdneHd4cnJuZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODUxNTMsImV4cCI6MjA2MzI2MTE1M30.v0Pkr4XwgL2IjVGZlTnJhYMWKSXJGi3BGcUfkWHxhgY
VITE_N8N_WEBHOOK_URL=https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa
VITE_N8N_JWT_SECRET=Z@V@L@
VITE_N8N_WEBHOOK_SECRET=zbyHNp38TAvoGpTKP2MZzVdfJKWAxEc
VITE_APP_ENV=production
VITE_DEBUG_MODE=false
VITE_STORAGE_BUCKET=assets
```

## 🧪 Testing Workflow

### Test 1: Instagram Workflow Deployment

1. **Start the dev server**: `npm run dev`
2. **Go to**: http://localhost:8082/console
3. **Click**: "Workflow Testing" tab
4. **Click**: "Run Instagram Test"

**What happens**:
- ✅ Creates test asset in Supabase
- ✅ Builds 7-node N8N workflow definition
- ✅ **Deploys actual workflow to your N8N cloud instance**
- ✅ Tests webhook endpoint
- ✅ Verifies event sourcing
- ✅ Shows real-time progress

**Expected Result**: You should see:
- Green checkmarks for all 5 steps
- N8N workflow ID (like `workflow_123`)
- Webhook URL from your N8N cloud
- "🟢 N8N Connected" status badge

### Test 2: View Workflow in N8N Cloud

1. **After Test 1**, go to "N8N Workflows" tab
2. **Click**: "View in N8N Cloud" button
3. **Opens**: Your N8N cloud instance with the deployed workflow

**What you'll see**:
- 7-node workflow in N8N's visual editor
- Nodes: Webhook → Get Asset → Update Status → Instagram API → Success/Error → Response
- Workflow is **ACTIVE** and ready to receive webhooks

### Test 3: File Upload + Workflow

1. **Go to**: "Upload Test" tab in console
2. **Click**: "Select File & Test"
3. **Choose**: Any image file
4. **Watch**: Complete pipeline execution

**What happens**:
- ✅ Uploads file to Supabase Storage
- ✅ Creates asset with metadata
- ✅ Deploys new N8N workflow
- ✅ Tests complete integration

### Test 4: Real Webhook Test

1. **Copy webhook URL** from test results
2. **Use Postman/curl** to send POST request:

```bash
curl -X POST "https://lifemastery.app.n8n.cloud/webhook/your-webhook-path" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "your-test-asset-id",
    "test": true,
    "triggerSource": "manual_test"
  }'
```

**Expected**: N8N workflow executes and calls your platform APIs

## 🔍 Monitoring & Debugging

### Event Console
- **Go to**: Console → "Event Console" tab
- **See**: Real-time events from all system operations
- **Filter by**: Asset operations, workflow events, security events

### N8N Execution History
- **In N8N Cloud**: Go to "Executions" tab
- **See**: All workflow runs with success/failure status
- **Debug**: Click executions to see detailed logs

### Database Inspection
- **Supabase Dashboard**: Check `assets`, `workflow_executions`, `events` tables
- **See**: All data created by tests

## 🧹 Cleanup

After testing:
1. **Click**: "Cleanup Test Data" in test results
2. **Removes**: Test assets from database
3. **Removes**: Test workflows from N8N cloud
4. **Keeps**: Event logs for analysis

## ⚠️ Troubleshooting

### "🔴 N8N Error" Status
- **Check**: N8N API key is correct
- **Check**: N8N cloud instance is accessible
- **Check**: API key has proper permissions

### Workflow Deployment Fails
- **Verify**: N8N_BASE_URL is correct
- **Check**: API key hasn't expired
- **Look at**: Browser console for detailed errors

### Webhook Tests Fail
- **Check**: Asset APIs are running (`/api/assets/[id]`)
- **Verify**: CORS settings in N8N cloud
- **Test**: Webhook URL directly in browser

## 🎉 Success Indicators

You'll know everything is working when:
- ✅ "🟢 N8N Connected" status shows
- ✅ Instagram test completes all 5 steps
- ✅ Workflows appear in N8N Workflows tab
- ✅ You can view/edit workflows in N8N cloud
- ✅ Event console shows real-time activity
- ✅ Webhook tests return successful responses

This gives you a **complete tactical workflow testing system** that actually deploys and manages real N8N workflows in your cloud instance!

## 🚀 Next Steps

Once testing works:
1. Create production workflows for real Instagram/LinkedIn posting
2. Set up scheduling and queuing systems
3. Add user authentication and role-based access
4. Deploy to production environment

The foundation is solid - now you can build real social media automation workflows with confidence!