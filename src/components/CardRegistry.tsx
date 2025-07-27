
import { RecentDeals } from "./RecentDeals";
import { ChartWidget } from "./ChartWidget";
import { TopPartners } from "./TopPartners";
import { ActivityFeed } from "./ActivityFeed";
import { MonthlyRevenueGoals } from "./MonthlyRevenueGoals";
import { QuickNotes } from "./QuickNotes";
import { PartnerPerformance } from "./PartnerPerformance";
import { DocumentTracker } from "./DocumentTracker";
import { CalendarIntegration } from "./CalendarIntegration";

export interface CardConfig {
  id: string;
  title: string;
  component: React.ComponentType;
  category: 'default' | 'new';
}

export const CARD_REGISTRY: Record<string, CardConfig> = {
  'recent-deals': {
    id: 'recent-deals',
    title: 'Recent Deals',
    component: RecentDeals,
    category: 'default'
  },
  'deal-pipeline': {
    id: 'deal-pipeline',
    title: 'Deal Pipeline',
    component: () => <ChartWidget title="Deal Pipeline" subtitle="DEALS BY STATUS OVER TIME" />,
    category: 'default'
  },
  'top-partners': {
    id: 'top-partners',
    title: 'Top Partners',
    component: TopPartners,
    category: 'default'
  },
  'activity-feed': {
    id: 'activity-feed',
    title: 'Activity Feed',
    component: ActivityFeed,
    category: 'default'
  },
  'monthly-revenue-goals': {
    id: 'monthly-revenue-goals',
    title: 'Monthly Revenue Goals',
    component: MonthlyRevenueGoals,
    category: 'new'
  },
  'quick-notes': {
    id: 'quick-notes',
    title: 'Quick Notes',
    component: QuickNotes,
    category: 'new'
  },
  'partner-performance': {
    id: 'partner-performance',
    title: 'Partner Performance',
    component: PartnerPerformance,
    category: 'new'
  },
  'document-tracker': {
    id: 'document-tracker',
    title: 'Document Tracker',
    component: DocumentTracker,
    category: 'new'
  },
  'calendar-integration': {
    id: 'calendar-integration',
    title: 'Calendar Integration',
    component: CalendarIntegration,
    category: 'new'
  }
};
