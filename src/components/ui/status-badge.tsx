import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
          label: "Draft"
        };
      case 'in_review':
      case 'in review':
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
          label: "In Review"
        };
      case 'scheduled':
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
          label: "Scheduled"
        };
      case 'published':
        return {
          color: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
          label: "Published"
        };
      case 'failed':
        return {
          color: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
          label: "Failed"
        };
      case 'archived':
        return {
          color: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200",
          label: "Archived"
        };
      case 'pending':
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
          label: "Pending"
        };
      case 'queued':
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
          label: "Queued"
        };
      case 'publishing':
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 animate-pulse",
          label: "Publishing"
        };
      case 'cancelled':
        return {
          color: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200",
          label: "Cancelled"
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
          label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      className={cn(
        "text-xs font-medium border transition-colors duration-200",
        config.color,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}