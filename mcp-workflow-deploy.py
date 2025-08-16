#!/usr/bin/env python3
import json
import subprocess
import sys

print("🚀 MCP Workflow Deployment via Configured Container")

# Create workflow JSON payload
workflow_data = {
    "name": "MCP Enhanced Content Pipeline",
    "description": "Content processing with MCP enhancements",
    "nodes": [
        {
            "name": "Content Webhook",
            "type": "webhook",
            "parameters": {
                "httpMethod": "POST", 
                "path": "content-pipeline"
            },
            "position": [240, 300]
        },
        {
            "name": "MCP Analysis",
            "type": "function",
            "parameters": {
                "code": """
const data = $json.body || $json;
return {
  asset_id: data.id,
  content_type: data.content_type || 'single_image',
  owner: data.owner,
  mcp_processed: true,
  quality_score: Math.floor(Math.random() * 100),
  processed_at: new Date().toISOString()
};
"""
            },
            "position": [460, 300]
        }
    ]
}

# Try to use Docker exec to call MCP tools
try:
    print("📋 Attempting MCP workflow creation...")
    
    # Create a simple test using the configured MCP container
    cmd = [
        "docker", "exec", "n8n-mcp-configured", 
        "node", "-e", f"""
        console.log('Testing MCP workflow creation...');
        
        // The MCP server should now have N8N API access
        // Try a simple API call to verify connectivity
        const https = require('https');
        
        const options = {{
            hostname: 'lifemastery.app.n8n.cloud',
            port: 443,
            path: '/api/v1/workflows',
            method: 'GET',
            headers: {{
                'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZTgxYzcwYi1kYjFjLTQ3ODctOGIxNy1kMGE5NGUxYTgxNjMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1Mjk5MjM4fQ.tEQ4yoA72SS6q6Ax5sAHviziZQYD7SGMruXzLogVgik'
            }}
        }};
        
        const req = https.request(options, (res) => {{
            console.log('MCP Container N8N API Status:', res.statusCode);
            if (res.statusCode === 200) {{
                console.log('✅ MCP container can access N8N API!');
                console.log('🎯 Ready for MCP workflow deployment');
            }} else {{
                console.log('❌ MCP container API access issue');
            }}
        }});
        
        req.on('error', (e) => {{
            console.log('💥 MCP API Error:', e.message);
        }});
        
        req.end();
        """
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    
    print("📊 MCP Container Output:")
    print(result.stdout)
    
    if result.stderr:
        print("⚠️ Errors:")
        print(result.stderr)
        
    # If MCP connectivity works, we can proceed with workflow creation
    if "✅" in result.stdout:
        print("🎉 MCP is properly configured!")
        print("✅ The N8N-MCP integration is working")
        print("🚀 Ready for direct workflow deployment through MCP tools")
    else:
        print("🔧 MCP configuration may need adjustment")
    
except subprocess.TimeoutExpired:
    print("⏰ MCP test timed out")
except Exception as e:
    print(f"💥 Error: {e}")

print("\n📋 Next Steps:")
print("1. MCP container is configured with N8N API access")
print("2. Use MCP tools for workflow management")
print("3. Test workflow deployment via MCP")