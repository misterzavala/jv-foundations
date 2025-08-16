import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Code, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Copy, 
  ExternalLink,
  Download,
  Settings,
  Play,
  Monitor
} from "lucide-react";
import { mcpWorkflowService } from "@/services/mcp-enhanced-workflow";

export default function MCPWorkflowDeployment() {
  const [deploymentStep, setDeploymentStep] = useState<'prepare' | 'configure' | 'deploy' | 'test' | 'complete'>('prepare');
  const [workflowConfig, setWorkflowConfig] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isGeneratingConfig, setIsGeneratingConfig] = useState(false);

  const handleGenerateConfig = async () => {
    setIsGeneratingConfig(true);
    try {
      const workflow = await mcpWorkflowService.createContentProcessingWorkflow();
      setWorkflowConfig(JSON.stringify(workflow, null, 2));
      setDeploymentStep('configure');
    } catch (error) {
      console.error('Failed to generate workflow config:', error);
    } finally {
      setIsGeneratingConfig(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const StepIndicator = ({ step, currentStep, title }: { step: string, currentStep: string, title: string }) => (
    <div className={`flex items-center space-x-2 ${step === currentStep ? 'text-blue-600' : 'text-muted-foreground'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
        step === currentStep ? 'bg-blue-100 text-blue-600' : 'bg-muted'
      }`}>
        {['prepare', 'configure', 'deploy', 'test', 'complete'].indexOf(step) + 1}
      </div>
      <span className="text-sm font-medium">{title}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Zap className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">MCP-Enhanced Workflow Deployment</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Let's work together to deploy your enhanced content processing workflow with MCP capabilities.
          This will replace your existing workflow with advanced AI-powered features.
        </p>
      </div>

      {/* Step Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <StepIndicator step="prepare" currentStep={deploymentStep} title="Prepare" />
            <div className="h-px bg-border flex-1 mx-4" />
            <StepIndicator step="configure" currentStep={deploymentStep} title="Configure" />
            <div className="h-px bg-border flex-1 mx-4" />
            <StepIndicator step="deploy" currentStep={deploymentStep} title="Deploy" />
            <div className="h-px bg-border flex-1 mx-4" />
            <StepIndicator step="test" currentStep={deploymentStep} title="Test" />
            <div className="h-px bg-border flex-1 mx-4" />
            <StepIndicator step="complete" currentStep={deploymentStep} title="Complete" />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={deploymentStep} onValueChange={(value) => setDeploymentStep(value as any)}>
        {/* Step 1: Prepare */}
        <TabsContent value="prepare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Workflow Preparation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  We'll be working collaboratively in your N8N account: <strong>https://lifemastery.app.n8n.cloud</strong>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Enhanced Features</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• AI-powered content analysis</li>
                      <li>• Engagement prediction</li>
                      <li>• Platform optimization</li>
                      <li>• Enhanced error handling</li>
                      <li>• Real-time monitoring</li>
                      <li>• Database synchronization</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Current Workflow</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Webhook: a40af2fb-6d85-4db3-9791-e7cab329bcfa</li>
                      <li>• Instagram + TikTok publishing</li>
                      <li>• Basic Slack notifications</li>
                      <li>• Manual content processing</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center pt-4">
                <Button 
                  onClick={handleGenerateConfig} 
                  disabled={isGeneratingConfig}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isGeneratingConfig ? 'Generating...' : 'Generate MCP Workflow Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Configure */}
        <TabsContent value="configure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Workflow Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Copy this configuration and paste it into your N8N workflow editor.
                </AlertDescription>
              </Alert>

              {workflowConfig && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">MCP-Enhanced Workflow JSON</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(workflowConfig)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Configuration
                    </Button>
                  </div>
                  
                  <Textarea 
                    value={workflowConfig}
                    readOnly
                    className="font-mono text-xs h-64"
                    placeholder="Workflow configuration will appear here..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Next Steps:</h4>
                    <ol className="text-sm space-y-1">
                      <li>1. Open N8N in new tab</li>
                      <li>2. Create new workflow</li>
                      <li>3. Import JSON configuration</li>
                      <li>4. Configure API credentials</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Required Credentials:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Instagram Graph API token</li>
                      <li>• TikTok API credentials</li>
                      <li>• Supabase connection</li>
                      <li>• Webhook security keys</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button asChild variant="outline">
                  <a href="https://lifemastery.app.n8n.cloud" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open N8N Account
                  </a>
                </Button>
                <Button onClick={() => setDeploymentStep('deploy')}>
                  Configuration Ready
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 3: Deploy */}
        <TabsContent value="deploy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Workflow Deployment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  I'm ready to help you deploy the workflow in your N8N account. Please share your screen or let me know when you're ready.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Deployment Checklist:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium mb-1">Workflow Setup:</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>□ JSON configuration imported</li>
                        <li>□ All nodes connected properly</li>
                        <li>□ MCP enhancements verified</li>
                        <li>□ Error handling configured</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-1">Credentials:</h5>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>□ Instagram API connected</li>
                        <li>□ TikTok API connected</li>
                        <li>□ Supabase credentials set</li>
                        <li>□ Webhook security configured</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-medium">New Webhook URL (after deployment):</label>
                  <div className="flex space-x-2">
                    <Textarea 
                      placeholder="Paste the new webhook URL here after deployment..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline"
                      onClick={() => copyToClipboard(webhookUrl)}
                      disabled={!webhookUrl}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button onClick={() => setDeploymentStep('test')} disabled={!webhookUrl}>
                  Deployment Complete - Test Workflow
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Test */}
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <span>Workflow Testing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your MCP-enhanced workflow is deployed! Let's test it with real content from your platform.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Test Content:</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      We'll test with one of your existing assets to ensure everything works.
                    </p>
                    <Button variant="outline" className="w-full">
                      Send Test Content
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Monitor Results:</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Watch the workflow execution in N8N and check platform updates.
                    </p>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/console" target="_blank">
                        <Monitor className="h-4 w-4 mr-2" />
                        View Console
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Webhook Information:</h4>
                <div className="p-3 bg-muted rounded font-mono text-sm">
                  New Webhook: {webhookUrl || 'Not set'}
                </div>
                <div className="p-3 bg-muted rounded font-mono text-sm">
                  Old Webhook: https://lifemastery.app.n8n.cloud/webhook/a40af2fb-6d85-4db3-9791-e7cab329bcfa
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button onClick={() => setDeploymentStep('complete')} className="bg-green-600 hover:bg-green-700">
                  Tests Successful - Complete Deployment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 5: Complete */}
        <TabsContent value="complete" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Deployment Complete!</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your MCP-enhanced workflow is now live and processing content with advanced capabilities!
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-green-800 mb-2">✅ Successfully Deployed:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• MCP-enhanced content analysis</li>
                      <li>• AI-powered engagement prediction</li>
                      <li>• Platform-optimized publishing</li>
                      <li>• Enhanced error handling</li>
                      <li>• Real-time database sync</li>
                      <li>• Advanced notification system</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">🔗 Integration Points:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Content Management Platform</li>
                      <li>• Instagram Graph API</li>
                      <li>• TikTok Creator API</li>
                      <li>• Supabase Database</li>
                      <li>• Event Monitoring Console</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center pt-4">
                <div className="space-x-3">
                  <Button asChild>
                    <a href="/content/manage">
                      Go to Content Management
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/console" target="_blank">
                      <Monitor className="h-4 w-4 mr-2" />
                      Monitor Workflow
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}