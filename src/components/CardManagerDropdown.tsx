
import { useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CARD_REGISTRY } from "./CardRegistry";
import { useToast } from "@/hooks/use-toast";

interface CardManagerDropdownProps {
  visibleCards: string[];
  onCardToggle: (cardId: string, isVisible: boolean) => void;
  onSave?: () => void;
}

export function CardManagerDropdown({ visibleCards, onCardToggle, onSave }: CardManagerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const defaultCards = Object.values(CARD_REGISTRY).filter(card => card.category === 'default');
  const newCards = Object.values(CARD_REGISTRY).filter(card => card.category === 'new');

  const handleCardToggle = (cardId: string, checked: boolean) => {
    console.log('Card toggle requested:', cardId, checked);
    onCardToggle(cardId, checked);
  };

  const handleSave = () => {
    console.log('Save button clicked - forcing dashboard refresh');
    if (onSave) {
      onSave();
    }
    setIsOpen(false);
    toast({
      title: "Dashboard Updated",
      description: "Your card preferences have been saved and the dashboard has been refreshed.",
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="text-xs md:text-sm px-2 md:px-3 h-8 md:h-9">
          <span className="hidden sm:inline">Manage Cards</span>
          <span className="sm:hidden">Cards</span>
          <ChevronDown size={12} className="ml-1 md:ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-64 bg-popover border border-border shadow-lg rounded-lg p-2"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-sm font-medium text-foreground px-2 py-1">
          Default Cards
        </DropdownMenuLabel>
        <div className="space-y-2 px-2">
          {defaultCards.map((card) => (
            <div key={card.id} className="flex items-center space-x-3 py-1">
              <Checkbox
                id={card.id}
                checked={visibleCards.includes(card.id)}
                onCheckedChange={(checked) => handleCardToggle(card.id, checked as boolean)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor={card.id} 
                className="text-sm text-foreground cursor-pointer flex-1 select-none"
              >
                {card.title}
              </label>
            </div>
          ))}
        </div>

        <DropdownMenuSeparator className="my-3" />

        <DropdownMenuLabel className="text-sm font-medium text-foreground px-2 py-1">
          Additional Cards
        </DropdownMenuLabel>
        <div className="space-y-2 px-2">
          {newCards.map((card) => (
            <div key={card.id} className="flex items-center space-x-3 py-1">
              <Checkbox
                id={card.id}
                checked={visibleCards.includes(card.id)}
                onCheckedChange={(checked) => handleCardToggle(card.id, checked as boolean)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label 
                htmlFor={card.id} 
                className="text-sm text-foreground cursor-pointer flex-1 select-none"
              >
                {card.title}
              </label>
            </div>
          ))}
        </div>

        <DropdownMenuSeparator className="my-3" />

        <div className="px-2">
          <Button 
            onClick={handleSave}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
            size="sm"
          >
            <Save size={14} className="mr-2" />
            Save & Refresh
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
