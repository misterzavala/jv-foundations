import { Calendar, MapPin, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const upcomingEvents = [
  {
    title: "Property Showing - Main St",
    time: "10:00 AM",
    date: "Today",
    attendees: ["Sarah Johnson", "Buyer"],
    location: "123 Main St"
  },
  {
    title: "Deal Review Meeting",
    time: "2:30 PM", 
    date: "Today",
    attendees: ["Mike Chen", "Lisa Rodriguez"],
    location: "Office"
  },
  {
    title: "Property Inspection - Oak Ave",
    time: "9:00 AM",
    date: "Tomorrow",
    attendees: ["David Park", "Inspector"],
    location: "456 Oak Ave"
  },
  {
    title: "Closing - Pine St",
    time: "11:00 AM",
    date: "Friday",
    attendees: ["Sarah Johnson", "Title Company"],
    location: "789 Pine St"
  }
];

export function CalendarIntegration() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('calendar-integration') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing calendar events...');
  };

  const handleExport = () => {
    console.log('Exporting calendar data...');
  };

  const handleFilter = () => {
    console.log('Opening calendar filters...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('calendar-integration');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm md:text-base text-foreground font-medium">Upcoming Events</h3>
        <CardActionsDialog
          cardId="calendar-integration"
          cardTitle="Upcoming Events"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onFilter={handleFilter}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 md:space-y-3 pr-2">
          {upcomingEvents.map((event, index) => (
            <div key={index} className="border border-border rounded-lg p-2 md:p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-2 min-w-0 flex-1">
                  <Calendar size={14} className="text-primary mt-0.5 flex-shrink-0 md:hidden" />
                  <Calendar size={16} className="text-primary mt-0.5 flex-shrink-0 hidden md:block" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs md:text-sm font-medium text-foreground truncate">{event.title}</div>
                    <div className="text-xs text-muted-foreground">{event.date} at {event.time}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <MapPin size={10} className="text-muted-foreground md:hidden" />
                  <MapPin size={12} className="text-muted-foreground hidden md:block" />
                  <span className="text-xs text-muted-foreground truncate">{event.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users size={10} className="text-muted-foreground md:hidden" />
                  <Users size={12} className="text-muted-foreground hidden md:block" />
                  <span className="text-xs text-muted-foreground truncate">{event.attendees.join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
