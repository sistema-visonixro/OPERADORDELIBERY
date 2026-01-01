import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEmailConfig, enviarRecordatorioEmail } from "@/hooks/use-email-config";
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
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import ContratoButton from "@/components/contrato-button";
import {
  formatCurrency,
  formatDate,
  getInitials,
  getDaysUntilDue,
  hondurasToUTC,
  utcToHondurasDate,
} from "@/lib/utils";
import type { Subscription, DashboardStats } from "@shared/schema";

interface SubscriptionWithClient {
  id: string;
  clientName: string;
  clientEmail?: string | null;
  projectName: string;
  contrato_url?: string | null;
  cliente?: string;
  proyecto?: string;
  ultimo_recordatorio_cobro?: string | null;
  monthlyAmount: number;
  startDate: Date | string | null;
  lastPaymentDate: Date | string | null;
  nextPaymentDate: Date | string | null;
  isActive: boolean;
}

function monthsBetween(startInput?: string | Date | null, endInput?: Date) {
  if (!startInput) return 0;
  const start =
    typeof startInput === "string"
      ? new Date(startInput)
      : new Date(startInput as Date);
  const end = endInput ?? new Date();
  // normalize times to compare dates only
  const sDay = start.getDate();
  const sMonth = start.getMonth();
  const sYear = start.getFullYear();
  const eDay = end.getDate();
  const eMonth = end.getMonth();
  const eYear = end.getFullYear();
  let months = (eYear - sYear) * 12 + (eMonth - sMonth);
  // if the end day is before the start day, reduce one month (not a full month yet)
  if (eDay < sDay) months -= 1;
  return Math.max(0, months);
}

