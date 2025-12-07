import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  RefreshCcw,
  AlertTriangle,
  ArrowUpRight,
  Clock,
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
import {
  formatCurrency,
  formatDate,
  getInitials,
  getPaymentTypeLabel,
  getDaysUntilDue,
  utcToHondurasDate,
} from "@/lib/utils";
import type {
  DashboardStats,
  ClientWithPayments,
  Payment,
  MonthlyRevenue,
} from "@shared/schema";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  loading,
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
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p
              className="text-2xl font-bold mt-1 truncate"
              data-testid={`text-stat-${title
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              {value}
            </p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                )}
                <span
                  className={`text-xs font-medium ${
                    trend === "up" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {trendValue}
                </span>
                <span className="text-xs text-muted-foreground">
                  vs mes anterior
                </span>
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

function RecentPaymentItem({
  payment,
  clientName,
}: {
  payment: Payment;
  clientName: string;
}) {
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
        <p className="text-xs text-muted-foreground truncate">
          {formatDate(payment.dueDate)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold">
          {formatCurrency(Number(payment.amount))}
        </p>
        <Badge
          variant="secondary"
          className={`text-xs ${
            statusColors[payment.status as keyof typeof statusColors]
          }`}
        >
          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </Badge>
      </div>
    </div>
  );
}

function UpcomingPaymentItem({
  payment,
  clientName,
}: {
  payment: Payment;
  clientName: string;
}) {
  const daysUntil = payment.dueDate ? getDaysUntilDue(payment.dueDate) : NaN;
  const isOverdue = Number.isFinite(daysUntil) ? daysUntil < 0 : false;
  const isUrgent = Number.isFinite(daysUntil)
    ? daysUntil <= 3 && daysUntil >= 0
    : false;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div
        className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isOverdue
            ? "bg-red-500/10"
            : isUrgent
            ? "bg-yellow-500/10"
            : "bg-muted"
        }`}
      >
        {isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        ) : (
          <Clock
            className={`h-5 w-5 ${
              isUrgent ? "text-yellow-500" : "text-muted-foreground"
            }`}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{clientName}</p>
        <p
          className={`text-xs ${
            isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
          }`}
        >
          {isOverdue
            ? `Vencido hace ${Math.abs(daysUntil)} dias`
            : daysUntil === 0
            ? "Vence hoy"
            : `Vence en ${daysUntil} dias`}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold">
          {formatCurrency(Number(payment.amount))}
        </p>
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
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      try {
        const [rPagos, rClientes, rSubs, rContratos] = await Promise.all([
          supabase.from("pagos").select("monto"),
          supabase.from("clientes").select("*"),
          supabase
            .from("suscripciones")
            .select("*"),
          supabase
            .from("contratos")
            .select("*"),
        ]);

        const pagosData = Array.isArray(rPagos.data) ? rPagos.data : [];
        const clientesData = Array.isArray(rClientes.data)
          ? rClientes.data
          : [];
        const subsData = Array.isArray(rSubs.data) ? rSubs.data : [];
        const contratosData = Array.isArray(rContratos.data) ? rContratos.data : [];

        // Sumar todos los pagos realizados
        const totalPagos = pagosData.reduce(
          (s: number, p: any) => s + Number(p.monto ?? 0),
          0
        );
        
        // Sumar pagos iniciales de contratos
        const totalPagosInicialesContratos = contratosData.reduce(
          (s: number, c: any) => s + Number(c.pago_inicial ?? 0),
          0
        );
        
        // Total de ingresos = pagos + pagos iniciales de contratos
        const totalRevenue = totalPagos + totalPagosInicialesContratos;
        
        const totalClients = clientesData.length;
        const activeSubs = subsData.filter((s: any) =>
          s.is_active === undefined ? true : Boolean(s.is_active)
        );
        
        const activeSubscriptions = activeSubs.length;

        const monthlyRecurringRevenue = activeSubs.reduce(
          (sum: number, s: any) => {
            const mensualidad = parseFloat(s.mensualidad || 0);
            return sum + (isNaN(mensualidad) ? 0 : mensualidad);
          },
          0
        );

        // Comparar fechas en horario hondureño
        const today = new Date();
        const hondurasToday = utcToHondurasDate(today);
        if (hondurasToday) {
          hondurasToday.setHours(0, 0, 0, 0);
        }
        
        const pendingPayments = subsData.filter((s: any) => {
          if (!s.proxima_fecha_de_pago) return false;
          const hondurasDue = utcToHondurasDate(s.proxima_fecha_de_pago);
          if (!hondurasDue || !hondurasToday) return false;
          hondurasDue.setHours(0, 0, 0, 0);
          return hondurasDue <= hondurasToday;
        }).length;

        const overduePayments = pendingPayments;

        return {
          totalRevenue,
          totalClients,
          pendingPayments,
          activeSubscriptions,
          monthlyRecurringRevenue,
          overduePayments,
        } as DashboardStats;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error loading dashboard stats:", err);
        toast({ title: "Error cargando estadísticas", variant: "destructive" });
        return {
          totalRevenue: 0,
          totalClients: 0,
          pendingPayments: 0,
          activeSubscriptions: 0,
          monthlyRecurringRevenue: 0,
          overduePayments: 0,
        } as DashboardStats;
      }
    },
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<
    Array<{
      id: any;
      nombre: any;
      telefono: any;
      rtn: any;
      oficio: any;
      created_at: any;
    }>
  >({
    queryKey: ["dashboard", "clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id,nombre,telefono,rtn,oficio,created_at");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery<any[]>({
    queryKey: ["dashboard", "payments", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagos")
        .select(
          "id,fecha_de_creacion,tipo,referencia_id,cliente,proyecto,monto,notas"
        )
        .order("fecha_de_creacion", { ascending: false })
        .limit(5);
      if (error) throw error;
      const pagos = Array.isArray(data) ? data : [];
      // fetch clients map
      const clientIds = Array.from(
        new Set(pagos.map((p: any) => p.cliente).filter(Boolean))
      );
      const { data: clientsRes } = await supabase
        .from("clientes")
        .select("id,nombre")
        .in("id", clientIds);
      const cMap: Record<string, string> = {};
      (Array.isArray(clientsRes) ? clientsRes : []).forEach((c: any) => {
        if (c?.id) cMap[c.id] = c.nombre;
      });
      return pagos.map((p: any) => ({
        payment: {
          id: p.id,
          amount: p.monto,
          dueDate: p.fecha_de_creacion,
          status: "pagado",
        },
        clientName: cMap[p.cliente] ?? p.cliente ?? "Cliente",
        raw: p,
      }));
    },
  });

  const { data: upcomingPayments } = useQuery<any[]>({
    queryKey: ["dashboard", "payments", "upcoming"],
    queryFn: async () => {
      // upcoming: suscripciones with next payment in next 30 days or overdue
      const now = new Date();
      const hondurasNow = utcToHondurasDate(now);
      const hondurasSoon = hondurasNow ? new Date(hondurasNow) : new Date();
      if (hondurasSoon) {
        hondurasSoon.setDate(hondurasSoon.getDate() + 30);
      }
      
      // Fetch upcoming suscripciones
      const { data: subsData, error: subsErr } = await supabase
        .from("suscripciones")
        .select("id,cliente,proyecto,proxima_fecha_de_pago,mensualidad")
        .order("proxima_fecha_de_pago", { ascending: true })
        .limit(10);
      if (subsErr) throw subsErr;
      const subs = Array.isArray(subsData) ? subsData : [];

      // Fetch contratos that have proximo_pago set
      const { data: contratosData, error: contratosErr } = await supabase
        .from("contratos")
        .select(
          "id,cliente,proyecto,proximo_pago,monto_total,pago_inicial,cantidad_de_pagos"
        )
        .order("proximo_pago", { ascending: true })
        .limit(10);
      if (contratosErr) throw contratosErr;
      const contratos = Array.isArray(contratosData) ? contratosData : [];

      // Collect client ids from both sets
      const clientIds = Array.from(
        new Set(
          [
            ...subs.map((s: any) => s.cliente),
            ...contratos.map((c: any) => c.cliente),
          ].filter(Boolean)
        )
      );

      const { data: clientsRes } = await supabase
        .from("clientes")
        .select("id,nombre")
        .in("id", clientIds);
      const cMap: Record<string, string> = {};
      (Array.isArray(clientsRes) ? clientsRes : []).forEach((c: any) => {
        if (c?.id) cMap[c.id] = c.nombre;
      });

      // For contratos, fetch pagos to compute paid sums and remaining
      const contratoIds = contratos.map((c: any) => c.id).filter(Boolean);
      let pagosMap: Record<string, number> = {};
      if (contratoIds.length > 0) {
        const { data: pagosData, error: pagosErr } = await supabase
          .from("pagos")
          .select("referencia_id,monto,tipo")
          .in("referencia_id", contratoIds)
          .eq("tipo", "contrato");
        if (pagosErr) {
          // log but continue
          // eslint-disable-next-line no-console
          console.error(
            "Error cargando pagos para contratos en dashboard:",
            pagosErr
          );
        } else {
          const pagos = Array.isArray(pagosData) ? pagosData : [];
          pagos.forEach((p: any) => {
            if (!p || !p.referencia_id) return;
            const key = String(p.referencia_id);
            pagosMap[key] = (pagosMap[key] ?? 0) + Number(p.monto ?? 0);
          });
        }
      }

      const subsItems = subs.map((s: any) => ({
        payment: {
          id: s.id,
          amount: s.mensualidad,
          dueDate: s.proxima_fecha_de_pago,
          status: "pendiente",
        },
        clientName: cMap[s.cliente] ?? s.cliente ?? "Cliente",
      }));

      const contratoItems = contratos
        .filter((c: any) => c.proximo_pago)
        .map((c: any) => {
          // Calculate installment amount as (monto_total - pago_inicial) / cantidad_de_pagos
          const montoTotal = Number(c.monto_total ?? 0);
          const pagoInicial = Number(c.pago_inicial ?? 0);
          const cuotas = Math.max(1, Number(c.cantidad_de_pagos ?? 1));
          const cuota = (montoTotal - pagoInicial) / cuotas;
          const amount = Number.isFinite(cuota)
            ? cuota
            : Math.max(0, montoTotal - pagoInicial);
          return {
            payment: {
              id: c.id,
              amount: amount,
              dueDate: c.proximo_pago,
              status: "pendiente",
            },
            clientName: cMap[c.cliente] ?? c.cliente ?? "Cliente",
          };
        });

      // Combine both lists and sort by dueDate
      const combined = [...subsItems, ...contratoItems].sort((a, b) => {
        const ad = a.payment.dueDate
          ? new Date(a.payment.dueDate).getTime()
          : 0;
        const bd = b.payment.dueDate
          ? new Date(b.payment.dueDate).getTime()
          : 0;
        return ad - bd;
      });

      return combined.slice(0, 10);
    },
  });

  const { data: monthlyRevenue } = useQuery<any[]>({
    queryKey: ["dashboard", "revenue"],
    queryFn: async () => {
      // fetch pagos, contratos y suscripciones for last 6 months en horario hondureño
      const now = new Date();
      const hondurasNow = utcToHondurasDate(now);
      
      // Calcular hace 6 meses en horario hondureño
      const sixMonthsAgo = hondurasNow 
        ? new Date(hondurasNow.getFullYear(), hondurasNow.getMonth() - 5, 1)
        : new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      // Convertir a UTC para la consulta (sumar 6 horas)
      const sixMonthsAgoUTC = new Date(sixMonthsAgo.getTime() + (6 * 60 * 60 * 1000));
      
      const [pagosRes, contratosRes, suscripcionesRes] = await Promise.all([
        supabase
          .from("pagos")
          .select("id,fecha_de_creacion,monto,tipo")
          .gte("fecha_de_creacion", sixMonthsAgoUTC.toISOString())
          .order("fecha_de_creacion", { ascending: true }),
        supabase
          .from("contratos")
          .select("*")
          .gte("fecha_de_creacion", sixMonthsAgoUTC.toISOString()),
        supabase
          .from("suscripciones")
          .select("*")
          .gte("fecha_de_creacion", sixMonthsAgoUTC.toISOString()),
      ]);

      if (pagosRes.error) throw pagosRes.error;
      const pagos = Array.isArray(pagosRes.data) ? pagosRes.data : [];
      const contratos = Array.isArray(contratosRes.data) ? contratosRes.data : [];
      const suscripciones = Array.isArray(suscripcionesRes.data) ? suscripcionesRes.data : [];

      // build months array usando horario hondureño
      const months: Record<
        string,
        {
          month: string;
          oneTime: number;
          subscriptions: number;
          revenue: number;
        }
      > = {};
      const baseDate = hondurasNow || now;
      for (let i = 0; i < 6; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        months[key] = {
          month: d.toLocaleString(undefined, { month: "short" }),
          oneTime: 0,
          subscriptions: 0,
          revenue: 0,
        };
      }

      // Agregar pagos regulares (convertir fecha a horario hondureño)
      pagos.forEach((r: any) => {
        const hondurasDate = utcToHondurasDate(r.fecha_de_creacion);
        if (!hondurasDate) return;
        const key = `${hondurasDate.getFullYear()}-${(hondurasDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        if (!months[key]) return;
        const monto = Number(r.monto ?? 0);
        months[key].revenue += monto;
        if (String(r.tipo) === "suscripcion")
          months[key].subscriptions += monto;
        else months[key].oneTime += monto;
      });

      // Agregar pagos iniciales de contratos
      contratos.forEach((c: any) => {
        if (!c.pago_inicial) return;
        const hondurasDate = utcToHondurasDate(c.fecha_de_creacion);
        if (!hondurasDate) return;
        const key = `${hondurasDate.getFullYear()}-${(hondurasDate.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        if (!months[key]) return;
        const monto = Number(c.pago_inicial ?? 0);
        months[key].revenue += monto;
        months[key].oneTime += monto;
      });

      return Object.values(months);
    },
  });

  const { data: pagosAll } = useQuery<any[]>({
    queryKey: ["dashboard", "pagos", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagos").select("tipo,monto");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const paymentTypeDistribution = (
    Array.isArray(pagosAll) ? pagosAll : []
  ).reduce((acc: Record<string, number>, p: any) => {
    const type = p?.tipo ?? "unico";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(paymentTypeDistribution).map(
    ([name, value]) => ({
      name: getPaymentTypeLabel(name),
      value,
    })
  );

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          data-testid="text-page-title"
        >
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen general de tu negocio
        </p>
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
            <CardTitle className="text-lg font-semibold">
              Ingresos Mensuales
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Ultimos 6 meses
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => `L ${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [formatCurrency(value), ""]}
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
            <CardTitle className="text-lg font-semibold">
              Tipo de Pagos
            </CardTitle>
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
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
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
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">
              Transacciones Recientes
            </CardTitle>
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
            <CardTitle className="text-lg font-semibold">
              Proximos Vencimientos
            </CardTitle>
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
          <CardTitle className="text-lg font-semibold">
            Ingresos Recurrentes (MRR)
          </CardTitle>
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
              <p className="text-sm text-muted-foreground mt-1">
                Suscripciones Activas
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">
                {formatCurrency((stats?.monthlyRecurringRevenue || 0) * 12)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ARR Proyectado
              </p>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `L ${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Suscripciones",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="subscriptions"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
