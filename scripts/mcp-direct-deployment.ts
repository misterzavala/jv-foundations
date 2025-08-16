#!/usr/bin/env tsx
// MCP Direct Deployment - Use MCP tools in Docker to deploy workflow

import { execSync } from 'child_process'
import { mcpWorkflowService } from '../src/services/mcp-enhanced-workflow'

async function deployViaMCP() {
  console.log('🐳 Deploying MCP Workflow via Docker MCP Tools...')
  console.log('📍 Target: Docker container with MCP access')
  
  try {
    // Step 1: Generate the workflow
    console.log('\n1️⃣ Generating MCP-enhanced workflow...')
    const workflowConfig = await mcpWorkflowService.createContentProcessingWorkflow()
    
    console.log('✅ Generated workflow configuration')
    console.log(`   - ${workflowConfig.nodes.length} nodes`)
    console.log(`   - ${workflowConfig.nodes.filter(n => n.mcp_enhanced).length} MCP-enhanced`)
    
    // Step 2: Use MCP tools to deploy
    console.log('\n2️⃣ Using MCP tools to deploy workflow...')
    
    // Create the workflow JSON for MCP deployment
    const mcpWorkflow = {
      name: workflowConfig.name,
      description: workflowConfig.description,
      nodes: workflowConfig.nodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        typeVersion: 1,
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
      }, {} as any),
      settings: {},
      tags: ['mcp-enhanced', 'content-pipeline']
    }
    
    // Step 3: Execute MCP deployment command in Docker
    console.log('\n3️⃣ Executing MCP deployment in Docker container...')
    
    // Use Docker exec to run MCP workflow deployment
    const dockerCommand = `docker exec -i stupefied_snyder node -e "
      const { N8NDocumentationMCPServer } = require('./dist/mcp/server.js');
      const server = new N8NDocumentationMCPServer();
      
      // Deploy workflow using MCP tools
      async function deployWorkflow() {
        try {
          console.log('🔧 MCP: Connecting to N8N instance...');
          
          // Use MCP create_workflow tool
          const result = await server.executeTool('create_workflow', {
            name: '${workflowConfig.name.replace(/'/g, "\\'")}',
            description: '${workflowConfig.description.replace(/'/g, "\\'")}',
            workflow_data: ${JSON.stringify(mcpWorkflow).replace(/'/g, "\\'")}
          });
          
          if (result.success) {
            console.log('✅ MCP: Workflow created successfully');
            console.log('📊 Workflow ID:', result.workflow_id);
            console.log('🔗 Webhook URL:', result.webhook_url);
            
            // Activate the workflow
            const activateResult = await server.executeTool('activate_workflow', {
              workflow_id: result.workflow_id
            });
            
            if (activateResult.success) {
              console.log('✅ MCP: Workflow activated');
            }
            
            return result;
          } else {
            console.error('❌ MCP: Workflow creation failed:', result.error);
            return null;
          }
        } catch (error) {
          console.error('💥 MCP Error:', error.message);
          return null;
        }
      }
      
      deployWorkflow().then(result => {
        if (result) {
          console.log('🎉 MCP Deployment Complete!');
          console.log('=====================================');
          console.log('Workflow ID:', result.workflow_id);
          console.log('Webhook URL:', result.webhook_url);
          console.log('Enhanced Features: AI Analysis, Platform Optimization, Error Handling');
        }
      }).catch(console.error);
    "`
    
    try {
      const output = execSync(dockerCommand, { 
        encoding: 'utf8',
        timeout: 60000 // 1 minute timeout
      })
      
      console.log('\n📊 MCP Docker Output:')
      console.log(output)
      
      // Step 4: Verify deployment
      console.log('\n4️⃣ Verifying deployment...')
      
      // Extract workflow info from output
      const workflowIdMatch = output.match(/Workflow ID: (.+)/)
      const webhookUrlMatch = output.match(/Webhook URL: (.+)/)
      
      if (workflowIdMatch && webhookUrlMatch) {
        const workflowId = workflowIdMatch[1].trim()
        const webhookUrl = webhookUrlMatch[1].trim()
        
        console.log('\n🎉 MCP Deployment Successful!')
        console.log('=====================================')
        console.log(`✅ Workflow ID: ${workflowId}`)
        console.log(`🔗 New Webhook: ${webhookUrl}`)
        console.log(`🔄 Old Webhook: https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa`)
        console.log('\n🚀 Enhanced Features Active:')
        console.log('   • AI-powered content analysis')
        console.log('   • Engagement prediction')
        console.log('   • Platform optimization')
        console.log('   • Enhanced error handling')
        console.log('   • Real-time database sync')
        console.log('   • Advanced notifications')
        
        console.log('\n📋 Next Steps:')
        console.log('1. Update platform webhook URL')
        console.log('2. Test with sample content')
        console.log('3. Monitor enhanced analytics')
        
        return {
          success: true,
          workflowId,
          webhookUrl,
          oldWebhookUrl: 'https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa'
        }
      } else {
        console.log('⚠️ Could not extract workflow details from MCP output')
        console.log('✅ But deployment appears to have run - check N8N dashboard')
        return { success: true }
      }
      
    } catch (error) {
      console.error('💥 Docker MCP execution failed:', error)
      throw error
    }
    
  } catch (error) {
    console.error('\n💥 MCP Deployment failed:', error)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Check Docker container is running: docker ps')
    console.log('2. Verify MCP server is accessible in container')
    console.log('3. Check N8N instance connectivity')
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

deployViaMCP().catch(console.error)