
import { 
  BarChart3, 
  Calendar, 
  DollarSign, 
  Home, 
  Phone, 
  Settings, 
  Target, 
  TrendingUp,
  Users,
  FolderOpen
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navigation = [
  { icon: Home, path: "/" },
  { icon: BarChart3, path: "/deal-tracking" },
  { icon: FolderOpen, path: "/content" }, // Content Engine - Staff Only
  { icon: DollarSign, path: "#" },
  { icon: Settings, path: "#" },
  { icon: Phone, path: "#" },
  { icon: Target, path: "#" },
  { icon: TrendingUp, path: "#" },
  { icon: Users, path: "#" },
  { icon: Calendar, path: "#" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    if (path !== "#") {
      navigate(path);
    }
  };

  return (
    <div className="w-16 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4">
      {/* Logo */}
      <div className="w-8 h-8 bg-primary rounded-lg mb-6 flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">M</span>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navigation.map((item, index) => {
          const isActive = location.pathname === item.path;
          const isClickable = item.path !== "#";
          
          return (
            <button
              key={index}
              onClick={() => handleNavigation(item.path)}
              disabled={!isClickable}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isClickable
                  ? "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent cursor-pointer"
                  : "text-sidebar-foreground/50 cursor-not-allowed"
              }`}
            >
              <item.icon size={20} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
