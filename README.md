
# Deal Tracking Dashboard

A comprehensive real estate deal tracking and management dashboard built with React, TypeScript, and Supabase.

## Project Overview

This application provides a complete solution for real estate professionals to track deals, manage partnerships, and monitor business performance through an intuitive dashboard interface.

## Features

### Dashboard & Analytics
- **Interactive Dashboard**: Customizable card-based layout with drag-and-drop functionality
- **Deal Pipeline Visualization**: Track deals through 8 stages from "Lead Submitted" to "Closing"
- **Performance Metrics**: Revenue tracking, partnership analytics, and activity monitoring
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Deal Management
- **Deal Tracking**: Complete deal lifecycle management with status progression
- **Enhanced Timeline**: Visual timeline with interactive status stepper
- **Deal Information**: Comprehensive deal details including property info, seller details, and partner information
- **Status Management**: 8-stage deal progression system

### Customization & Preferences
- **Card Management**: Show/hide dashboard cards with personalized preferences
- **Card Sizing**: Multiple size options (compact, standard, expanded)
- **Layout Persistence**: User preferences stored in Supabase
- **Theme Support**: Light/dark mode toggle

### Database Integration
- **Supabase Integration**: Complete backend with PostgreSQL database
- **Deal Storage**: Persistent deal data with JSONB support for flexible details
- **Card Preferences**: User customization settings storage
- **Migration System**: Structured database migrations for version control

## Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI component library

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Row Level Security (RLS)** - Database security policies
- **Real-time subscriptions** - Live data updates

### Routing & Navigation
- **React Router v6** - Client-side routing
- **Dynamic navigation** - Sidebar with active state management

### Development Tools
- **ESLint** - Code linting and quality
- **TypeScript** - Static type checking
- **PostCSS** - CSS processing
- **Component Tagger** - Development mode component identification

## Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── deal-tracking/         # Deal-specific components
│   │   ├── DealHeader.tsx
│   │   ├── DealInformation.tsx
│   │   ├── DealSidebar.tsx
│   │   ├── EnhancedDealTimeline.tsx
│   │   ├── SimpleDealTimeline.tsx
│   │   └── StatusStepper.tsx
│   ├── ActivityFeed.tsx       # Dashboard activity component
│   ├── CalendarIntegration.tsx
│   ├── CardActionsDialog.tsx  # Card management dialog
│   ├── CardManagerDropdown.tsx
│   ├── CardOptionsPopover.tsx
│   ├── CardRegistry.tsx       # Available cards registry
│   ├── ChartWidget.tsx
│   ├── DashboardLayout.tsx    # Main layout component
│   ├── DocumentTracker.tsx
│   ├── Header.tsx             # Application header
│   ├── MetricCard.tsx
│   ├── MonthlyRevenueGoals.tsx
│   ├── PartnerPerformance.tsx
│   ├── QuickNotes.tsx
│   ├── RecentDeals.tsx
│   ├── RecentReports.tsx
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── ThemeToggle.tsx
│   ├── TopPartners.tsx
│   └── TopSources.tsx
├── contexts/
│   └── CardPreferencesContext.tsx  # Card preferences state management
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── useCardResize.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client configuration
│       └── types.ts           # Generated database types
├── lib/
│   └── utils.ts               # Utility functions
├── pages/
│   ├── DealTracking.tsx       # Deal tracking page
│   ├── Index.tsx              # Home dashboard page
│   └── NotFound.tsx           # 404 page
├── styles/
│   └── masonry.css            # Masonry layout styles
└── utils/
    └── cardSizeUtils.ts       # Card sizing utilities
```

## Database Schema

### Tables

#### `deals`
- Deal lifecycle management
- Property and seller information
- Partner details and status tracking
- JSONB details field for flexible data storage

#### `card_preferences`
- User dashboard customization
- Card visibility and positioning
- Card sizing preferences (compact, standard, expanded)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for backend functionality)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd deal-tracking-dashboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Supabase credentials.

4. **Database Setup**
- Create a new Supabase project
- Run the migrations in `supabase/migrations/`
- Update the Supabase configuration in `src/integrations/supabase/client.ts`

5. **Start Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Development

### Adding New Dashboard Cards
1. Create the card component in `src/components/`
2. Register it in `src/components/CardRegistry.tsx`
3. Add default preferences to the database migration

### Database Migrations
Database changes are managed through SQL migrations in `supabase/migrations/`. Each migration file follows the naming convention:
```
YYYYMMDDHHMMSS-description.sql
```

### Component Development
- Use TypeScript for all components
- Follow the existing component structure in `src/components/ui/`
- Utilize shadcn/ui components for consistency
- Implement responsive design with Tailwind CSS

## Deployment

### Supabase Deployment
1. Create a production Supabase project
2. Run database migrations
3. Update environment variables

### Frontend Deployment
The application can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

## Configuration

### Environment Variables
See `.env.example` for required environment variables.

### Tailwind Configuration
Tailwind is configured in `tailwind.config.ts` with:
- Custom color schemes
- Sidebar-specific styling
- Animation utilities
- Component-specific extensions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For support and questions, please contact the development team.

---

Built with ❤️ using React, TypeScript, and Supabase.
