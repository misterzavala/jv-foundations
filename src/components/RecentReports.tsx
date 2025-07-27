
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

export function RecentReports() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('recent-reports') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing recent reports...');
  };

  const handleExport = () => {
    console.log('Exporting reports data...');
  };

  const handleAddReport = () => {
    console.log('Adding new report...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('recent-reports');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-foreground font-medium">Recent Reports</h3>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            onClick={handleAddReport}
            title="Add Report"
          >
            <Plus size={16} />
          </Button>
          <CardActionsDialog
            cardId="recent-reports"
            cardTitle="Recent Reports"
            onRefresh={handleRefresh}
            onExport={handleExport}
            onSizeShuffle={handleSizeShuffleAction}
          />
        </div>
      </div>

      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <p className="text-sm">No reports have been created</p>
      </div>
    </div>
  );
}
