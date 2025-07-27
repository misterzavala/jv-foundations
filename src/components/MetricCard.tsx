
interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend: "up" | "down" | "neutral";
}

export function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 md:p-4 min-w-0">
      <h3 className="text-xs md:text-sm text-muted-foreground mb-1 truncate">{title}</h3>
      <div className="text-lg md:text-2xl font-bold text-foreground mb-1 truncate">{value}</div>
      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>
  );
}
