import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User,
  FileText,
  TrendingUp,
  Save,
} from "lucide-react";
import type { Avance, AvanceCaracteristica } from "@shared/schema";
import { formatDate, formatDateTime } from "@/lib/utils";

interface AvanceWithDetails extends Avance {
  cliente_nombre: string;
  contrato_nombre: string;
  caracteristicas: AvanceCaracteristica[];
}

export default function AvanceDetallePage() {
  const params = useParams();
  const id = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showRegistrarAvance, setShowRegistrarAvance] = useState(false);
  const [selectedCaracteristicas, setSelectedCaracteristicas] = useState<
    string[]
  >([]);
  const [passwordInput, setPasswordInput] = useState("");

  // Obtener detalle del avance
  const { data: avance, isLoading } = useQuery({
    queryKey: ["avance-detalle", id],
    queryFn: async () => {
      const { data: avanceData, error: avanceError } = await supabase
        .from("avances")
        .select("*")
        .eq("id", id!)
        .single();

      if (avanceError) throw avanceError;

      // Obtener cliente
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("nombre")
        .eq("id", avanceData.cliente_id)
        .single();

      const { data: caracteristicasData, error: caracteristicasError } =
        await supabase
          .from("avances_caracteristicas")
          .select("*")
          .eq("avance_id", id!)
          .order("orden");

      if (caracteristicasError) throw caracteristicasError;

      return {
        ...avanceData,
        cliente_nombre: clienteData?.nombre || "Sin cliente",
        contrato_nombre: avanceData.nombre_proyecto || "Sin proyecto",
        caracteristicas: caracteristicasData || [],
      } as AvanceWithDetails;
    },
    enabled: !!id,
  });

  // Mutación para actualizar características
  const updateCaracteristicasMutation = useMutation({
    mutationFn: async (caracteristicaIds: string[]) => {
      // Actualizar las características seleccionadas
      const updates = caracteristicaIds.map((id) =>
        supabase
          .from("avances_caracteristicas")
          .update({
            completada: true,
            fecha_completado: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("completada", false) // Solo actualizar si no estaba completada
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw errors[0].error;
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avance-detalle", id] });
      queryClient.invalidateQueries({ queryKey: ["avances"] });
      toast({
        title: "Avance registrado",
        description: "Las características han sido marcadas como completadas",
      });
      setShowRegistrarAvance(false);
      setSelectedCaracteristicas([]);
      setPasswordInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Error al registrar avance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenRegistrarAvance = () => {
    // Solo permitir seleccionar características no completadas
    setSelectedCaracteristicas([]);
    setShowRegistrarAvance(true);
  };

  const handleToggleCaracteristica = (caracteristicaId: string) => {
    setSelectedCaracteristicas((prev) =>
      prev.includes(caracteristicaId)
        ? prev.filter((id) => id !== caracteristicaId)
        : [...prev, caracteristicaId]
    );
  };

  const handleConfirmRegistrarAvance = async () => {
    if (selectedCaracteristicas.length === 0) {
      toast({
        title: "Selecciona características",
        description: "Debes seleccionar al menos una característica",
        variant: "destructive",
      });
      return;
    }

    // Validar contraseña
    try {
      const { data: configData, error: configError } = await supabase
        .from("configuracion")
        .select("clave")
        .limit(1)
        .single();

      if (configError) {
        toast({
          title: "Error al verificar contraseña",
          description: configError.message,
          variant: "destructive",
        });
        return;
      }

      const adminPassword = configData?.clave;

      if (!adminPassword) {
        toast({
          title: "Contraseña no configurada",
          description: "Por favor configura una contraseña en Configuración",
          variant: "destructive",
        });
        return;
      }

      if (passwordInput !== adminPassword) {
        toast({
          title: "Contraseña incorrecta",
          description: "La contraseña ingresada no es válida",
          variant: "destructive",
        });
        return;
      }

      // Si la contraseña es correcta, registrar avance
      await updateCaracteristicasMutation.mutateAsync(selectedCaracteristicas);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Error al validar contraseña",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!avance) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Proyecto no encontrado</h3>
            <Button onClick={() => navigate("/avances")} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Avances
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const caracteristicasPendientes = avance.caracteristicas.filter(
    (c) => !c.completada
  );
  const caracteristicasCompletadas = avance.caracteristicas.filter(
    (c) => c.completada
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/avances")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {avance.nombre_proyecto}
          </h1>
          <p className="text-muted-foreground">{avance.descripcion}</p>
        </div>
        {caracteristicasPendientes.length > 0 && (
          <Button size="lg" onClick={handleOpenRegistrarAvance}>
            <Save className="h-4 w-4 mr-2" />
            Registrar Avance
          </Button>
        )}
      </div>

      {/* Información general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-semibold">{avance.cliente_nombre}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contrato</p>
                <p className="font-semibold truncate">
                  {avance.contrato_nombre}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Creación</p>
                <p className="font-semibold">{formatDate(avance.fecha_creacion)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progreso */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progreso del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Porcentaje de Avance
            </span>
            <span className="text-3xl font-bold text-primary">
              {Number(avance.porcentaje_avance).toFixed(0)}%
            </span>
          </div>
          <Progress value={Number(avance.porcentaje_avance)} className="h-4" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {avance.caracteristicas_completadas} de{" "}
              {avance.total_caracteristicas} características completadas
            </span>
            <Badge
              variant={
                avance.estado === "completado" ? "default" : "secondary"
              }
              className={
                avance.estado === "completado"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : ""
              }
            >
              {avance.estado === "completado" ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completado
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  En Progreso
                </>
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Características */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-orange-500" />
              Características Pendientes ({caracteristicasPendientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caracteristicasPendientes.length > 0 ? (
              <div className="space-y-3">
                {caracteristicasPendientes.map((caracteristica) => (
                  <div
                    key={caracteristica.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Circle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{caracteristica.nombre}</p>
                        {caracteristica.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {caracteristica.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                ¡Todas las características han sido completadas!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Completadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Características Completadas ({caracteristicasCompletadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caracteristicasCompletadas.length > 0 ? (
              <div className="space-y-3">
                {caracteristicasCompletadas.map((caracteristica) => (
                  <div
                    key={caracteristica.id}
                    className="p-4 border rounded-lg bg-green-500/5"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium line-through text-muted-foreground">
                          {caracteristica.nombre}
                        </p>
                        {caracteristica.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {caracteristica.descripcion}
                          </p>
                        )}
                        {caracteristica.fecha_completado && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Completada: {formatDateTime(caracteristica.fecha_completado)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aún no hay características completadas
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal Registrar Avance */}
      <Dialog
        open={showRegistrarAvance}
        onOpenChange={setShowRegistrarAvance}
      >
        <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Registrar Avance</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <p className="text-sm text-muted-foreground">
              Selecciona las características que has completado. Una vez
              marcadas, no podrán desmarcarse.
            </p>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {caracteristicasPendientes.map((caracteristica) => (
                <div
                  key={caracteristica.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={caracteristica.id}
                    checked={selectedCaracteristicas.includes(
                      caracteristica.id
                    )}
                    onCheckedChange={() =>
                      handleToggleCaracteristica(caracteristica.id)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={caracteristica.id}
                      className="font-medium cursor-pointer"
                    >
                      {caracteristica.nombre}
                    </Label>
                    {caracteristica.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {caracteristica.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="password">
                Contraseña de Administrador{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingresa tu contraseña"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmRegistrarAvance();
                }}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRegistrarAvance(false);
                setSelectedCaracteristicas([]);
                setPasswordInput("");
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRegistrarAvance}
              disabled={
                selectedCaracteristicas.length === 0 ||
                !passwordInput ||
                updateCaracteristicasMutation.isPending
              }
              className="w-full sm:w-auto"
            >
              {updateCaracteristicasMutation.isPending
                ? "Guardando..."
                : "Confirmar Avance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
