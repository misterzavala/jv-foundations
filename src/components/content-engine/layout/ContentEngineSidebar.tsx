import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FolderOpen, 
  Clock, 
  Users, 
  BarChart3, 
  Settings,
  Cog,
  Calendar,
  AlertTriangle,
  Bell,
  Sliders,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/content", icon: LayoutDashboard, isActive: true },
  { name: "Assets", href: "/content/assets", icon: FolderOpen, isActive: true },
  { name: "Queue", href: "/content/queue", icon: Clock, isActive: false },
  { name: "Accounts", href: "/content/accounts", icon: Users, isActive: false },
  { name: "Analytics", href: "/content/analytics", icon: BarChart3, isActive: false },
];

const automationItems = [
  { name: "Workflows", href: "/content/workflows", icon: Cog, isActive: false },
  { name: "Scheduling", href: "/content/scheduling", icon: Calendar, isActive: false },
  { name: "Errors", href: "/content/errors", icon: AlertTriangle, isActive: false },
];

const settingsItems = [
  { name: "Preferences", href: "/content/preferences", icon: Sliders, isActive: false },
  { name: "Notifications", href: "/content/notifications", icon: Bell, isActive: false },
];

interface ContentEngineSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export default function ContentEngineSidebar({ isOpen, onToggle, className }: ContentEngineSidebarProps) {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('aside') && !target.closest('[data-sidebar-toggle]')) {
        onToggle();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, isMobile, onToggle]);

  const NavItem = ({ item, isRouteActive }: { item: any; isRouteActive: boolean }) => {
    const IconComponent = item.icon;
    
    if (!item.isActive) {
      return (
        <div 
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-lg opacity-20 cursor-not-allowed",
            "text-sidebar-foreground"
          )}
        >
          <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
          <span className={cn("transition-opacity duration-200", !isOpen && "lg:opacity-0 lg:w-0")}>{item.name}</span>
        </div>
      );
    }
    
    return (
      <Link 
        to={item.href}
        onClick={isMobile ? onToggle : undefined}
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105",
          isRouteActive
            ? "bg-primary text-primary-foreground shadow-md animate-glow"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
        <span className={cn("transition-opacity duration-200", !isOpen && "lg:opacity-0 lg:w-0")}>{item.name}</span>
      </Link>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <h3 className={cn(
      "px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-opacity duration-200",
      !isOpen && "lg:opacity-0"
    )}>
      {title}
    </h3>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar border-r border-sidebar-border fixed left-0 top-0 bottom-0 overflow-y-auto z-50 transition-all duration-300 ease-in-out shadow-lg",
          isOpen ? "w-64" : "w-64 lg:w-16",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-center px-4 py-6 border-b border-sidebar-border">
          <div className={cn("flex items-center space-x-3 transition-opacity duration-200", !isOpen && "lg:opacity-0")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <FolderOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">Zavala AI</h1>
              <p className="text-xs text-muted-foreground">Wholesale Mastery</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <NavItem key={item.href} item={item} isRouteActive={location.pathname === item.href} />
            ))}
          </div>
          
          {/* Automation Section */}
          <div>
            <SectionHeader title="Automation" />
            <div className="mt-2 space-y-1">
              {automationItems.map((item) => (
                <NavItem key={item.href} item={item} isRouteActive={location.pathname === item.href} />
              ))}
            </div>
          </div>

          {/* Settings Section */}
          <div>
            <SectionHeader title="Settings" />
            <div className="mt-2 space-y-1">
              {settingsItems.map((item) => (
                <NavItem key={item.href} item={item} isRouteActive={location.pathname === item.href} />
              ))}
            </div>
          </div>
        </nav>

        {/* Footer with Collapse Button */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
          {/* Collapse Button */}
          <div className="flex justify-center">
            <button
              onClick={onToggle}
              data-sidebar-toggle
              className="hidden lg:flex p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors duration-200"
            >
              {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}