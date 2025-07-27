
import { useState } from "react";
import { MoreHorizontal, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CardOptionsPopoverProps {
  onRefresh?: () => void;
  onResize?: (size: 'small' | 'medium' | 'large') => void;
}

export function CardOptionsPopover({ onRefresh, onResize }: CardOptionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRefresh = () => {
    onRefresh?.();
    setIsOpen(false);
  };

  const handleResize = (size: 'small' | 'medium' | 'large') => {
    onResize?.(size);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-6 w-6 md:h-8 md:w-8">
          <MoreHorizontal size={14} className="md:hidden" />
          <MoreHorizontal size={16} className="hidden md:block" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sm"
            onClick={handleRefresh}
          >
            <RotateCcw size={14} className="mr-2" />
            Refresh
          </Button>
          <div className="border-t my-1" />
          <div className="text-xs text-muted-foreground px-2 py-1">Card Size</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sm"
            onClick={() => handleResize('small')}
          >
            <Minimize2 size={14} className="mr-2" />
            Small
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sm"
            onClick={() => handleResize('medium')}
          >
            <Maximize2 size={14} className="mr-2" />
            Medium
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sm"
            onClick={() => handleResize('large')}
          >
            <Maximize2 size={14} className="mr-2" />
            Large
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
