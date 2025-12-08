import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingDown, Calendar } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  getHondurasDayStartUTC,
  getHondurasDayEndUTC,
} from "@/lib/utils";

interface Egreso {
  id: string;
  monto: number;
  motivo: string;
  fecha: string;
  created_at: string;
  updated_at: string;
  categoria_id?: string | null;
}

export default function EgresosPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [claveConfirmacion, setClaveConfirmacion] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryFilterText, setCategoryFilterText] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Obtener la clave de configuración
  const { data: configuracion } = useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracion")
        .select("clave")
        .limit(1);
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });

  // Obtener categorias existentes
  const { data: categories } = useQuery({
    queryKey: ["egreso_categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("egreso_categorias")
        .select("id,nombre")
        .order("nombre", { ascending: true });
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  // Obtener todos los egresos
  const { data: egresos, isLoading } = useQuery({
    queryKey: ["egresos", fechaDesde, fechaHasta, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("egresos")
        .select("*")
        .order("fecha", { ascending: false });

      // Si el usuario define fechas, convertir el inicio/fin del día en horario
      // hondureño a UTC antes de enviar la consulta a Supabase (timestamptz)
      if (fechaDesde) {
        const desdeUTC = getHondurasDayStartUTC(fechaDesde);
        if (desdeUTC) query = query.gte("fecha", desdeUTC);
      }

      if (fechaHasta) {
        const hastaUTC = getHondurasDayEndUTC(fechaHasta);
        if (hastaUTC) query = query.lte("fecha", hastaUTC);
      }

      // Filtrar por categoria si se seleccionó
      if (categoryFilter) {
        query = query.eq("categoria_id", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Egreso[];
    },
  });

  // Calcular total de egresos
  const totalEgresos = (egresos || []).reduce(
    (sum, e) => sum + Number(e.monto || 0),
    0
  );

  // Mutación para crear egreso
  const createEgresoMutation = useMutation({
    mutationFn: async (newEgreso: {
      monto: number;
      motivo: string;
      categoria_id?: string | null;
    }) => {
      const payload: any = {
        monto: newEgreso.monto,
        motivo: newEgreso.motivo,
        fecha: new Date().toISOString(),
      };
      if (newEgreso.categoria_id) payload.categoria_id = newEgreso.categoria_id;
      const { data, error } = await supabase
        .from("egresos")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Egreso registrado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["egresos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al registrar egreso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setMonto("");
    setMotivo("");
    setClaveConfirmacion("");
    setCategoryInput("");
  };

  const handleSubmit = () => {
    // Validar campos
    if (!monto || Number(monto) <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (!motivo.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar un motivo",
        variant: "destructive",
      });
      return;
    }

    // Validar clave de confirmación
    if (!configuracion?.clave) {
      toast({
        title: "Error",
        description:
          "No hay clave de confirmación configurada. Vaya a Configuración para establecerla.",
        variant: "destructive",
      });
      return;
    }

    if (claveConfirmacion !== configuracion.clave) {
      toast({
        title: "Error",
        description: "La clave de confirmación es incorrecta",
        variant: "destructive",
      });
      return;
    }

    // Determinar categoria: si escribió una y no existe, crearla primero
    (async () => {
      try {
        let categoria_id: string | undefined | null = undefined;
        const catName = categoryInput?.trim();
        if (catName) {
          const existing = (categories || []).find(
            (c: any) => String(c.nombre).toLowerCase() === catName.toLowerCase()
          );
          if (existing) {
            categoria_id = existing.id;
          } else {
            const { data: newCat, error: errCat } = await supabase
              .from("egreso_categorias")
              .insert({ nombre: catName })
              .select()
              .single();
            if (errCat) throw errCat;
            categoria_id = newCat.id;
            queryClient.invalidateQueries({ queryKey: ["egreso_categorias"] });
          }
        }

        createEgresoMutation.mutate({
          monto: Number(monto),
          motivo: motivo.trim(),
          categoria_id,
        });
      } catch (err: any) {
        toast({
          title: "Error al crear categoría",
          description: err?.message ?? String(err),
          variant: "destructive",
        });
      }
    })();
  };

  const handleRowClick = (egreso: Egreso) => {
    navigate(`/egresos/${egreso.id}`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Egresos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los egresos y gastos
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Egreso
        </Button>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Egresos
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(totalEgresos)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros de fecha */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Desde:</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Hasta:</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Filtro por categoría (opcional) - ahora searchable */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Categoría:</Label>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setCategoryFilter("");
                    setCategoryFilterText("");
                  }}
                >
                  Limpiar
                </button>
              </div>
              <div className="flex items-center gap-2 w-full">
                <input
                  list="categoria-filter-list"
                  value={categoryFilterText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryFilterText(val);
                    const match = (categories || []).find(
                      (c: any) =>
                        String(c.nombre).toLowerCase() ===
                        String(val).trim().toLowerCase()
                    );
                    setCategoryFilter(match ? match.id : "");
                  }}
                  placeholder="Escriba para buscar o seleccione..."
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
                <datalist id="categoria-filter-list">
                  {(categories || []).map((c: any) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de egresos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Egresos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando egresos...
            </div>
          ) : egresos && egresos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {egresos.map((egreso) => (
                  <TableRow
                    key={egreso.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(egreso)}
                  >
                    <TableCell>{formatDate(egreso.fecha)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {egreso.motivo}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {(categories || []).find(
                        (c: any) => c.id === egreso.categoria_id
                      )?.nombre || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatCurrency(Number(egreso.monto))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay egresos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear egreso */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Egreso</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea
                id="motivo"
                placeholder="Describe el motivo del egreso..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                list="categoria-list"
                placeholder="Escriba o seleccione una categoría"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
              />
              <datalist id="categoria-list">
                {(categories || []).map((c: any) => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clave">Clave de Confirmación</Label>
              <Input
                id="clave"
                type="password"
                placeholder="Ingrese la clave de confirmación"
                value={claveConfirmacion}
                onChange={(e) => setClaveConfirmacion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ingrese la clave configurada en la sección de Configuración
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowCreateDialog(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createEgresoMutation.isPending}
            >
              {createEgresoMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
