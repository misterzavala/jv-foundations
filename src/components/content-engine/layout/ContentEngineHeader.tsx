import { Search, Bell, Menu, Plus, Upload, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useLocation } from "react-router-dom";

interface ContentEngineHeaderProps {
  onToggleSidebar: () => void;
  onCreateAsset?: () => void;
  onBulkUpload?: () => void;
  className?: string;
}

export default function ContentEngineHeader({ 
  onToggleSidebar, 
  onCreateAsset, 
  onBulkUpload,
  className 
}: ContentEngineHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications] = useState(3); // Mock notification count
  const location = useLocation();

  // Get dynamic title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/content") return "Dashboard";
    if (path === "/content/assets") return "Assets";
    if (path === "/content/queue") return "Queue";
    if (path === "/content/accounts") return "Accounts";
    if (path === "/content/analytics") return "Analytics";
    if (path === "/content/workflows") return "Workflows";
    if (path === "/content/scheduling") return "Scheduling";
    if (path === "/content/errors") return "Errors";
    if (path === "/content/preferences") return "Preferences";
    if (path === "/content/notifications") return "Notifications";
    return "Zavala AI";
  };

  return (
    <nav className={`bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/95 ${className}`}>
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Menu Toggle & Brand */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="p-2 hover:bg-accent"
              data-sidebar-toggle
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
              </div>
              <div>
                <span className="font-semibold text-lg text-foreground">{getPageTitle()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions - Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            <Button 
              size="sm" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
              onClick={onCreateAsset}
            >
              <Plus className="mr-1 h-3 w-3" />
              Create Asset
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="hover:bg-accent border-border"
              onClick={onBulkUpload}
            >
              <Upload className="mr-1 h-3 w-3" />
              Bulk Upload
            </Button>
          </div>
          
          {/* Mobile Quick Action */}
          <div className="md:hidden">
            <Button 
              size="sm" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onCreateAsset}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Search Bar - Desktop */}
          <div className="relative hidden sm:block">
            <Input
              type="text"
              placeholder="Search assets, campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 text-sm bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                onClick={() => setSearchQuery("")}
              >
                ×
              </Button>
            )}
          </div>

          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="sm"
            className="sm:hidden p-2 hover:bg-accent"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 hover:bg-accent"
          >
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs flex items-center justify-center animate-pulse"
              >
                {notifications}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative p-1 hover:bg-accent rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src="/avatars/staff-user.png" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1 border-border bg-card">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">Staff User</p>
                  <p className="text-xs text-muted-foreground">staff@company.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-accent cursor-pointer text-destructive focus:text-destructive">
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search Bar - Expandable */}
      <div className="sm:hidden border-t border-border px-4 py-2">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search assets, campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border-border"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        </div>
      </div>
    </nav>
  );
}