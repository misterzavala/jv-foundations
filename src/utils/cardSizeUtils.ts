
export type CardSize = 'compact' | 'standard' | 'expanded';

// CSS Grid classes for responsive 12-column layout
export function getCardGridClasses(size: CardSize): string {
  switch (size) {
    case 'compact':
      return 'col-span-12 md:col-span-4';
    case 'standard':
      return 'col-span-12 md:col-span-6';
    case 'expanded':
      return 'col-span-12';
    default:
      return 'col-span-12 md:col-span-6';
  }
}

// Height classes optimized for CSS Grid auto-rows
export function getCardHeightClasses(size: CardSize): string {
  switch (size) {
    case 'compact':
      return 'h-40 md:h-48';
    case 'standard':
      return 'h-56 md:h-64';
    case 'expanded':
      return 'h-80 md:h-96';
    default:
      return 'h-56 md:h-64';
  }
}

// Default card sizes per card type for better visual hierarchy
export const defaultCardSizes: Record<string, CardSize> = {
  // Core cards - prominent display
  'recent-deals': 'standard',
  'deal-pipeline': 'expanded',
  'top-partners': 'standard',
  'activity-feed': 'standard',
  
  // Secondary cards - compact display
  'monthly-revenue-goals': 'compact',
  'quick-notes': 'compact',
  'document-tracker': 'compact',
  'top-sources': 'compact',
  'recent-reports': 'compact',
  
  // Interactive cards - expanded display
  'partner-performance': 'expanded',
  'calendar-integration': 'standard'
};

export function getCardSizeName(size: CardSize): string {
  switch (size) {
    case 'compact':
      return 'Compact';
    case 'standard':
      return 'Standard';
    case 'expanded':
      return 'Expanded';
    default:
      return 'Standard';
  }
}

export function getNextCardSize(currentSize: CardSize): CardSize {
  const SIZE_CYCLE: CardSize[] = ['compact', 'standard', 'expanded'];
  const currentIndex = SIZE_CYCLE.indexOf(currentSize);
  const nextIndex = (currentIndex + 1) % SIZE_CYCLE.length;
  return SIZE_CYCLE[nextIndex];
}

export function capitalizeSize(size: CardSize): string {
  return size.charAt(0).toUpperCase() + size.slice(1);
}
