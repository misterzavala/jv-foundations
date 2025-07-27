
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const activities = [
  { type: "Deal submitted", partner: "Sarah Johnson", time: "2 h ago", status: "new" },
  { type: "Deal approved", partner: "Mike Chen", time: "4 h ago", status: "success" },
  { type: "Deal closed", partner: "Lisa Rodriguez", time: "6 h ago", status: "success" },
  { type: "Deal rejected", partner: "David Park", time: "1 d ago", status: "rejected" },
  { type: "Deal under review", partner: "Emma Wilson", time: "1 d ago", status: "pending" },
  { type: "Deal submitted", partner: "John Smith", time: "2 d ago", status: "new" },
  { type: "Deal closed", partner: "Sarah Johnson", time: "3 d ago", status: "success" },
  { type: "Partner joined", partner: "Alex Turner", time: "4 d ago", status: "success" },
];

export function ActivityFeed() {
  const { handleSizeShuffle } = useCardResize();
  const { getCardSize } = useCardPreferences();

  const cardSize = getCardSize('activity-feed') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing activity feed...');
  };

  const handleFilter = () => {
    console.log('Opening activity filters...');
  };

  const handleExport = () => {
    console.log('Exporting activity data...');
  };

  const handleSizeShuffleAction = async () => {
    return await handleSizeShuffle('activity-feed');
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group shadow-sm hover:shadow-md transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm md:text-base text-foreground font-medium">Recent Activity</h3>
        <CardActionsDialog
          cardId="activity-feed"
          cardTitle="Recent Activity"
          onRefresh={handleRefresh}
          onFilter={handleFilter}
          onExport={handleExport}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-2 md:space-y-3 pr-2">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-2 md:space-x-3 hover:bg-muted/50 p-1 rounded transition-colors">
                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${
                  activity.status === 'success' ? 'bg-green-500' : 
                  activity.status === 'pending' ? 'bg-yellow-500' :
                  activity.status === 'rejected' ? 'bg-red-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm text-foreground truncate">{activity.type}</div>
                  <div className="text-xs text-muted-foreground truncate">{activity.partner} • {activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
