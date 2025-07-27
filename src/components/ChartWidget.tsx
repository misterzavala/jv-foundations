
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { CardActionsDialog } from "./CardActionsDialog";
import { useCardResize } from "@/hooks/useCardResize";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { getCardHeightClasses, CardSize } from "@/utils/cardSizeUtils";

interface ChartWidgetProps {
  title: string;
  subtitle: string;
}

const dealPipelineData = [
  { name: 'Jun 02', value: 15 },
  { name: 'Jun 03', value: 18 },
  { name: 'Jun 04', value: 22 },
  { name: 'Jun 05', value: 25 },
  { name: 'Jun 06', value: 28 },
  { name: 'Jun 07', value: 26 },
  { name: 'Jun 08', value: 31 },
];

export function ChartWidget({ title, subtitle }: ChartWidgetProps) {
  const { handleSizeShuffle } = useCardResize();
  const { refreshPreferences, getCardSize } = useCardPreferences();

  const cardSize = getCardSize('deal-pipeline') as CardSize;
  const heightClasses = getCardHeightClasses(cardSize);

  const handleRefresh = () => {
    console.log('Refreshing chart data...');
  };

  const handleExport = () => {
    console.log('Exporting chart data...');
  };

  const handleFilter = () => {
    console.log('Opening chart filters...');
  };

  const handleSizeShuffleAction = async () => {
    const success = await handleSizeShuffle('deal-pipeline');
    if (success) {
      await refreshPreferences();
    }
    return success;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-3 md:p-4 flex flex-col shadow-sm hover:shadow-md transition-all duration-300 ease-in-out ${heightClasses}`}>
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm md:text-base text-foreground font-medium truncate">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
        </div>
        <CardActionsDialog
          cardId="deal-pipeline"
          cardTitle={title}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onFilter={handleFilter}
          onSizeShuffle={handleSizeShuffleAction}
        />
      </div>

      <div className="flex-1 min-h-0 mb-3 md:mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dealPipelineData}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              className="md:text-xs"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              className="md:text-xs"
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#14b8a6" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-lg md:text-2xl font-bold text-foreground">23</div>
          <div className="text-xs text-muted-foreground">ACTIVE DEALS</div>
        </div>
        <div>
          <div className="text-lg md:text-2xl font-bold text-foreground">12</div>
          <div className="text-xs text-muted-foreground">CLOSED THIS MONTH</div>
        </div>
      </div>
    </div>
  );
}
