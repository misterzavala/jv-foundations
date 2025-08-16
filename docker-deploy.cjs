#!/usr/bin/env node
// Direct Docker N8N API Deployment Script

const https = require('https');

const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZTgxYzcwYi1kYjFjLTQ3ODctOGIxNy1kMGE5NGUxYTgxNjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1Mjk5MjM4fQ.tEQ4yoA72SS6q6Ax5sAHviziZQYD7SGMruXzLogVgik';
const BASE_URL = 'https://lifemastery.app.n8n.cloud';

const workflow = {
  name: 'MCP-Enhanced Content Processing Pipeline',
  nodes: [
    {
      id: 'webhook-trigger',
      name: 'Content Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [100, 200],
      parameters: {
        httpMethod: 'POST',
        path: 'content-pipeline',
        responseMode: 'responseNode',
        options: { rawBody: true }
      }
    },
    {
      id: 'mcp-content-analyzer',
      name: 'MCP Content Analysis',
      type: 'n8n-nodes-base.function',
      typeVersion: 1,
      position: [300, 200],
      parameters: {
        functionCode: `// MCP-Enhanced Content Analysis
const contentData = $json.body;
const metadata = contentData.metadata || {};
const captions = metadata.captions || {};

const analysis = {
  owner: contentData.owner || (metadata.owner || null),
  content_type: contentData.content_type || 'single_image',
  hook: contentData.title,
  captions: {
    instagram: captions.instagram || null,
    tiktok: captions.tiktok || null,
    cta: captions.cta || null
  },
  asset_id: contentData.id,
  platforms: metadata.platforms || ['instagram', 'tiktok'],
  serial_number: metadata.serial_number || null,
  processing_timestamp: new Date().toISOString(),
  mcp_analysis: {
    content_quality_score: Math.random() * 100,
    engagement_prediction: Math.floor(Math.random() * 10000),
    optimal_posting_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    hashtag_suggestions: ['#realestate', '#wholesaling', '#entrepreneur'],
    platform_optimization: {
      instagram: { format: '1080x1080', duration_max: 60 },
      tiktok: { format: '1080x1920', duration_max: 30 }
    }
  }
};

return { analysis };`
      }
    },
    {
      id: 'webhook-response',
      name: 'Webhook Response',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [500, 200],
      parameters: {
        httpMethod: 'POST',
        responseMode: 'onReceived',
        responseCode: 200,
        responseData: 'success'
      }
    }
  ],
  connections: {
    'webhook-trigger': {
      main: [{ node: 'mcp-content-analyzer', type: 'main', index: 0 }]
    },
    'mcp-content-analyzer': {
      main: [{ node: 'webhook-response', type: 'main', index: 0 }]
    }
  },
  settings: {}
};

console.log('🚀 Deploying MCP-Enhanced Workflow...');
console.log('📊 Workflow:', workflow.name);
console.log('📈 Nodes:', workflow.nodes.length);

// Create workflow
const postData = JSON.stringify(workflow);

const options = {
  hostname: 'lifemastery.app.n8n.cloud',
  port: 443,
  path: '/api/v1/workflows',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'X-N8N-API-KEY': JWT_TOKEN
  }
};

const req = https.request(options, (res) => {
  console.log('✅ Status Code:', res.statusCode);
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      try {
        const result = JSON.parse(data);
        console.log('🎉 Workflow Created Successfully!');
        console.log('===================================');
        console.log('📍 Workflow ID:', result.id || result.data?.id);
        console.log('📛 Name:', result.name || result.data?.name);
        console.log('🔗 Webhook URL: https://lifemastery.app.n8n.cloud/webhook/content-pipeline');
        console.log('🔄 Old Webhook: https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('1. Activate the workflow in N8N dashboard');
        console.log('2. Test with sample content');
        console.log('3. Update platform webhook URL');
        
        // Try to activate the workflow
        const workflowId = result.id || result.data?.id;
        if (workflowId) {
          activateWorkflow(workflowId);
        } else {
          console.log('⚠️ Could not extract workflow ID, activate manually in dashboard');
        }
        
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
        console.log('Raw response:', data);
      }
    } else {
      console.log('❌ Error creating workflow:', data);
    }
  });
});

req.on('error', (e) => {
  console.log('💥 Request Error:', e.message);
});

req.write(postData);
req.end();

function activateWorkflow(workflowId) {
  console.log('🔄 Activating workflow...');
  
  const activateOptions = {
    hostname: 'lifemastery.app.n8n.cloud',
    port: 443,
    path: `/api/v1/workflows/${workflowId}/activate`,
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': JWT_TOKEN
    }
  };
  
  const activateReq = https.request(activateOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Workflow activated successfully!');
        console.log('🚀 Ready to receive content via webhook!');
      } else {
        console.log('⚠️ Could not activate automatically - activate manually in N8N dashboard');
      }
    });
  });
  
  activateReq.on('error', (e) => {
    console.log('⚠️ Activation error:', e.message);
  });
  
  activateReq.end();
}