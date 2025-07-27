
import { Star, Award } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const partnerPerformance = [
  {
    name: "Sarah Johnson",
    rating: 4.8,
    deals: 8,
    avgCloseTime: "14 days",
    reliability: "Excellent"
  },
  {
    name: "Mike Chen",
    rating: 4.6,
    deals: 6,
    avgCloseTime: "18 days", 
    reliability: "Very Good"
  },
  {
    name: "Lisa Rodriguez",
    rating: 4.2,
    deals: 5,
    avgCloseTime: "22 days",
    reliability: "Good"
  }
];

export function PartnerPerformance() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('partner-performance') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing partner performance...');
  };

  const handleExport = () => {
    console.log('Exporting partner performance data...');
  };

  const handleSort = () => {
    console.log('Opening sort options...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('partner-performance');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm md:text-base text-foreground font-medium">Partner Performance</h3>
        <CardActionsDialog
          cardId="partner-performance"
          cardTitle="Partner Performance"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onSort={handleSort}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 md:space-y-3 pr-2">
          {partnerPerformance.map((partner, index) => (
            <div key={partner.name} className="border border-border rounded-lg p-2 md:p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-medium text-xs">
                      {partner.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs md:text-sm font-medium text-foreground truncate">{partner.name}</div>
                    <div className="flex items-center space-x-1">
                      <Star size={10} className="text-yellow-500 fill-current md:hidden" />
                      <Star size={12} className="text-yellow-500 fill-current hidden md:block" />
                      <span className="text-xs text-foreground">{partner.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs md:text-sm font-semibold text-foreground">{partner.deals} deals</div>
                  <div className="text-xs text-muted-foreground">{partner.avgCloseTime}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Reliability</span>
                <div className="flex items-center space-x-1">
                  <Award size={10} className="text-primary md:hidden" />
                  <Award size={12} className="text-primary hidden md:block" />
                  <span className="text-xs text-foreground">{partner.reliability}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
