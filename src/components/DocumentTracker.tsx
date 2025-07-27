
import { FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

const documents = [
  {
    name: "Purchase Agreement - Main St",
    status: "completed",
    dueDate: "2 days ago",
    partner: "Sarah Johnson"
  },
  {
    name: "Property Inspection Report - Oak Ave",
    status: "pending",
    dueDate: "Due today",
    partner: "Mike Chen"
  },
  {
    name: "Title Search - Pine St",
    status: "overdue",
    dueDate: "3 days overdue",
    partner: "Lisa Rodriguez"
  },
  {
    name: "Financing Docs - Elm Street",
    status: "in_progress",
    dueDate: "Due in 2 days",
    partner: "David Park"
  }
];

export function DocumentTracker() {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('document-tracker') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing document tracker...');
  };

  const handleExport = () => {
    console.log('Exporting document data...');
  };

  const handleFilter = () => {
    console.log('Opening document filters...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('document-tracker');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col group transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <h3 className="text-sm md:text-base text-foreground font-medium">Document Tracker</h3>
        <CardActionsDialog
          cardId="document-tracker"
          cardTitle="Document Tracker"
          onRefresh={handleRefresh}
          onExport={handleExport}
          onFilter={handleFilter}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 md:space-y-3 pr-2">
          {documents.map((doc, index) => (
            <div key={index} className="border border-border rounded-lg p-2 md:p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start space-x-2 min-w-0 flex-1">
                  <FileText size={14} className="text-primary mt-0.5 flex-shrink-0 md:hidden" />
                  <FileText size={16} className="text-primary mt-0.5 flex-shrink-0 hidden md:block" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs md:text-sm font-medium text-foreground truncate">{doc.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{doc.partner}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {doc.status === 'completed' && <CheckCircle size={12} className="text-green-500" />}
                  {doc.status === 'pending' && <Clock size={12} className="text-yellow-500" />}
                  {doc.status === 'overdue' && <AlertCircle size={12} className="text-red-500" />}
                  {doc.status === 'in_progress' && <Clock size={12} className="text-blue-500" />}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  doc.status === 'completed' ? 'bg-green-100 text-green-800' :
                  doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  doc.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {doc.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-muted-foreground">{doc.dueDate}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
