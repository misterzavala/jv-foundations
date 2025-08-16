#!/usr/bin/env tsx
// Direct MCP Workflow Deployment
// Deploy enhanced workflow directly to N8N instance

import { mcpWorkflowService } from '../src/services/mcp-enhanced-workflow'

const N8N_BASE_URL = 'https://lifemastery.app.n8n.cloud'
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZTgxYzcwYi1kYjFjLTQ3ODctOGIxNy1kMGE5NGUxYTgxNjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1Mjk5MjM4fQ.tEQ4yoA72SS6q6Ax5sAHviziZQYD7SGMruXzLogVgik'

async function deployMCPWorkflow() {
  console.log('🚀 Starting Direct MCP Workflow Deployment...')
  console.log('📍 Target: https://lifemastery.app.n8n.cloud')
  console.log('🔑 Using API Key: Z@V@L@')
  
  try {
    // Step 1: Generate the MCP-enhanced workflow configuration
    console.log('\n1️⃣ Generating MCP-enhanced workflow configuration...')
    const workflowConfig = await mcpWorkflowService.createContentProcessingWorkflow()
    
    console.log('✅ Generated workflow with:')
    console.log(`   - ${workflowConfig.nodes.length} total nodes`)
    console.log(`   - ${workflowConfig.nodes.filter(n => n.mcp_enhanced).length} MCP-enhanced nodes`)
    console.log(`   - Platforms: Instagram + TikTok`)
    console.log(`   - Features: ${workflowConfig.nodes.filter(n => n.mcp_enhanced).flatMap(n => n.mcp_enhanced!.capabilities).join(', ')}`)
    
    // Step 2: Convert to N8N workflow format
    console.log('\n2️⃣ Converting to N8N workflow format...')
    const n8nWorkflow = {
      name: workflowConfig.name,
      nodes: workflowConfig.nodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        typeVersion: node.typeVersion || 1,
        position: node.position,
        parameters: node.parameters
      })),
      connections: workflowConfig.connections.reduce((acc, conn) => {
        if (!acc[conn.source]) {
          acc[conn.source] = {}
        }
        if (!acc[conn.source][conn.sourceOutput]) {
          acc[conn.source][conn.sourceOutput] = []
        }
        acc[conn.source][conn.sourceOutput].push({
          node: conn.destination,
          type: 'main',
          index: 0
        })
        return acc
      }, {} as any)
    }
    
    console.log('✅ Converted to N8N format')
    
    // Step 3: Deploy to N8N instance
    console.log('\n3️⃣ Deploying to N8N instance...')
    
    const deployResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      body: JSON.stringify(n8nWorkflow)
    })
    
    if (!deployResponse.ok) {
      const errorText = await deployResponse.text()
      throw new Error(`Deployment failed: ${deployResponse.status} - ${errorText}`)
    }
    
    const deployedWorkflow = await deployResponse.json()
    console.log('✅ Workflow deployed successfully!')
    console.log(`   - Workflow ID: ${deployedWorkflow.id}`)
    console.log(`   - Name: ${deployedWorkflow.name}`)
    
    // Step 4: Activate the workflow
    console.log('\n4️⃣ Activating workflow...')
    
    const activateResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${deployedWorkflow.id}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    })
    
    if (!activateResponse.ok) {
      console.warn('⚠️ Could not activate workflow automatically - you may need to activate it manually')
    } else {
      console.log('✅ Workflow activated!')
    }
    
    // Step 5: Get webhook URL
    console.log('\n5️⃣ Getting new webhook URL...')
    
    // Find the webhook node to get the URL
    const webhookNode = workflowConfig.nodes.find(n => n.type === 'n8n-nodes-base.webhook')
    const webhookPath = webhookNode?.parameters?.path || 'content-pipeline'
    const newWebhookUrl = `${N8N_BASE_URL}/webhook/${webhookPath}`
    
    console.log('\n🎉 MCP Workflow Deployment Complete!')
    console.log('=====================================')
    console.log(`✅ Workflow ID: ${deployedWorkflow.id}`)
    console.log(`🔗 New Webhook URL: ${newWebhookUrl}`)
    console.log(`📊 Enhanced Features: AI Analysis, Engagement Prediction, Platform Optimization`)
    console.log(`🔄 Old Webhook: ${N8N_BASE_URL}/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa`)
    console.log('\n📋 Next Steps:')
    console.log('1. Verify the workflow in your N8N dashboard')
    console.log('2. Test with sample content')
    console.log('3. Update platform to use new webhook URL')
    console.log('4. Monitor enhanced analytics and performance')
    
    return {
      success: true,
      workflowId: deployedWorkflow.id,
      webhookUrl: newWebhookUrl,
      oldWebhookUrl: `${N8N_BASE_URL}/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa`
    }
    
  } catch (error) {
    console.error('\n💥 Deployment failed:', error)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Check N8N API key is valid')
    console.log('2. Verify N8N instance is accessible')
    console.log('3. Ensure sufficient permissions for workflow creation')
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

deployMCPWorkflow().catch(console.error)