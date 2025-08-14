
import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CardPreferencesProvider } from "@/contexts/CardPreferencesContext";
import Index from "./pages/Index";
import DealTracking from "./pages/DealTracking";
import NotFound from "./pages/NotFound";
import ContentDashboard from "./pages/content-engine/ContentDashboard";
import AssetsPage from "./pages/content-engine/AssetsPage";

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CardPreferencesProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/deal-tracking" element={<DealTracking />} />
              
              {/* Content Engine Routes - Staff Only */}
              <Route path="/content" element={<ContentDashboard />} />
              <Route path="/content/assets" element={<AssetsPage />} />
              <Route path="/content/queue" element={<ContentDashboard />} />
              <Route path="/content/accounts" element={<ContentDashboard />} />
              <Route path="/content/analytics" element={<ContentDashboard />} />
              <Route path="/content/workflows" element={<ContentDashboard />} />
              <Route path="/content/scheduling" element={<ContentDashboard />} />
              <Route path="/content/errors" element={<ContentDashboard />} />
              <Route path="/content/preferences" element={<ContentDashboard />} />
              <Route path="/content/notifications" element={<ContentDashboard />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CardPreferencesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
