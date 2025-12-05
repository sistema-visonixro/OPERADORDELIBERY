import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Calendar,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import CobroForm from "@/components/cobro-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  formatCurrency,
  formatDate,
  getInitials,
  getDaysUntilDue,
} from "@/lib/utils";
import type { Payment } from "@shared/schema";

interface PaymentWithClient extends Omit<
  Payment,
  | "clientId"
  | "referenceId"
  | "amount"
  | "dueDate"
  | "paidDate"
  | "notes"
  | "paymentNumber"
> {
  clientId?: string | null;
  referenceId?: string | null;
  amount: string;
  clientName: string;
  projectName: string;
  tipo?: string | null;
  dueDate?: string | null;
  paidDate?: string | null;
  notes?: string | null;
  status: Payment["status"];
  paymentNumber?: number | null;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config = {
    pagado: {
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-600 dark:text-green-400",
      label: "Pagado",
    },
    pendiente: {
      icon: Clock,
      className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      label: "Pendiente",
    },
    vencido: {
      icon: AlertTriangle,
      className: "bg-red-500/10 text-red-600 dark:text-red-400",
      label: "Vencido",
    },
  };

  const {
    icon: Icon,
    className,
    label,
  } = config[status as keyof typeof config] || config.pendiente;

  return (
    <Badge variant="secondary" className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

function PaymentCard({
  payment,
  onMarkPaid,
}: {
  payment: PaymentWithClient;
  onMarkPaid: (id: string) => void;
}) {
  const daysUntil = payment.dueDate ? getDaysUntilDue(payment.dueDate) : NaN;
  const isOverdue = daysUntil < 0 && payment.status !== "pagado";
  const isUrgent =
    daysUntil <= 3 && daysUntil >= 0 && payment.status === "pendiente";

  return (
    <Card
      onClick={() => undefined}
      className={`hover-elevate transition-all cursor-pointer ${
        isOverdue ? "border-red-500/50" : isUrgent ? "border-yellow-500/50" : ""
      }`}
      data-testid={`card-payment-${payment.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(payment.clientName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{payment.clientName}</p>
              <p className="text-sm text-muted-foreground truncate">
                {payment.projectName}
              </p>
              {payment.tipo && (
                <div className="mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {String(payment.tipo)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {payment.status !== "pagado" && (
                <DropdownMenuItem
                  onClick={() => onMarkPaid(payment.id)}
                  data-testid="menu-mark-paid"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como pagado
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Monto:</span>
            <span className="text-lg font-bold">
              {formatCurrency(Number(payment.amount))}
            </span>
          </div>

          {payment.paymentNumber && payment.paymentNumber > 1 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Cuota:</span>
              <span className="text-sm">#{payment.paymentNumber}</span>
            </div>
          )}

          {payment.paidDate && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                Fecha de pago:
              </span>
              <span className="text-sm text-green-600 dark:text-green-400">
                {formatDate(payment.paidDate)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
          <PaymentStatusBadge status={payment.status} />
          {payment.status === "pendiente" && (
            <span
              className={`text-xs ${
                isOverdue
                  ? "text-red-500"
                  : isUrgent
                  ? "text-yellow-500"
                  : "text-muted-foreground"
              }`}
            >
              {Number.isFinite(daysUntil)
                ? isOverdue
                  ? `Vencido hace ${Math.abs(daysUntil)} dias`
                  : daysUntil === 0
                  ? "Vence hoy"
                  : `Vence en ${daysUntil} dias`
                : "Fecha no disponible"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentRow({
  payment,
  onMarkPaid,
}: {
  payment: PaymentWithClient;
  onMarkPaid: (id: string) => void;
}) {
  const daysUntil = payment.dueDate ? getDaysUntilDue(payment.dueDate) : NaN;
  const isOverdue = daysUntil < 0 && payment.status !== "pagado";

  return (
    <div
      className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover-elevate"
      data-testid={`row-payment-${payment.id}`}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {getInitials(payment.clientName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 items-center">
        <div className="min-w-0">
          <p className="font-medium truncate">{payment.clientName}</p>
          <p className="text-sm text-muted-foreground truncate">
            {payment.projectName}
          </p>
        </div>

        <div className="text-sm">
          <span className="font-semibold">
            {formatCurrency(Number(payment.amount))}
          </span>
          {payment.paymentNumber && payment.paymentNumber > 1 && (
            <span className="text-muted-foreground ml-1">
              (Cuota #{payment.paymentNumber})
            </span>
          )}
        </div>

        <div
          className={`text-sm ${isOverdue ? "text-red-500 font-medium" : ""}`}
        >
          {formatDate(payment.dueDate)}
        </div>

        <div>
          <PaymentStatusBadge status={payment.status} />
        </div>

        <div className="text-sm text-muted-foreground">
          {payment.paidDate ? formatDate(payment.paidDate) : "-"}
        </div>
      </div>

      {payment.status !== "pagado" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMarkPaid(payment.id)}
          className="flex-shrink-0"
          data-testid={`button-mark-paid-${payment.id}`}
        >
          <Check className="h-4 w-4 mr-1" />
          Pagado
        </Button>
      )}
    </div>
  );
}

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const { data: payments, isLoading } = useQuery<any[]>({
    queryKey: ["pagos"],
    queryFn: async () => {
      // load pagos and map client/project names
      const { data, error } = await supabase
        .from("pagos")
        .select(
          "id,fecha_de_creacion,tipo,referencia_id,cliente,proyecto,monto,notas"
        )
        .order("fecha_de_creacion", { ascending: false });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const [cobroOpen, setCobroOpen] = useState(false);

  // invoice preview state
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const invoiceFrameRef = useRef<HTMLIFrameElement | null>(null);

  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          supabase.from("proyectos").select("id,nombre"),
          supabase.from("clientes").select("id,nombre"),
        ]);
        const pData = Array.isArray(pRes.data) ? pRes.data : [];
        const cData = Array.isArray(cRes.data) ? cRes.data : [];
        const pMap: Record<string, string> = {};
        const cMap: Record<string, string> = {};
        pData.forEach((p: any) => {
          if (p?.id) pMap[p.id] = p.nombre ?? p.id;
        });
        cData.forEach((c: any) => {
          if (c?.id) cMap[c.id] = c.nombre ?? c.id;
        });
        setProjectsMap(pMap);
        setClientsMap(cMap);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error cargando meta en Pagos:", err);
      }
    })();
  }, []);

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      // For pagos table, a payment record already represents a completed payment.
      // If you need to mark an external scheduled payment as paid, implement here.
      return Promise.resolve(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Pago registrado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al registrar pago", variant: "destructive" });
    },
  });

  async function openInvoiceForPayment(payment: PaymentWithClient) {
    try {
      // fetch config
      const { data: cfgData } = await supabase
        .from("configuracion")
        .select("*")
        .limit(1);
      const config = Array.isArray(cfgData) && cfgData.length ? cfgData[0] : {};

      const extra: any = {};
      // if suscripcion, fetch next date
      try {
        if (payment.tipo === "suscripcion" && (payment as any).referenceId) {
          const { data: sdata } = await supabase
            .from("suscripciones")
            .select("proxima_fecha_de_pago")
            .eq("id", (payment as any).referenceId)
            .limit(1)
            .single();
          if (sdata) extra.proxima_fecha_de_pago = sdata.proxima_fecha_de_pago;
        }
      } catch (e) {
        // ignore
      }

      // fetch client details
      try {
        if (payment.clientId) {
          const { data: cdata } = await supabase
            .from("clientes")
            .select("id,nombre,rtn")
            .eq("id", payment.clientId)
            .limit(1)
            .single();
          if (cdata) {
            extra.clientRtn = cdata.rtn ?? null;
            extra.clientNombre = cdata.nombre ?? null;
          }
        }
      } catch (e) {
        // ignore
      }

      // build html (same structure as in cobro-form)
      const negocio = {
        nombre: config?.proyecto ?? config?.nombre ?? "",
        propietario: config?.propietario ?? config?.nombre ?? "",
        direccion: config?.direccion ?? "",
        telefono: config?.telefono ?? "",
        rtn: config?.rtn ?? "",
      };

      const cliente = {
        identidad: extra?.clientRtn ?? payment.clientId ?? "",
        nombre: extra?.clientNombre ?? payment.clientName,
        producto: payment.projectName,
        valorPagar: formatCurrency(Number(payment.amount)),
        valorPagado: formatCurrency(Number(payment.amount)),
        proximaFecha: extra?.proxima_fecha_de_pago
          ? formatDate(extra.proxima_fecha_de_pago)
          : "-",
      };

      const invoiceNumber = payment.id ?? Math.floor(Math.random() * 1000000);

      const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Recibo - ${invoiceNumber}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 100%; height: 100vh; background-color: #f7f7f7; }
          .container { width: 90%; margin: 0 auto; padding: 40px; background-color: rgba(255,255,255,0.9); box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 9px; background-size: contain; background-repeat: no-repeat; background-position: center; }
          h1, h2 { text-align: center; color: #2196F3; font-weight: bold; }
          .header { text-align:center; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; position: relative; }
          .header img { height: 120px; display: block; position: absolute; top: 20px; right: 30px; }
          .business-info, .client-info { margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
          .business-info p, .client-info p { margin: 4px 0; color: #333; }
          .client-info h3 { text-align: left; color: #2196F3; font-weight: bold; }
          .footer { text-align: center; margin-top: 0; font-size: 12px; color: #555; }
          .value { font-weight: bold; color: black; }
          .separator { border-top: 2px dashed #2196F3; margin-top: 20px; margin-bottom: 20px; }
          .print-button { display: block; margin: 20px auto; padding: 10px 20px; font-size: 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; }
          @media print { .no-print { display: none; } body { background-color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .container { width: 100%; background-size: contain; box-shadow: none; border-radius: 0; padding: 10px; } }
        </style>
        <script>function imprimirRecibo(){window.print();}</script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${negocio.nombre}</h1>
            <img src="/vsr.png" alt="Logo" />
          </div>
          <h2>Recibo de Pago de Suscripción</h2>

          <div class="business-info">
            <p><strong>Propietario:</strong> ${negocio.propietario}</p>
            <p><strong>Dirección:</strong> ${negocio.direccion}</p>
            <p><strong>Teléfono:</strong> ${negocio.telefono}</p>
            <p><strong>RTN:</strong> ${negocio.rtn}</p>
          </div>

          <div class="separator"></div>

          <div class="client-info">
            <h3>Datos del Cliente</h3>
            <p><strong>Identidad:</strong> ${cliente.identidad}</p>
            <p><strong>Nombre:</strong> ${cliente.nombre}</p>
            <p><strong>Producto:</strong> ${cliente.producto}</p>
            <p><strong>Valor a Pagar:</strong> <span class="value">${cliente.valorPagar}</span></p>
            <p><strong>Valor Pagado:</strong> <span class="value">${cliente.valorPagado}</span></p>
            <p><strong>Próxima Fecha de Pago:</strong> ${cliente.proximaFecha}</p>
          </div>

          <div class="separator"></div>

          <div class="footer">
            <p>¡Gracias por su preferencia!</p>
          </div>

          <button class="print-button no-print" onclick="imprimirRecibo()">Imprimir Recibo</button>
        </div>
      </body>
      </html>`;

      setInvoiceHtml(html);
      setInvoiceOpen(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error abriendo factura:", err);
      toast({ title: "Error generando vista de factura" });
    }
  }

  // Normalize query result to an array to avoid runtime errors when the
  // query returns null/string/object (e.g., when no backend is present).
  // Map pagos rows to the UI shape
  const paymentsList: PaymentWithClient[] = Array.isArray(payments)
    ? (payments as any[]).map((p) => ({
        id: p.id,
        amount: String(Number(p.monto ?? 0)),
        clientId: p.cliente ?? null,
        referenceId: p.referencia_id ?? null,
        clientName: clientsMap[p.cliente] ?? p.cliente ?? "Cliente",
        projectName: projectsMap[p.proyecto] ?? p.proyecto ?? "Proyecto",
        tipo: p.tipo ?? null,
        dueDate: p.fecha_de_creacion ?? null,
        paidDate: p.fecha_de_creacion ?? null,
        notes: p.notas ?? null,
        status: "pagado",
        paymentNumber: null,
      }))
    : [];

  const filteredPayments = paymentsList.filter((payment) => {
    const matchesSearch =
      payment.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.projectName.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (filterStatus !== "all") {
      matchesStatus = payment.status === filterStatus;
    }

    let matchesTab = true;
    if (activeTab === "pending") {
      matchesTab = payment.status === "pendiente";
    } else if (activeTab === "overdue") {
      matchesTab =
        payment.status === "vencido" ||
        (payment.status === "pendiente" &&
            (payment.dueDate ? getDaysUntilDue(payment.dueDate) < 0 : false));
    } else if (activeTab === "paid") {
      matchesTab = payment.status === "pagado";
    }

    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    total: paymentsList.length,
    pending: paymentsList.filter((p) => p.status === "pendiente").length,
    overdue: paymentsList.filter(
      (p) =>
        p.status === "vencido" ||
        (p.status === "pendiente" && (p.dueDate ? getDaysUntilDue(p.dueDate) < 0 : false))
    ).length,
    paid: paymentsList.filter((p) => p.status === "pagado").length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          data-testid="text-page-title"
        >
          Pagos
        </h1>
        <p className="text-muted-foreground mt-1">
          Seguimiento de todos los pagos
        </p>
        <div className="mt-3">
          <Button onClick={() => setCobroOpen(true)}>Cobro</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.paid}</p>
              <p className="text-xs text-muted-foreground">Pagados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              Todos
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="overdue" data-testid="tab-overdue">
              Vencidos
            </TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">
              Pagados
            </TabsTrigger>
          </TabsList>
          <div className="flex-1 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o proyecto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-payments"
              />
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPayments && filteredPayments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPayments.map((payment) => (
                <div key={payment.id}>
                  <PaymentCard
                    payment={payment}
                    onMarkPaid={(id) => markPaidMutation.mutate(id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay pagos</h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No se encontraron pagos con esos criterios"
                    : "Los pagos apareceran aqui cuando agregues clientes"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <CobroForm
        open={cobroOpen}
        onOpenChange={setCobroOpen}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
          queryClient.invalidateQueries({ queryKey: ["/api/payments/recent"] });
          queryClient.invalidateQueries({
            queryKey: ["/api/payments/upcoming"],
          });
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        }}
      />
      {invoiceHtml && invoiceOpen ? (
        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Factura</DialogTitle>
            </DialogHeader>

            <div className="mt-2">
              <iframe
                ref={invoiceFrameRef}
                srcDoc={invoiceHtml}
                title="Factura"
                className="w-full h-[70vh] border"
              />
            </div>

            <DialogFooter>
              <div className="flex gap-2 justify-end w-full">
                <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    const w = invoiceFrameRef.current?.contentWindow;
                    if (w) {
                      try {
                        w.focus();
                        w.print();
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error("Error imprimiendo factura:", err);
                        toast({ title: "Error imprimiendo factura" });
                      }
                    }
                  }}
                >
                  Imprimir
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
