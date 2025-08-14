import { useState, ReactNode } from "react";
import ContentEngineHeader from "./ContentEngineHeader";
import ContentEngineSidebar from "./ContentEngineSidebar";
import { cn } from "@/lib/utils";

interface ContentEngineLayoutProps {
  children: ReactNode;
  onCreateAsset?: () => void;
  onBulkUpload?: () => void;
  className?: string;
}

export default function ContentEngineLayout({ 
  children, 
  onCreateAsset, 
  onBulkUpload,
  className 
}: ContentEngineLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <ContentEngineSidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        sidebarOpen ? "lg:ml-64" : "lg:ml-16"
      )}>
        {/* Header */}
        <ContentEngineHeader
          onToggleSidebar={toggleSidebar}
          onCreateAsset={onCreateAsset}
          onBulkUpload={onBulkUpload}
        />

        {/* Page Content */}
        <main className={cn("min-h-[calc(100vh-3.5rem)] bg-background", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}