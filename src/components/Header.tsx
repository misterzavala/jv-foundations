
import { Bell, Settings, ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  dealInfo?: {
    sellerAddress: string;
    sellerName: string;
    description: string;
    createdAt: string;
  };
  onDownloadReport?: () => void;
}

export function Header({ dealInfo, onDownloadReport }: HeaderProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric'
    });
  };

  const handleBackClick = () => {
    navigate("/");
  };

  return (
    <header className="border-b border-border bg-card flex-shrink-0">
      <div className="px-3 md:px-6">
        <div className="h-14 md:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
            {dealInfo ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBackClick}
                  className="flex items-center space-x-1 px-2 md:px-3 flex-shrink-0"
                >
                  <ArrowLeft size={14} className="md:hidden" />
                  <ArrowLeft size={16} className="hidden md:block" />
                  <span className="hidden sm:inline text-xs md:text-sm">Back</span>
                </Button>
                
                {/* Desktop: Horizontal layout */}
                <div className="hidden lg:flex lg:items-center lg:space-x-6 min-w-0">
                  <h1 className="text-xl font-bold text-foreground truncate">{dealInfo.sellerAddress}</h1>
                  <span className="text-base text-foreground truncate">{dealInfo.sellerName}</span>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Created {formatDate(dealInfo.createdAt)}</span>
                </div>

                {/* Mobile/Tablet: Vertical stack */}
                <div className="lg:hidden min-w-0 flex-1">
                  <h1 className="text-sm md:text-lg font-bold text-foreground truncate">{dealInfo.sellerAddress}</h1>
                  <div className="flex flex-col">
                    <p className="text-xs md:text-sm text-foreground truncate">{dealInfo.sellerName}</p>
                    <p className="text-xs text-muted-foreground">Created {formatDate(dealInfo.createdAt)}</p>
                  </div>
                </div>
              </>
            ) : (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm px-2 md:px-4">
                Add Deal
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
            {/* Download Report button - desktop only in header, mobile handled separately */}
            {dealInfo && onDownloadReport && (
              <Button 
                onClick={onDownloadReport}
                size="sm"
                className="hidden lg:flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Report</span>
              </Button>
            )}
            
            <ThemeToggle />
            
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-9 md:w-9">
              <Settings size={14} className="md:hidden" />
              <Settings size={18} className="hidden md:block" />
            </Button>
            
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-9 md:w-9">
              <Bell size={14} className="md:hidden" />
              <Bell size={18} className="hidden md:block" />
            </Button>
          </div>
        </div>

        {/* Mobile Download Report button - below header */}
        {dealInfo && onDownloadReport && (
          <div className="lg:hidden pb-3">
            <Button 
              onClick={onDownloadReport}
              size="sm"
              className="w-full flex items-center justify-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Report</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
