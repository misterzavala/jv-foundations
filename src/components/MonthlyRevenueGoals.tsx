
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const revenueGoals = [
  {
    month: "January",
    goal: "$50,000",
    current: "$38,500",
    percentage: 77,
    trend: "up"
  },
  {
    month: "February", 
    goal: "$55,000",
    current: "$42,200",
    percentage: 77,
    trend: "up"
  },
  {
    month: "March",
    goal: "$60,000",
    current: "$25,800",
    percentage: 43,
    trend: "down"
  }
];

export function MonthlyRevenueGoals() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('monthly-revenue-goals') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing revenue goals...');
  };

  const handleExport = () => {
    console.log('Exporting revenue data...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('monthly-revenue-goals');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm md:text-base text-foreground font-medium">Revenue Goals</h3>
        <CardActionsDialog
          cardId="monthly-revenue-goals"
          cardTitle="Revenue Goals"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 md:space-y-4 pr-2">
          {revenueGoals.map((goal, index) => (
            <div key={goal.month} className="border border-border rounded-lg p-2 md:p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs md:text-sm font-medium text-foreground">{goal.month}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">{goal.percentage}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Goal: {goal.goal}</span>
                <span className="font-semibold text-foreground">{goal.current}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 md:h-2 mt-2">
                <div 
                  className="bg-primary h-1.5 md:h-2 rounded-full transition-all duration-300"
                  style={{ width: `${goal.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
