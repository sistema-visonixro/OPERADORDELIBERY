# Visonixro Admin Dashboard

## Overview

Visonixro is a professional admin dashboard for managing web development clients, payments, and subscriptions. Built as a full-stack TypeScript application, it provides a comprehensive financial management system with a focus on data clarity and efficient workflows. The application follows modern SaaS dashboard design principles inspired by tools like Linear, Stripe Dashboard, and Vercel.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables

**Design System**
- Component library based on shadcn/ui "new-york" style preset
- Custom theme with light/dark mode support via ThemeProvider
- Typography: Inter font family for entire dashboard
- Spacing system using Tailwind's 4, 6, 8, 12, 16px scale
- Color system using HSL values with CSS custom properties for dynamic theming
- Responsive layout with fixed sidebar navigation (240px desktop, collapsible to 64px icon-only)

**Key Features**
- Dashboard with stats overview and revenue charts
- Client management (CRUD operations)
- Payment tracking with status badges (pagado/pendiente/vencido)
- Subscription management with active/inactive toggles
- Statistics page with data visualization using Recharts

### Backend Architecture

**Technology Stack**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL (via @neondatabase/serverless)
- **Schema Validation**: Zod with drizzle-zod for type-safe schema generation
- **Build Process**: ESBuild for server bundling with selective dependency bundling

**API Design**
RESTful API endpoints organized by resource:
- `/api/stats` - Dashboard statistics and metrics
- `/api/stats/revenue` - Monthly revenue data
- `/api/clients` - Client CRUD operations
- `/api/payments` - Payment management
- `/api/subscriptions` - Subscription management

**Data Models**
Three core entities with PostgreSQL tables:
1. **Clients**: Stores client information, project details, and payment type configuration
2. **Payments**: Individual payment records linked to clients with status tracking
3. **Subscriptions**: Recurring monthly payments with active/inactive status

### Database Schema

**Payment Types**: Three models supported
- "unico" - One-time payment
- "cuotas" - Installment payments
- "suscripcion" - Recurring subscription

**Payment Status**: Three states
- "pagado" - Paid
- "pendiente" - Pending
- "vencido" - Overdue

**Key Fields**:
- Clients: name, email, phone, projectName, projectDescription, paymentType, totalAmount, numberOfPayments
- Payments: clientId (foreign key), amount, status, dueDate, paidDate, paymentNumber, notes
- Subscriptions: clientId (foreign key), monthlyAmount, startDate, isActive, lastPaymentDate, nextPaymentDate

All tables use UUID primary keys generated via `gen_random_uuid()` and include appropriate timestamps.

### Development Workflow

**Build System**
- Development: `tsx` for hot-reload TypeScript execution
- Production: Custom build script that compiles frontend with Vite and backend with ESBuild
- Server dependencies are selectively bundled (allowlist) to reduce cold start times
- Static files served from Express in production

**Code Organization**
- `/client` - React frontend application
- `/server` - Express backend with routes and storage layer
- `/shared` - Shared TypeScript types and Drizzle schema
- Path aliases configured for clean imports: `@/`, `@shared/`, `@assets/`

**Storage Layer**
- Abstract `IStorage` interface defining all data operations
- `MemStorage` implementation for in-memory development/testing
- Database operations wrapped in try-catch with appropriate error responses
- All database queries return typed results based on Drizzle schema

### HTTP Server Configuration

**Middleware Stack**
- JSON body parsing with raw body preservation for webhook support
- URL-encoded form data support
- Request logging with timing and status codes
- Static file serving for production builds

**Development Mode**
- Vite middleware integration for HMR (Hot Module Replacement)
- Replit-specific plugins for development tools (cartographer, dev banner, runtime error overlay)
- Template reloading with cache-busting for index.html

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Cloud-hosted PostgreSQL with serverless driver
- Database URL configured via `DATABASE_URL` environment variable
- Drizzle Kit for schema migrations (migrations stored in `/migrations` directory)

### UI Components
- **Radix UI**: Headless component primitives for accessibility
  - 20+ component primitives (Dialog, Dropdown, Popover, Select, etc.)
- **Lucide React**: Icon library for consistent iconography
- **Recharts**: Chart library for data visualization (bar, line, pie, area charts)
- **date-fns**: Date manipulation and formatting
- **Embla Carousel**: Carousel/slider component
- **cmdk**: Command palette component

### Styling & Utilities
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant management for components
- **tailwind-merge**: Utility for merging Tailwind classes
- **clsx**: Conditional className utility

### Forms & Validation
- **React Hook Form**: Form state management
- **@hookform/resolvers**: Form validation resolvers
- **Zod**: Schema validation library

### Build Tools
- **Vite**: Frontend build tool and dev server
- **ESBuild**: Fast JavaScript/TypeScript bundler for backend
- **TypeScript**: Type safety across frontend and backend
- **PostCSS**: CSS processing with Autoprefixer

### Development Tools (Replit-specific)
- `@replit/vite-plugin-runtime-error-modal`: Runtime error overlay
- `@replit/vite-plugin-cartographer`: Development tooling
- `@replit/vite-plugin-dev-banner`: Development mode indicator

### Session & Storage
- **express-session**: Session middleware
- **connect-pg-simple**: PostgreSQL session store for production-ready session persistence