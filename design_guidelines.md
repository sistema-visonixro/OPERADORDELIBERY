# Visonixro Admin Dashboard - Design Guidelines

## Design Approach
**Modern Dashboard System** - Drawing from professional business tools like Linear, Stripe Dashboard, and Vercel. Focus on data clarity, efficient workflows, and clean visual hierarchy for financial management.

## Layout Architecture

**Sidebar Navigation (Fixed Left)**
- Width: 240px desktop, collapsible to 64px icon-only mode
- Logo/branding at top
- Navigation sections: Dashboard, Clientes, Pagos, Suscripciones, Estadísticas
- User profile/settings at bottom
- Active state: Subtle background highlight with accent border-left

**Main Content Area**
- Max width: Fluid with padding (px-8)
- Page header: Title (2xl font), breadcrumbs, primary action button
- Content organized in cards/sections with clean separation

**Spacing System**
Primary units: **4, 6, 8, 12, 16** (Tailwind scale)
- Card padding: p-6
- Section gaps: gap-6 or gap-8
- Page margins: px-8 py-6

## Typography Hierarchy

**Font Family**: Inter (Google Fonts) - single family for entire dashboard

**Type Scale**:
- Page Titles: text-2xl font-semibold
- Section Headers: text-lg font-semibold
- Card Titles: text-base font-medium
- Body Text: text-sm font-normal
- Labels/Meta: text-xs font-medium uppercase tracking-wide
- Numbers/Stats: text-3xl font-bold (for metrics)

## Component Library

**Dashboard Cards**
- Background: white with subtle border
- Border radius: rounded-lg
- Shadow: subtle drop shadow on hover
- Stats display: Large number on top, label below, trend indicator (arrow + percentage)

**Data Tables**
- Striped rows for readability
- Hover state on rows
- Sticky header on scroll
- Status badges for payment states: "Pagado" (green), "Pendiente" (yellow), "Vencido" (red)
- Action buttons (icon-only) in last column

**Client Cards/List Items**
- Avatar/initial circle on left
- Name + project name
- Payment status badge
- Amount due (if applicable) - right-aligned, bold
- Quick actions menu (three-dot icon)

**Forms & Inputs**
- Labels: text-sm font-medium, mb-2
- Input fields: border, rounded-md, px-4 py-2
- Focus state: border accent color
- Grouped fields in grid layouts (grid-cols-2 gap-6)

**Navigation**
- Sidebar items: px-4 py-2, rounded-md
- Icons from Heroicons (outline for inactive, solid for active)
- Text: text-sm, font-medium on active

**Charts/Visualizations**
- Use Recharts library for bar charts, line graphs, pie charts
- Clean axis labels, gridlines
- Data point tooltips on hover
- Consistent spacing around charts (p-6 inside cards)

**Status Indicators**
- Badges: rounded-full px-3 py-1 text-xs font-semibold
- Payment types: Different badge styles for "Pago Único", "Cuotas", "Suscripción"
- Alert banners for overdue payments: Left accent border, icon, message

**Buttons**
- Primary: Solid background, white text, font-medium, px-6 py-2.5, rounded-md
- Secondary: Border style, transparent background
- Icon buttons: Rounded, p-2, icon size 20px
- Danger actions: Red variants for delete operations

## Page-Specific Layouts

**Dashboard Overview**
- Top row: 4 metric cards (grid-cols-4) showing total income, active clients, pending payments, active subscriptions
- Middle section: Recent transactions table + Quick actions sidebar (grid-cols-3 gap-8, 2:1 ratio)
- Bottom: Revenue chart (full width)

**Client Management**
- Header with search bar + "Agregar Cliente" button
- Filters: Dropdown for payment type, status
- Client cards in grid-cols-3 or data table view toggle
- Detail modal/side panel for editing

**Payment Tracking**
- Timeline view for installment payments
- Calendar integration for due dates
- Quick filters: "Vencidos Hoy", "Próximos 7 Días", "Al Día"

**Subscription Dashboard**
- Monthly recurring revenue (MRR) metric prominent
- List of subscriptions with renewal dates
- Auto-payment status indicators

**Statistics Page**
- Multiple chart types: Line graph for revenue trends, bar chart for monthly comparisons, pie chart for payment type distribution
- Date range selector (last 7/30/90 days, custom)
- Exportable data tables

## Animations
Minimal, performance-focused:
- Smooth page transitions (fade)
- Card hover lifts (subtle)
- Loading states: Skeleton screens for data tables
- NO decorative animations

## Data Visualization Principles
- Currency always formatted: L 1,500.00 (Lempiras)
- Dates: DD/MM/YYYY format
- Percentage changes with arrows (↑ ↓)
- Empty states with helpful illustrations and "Agregar" CTAs

## Responsive Behavior
- Desktop-first (primary use case)
- Tablet: Sidebar collapses to icons, grid-cols reduce
- Mobile: Bottom navigation, stacked cards, simplified tables (show key info only)

**Critical**: This is a data-heavy admin tool - prioritize information density and scanability over whitespace. Every component should serve a clear functional purpose for managing clients and finances efficiently.