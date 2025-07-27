
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MetricCard } from "@/components/MetricCard";
import { useCardPreferences } from "@/contexts/CardPreferencesContext";
import { CARD_REGISTRY } from "@/components/CardRegistry";
import { getCardGridClasses } from "@/utils/cardSizeUtils";

export function DashboardLayout() {
  const { getOrderedVisibleCards, loading, getCardSize } = useCardPreferences();
  const visibleCardIds = getOrderedVisibleCards();

  console.log('DashboardLayout render - loading:', loading, 'visibleCardIds:', visibleCardIds);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6 overflow-auto">
          {/* Top Metrics Row */}
          <section className="dashboard-section">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <MetricCard
                title="Active Deals"
                value="23"
                subtitle="this month"
                trend="up"
              />
              <MetricCard
                title="Pipeline Value"
                value="$450K"
                subtitle="estimated total"
                trend="up"
              />
              <MetricCard
                title="Partners"
                value="8"
                subtitle="active this month"
                trend="neutral"
              />
              <MetricCard
                title="Closed Deals"
                value="12"
                subtitle="this month"
                trend="up"
              />
              <MetricCard
                title="Avg Deal Size"
                value="$18.7K"
                subtitle="current month"
                trend="neutral"
              />
            </div>
          </section>

          {/* Dashboard Cards Section with CSS Grid */}
          {visibleCardIds.length > 0 ? (
            <section className="dashboard-section">
              <div className="dashboard-grid">
                {visibleCardIds.map((cardId) => {
                  const cardConfig = CARD_REGISTRY[cardId];
                  if (!cardConfig) {
                    console.warn('Card config not found for:', cardId);
                    return null;
                  }
                  
                  console.log('Rendering card:', cardId, cardConfig.title);
                  
                  const CardComponent = cardConfig.component;
                  const cardSize = getCardSize(cardId);
                  const gridClasses = getCardGridClasses(cardSize);
                  
                  return (
                    <div 
                      key={cardId} 
                      className={`grid-card-wrapper ${gridClasses}`}
                    >
                      <CardComponent />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="dashboard-section">
              <div className="text-center text-muted-foreground py-8">
                No cards selected. Use the "Manage Cards" dropdown to add cards to your dashboard.
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
