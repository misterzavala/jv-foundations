
import { useState } from "react";
import { 
  MoreHorizontal, 
  Download, 
  Share2, 
  RotateCcw,
  Filter,
  SortAsc,
  Shuffle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardSizeName, getNextCardSize, CardSize } from "@/utils/cardSizeUtils";

interface CardActionsDialogProps {
  cardId: string;
  cardTitle: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  onSort?: () => void;
  onSizeShuffle?: () => Promise<boolean>;
}

export function CardActionsDialog({ 
  cardId, 
  cardTitle, 
  onRefresh, 
  onExport,
  onFilter,
  onSort,
  onSizeShuffle
}: CardActionsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const { toast } = useToast();
  const { getCardSize } = useCardPreferences();

  const currentSize = getCardSize(cardId) as CardSize;
  const currentSizeName = getCardSizeName(currentSize);
  const nextSize = getNextCardSize(currentSize);
  const nextSizeName = getCardSizeName(nextSize);

  const handleAction = (action: () => void, message: string) => {
    action();
    setIsOpen(false);
    toast({
      title: "Action completed",
      description: message,
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsOpen(false);
    toast({
      title: "Link copied",
      description: "Dashboard link copied to clipboard.",
    });
  };

  const handleSizeShuffle = async () => {
    if (onSizeShuffle) {
      setIsShuffling(true);
      const success = await onSizeShuffle();
      setIsShuffling(false);
      setIsOpen(false);
      // Toast is handled in the onSizeShuffle function
    }
  };

  const actions = [
    ...(onRefresh ? [{
      icon: RotateCcw,
      label: "Refresh",
      action: () => handleAction(onRefresh, "Data refreshed successfully."),
    }] : []),
    ...(onExport ? [{
      icon: Download,
      label: "Export",
      action: () => handleAction(onExport, "Data exported successfully."),
    }] : []),
    ...(onFilter ? [{
      icon: Filter,
      label: "Filter",
      action: () => handleAction(onFilter, "Filter options opened."),
    }] : []),
    ...(onSort ? [{
      icon: SortAsc,
      label: "Sort",
      action: () => handleAction(onSort, "Sort options opened."),
    }] : []),
    ...(onSizeShuffle ? [{
      icon: Shuffle,
      label: "Resize",
      action: handleSizeShuffle,
    }] : []),
    {
      icon: Share2,
      label: "Share",
      action: handleShare,
    }
  ];

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-6 w-6 md:h-8 md:w-8">
            <MoreHorizontal size={14} className="md:hidden" />
            <MoreHorizontal size={16} className="hidden md:block" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-fit p-0 border-0 bg-transparent shadow-none"
          side="top"
          align="end"
          sideOffset={8}
          data-state={isOpen ? "open" : "closed"}
        >
          <div className="backdrop-blur-xl bg-background/70 border border-border/50 rounded-xl p-3 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-1">
              {actions.map((action, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 rounded-lg hover:bg-accent/50 transition-all duration-200 hover:scale-105 ${
                        action.label === 'Resize' && isShuffling ? 'animate-pulse' : ''
                      }`}
                      onClick={action.action}
                      disabled={action.label === 'Resize' && isShuffling}
                    >
                      <action.icon 
                        size={14} 
                        className={action.label === 'Resize' && isShuffling ? 'animate-spin' : ''} 
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={4}>
                    <p className="text-xs">
                      {action.label === 'Resize' 
                        ? `Resize to ${nextSizeName} (Current: ${currentSizeName})`
                        : action.label
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
