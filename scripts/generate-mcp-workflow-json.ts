#!/usr/bin/env tsx
// Generate MCP Workflow JSON for Manual Import
// Create the enhanced workflow file for direct import into N8N

import { mcpWorkflowService } from '../src/services/mcp-enhanced-workflow'
import * as fs from 'fs'

async function generateMCPWorkflowJSON() {
  console.log('🎯 Generating MCP-Enhanced Workflow JSON for Import...')
  
  try {
    // Generate the workflow configuration
    const workflowConfig = await mcpWorkflowService.createContentProcessingWorkflow()
    
    // Create N8N importable format
    const n8nWorkflow = {
      name: workflowConfig.name,
      nodes: workflowConfig.nodes.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        typeVersion: 1,
        position: node.position,
        parameters: node.parameters,
        ...(node.notes && { notes: node.notes })
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
      staticData: null,
      tags: ['mcp-enhanced', 'content-pipeline'],
      meta: {}
    }
    
    // Save to file
    const filename = 'mcp-enhanced-workflow.json'
    fs.writeFileSync(filename, JSON.stringify(n8nWorkflow, null, 2))
    
    console.log('\n✅ MCP-Enhanced Workflow Generated!')
    console.log('=====================================')
    console.log(`📁 File saved: ${filename}`)
    console.log(`📊 Nodes: ${workflowConfig.nodes.length} total`)
    console.log(`🚀 MCP Enhanced: ${workflowConfig.nodes.filter(n => n.mcp_enhanced).length} nodes`)
    console.log('\n🎯 Enhanced Features:')
    console.log('   • AI-powered content analysis and quality scoring')
    console.log('   • Engagement prediction algorithms')
    console.log('   • Platform-specific optimization')
    console.log('   • Enhanced error handling and monitoring')
    console.log('   • Real-time database synchronization')
    console.log('   • Advanced notification system')
    
    console.log('\n📋 Import Instructions:')
    console.log('1. Open https://lifemastery.app.n8n.cloud')
    console.log('2. Click "+" to create new workflow')
    console.log('3. Click the "..." menu → "Import from file"')
    console.log(`4. Select the file: ${filename}`)
    console.log('5. Configure your API credentials')
    console.log('6. Activate the workflow')
    console.log('7. Test with sample content')
    
    console.log('\n🔗 Webhook Configuration:')
    console.log('   • Webhook path: /webhook/content-pipeline')
    console.log('   • Method: POST')
    console.log('   • Current webhook: /webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa')
    console.log('   • New webhook: [Will be generated after import]')
    
    console.log('\n🎉 Ready for import! The enhanced workflow is saved and ready to deploy.')
    
  } catch (error) {
    console.error('💥 Generation failed:', error)
  }
}

generateMCPWorkflowJSON().catch(console.error)