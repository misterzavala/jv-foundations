
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const recentDeals = [
  {
    id: "D001",
    property: "123 Main St, Austin, TX",
    partner: "Sarah Johnson",
    value: "$25,000",
    status: "In Review",
    statusColor: "bg-yellow-500"
  },
  {
    id: "D002", 
    property: "456 Oak Ave, Dallas, TX",
    partner: "Mike Chen",
    value: "$18,500",
    status: "Under Contract",
    statusColor: "bg-blue-500"
  },
  {
    id: "D003",
    property: "789 Pine St, Houston, TX", 
    partner: "Lisa Rodriguez",
    value: "$32,000",
    status: "Closed",
    statusColor: "bg-green-500"
  }
];

export function RecentDeals() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('recent-deals') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing recent deals...');
  };

  const handleExport = () => {
    console.log('Exporting deals data...');
  };

  const handleFilter = () => {
    console.log('Opening deal filters...');
  };

  const handleSort = () => {
    console.log('Opening sort options...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('recent-deals');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group transition-all duration-300 ease-in-out shadow-sm hover:shadow-md ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm md:text-base text-foreground font-medium">Recent Deals</h3>
        <CardActionsDialog
          cardId="recent-deals"
          cardTitle="Recent Deals"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onFilter={handleFilter}
          onSort={handleSort}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-2 md:space-y-3 pr-2">
            {recentDeals.map((deal) => (
              <div key={deal.id} className="border border-border rounded-lg p-2 md:p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm font-medium text-foreground truncate">{deal.property}</div>
                    <div className="text-xs text-muted-foreground truncate">Partner: {deal.partner}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs md:text-sm font-semibold text-foreground">{deal.value}</div>
                  <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${deal.statusColor}`} />
                    <span className="text-xs text-muted-foreground">{deal.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
