import ContentEngineLayout from "@/components/content-engine/layout/ContentEngineLayout";
import MCPWorkflowDeployment from "@/components/mcp/MCPWorkflowDeployment";

export default function MCPWorkflowPage() {
  return (
    <ContentEngineLayout>
      <div className="p-6">
        <MCPWorkflowDeployment />
      </div>
    </ContentEngineLayout>
  );
}