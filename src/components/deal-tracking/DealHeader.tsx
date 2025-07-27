
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, MoreHorizontal } from "lucide-react";

interface DealHeaderProps {
  createdAt: string;
  sellerAddress: string;
  sellerName: string;
  description: string;
  dealId: string;
}

export function DealHeader({ 
  createdAt, 
  sellerAddress, 
  sellerName, 
  description: initialDescription,
  dealId 
}: DealHeaderProps) {
  const [description, setDescription] = useState(initialDescription);
  const [isEditing, setIsEditing] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  const handleDescriptionSave = () => {
    setIsEditing(false);
    // TODO: Save to backend
    console.log('Saving description:', description);
  };

  const handleDownloadReport = () => {
    console.log('Downloading report for deal:', dealId);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between">
        {/* Left: Creation Date */}
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Created</span>
          <span className="text-lg font-semibold text-foreground">
            {formatDate(createdAt)}
          </span>
        </div>

        {/* Center: Address, Name, Description */}
        <div className="flex-1 max-w-2xl mx-8">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-foreground">{sellerAddress}</h1>
            <p className="text-lg text-muted-foreground">{sellerName}</p>
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-center"
                  onBlur={handleDescriptionSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleDescriptionSave();
                    }
                    if (e.key === 'Escape') {
                      setDescription(initialDescription);
                      setIsEditing(false);
                    }
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <p 
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsEditing(true)}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleDownloadReport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download Report</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export Data</DropdownMenuItem>
              <DropdownMenuItem>Share Deal</DropdownMenuItem>
              <DropdownMenuItem>Archive Deal</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete Deal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