function SubscriptionCard({
  subscription,
  onToggleStatus,
  onContratoUpdated,
}: {
  subscription: SubscriptionWithClient;
  onToggleStatus?: (id: string, active: boolean) => void;
  onContratoUpdated?: () => void;
}) {
  const daysUntilPayment = subscription.nextPaymentDate
    ? getDaysUntilDue(subscription.nextPaymentDate)
    : 0;
  const isPaymentDue = daysUntilPayment <= 0 && subscription.isActive;
  const isPaymentSoon =
    daysUntilPayment <= 5 && daysUntilPayment > 0 && subscription.isActive;
  return (
    <Card
      className={`hover-elevate transition-all ${
        !subscription.isActive ? "opacity-60" : ""
      }`}
      data-testid={`card-subscription-${subscription.id}`}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(subscription.clientName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate text-sm md:text-base">
                {subscription.clientName}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {subscription.projectName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ContratoButton
              suscripcionId={subscription.id}
              contratoUrl={subscription.contrato_url}
              onContratoUpdated={onContratoUpdated}
              tableName="suscripciones"
              clienteId={subscription.cliente}
              proyectoId={subscription.proyecto}
            />
            {onToggleStatus ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      onToggleStatus(subscription.id, !subscription.isActive)
                    }
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
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Monto mensual</span>
            <span className="text-lg md:text-xl font-bold text-primary">
              {formatCurrency(Number(subscription.monthlyAmount))}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Inicio</span>
            <span className="text-sm">
              {formatDate(subscription.startDate)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Próximo pago</span>
            <span
              className={`font-medium ${
                isPaymentDue
                  ? "text-red-500"
                  : isPaymentSoon
                  ? "text-yellow-500"
                  : ""
              } text-sm md:text-base`}
            >
              {subscription.nextPaymentDate
                ? formatDate(subscription.nextPaymentDate)
                : "-"}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Último pago:{" "}
              {subscription.lastPaymentDate
                ? formatDate(subscription.lastPaymentDate)
                : "Pendiente"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className={
                subscription.isActive
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
              <span className="text-xs text-red-500 font-medium">
                Pago vencido
              </span>
            )}
            {isPaymentSoon && (
              <span className="text-xs text-yellow-500">
                Vence en {daysUntilPayment} dias
              </span>
            )}
          </div>

          <div className="ml-auto w-full md:w-auto flex gap-2">
            {onToggleStatus && (
              <Button
                size="sm"
                variant="outline"
                className="w-full md:w-auto"
                onClick={() =>
                  onToggleStatus(subscription.id, !subscription.isActive)
                }
              >
                {subscription.isActive ? "Pausar" : "Reactivar"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Subscriptions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "paused">(
    "all"
  );
  const [filterStatus, setFilterStatus] = useState<"all" | "aldia" | "atraso">(
    "all"
  );
  const { toast } = useToast();
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [clientsEmailMap, setClientsEmailMap] = useState<
    Record<string, string>
  >({});
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState<
    Record<string, boolean>
  >({});

  async function loadMeta() {
    try {
      const [pRes, cRes] = await Promise.all([
        supabase.from("proyectos").select("id,nombre"),
        supabase.from("clientes").select("id,nombre,email"),
      ]);
      const pData = Array.isArray(pRes.data) ? pRes.data : [];
      const cData = Array.isArray(cRes.data) ? cRes.data : [];
      const pMap: Record<string, string> = {};
      const cMap: Record<string, string> = {};
      const cEmailMap: Record<string, string> = {};
      pData.forEach((p: any) => {
        if (p?.id) pMap[p.id] = p.nombre ?? p.id;
      });
      cData.forEach((c: any) => {
        if (c?.id) {
          cMap[c.id] = c.nombre ?? c.id;
          if (c.email) cEmailMap[c.id] = c.email;
        }
      });
      setProjectsMap(pMap);
      setClientsMap(cMap);
      setClientsEmailMap(cEmailMap);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando meta:", err);
    }
  }

  // Query suscripciones from Supabase and map to SubscriptionWithClient
  const { data: rawSubs, isLoading } = useQuery({
    queryKey: ["suscripciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suscripciones")
        .select("*")
        .order("fecha_de_creacion", { ascending: false });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    loadMeta();
  }, []);

  const subscriptionsList: SubscriptionWithClient[] = (
    Array.isArray(rawSubs) ? rawSubs : []
  ).map((r: any) => ({
    id: r.id,
    cliente: r.cliente,
    proyecto: r.proyecto,
    clientName: clientsMap[r.cliente] ?? r.cliente ?? "Cliente",
    clientEmail: clientsEmailMap[r.cliente] ?? null,
    projectName: projectsMap[r.proyecto] ?? r.proyecto ?? "Proyecto",
    monthlyAmount: Number(r.mensualidad ?? 0),
    startDate: r.fecha_de_creacion ?? r.created_at ?? null,
    lastPaymentDate: r.ultimo_pago ?? null,
    nextPaymentDate: r.proxima_fecha_de_pago ?? null,
    contrato_url: r.contrato_url ?? null,
    isActive: r.is_active === undefined ? true : Boolean(r.is_active),
    ultimo_recordatorio_cobro: r.ultimo_recordatorio_cobro ?? null,
  }));

  const filteredSubscriptions = subscriptionsList.filter((sub) => {
    const matchesSearch =
      (sub.clientName ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (sub.projectName ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (filterActive === "active") {
      matchesFilter = sub.isActive === true;
    } else if (filterActive === "paused") {
      matchesFilter = sub.isActive === false;
    }

    // filtro por estado de pago: 'aldia' | 'atraso'
    let matchesStatus = true;
    if (filterStatus !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = sub.nextPaymentDate
        ? new Date(sub.nextPaymentDate as string)
        : null;
      if (!next) {
        matchesStatus = false;
      } else {
        next.setHours(0, 0, 0, 0);
        if (today > next) matchesStatus = filterStatus === "atraso";
        else matchesStatus = filterStatus === "aldia";
      }
    }

    return matchesSearch && matchesFilter && matchesStatus;
  });

  const activeSubscriptions = subscriptionsList.filter((s) => s.isActive) || [];
  const mrr = activeSubscriptions.reduce(
    (sum, s) => sum + Number(s.monthlyAmount ?? 0),
    0
  );
  const arr = mrr * 12;

  const [selected, setSelected] = useState<SubscriptionWithClient | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [mensualidadEdit, setMensualidadEdit] = useState<string>("");
  const [proximaEdit, setProximaEdit] = useState<string>("");
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  const openDetail = (s: SubscriptionWithClient) => {
    setSelected(s);
    // inicializar valores de edición
    setMensualidadEdit(String(s.monthlyAmount ?? ""));
    // Convertir la fecha UTC a fecha local para el input type="date"
    if (s.nextPaymentDate) {
      const hondurasDate = utcToHondurasDate(s.nextPaymentDate);
      if (hondurasDate) {
        const year = hondurasDate.getFullYear();
        const month = String(hondurasDate.getMonth() + 1).padStart(2, "0");
        const day = String(hondurasDate.getDate()).padStart(2, "0");
        setProximaEdit(`${year}-${month}-${day}`);
      } else {
        setProximaEdit("");
      }
    } else {
      setProximaEdit("");
    }
    setEditMode(false);
    setDetailOpen(true);
  };

  const enviarRecordatorioCobro = async (
    suscripcion: SubscriptionWithClient
  ) => {
    try {
      setEnviandoRecordatorio((prev) => ({ ...prev, [suscripcion.id]: true }));

      // Verificar si tiene email
      if (!suscripcion.clientEmail) {
        toast({
          title: "Email no configurado",
          description: "Este cliente no tiene un email registrado",
          variant: "destructive",
        });
        return;
      }

      // Calcular días de atraso
      if (!suscripcion.nextPaymentDate) {
        toast({
          title: "Fecha de pago no configurada",
          description: "Esta suscripción no tiene fecha de próximo pago",
          variant: "destructive",
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextDate = new Date(suscripcion.nextPaymentDate);
      nextDate.setHours(0, 0, 0, 0);
      const diasAtraso = Math.floor(
        (today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasAtraso < 2) {
        toast({
          title: "No aplica recordatorio",
          description:
            "El recordatorio solo se envía a partir de 2 días de atraso",
          variant: "destructive",
        });
        return;
      }

      // Verificar si ya se envió hoy
      if (suscripcion.ultimo_recordatorio_cobro) {
        const ultimoRecordatorio = new Date(
          suscripcion.ultimo_recordatorio_cobro
        );
        ultimoRecordatorio.setHours(0, 0, 0, 0);
        if (ultimoRecordatorio.getTime() === today.getTime()) {
          toast({
            title: "Ya enviado hoy",
            description: "Ya se envió un recordatorio hoy a este cliente",
            variant: "destructive",
          });
          return;
        }
      }

      // Enviar al Google Apps Script (GET con query params)
      await enviarRecordatorioEmail({
        clienteEmail: suscripcion.clientEmail,
        clienteNombre: suscripcion.clientName,
        proyectoNombre: suscripcion.projectName,
        mensualidad: suscripcion.monthlyAmount,
        diasAtraso,
        fechaVencimiento: formatDate(suscripcion.nextPaymentDate),
      });

      // Como usamos no-cors, no podemos leer la respuesta, asumimos éxito
      // Actualizar fecha de último recordatorio
      const { error: updateError } = await supabase
        .from("suscripciones")
        .update({ ultimo_recordatorio_cobro: new Date().toISOString() })
        .eq("id", suscripcion.id);

      if (updateError) throw updateError;

      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ["suscripciones"] });

      toast({
        title: "Recordatorio enviado",
        description: `Se envió el recordatorio de cobro a ${suscripcion.clientName}`,
      });
    } catch (err: any) {
      console.error("Error enviando recordatorio:", err);
      toast({
        title: "Error al enviar recordatorio",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setEnviandoRecordatorio((prev) => ({ ...prev, [suscripcion.id]: false }));
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  const handleContratoUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["suscripciones"] });
  }, []);

  const handleContratoUpdatedAndClose = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["suscripciones"] });
    closeDetail();
  }, []);

  const toggleSubscription = async () => {
    if (!selected) return;
    try {
      const newState = !selected.isActive;
      const { error } = await supabase
        .from("suscripciones")
        .update({ is_active: newState })
        .eq("id", selected.id);
      if (error) throw error;
      // actualizar UI local y refetch
      setSelected({ ...selected, isActive: newState });
      queryClient.invalidateQueries({ queryKey: ["suscripciones"] });
      toast({
        title: newState ? "Suscripción reactivada" : "Suscripción pausada",
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error actualizando suscripción:", err);
      toast({
        title: "Error al actualizar suscripción",
        description: err?.message ?? String(err),
      });
    }
  };

  const saveEdits = async () => {
    if (!selected) return;

    // Verificar si se está cambiando la próxima fecha de pago
    let originalProxima = "";
    if (selected.nextPaymentDate) {
      const hondurasDate = utcToHondurasDate(selected.nextPaymentDate);
      if (hondurasDate) {
        const year = hondurasDate.getFullYear();
        const month = String(hondurasDate.getMonth() + 1).padStart(2, "0");
        const day = String(hondurasDate.getDate()).padStart(2, "0");
        originalProxima = `${year}-${month}-${day}`;
      }
    }
    const cambioFecha = proximaEdit !== originalProxima;

    // Si se cambia la fecha, pedir confirmación de clave
    if (cambioFecha) {
      setShowPasswordConfirm(true);
      return;
    }

    // Si no hay cambio de fecha, guardar directamente
    await performSave();
  };

  const performSave = async () => {
    if (!selected) return;
    try {
      const mensual = mensualidadEdit ? Number(mensualidadEdit) : 0;
      const proxIso = proximaEdit ? hondurasToUTC(proximaEdit) : null;
      const updates: any = { mensualidad: mensual };
      if (proxIso) updates.proxima_fecha_de_pago = proxIso;

      const { error } = await supabase
        .from("suscripciones")
        .update(updates)
        .eq("id", selected.id);
      if (error) throw error;

      // actualizar seleccionado localmente con los nuevos valores
      const updatedSelected = {
        ...selected,
        monthlyAmount: mensual,
        nextPaymentDate: proxIso,
      };
      setSelected(updatedSelected);

      // Actualizar también los campos de edición con los valores guardados
      setMensualidadEdit(String(mensual));
      if (proxIso) {
        const hondurasDate = utcToHondurasDate(proxIso);
        if (hondurasDate) {
          const year = hondurasDate.getFullYear();
          const month = String(hondurasDate.getMonth() + 1).padStart(2, "0");
          const day = String(hondurasDate.getDate()).padStart(2, "0");
          setProximaEdit(`${year}-${month}-${day}`);
        }
      }

      // refrescar queries
      queryClient.invalidateQueries({ queryKey: ["suscripciones"] });

      toast({ title: "Suscripción actualizada" });
      setEditMode(false);
      setShowPasswordConfirm(false);
      setPasswordInput("");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error guardando cambios:", err);
      toast({
        title: "Error al guardar cambios",
        description: err?.message ?? String(err),
      });
    }
  };

  const confirmPasswordAndSave = async () => {
    // Validar la contraseña desde la configuración
    try {
      const { data: configData, error: configError } = await supabase
        .from("configuracion")
        .select("clave")
        .limit(1)
        .single();

      if (configError) {
        console.error("Error obteniendo configuración:", configError);
        toast({
          title: "Error al verificar contraseña",
          description: `No se pudo obtener la configuración: ${configError.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log("Configuración obtenida:", configData);
      console.log("Clave en configuración:", configData?.clave);
      console.log("Contraseña ingresada:", passwordInput);

      const adminPassword = configData?.clave;

      // Si no hay contraseña configurada, usar admin123 por defecto
      if (!adminPassword) {
        toast({
          title: "Contraseña no configurada",
          description:
            "Por favor configura una contraseña en Configuración primero",
          variant: "destructive",
        });
        return;
      }

      if (passwordInput !== adminPassword) {
        console.log("Contraseñas no coinciden");
        toast({
          title: "Contraseña incorrecta",
          description: "La contraseña ingresada no es válida",
          variant: "destructive",
        });
        return;
      }

      console.log("Contraseña correcta, guardando...");
      // Si la contraseña es correcta, guardar
      await performSave();
    } catch (err: any) {
      console.error("Error en validación de contraseña:", err);
      toast({
        title: "Error",
        description: err?.message || "Error al validar contraseña",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold tracking-tight"
          data-testid="text-page-title"
        >
          Suscripciones
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tus ingresos recurrentes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Ingreso Mensual Recurrente (MRR)
                </p>
                <p className="text-3xl font-bold">{formatCurrency(mrr)}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">ARR proyectado:</span>
                <span className="font-semibold ml-2">
                  {formatCurrency(arr)}
                </span>
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
              <p className="text-sm text-muted-foreground">
                Suscripciones activas
              </p>
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
                  : formatCurrency(0)}
              </p>
              <p className="text-sm text-muted-foreground">
                Promedio por cliente
              </p>
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
          <div className="ml-2 flex items-center gap-2">
            <Button
              variant={filterStatus === "all" ? "secondary" : "ghost"}
              onClick={() => setFilterStatus("all")}
              data-testid="filter-status-all"
            >
              Estado: Todas
            </Button>
            <Button
              variant={filterStatus === "aldia" ? "secondary" : "ghost"}
              onClick={() => setFilterStatus("aldia")}
              data-testid="filter-status-aldia"
            >
              Al Día
            </Button>
            <Button
              variant={filterStatus === "atraso" ? "secondary" : "ghost"}
              onClick={() => setFilterStatus("atraso")}
              data-testid="filter-status-atraso"
            >
              Atraso
            </Button>
          </div>
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
        <>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Mensualidad</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Meses transcurridos</TableHead>
                  <TableHead>Próximo pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Recordatorio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((s) => (
                  <TableRow
                    key={s.id}
                    onClick={() => openDetail(s)}
                    className="cursor-pointer"
                    role="button"
                  >
                    <TableCell className="truncate max-w-xs">
                      {s.clientName}
                    </TableCell>
                    <TableCell className="truncate max-w-xs">
                      {s.projectName}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(s.monthlyAmount ?? 0))}
                    </TableCell>
                    <TableCell>
                      {s.startDate ? formatDate(s.startDate) : "-"}
                    </TableCell>
                    <TableCell>
                      {s.startDate
                        ? `${monthsBetween(s.startDate)} meses`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {s.nextPaymentDate ? formatDate(s.nextPaymentDate) : "-"}
                    </TableCell>
                    <TableCell>
                      {s.nextPaymentDate ? (
                        (() => {
                          const today = new Date();
                          const next = new Date(s.nextPaymentDate as string);
                          today.setHours(0, 0, 0, 0);
                          next.setHours(0, 0, 0, 0);
                          if (today > next) {
                            return (
                              <span className="text-red-600 font-semibold">
                                ATRASO
                              </span>
                            );
                          }
                          return (
                            <span className="text-green-600 font-semibold">
                              AL DÍA
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          s.isActive
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {s.isActive ? "Activa" : "Pausada"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ContratoButton
                        suscripcionId={s.id}
                        contratoUrl={s.contrato_url}
                        onContratoUpdated={handleContratoUpdated}
                        tableName="suscripciones"
                        clienteId={s.cliente}
                        proyectoId={s.proyecto}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {/* Botón de recordatorio de cobro: solo si >= 2 días de atraso */}
                      {s.nextPaymentDate && s.isActive
                        ? (() => {
                            const today = new Date();
                            const next = new Date(s.nextPaymentDate as string);
                            today.setHours(0, 0, 0, 0);
                            next.setHours(0, 0, 0, 0);
                            const diasAtraso = Math.floor(
                              (today.getTime() - next.getTime()) /
                                (1000 * 60 * 60 * 24)
                            );

                            // Verificar si ya se envió hoy
                            let yaEnviadoHoy = false;
                            if (s.ultimo_recordatorio_cobro) {
                              const ultimoRecordatorio = new Date(
                                s.ultimo_recordatorio_cobro
                              );
                              ultimoRecordatorio.setHours(0, 0, 0, 0);
                              yaEnviadoHoy =
                                ultimoRecordatorio.getTime() ===
                                today.getTime();
                            }

                            if (diasAtraso >= 2) {
                              return yaEnviadoHoy ? (
                                <span className="text-xs text-muted-foreground">
                                  Enviado hoy
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="default"
                                  disabled={enviandoRecordatorio[s.id]}
                                  onClick={() => enviarRecordatorioCobro(s)}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  {enviandoRecordatorio[s.id]
                                    ? "Enviando..."
                                    : "Recordatorio"}
                                </Button>
                              );
                            }
                            return null;
                          })()
                        : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Dialog
            open={detailOpen}
            onOpenChange={(v) => {
              if (!v) closeDetail();
              else setDetailOpen(v);
            }}
          >
            <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-lg md:text-xl">
                  Detalle de Suscripción
                </DialogTitle>
              </DialogHeader>

              <div className="mt-2 md:mt-4">
                {selected ? (
                  !editMode ? (
                    <div className="space-y-4">
                      <SubscriptionCard
                        subscription={selected}
                        onContratoUpdated={handleContratoUpdatedAndClose}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 md:space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">
                            Mensualidad
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={mensualidadEdit}
                            onChange={(e) => setMensualidadEdit(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium">
                            Próxima fecha de pago
                          </label>
                          <Input
                            type="date"
                            value={proximaEdit}
                            onChange={(e) => setProximaEdit(e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setEditMode(false)}
                          className="w-full sm:w-auto"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={saveEdits}
                          className="w-full sm:w-auto"
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No hay detalle seleccionado
                  </p>
                )}
              </div>

              <DialogFooter className="mt-4">
                <div className="w-full flex flex-col sm:flex-row justify-end gap-2">
                  <Button
                    variant={
                      selected && selected.isActive
                        ? "destructive"
                        : "secondary"
                    }
                    onClick={toggleSubscription}
                    disabled={!selected}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    {selected && selected.isActive
                      ? "Pausar suscripción"
                      : "Reactivar suscripción"}
                  </Button>
                  {!editMode && (
                    <Button
                      variant="ghost"
                      onClick={() => setEditMode(true)}
                      disabled={!selected}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      Editar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={closeDetail}
                    className="w-full sm:w-auto order-3"
                  >
                    Cerrar
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo de confirmación de contraseña */}
          <Dialog
            open={showPasswordConfirm}
            onOpenChange={(v) => {
              setShowPasswordConfirm(v);
              if (!v) setPasswordInput("");
            }}
          >
            <DialogContent className="max-w-[95vw] md:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">
                  Confirmar cambio de fecha de pago
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Para modificar la próxima fecha de pago, ingresa la contraseña
                  de administrador.
                </p>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Contraseña
                  </label>
                  <Input
                    type="password"
                    placeholder="Ingresa la contraseña"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmPasswordAndSave();
                    }}
                    className="w-full"
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordConfirm(false);
                    setPasswordInput("");
                  }}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmPasswordAndSave}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
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
