import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  RefreshCcw, 
  AlertTriangle,
  ArrowUpRight,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency, formatDate, getInitials, getPaymentTypeLabel, getDaysUntilDue } from "@/lib/utils";
import type { DashboardStats, ClientWithPayments, Payment, MonthlyRevenue } from "@shared/schema";
import { Link } from "wouter";

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  loading 
}: { 
  title: string; 
  value: string; 
  icon: React.ElementType; 
  trend?: "up" | "down"; 
  trendValue?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-elevate transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold mt-1 truncate" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                )}
                <span className={`text-xs font-medium ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
                  {trendValue}
                </span>
                <span className="text-xs text-muted-foreground">vs mes anterior</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentPaymentItem({ payment, clientName }: { payment: Payment; clientName: string }) {
  const statusColors = {
    pagado: "bg-green-500/10 text-green-600 dark:text-green-400",
    pendiente: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    vencido: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {getInitials(clientName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{clientName}</p>
        <p className="text-xs text-muted-foreground truncate">{formatDate(payment.dueDate)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold">{formatCurrency(Number(payment.amount))}</p>
        <Badge 
          variant="secondary" 
          className={`text-xs ${statusColors[payment.status as keyof typeof statusColors]}`}
        >
          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </Badge>
      </div>
    </div>
  );
}

function UpcomingPaymentItem({ payment, clientName }: { payment: Payment; clientName: string }) {
  const daysUntil = getDaysUntilDue(payment.dueDate);
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil <= 3 && daysUntil >= 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isOverdue ? "bg-red-500/10" : isUrgent ? "bg-yellow-500/10" : "bg-muted"
      }`}>
        {isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        ) : (
          <Clock className={`h-5 w-5 ${isUrgent ? "text-yellow-500" : "text-muted-foreground"}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{clientName}</p>
        <p className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
          {isOverdue 
            ? `Vencido hace ${Math.abs(daysUntil)} dias` 
            : daysUntil === 0 
              ? "Vence hoy" 
              : `Vence en ${daysUntil} dias`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold">{formatCurrency(Number(payment.amount))}</p>
      </div>
    </div>
  );
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<ClientWithPayments[]>({
    queryKey: ["/api/clients"],
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery<{ payment: Payment; clientName: string }[]>({
    queryKey: ["/api/payments/recent"],
  });

  const { data: upcomingPayments } = useQuery<{ payment: Payment; clientName: string }[]>({
    queryKey: ["/api/payments/upcoming"],
  });

  const { data: monthlyRevenue } = useQuery<MonthlyRevenue[]>({
    queryKey: ["/api/stats/revenue"],
  });

  const paymentTypeDistribution = clients?.reduce((acc, client) => {
    const type = client.paymentType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pieData = Object.entries(paymentTypeDistribution).map(([name, value]) => ({
    name: getPaymentTypeLabel(name),
    value,
  }));

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de tu negocio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Ingresos Totales"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={CreditCard}
          trend="up"
          trendValue="+12.5%"
          loading={statsLoading}
        />
        <StatsCard
          title="Clientes Activos"
          value={String(stats?.totalClients || 0)}
          icon={Users}
          trend="up"
          trendValue="+3"
          loading={statsLoading}
        />
        <StatsCard
          title="Pagos Pendientes"
          value={String(stats?.pendingPayments || 0)}
          icon={AlertTriangle}
          loading={statsLoading}
        />
        <StatsCard
          title="Suscripciones"
          value={String(stats?.activeSubscriptions || 0)}
          icon={RefreshCcw}
          trend="up"
          trendValue="+2"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Ingresos Mensuales</CardTitle>
            <Badge variant="secondary" className="text-xs">Ultimos 6 meses</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `L ${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar 
                    dataKey="oneTime" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]}
                    name="Pagos Unicos"
                  />
                  <Bar 
                    dataKey="subscriptions" 
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]}
                    name="Suscripciones"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Tipo de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Transacciones Recientes</CardTitle>
            <Link 
              href="/pagos" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
              data-testid="link-view-all-payments"
            >
              Ver todas
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : recentPayments && recentPayments.length > 0 ? (
              <div>
                {recentPayments.slice(0, 5).map(({ payment, clientName }) => (
                  <RecentPaymentItem 
                    key={payment.id} 
                    payment={payment} 
                    clientName={clientName} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay transacciones recientes</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Proximos Vencimientos</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {upcomingPayments?.length || 0} pendientes
            </Badge>
          </CardHeader>
          <CardContent>
            {upcomingPayments && upcomingPayments.length > 0 ? (
              <div>
                {upcomingPayments.slice(0, 5).map(({ payment, clientName }) => (
                  <UpcomingPaymentItem 
                    key={payment.id} 
                    payment={payment} 
                    clientName={clientName} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay pagos proximos a vencer</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ingresos Recurrentes (MRR)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(stats?.monthlyRecurringRevenue || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">MRR Actual</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {stats?.activeSubscriptions || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Suscripciones Activas</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {formatCurrency((stats?.monthlyRecurringRevenue || 0) * 12)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">ARR Proyectado</p>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `L ${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Suscripciones']}
                />
                <Line 
                  type="monotone" 
                  dataKey="subscriptions" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--chart-2))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
