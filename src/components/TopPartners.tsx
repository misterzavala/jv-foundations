
import { TrendingUp, TrendingDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const topPartners = [
  {
    name: "Sarah Johnson",
    deals: 8,
    value: "$156K",
    trend: "up",
    change: "+23%"
  },
  {
    name: "Mike Chen", 
    deals: 6,
    value: "$124K",
    trend: "up",
    change: "+18%"
  },
  {
    name: "Lisa Rodriguez",
    deals: 5,
    value: "$98K", 
    trend: "down",
    change: "-5%"
  },
  {
    name: "David Park",
    deals: 4,
    value: "$87K",
    trend: "up", 
    change: "+12%"
  }
];

export function TopPartners() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('top-partners') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing top partners...');
  };

  const handleExport = () => {
    console.log('Exporting partners data...');
  };

  const handleSort = () => {
    console.log('Opening sort options...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('top-partners');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm md:text-base text-foreground font-medium">Top Partners</h3>
        <CardActionsDialog
          cardId="top-partners"
          cardTitle="Top Partners"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onSort={handleSort}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 md:space-y-3 pr-2">
          {topPartners.map((partner, index) => (
            <div key={partner.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-medium text-xs">
                    {partner.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs md:text-sm font-medium text-foreground truncate">{partner.name}</div>
                  <div className="text-xs text-muted-foreground">{partner.deals} deals</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs md:text-sm font-semibold text-foreground">{partner.value}</div>
                <div className="flex items-center space-x-1 justify-end">
                  {partner.trend === 'up' ? (
                    <TrendingUp size={10} className="text-green-500 md:hidden" />
                  ) : (
                    <TrendingDown size={10} className="text-red-500 md:hidden" />
                  )}
                  {partner.trend === 'up' ? (
                    <TrendingUp size={12} className="text-green-500 hidden md:block" />
                  ) : (
                    <TrendingDown size={12} className="text-red-500 hidden md:block" />
                  )}
                  <span className={`text-xs ${partner.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {partner.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
