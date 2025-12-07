import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  TrendingUp,
  CheckCircle2,
  Clock,
  Pause,
  X,
  Trash2,
} from "lucide-react";
import type { Avance, AvanceCaracteristica, InsertAvance } from "@shared/schema";

interface Cliente {
  id: string;
  nombre: string;
}

interface Contrato {
  id: string;
  proyecto: string;
  proyecto_nombre?: string;
}

interface AvanceExtended extends Avance {
  cliente_nombre: string;
  contrato_nombre: string;
}

export default function AvancesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [selectedContrato, setSelectedContrato] = useState<string>("");
  const [nombreProyecto, setNombreProyecto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [caracteristicas, setCaracteristicas] = useState<
    Array<{ nombre: string; descripcion: string }>
  >([{ nombre: "", descripcion: "" }]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Resetear contrato cuando cambia el cliente
  useEffect(() => {
    setSelectedContrato("");
  }, [selectedCliente]);

  // Obtener todos los avances
  const { data: avances, isLoading } = useQuery({
    queryKey: ["avances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avances")
        .select("*")
        .order("fecha_creacion", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Obtener IDs únicos de clientes y contratos
      const clienteIds = [...new Set(data.map((a: any) => a.cliente_id))];
      const contratoIds = [...new Set(data.map((a: any) => a.contrato_id))];

      // Obtener clientes
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre")
        .in("id", clienteIds);

      // Crear mapa de clientes
      const clientesMap: Record<string, string> = {};
      (clientesData || []).forEach((c: any) => {
        clientesMap[c.id] = c.nombre;
      });

      // Por ahora, usar el nombre_proyecto de avances directamente
      // ya que está guardado en la tabla
      return data.map((avance: any) => ({
        ...avance,
        cliente_nombre: clientesMap[avance.cliente_id] || "Sin cliente",
        contrato_nombre: avance.nombre_proyecto || "Sin proyecto",
      })) as AvanceExtended[];
    },
  });

  // Obtener clientes
  const { data: clientes } = useQuery({
    queryKey: ["clientes-avances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre")
        .order("nombre");

      if (error) throw error;
      return data as Cliente[];
    },
  });

  // Obtener contratos filtrados por cliente
  const { data: contratos } = useQuery({
    queryKey: ["contratos-avances", selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];

      // Obtener contratos del cliente
      const { data: contratosData, error: contratosError } = await supabase
        .from("contratos")
        .select("id, proyecto")
        .eq("cliente", selectedCliente)
        .eq("estado", "activo");

      if (contratosError) throw contratosError;
      if (!contratosData || contratosData.length === 0) return [];

      // Obtener nombres de proyectos
      const proyectoIds = contratosData.map((c: any) => c.proyecto);
      const { data: proyectosData, error: proyectosError } = await supabase
        .from("proyectos")
        .select("id, nombre")
        .in("id", proyectoIds);

      if (proyectosError) throw proyectosError;

      // Mapear nombres de proyectos
      const proyectosMap: Record<string, string> = {};
      (proyectosData || []).forEach((p: any) => {
        proyectosMap[p.id] = p.nombre;
      });

      // Combinar datos
      return contratosData.map((c: any) => ({
        id: c.id,
        proyecto: c.proyecto,
        proyecto_nombre: proyectosMap[c.proyecto] || "Sin nombre",
      })) as Contrato[];
    },
    enabled: !!selectedCliente,
  });

  // Mutación para crear avance
  const createAvanceMutation = useMutation({
    mutationFn: async (newAvance: InsertAvance) => {
      const { data, error } = await supabase
        .from("avances")
        .insert(newAvance)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (avance) => {
      // Insertar características
      const caracteristicasToInsert = caracteristicas
        .filter((c) => c.nombre.trim() !== "")
        .map((c, index) => ({
          avance_id: avance.id,
          nombre: c.nombre,
          descripcion: c.descripcion || null,
          orden: index + 1,
        }));

      if (caracteristicasToInsert.length > 0) {
        const { error: charError } = await supabase
          .from("avances_caracteristicas")
          .insert(caracteristicasToInsert);

        if (charError) {
          toast({
            title: "Error al guardar características",
            description: charError.message,
            variant: "destructive",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["avances"] });
      toast({
        title: "Proyecto creado",
        description: "El proyecto se ha creado exitosamente",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear proyecto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setSelectedCliente("");
    setSelectedContrato("");
    setNombreProyecto("");
    setDescripcion("");
    setCaracteristicas([{ nombre: "", descripcion: "" }]);
  };

  const handleAddCaracteristica = () => {
    setCaracteristicas([...caracteristicas, { nombre: "", descripcion: "" }]);
  };

  const handleRemoveCaracteristica = (index: number) => {
    if (caracteristicas.length > 1) {
      setCaracteristicas(caracteristicas.filter((_, i) => i !== index));
    }
  };

  const handleCaracteristicaChange = (
    index: number,
    field: "nombre" | "descripcion",
    value: string
  ) => {
    const updated = [...caracteristicas];
    updated[index][field] = value;
    setCaracteristicas(updated);
  };

  const handleSubmit = () => {
    if (!selectedCliente || !selectedContrato || !nombreProyecto.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (caracteristicas.filter((c) => c.nombre.trim() !== "").length === 0) {
      toast({
        title: "Características requeridas",
        description: "Debes agregar al menos una característica",
        variant: "destructive",
      });
      return;
    }

    createAvanceMutation.mutate({
      cliente_id: selectedCliente,
      contrato_id: selectedContrato,
      nombre_proyecto: nombreProyecto,
      descripcion: descripcion || null,
    });
  };

  // Filtrar avances
  const filteredAvances = avances?.filter((avance) => {
    const matchesSearch =
      avance.nombre_proyecto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avance.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avance.contrato_nombre.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEstado =
      filterEstado === "todos" || avance.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  // Estadísticas
  const stats = {
    total: avances?.length || 0,
    enProgreso:
      avances?.filter((a) => a.estado === "en_progreso").length || 0,
    completados:
      avances?.filter((a) => a.estado === "completado").length || 0,
    promedioAvance:
      avances && avances.length > 0
        ? avances.reduce((sum, a) => sum + Number(a.porcentaje_avance), 0) /
          avances.length
        : 0,
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> =
      {
        en_progreso: {
          variant: "default",
          icon: Clock,
          label: "En Progreso",
        },
        completado: {
          variant: "default",
          icon: CheckCircle2,
          label: "Completado",
        },
        pausado: { variant: "secondary", icon: Pause, label: "Pausado" },
        cancelado: { variant: "destructive", icon: X, label: "Cancelado" },
      };

    const config = variants[estado] || variants.en_progreso;
    const Icon = config.icon;

    return (
      <Badge
        variant={config.variant}
        className={
          estado === "completado"
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : estado === "en_progreso"
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            : ""
        }
      >
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Avances de Proyectos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y da seguimiento a tus proyectos en desarrollo
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Crear Proyecto
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Proyectos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enProgreso}</p>
                <p className="text-sm text-muted-foreground">En Progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completados}</p>
                <p className="text-sm text-muted-foreground">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.promedioAvance.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">Avance Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por proyecto, cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="en_progreso">En Progreso</SelectItem>
            <SelectItem value="completado">Completados</SelectItem>
            <SelectItem value="pausado">Pausados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de proyectos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAvances && filteredAvances.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAvances.map((avance) => (
            <Card
              key={avance.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/avances/${avance.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {avance.nombre_proyecto}
                  </CardTitle>
                  {getEstadoBadge(avance.estado)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{avance.cliente_nombre}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contrato</span>
                    <span className="font-medium truncate ml-2">
                      {avance.contrato_nombre}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-bold text-primary">
                      {Number(avance.porcentaje_avance).toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={Number(avance.porcentaje_avance)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {avance.caracteristicas_completadas} de{" "}
                    {avance.total_caracteristicas} características completadas
                  </p>
                </div>

                {avance.descripcion && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {avance.descripcion}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No se encontraron proyectos con esos criterios"
                : "Comienza creando tu primer proyecto en desarrollo"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Proyecto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog para crear proyecto */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Crear Nuevo Proyecto</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">
                  Cliente <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger id="cliente">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contrato">
                  Proyecto / Contrato <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedContrato}
                  onValueChange={setSelectedContrato}
                  disabled={!selectedCliente}
                >
                  <SelectTrigger id="contrato">
                    <SelectValue placeholder={
                      !selectedCliente 
                        ? "Primero selecciona un cliente" 
                        : contratos && contratos.length === 0
                        ? "No hay contratos disponibles"
                        : "Selecciona un proyecto"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {contratos && contratos.length > 0 ? (
                      contratos.map((contrato) => (
                        <SelectItem key={contrato.id} value={contrato.id}>
                          {contrato.proyecto_nombre || "Sin nombre"}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No hay contratos para este cliente
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedCliente && contratos && contratos.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Este cliente no tiene contratos activos. Crea uno primero en la sección de Contratos.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">
                Nombre del Proyecto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nombre"
                value={nombreProyecto}
                onChange={(e) => setNombreProyecto(e.target.value)}
                placeholder="Ej: Sistema de Gestión Administrativa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción opcional del proyecto..."
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  Características <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCaracteristica}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {caracteristicas.map((caracteristica, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder={`Característica ${index + 1}`}
                            value={caracteristica.nombre}
                            onChange={(e) =>
                              handleCaracteristicaChange(
                                index,
                                "nombre",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            placeholder="Descripción opcional"
                            value={caracteristica.descripcion}
                            onChange={(e) =>
                              handleCaracteristicaChange(
                                index,
                                "descripcion",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        {caracteristicas.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCaracteristica(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createAvanceMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createAvanceMutation.isPending ? "Creando..." : "Crear Proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
