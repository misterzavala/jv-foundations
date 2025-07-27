
import { Edit3, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const quickNotes = [
  {
    id: 1,
    content: "Follow up with Sarah Johnson about the Oak Ave property - she mentioned potential financing concerns",
    timestamp: "2 hours ago",
    priority: "high"
  },
  {
    id: 2,
    content: "Research comparable sales for Pine St area before meeting with Lisa Rodriguez",
    timestamp: "4 hours ago", 
    priority: "medium"
  },
  {
    id: 3,
    content: "Schedule property inspection for Main St deal - waiting on seller availability",
    timestamp: "1 day ago",
    priority: "low"
  }
];

export function QuickNotes() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('quick-notes') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing quick notes...');
  };

  const handleExport = () => {
    console.log('Exporting notes...');
  };

  const handleSort = () => {
    console.log('Opening sort options...');
  };

  const handleAddNote = () => {
    console.log('Adding new note...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('quick-notes');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm md:text-base text-foreground font-medium">Quick Notes</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground hover:text-foreground"
            onClick={handleAddNote}
            title="Add New Note"
          >
            <Plus size={12} className="md:hidden" />
            <Plus size={14} className="hidden md:block" />
          </Button>
        </div>
        <CardActionsDialog
          cardId="quick-notes"
          cardTitle="Quick Notes"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onSort={handleSort}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 md:space-y-3 pr-2">
          {quickNotes.map((note) => (
            <div key={note.id} className="border border-border rounded-lg p-2 md:p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                  note.priority === 'high' ? 'bg-red-500' : 
                  note.priority === 'medium' ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`} />
                <Button variant="ghost" size="icon" className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground hover:text-foreground ml-2">
                  <Edit3 size={10} className="md:hidden" />
                  <Edit3 size={12} className="hidden md:block" />
                </Button>
              </div>
              <p className="text-xs md:text-sm text-foreground mb-2 leading-relaxed">{note.content}</p>
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock size={10} className="md:hidden" />
                <Clock size={12} className="hidden md:block" />
                <span className="text-xs">{note.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
