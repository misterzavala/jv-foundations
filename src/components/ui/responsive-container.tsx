/**
 * Responsive Container Components
 * Provides consistent mobile-first responsive behavior
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export function MobileContainer({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'px-4 sm:px-6 lg:px-8', // Responsive horizontal padding
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveGrid({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'grid gap-3 sm:gap-4 lg:gap-6',
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      className
    )}>
      {children}
    </div>
  );
}

export function ResponsiveStack({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'space-y-3 sm:space-y-4 lg:space-y-6',
      className
    )}>
      {children}
    </div>
  );
}

export function MobileScrollable({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0',
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveColumnsProps {
  children: ReactNode;
  className?: string;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function ResponsiveColumns({ 
  children, 
  className,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 }
}: ResponsiveColumnsProps) {
  const gridClasses = [
    'grid gap-3 sm:gap-4 lg:gap-6',
    `grid-cols-1`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(gridClasses, className)}>
      {children}
    </div>
  );
}

// Mobile-optimized card component
interface MobileCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function MobileCard({ children, className, padding = 'md' }: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  return (
    <div className={cn(
      'bg-card text-card-foreground rounded-lg border shadow-sm',
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-friendly button group
export function MobileButtonGroup({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row gap-2 sm:gap-3',
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized form layout
export function MobileFormLayout({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn(
      'space-y-4 sm:space-y-6',
      className
    )}>
      {children}
    </div>
  );
}

// Responsive text sizing
interface ResponsiveTextProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption';
  className?: string;
}

export function ResponsiveText({ children, variant = 'body', className }: ResponsiveTextProps) {
  const variants = {
    h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
    h2: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
    h3: 'text-lg sm:text-xl lg:text-2xl font-semibold',
    h4: 'text-base sm:text-lg font-medium',
    body: 'text-sm sm:text-base',
    caption: 'text-xs sm:text-sm text-muted-foreground',
  };

  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}