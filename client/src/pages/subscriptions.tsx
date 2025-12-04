import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  RefreshCcw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  MoreHorizontal,
  Pause,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getInitials, getDaysUntilDue } from "@/lib/utils";
import type { Subscription, DashboardStats } from "@shared/schema";

interface SubscriptionWithClient extends Subscription {
  clientName: string;
  clientEmail: string;
  projectName: string;
}

function SubscriptionCard({ 
  subscription, 
  onToggleStatus 
}: { 
  subscription: SubscriptionWithClient;
  onToggleStatus: (id: string, active: boolean) => void;
}) {
  const daysUntilPayment = subscription.nextPaymentDate 
    ? getDaysUntilDue(subscription.nextPaymentDate) 
    : 0;
  const isPaymentDue = daysUntilPayment <= 0 && subscription.isActive;
  const isPaymentSoon = daysUntilPayment <= 5 && daysUntilPayment > 0 && subscription.isActive;

  return (
    <Card 
      className={`hover-elevate transition-all ${
        !subscription.isActive ? "opacity-60" : ""
      }`}
      data-testid={`card-subscription-${subscription.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(subscription.clientName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{subscription.clientName}</p>
              <p className="text-sm text-muted-foreground truncate">{subscription.projectName}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onToggleStatus(subscription.id, !subscription.isActive)}
                data-testid="menu-toggle-status"
              >
                {subscription.isActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar suscripcion
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Reactivar suscripcion
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Monto mensual:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(Number(subscription.monthlyAmount))}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Inicio:</span>
              <span>{formatDate(subscription.startDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Ultimo pago:</span>
              <span>{subscription.lastPaymentDate ? formatDate(subscription.lastPaymentDate) : "Pendiente"}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Proximo pago:</span>
              <span className={`font-medium ${isPaymentDue ? "text-red-500" : isPaymentSoon ? "text-yellow-500" : ""}`}>
                {subscription.nextPaymentDate ? formatDate(subscription.nextPaymentDate) : "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
          <Badge 
            variant="secondary" 
            className={subscription.isActive 
              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
              : "bg-muted text-muted-foreground"
            }
          >
            {subscription.isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Activa
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Pausada
              </>
            )}
          </Badge>
          {isPaymentDue && subscription.isActive && (
            <span className="text-xs text-red-500 font-medium">Pago vencido</span>
          )}
          {isPaymentSoon && (
            <span className="text-xs text-yellow-500">Vence en {daysUntilPayment} dias</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Subscriptions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "paused">("all");
  const { toast } = useToast();

  const { data: subscriptions, isLoading } = useQuery<SubscriptionWithClient[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiRequest("PATCH", `/api/subscriptions/${id}/toggle`, { isActive: active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Suscripcion actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar suscripcion", variant: "destructive" });
    },
  });

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch = 
      sub.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterActive === "active") {
      matchesFilter = sub.isActive === true;
    } else if (filterActive === "paused") {
      matchesFilter = sub.isActive === false;
    }
    
    return matchesSearch && matchesFilter;
  });

  const activeSubscriptions = subscriptions?.filter(s => s.isActive) || [];
  const mrr = activeSubscriptions.reduce((sum, s) => sum + Number(s.monthlyAmount), 0);
  const arr = mrr * 12;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Suscripciones</h1>
        <p className="text-muted-foreground mt-1">Gestiona tus ingresos recurrentes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ingreso Mensual Recurrente (MRR)</p>
                <p className="text-3xl font-bold">{formatCurrency(mrr)}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">ARR proyectado:</span>
                <span className="font-semibold ml-2">{formatCurrency(arr)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-3xl font-bold">{activeSubscriptions.length}</p>
              <p className="text-sm text-muted-foreground">Suscripciones activas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-3xl font-bold">
                {activeSubscriptions.length > 0 
                  ? formatCurrency(mrr / activeSubscriptions.length)
                  : formatCurrency(0)
                }
              </p>
              <p className="text-sm text-muted-foreground">Promedio por cliente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente o proyecto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-subscriptions"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterActive === "all" ? "secondary" : "ghost"}
            onClick={() => setFilterActive("all")}
            data-testid="filter-all"
          >
            Todas
          </Button>
          <Button
            variant={filterActive === "active" ? "secondary" : "ghost"}
            onClick={() => setFilterActive("active")}
            data-testid="filter-active"
          >
            Activas
          </Button>
          <Button
            variant={filterActive === "paused" ? "secondary" : "ghost"}
            onClick={() => setFilterActive("paused")}
            data-testid="filter-paused"
          >
            Pausadas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSubscriptions && filteredSubscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionCard 
              key={subscription.id} 
              subscription={subscription}
              onToggleStatus={(id, active) => toggleMutation.mutate({ id, active })}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCcw className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay suscripciones</h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? "No se encontraron suscripciones con esos criterios" 
                : "Las suscripciones apareceran aqui cuando agregues clientes con modelo de suscripcion"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
