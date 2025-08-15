// Simplified ContentDashboard for debugging
import { useState } from "react";
import ContentEngineLayout from "@/components/content-engine/layout/ContentEngineLayout";

export default function ContentDashboardSimple() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateAsset = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <ContentEngineLayout onCreateAsset={handleCreateAsset}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Content Dashboard</h1>
        <p>Dashboard is loading...</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Total Assets</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Published</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Scheduled</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-sm font-medium text-gray-500">Failed</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>
      </div>
    </ContentEngineLayout>
  );
}