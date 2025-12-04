import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getInitials, getDaysUntilDue } from "@/lib/utils";
import type { Payment } from "@shared/schema";

interface PaymentWithClient extends Payment {
  clientName: string;
  projectName: string;
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

  const { icon: Icon, className, label } = config[status as keyof typeof config] || config.pendiente;

  return (
    <Badge variant="secondary" className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

function PaymentCard({ payment, onMarkPaid }: { 
  payment: PaymentWithClient; 
  onMarkPaid: (id: string) => void;
}) {
  const daysUntil = getDaysUntilDue(payment.dueDate);
  const isOverdue = daysUntil < 0 && payment.status !== "pagado";
  const isUrgent = daysUntil <= 3 && daysUntil >= 0 && payment.status === "pendiente";

  return (
    <Card 
      className={`hover-elevate transition-all ${
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
              <p className="text-sm text-muted-foreground truncate">{payment.projectName}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {payment.status !== "pagado" && (
                <DropdownMenuItem onClick={() => onMarkPaid(payment.id)} data-testid="menu-mark-paid">
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
            <span className="text-lg font-bold">{formatCurrency(Number(payment.amount))}</span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Vencimiento:</span>
            <span className={`text-sm font-medium ${isOverdue ? "text-red-500" : ""}`}>
              {formatDate(payment.dueDate)}
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
              <span className="text-sm text-muted-foreground">Fecha de pago:</span>
              <span className="text-sm text-green-600 dark:text-green-400">
                {formatDate(payment.paidDate)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
          <PaymentStatusBadge status={payment.status} />
          {payment.status === "pendiente" && (
            <span className={`text-xs ${isOverdue ? "text-red-500" : isUrgent ? "text-yellow-500" : "text-muted-foreground"}`}>
              {isOverdue 
                ? `Vencido hace ${Math.abs(daysUntil)} dias` 
                : daysUntil === 0 
                  ? "Vence hoy" 
                  : `Vence en ${daysUntil} dias`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentRow({ payment, onMarkPaid }: { 
  payment: PaymentWithClient; 
  onMarkPaid: (id: string) => void;
}) {
  const daysUntil = getDaysUntilDue(payment.dueDate);
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
          <p className="text-sm text-muted-foreground truncate">{payment.projectName}</p>
        </div>
        
        <div className="text-sm">
          <span className="font-semibold">{formatCurrency(Number(payment.amount))}</span>
          {payment.paymentNumber && payment.paymentNumber > 1 && (
            <span className="text-muted-foreground ml-1">(Cuota #{payment.paymentNumber})</span>
          )}
        </div>
        
        <div className={`text-sm ${isOverdue ? "text-red-500 font-medium" : ""}`}>
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

  const { data: payments, isLoading } = useQuery<PaymentWithClient[]>({
    queryKey: ["/api/payments"],
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/payments/${id}/paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/upcoming"] });
      toast({ title: "Pago registrado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al registrar pago", variant: "destructive" });
    },
  });

  const filteredPayments = payments?.filter((payment) => {
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
      matchesTab = payment.status === "vencido" || 
        (payment.status === "pendiente" && getDaysUntilDue(payment.dueDate) < 0);
    } else if (activeTab === "paid") {
      matchesTab = payment.status === "pagado";
    }
    
    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    total: payments?.length || 0,
    pending: payments?.filter(p => p.status === "pendiente").length || 0,
    overdue: payments?.filter(p => 
      p.status === "vencido" || 
      (p.status === "pendiente" && getDaysUntilDue(p.dueDate) < 0)
    ).length || 0,
    paid: payments?.filter(p => p.status === "pagado").length || 0,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Pagos</h1>
        <p className="text-muted-foreground mt-1">Seguimiento de todos los pagos</p>
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
            <TabsTrigger value="all" data-testid="tab-all">Todos</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">Pendientes</TabsTrigger>
            <TabsTrigger value="overdue" data-testid="tab-overdue">Vencidos</TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">Pagados</TabsTrigger>
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
                <PaymentCard 
                  key={payment.id} 
                  payment={payment} 
                  onMarkPaid={(id) => markPaidMutation.mutate(id)}
                />
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
    </div>
  );
}
