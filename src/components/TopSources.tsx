
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

export function TopSources() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('top-sources') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing top sources...');
  };

  const handleExport = () => {
    console.log('Exporting top sources data...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('top-sources');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-foreground font-medium">Top Sources</h3>
        <CardActionsDialog
          cardId="top-sources"
          cardTitle="Top Sources"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <div className="space-y-3">
        <div className="text-muted-foreground text-sm">No data available</div>
      </div>
    </div>
  );
}
