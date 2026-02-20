import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, User, Package, DollarSign } from "lucide-react";

type PedidoRow = {
  id: string;
  numero_pedido?: string | null;
  total?: number | null;
  estado?: string | null;
  restaurante_id?: string | null;
  usuario_id?: string | null;
  repartidor_id?: string | null;
  creado_en?: string | null;
  sourceTable?: string | null;
  direccion_entrega?: string | null;
  costo_envio?: number | null;
  // Datos relacionados
  cliente_nombre?: string | null;
  restaurante_nombre?: string | null;
  repartidor_nombre?: string | null;
};

export default function Pedidos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<PedidoRow | null>(null);
  const [open, setOpen] = useState(false);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [selectedRepartidor, setSelectedRepartidor] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Obtener pedidos con información relacionada
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos_operador"],
    queryFn: async () => {
      console.log("🔍 Consultando tabla 'pedidos' en Supabase...");

      // Intentar tabla `pedidos` primero (sin joins para evitar errores)
      try {
        const { data, error, count } = await supabase
          .from("pedidos")
          .select(
            `
            id,
            numero_pedido,
            total,
            estado,
            restaurante_id,
            usuario_id,
            repartidor_id,
            creado_en,
            direccion_entrega,
            costo_envio
          `,
            { count: "exact" },
          )
          .order("creado_en", { ascending: false });

        console.log("📊 Tabla 'pedidos':", {
          error: error?.message,
          count: count || data?.length || 0,
          hayDatos: data && data.length > 0,
        });

        if (error) {
          console.error("❌ Error al consultar tabla 'pedidos':", error);
          console.log("🔄 Intentando tabla 'pedidos_restaurante'...");
        } else if (!data || data.length === 0) {
          console.warn("⚠️ Tabla 'pedidos' existe pero está VACÍA");
          console.log("🔄 Intentando tabla 'pedidos_restaurante'...");
        } else {
          console.log(
            `✅ Encontrados ${data.length} pedidos en tabla 'pedidos'`,
          );
          console.log("📝 Primeros 3 pedidos:", data.slice(0, 3));

          // Obtener información relacionada para cada pedido
          const pedidosEnriquecidos = await Promise.all(
            data.map(async (pedido: any) => {
              let clienteNombre = null;
              let restauranteNombre = null;
              let repartidorNombre = null;

              // Obtener nombre del cliente
              if (pedido.usuario_id) {
                try {
                  const { data: usuario } = await supabase
                    .from("usuarios")
                    .select("nombre")
                    .eq("id", pedido.usuario_id)
                    .single();
                  clienteNombre = usuario?.nombre || null;
                } catch (e) {
                  console.warn(
                    "No se pudo obtener usuario del cliente:",
                    pedido.usuario_id,
                  );
                }
              }

              // Obtener nombre del restaurante
              if (pedido.restaurante_id) {
                try {
                  const { data: rest } = await supabase
                    .from("restaurantes")
                    .select("nombre")
                    .eq("id", pedido.restaurante_id)
                    .single();
                  restauranteNombre = rest?.nombre || null;
                } catch (e) {
                  console.warn(
                    "No se pudo obtener restaurante:",
                    pedido.restaurante_id,
                  );
                }
              }

              // Obtener nombre del repartidor
              if (pedido.repartidor_id) {
                try {
                  const { data: rep } = await supabase
                    .from("repartidores")
                    .select("nombre_completo")
                    .eq("id", pedido.repartidor_id)
                    .single();
                  repartidorNombre = rep?.nombre_completo || null;
                } catch (e) {
                  console.warn(
                    "No se pudo obtener repartidor:",
                    pedido.repartidor_id,
                  );
                }
              }

              return {
                ...pedido,
                cliente_nombre: clienteNombre,
                restaurante_nombre: restauranteNombre,
                repartidor_nombre: repartidorNombre,
              } as PedidoRow;
            }),
          );

          return pedidosEnriquecidos;
        }
      } catch (e) {
        console.error("💥 Error en consulta de pedidos:", e);
      }

      // Fallback a `pedidos_restaurante`
      console.log("🔍 Consultando tabla 'pedidos_restaurante' en Supabase...");

      const {
        data: d2,
        error: err2,
        count: count2,
      } = await supabase
        .from("pedidos_restaurante")
        .select(
          "id,numero_pedido,total,estado_pedido,restaurante_id,created_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      console.log("📊 Tabla 'pedidos_restaurante':", {
        error: err2?.message,
        count: count2 || d2?.length || 0,
        hayDatos: d2 && d2.length > 0,
      });

      if (err2) {
        console.error(
          "❌ Error al consultar tabla 'pedidos_restaurante':",
          err2,
        );
        throw err2;
      }

      if (!d2 || d2.length === 0) {
        console.warn("⚠️ Tabla 'pedidos_restaurante' está VACÍA");
        return [];
      }

      console.log(
        `✅ Encontrados ${d2.length} pedidos en tabla 'pedidos_restaurante'`,
      );
      console.log("📝 Primeros 3 pedidos:", d2.slice(0, 3));

      return (d2 as any[]).map((p) => ({
        id: String(p.id),
        numero_pedido: p.numero_pedido,
        total: p.total,
        estado: p.estado_pedido,
        restaurante_id: p.restaurante_id,
        usuario_id: (p as any).usuario_id ?? null,
        repartidor_id: (p as any).repartidor_id ?? null,
        creado_en: p.created_at,
        cliente_nombre: null,
        restaurante_nombre: null,
        repartidor_nombre: null,
      })) as PedidoRow[];
    },
  });

  const repartidoresQ = useQuery({
    queryKey: ["repartidores_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("repartidores")
        .select("id,usuario_id,nombre_completo,disponible");
      return data || [];
    },
  });

  const [assignedFilter, setAssignedFilter] = useState<
    "todos" | "asignado" | "sin_asignar"
  >("todos");
  const [statusFilter, setStatusFilter] = useState<
    | "todos"
    | "pendiente"
    | "confirmado"
    | "en_preparacion"
    | "en_camino"
    | "entregado"
  >("todos");

  // Conteos: asignados / sin asignar
  const asignados = (pedidos || []).filter(
    (p: any) =>
      (statusFilter === "todos" ? true : p.estado === statusFilter) &&
      Boolean(p.repartidor_id),
  ).length;
  const sinAsignar = (pedidos || []).filter(
    (p: any) =>
      (statusFilter === "todos" ? true : p.estado === statusFilter) &&
      !p.repartidor_id,
  ).length;

  const STATUS_ORDER: { key: string; label: string }[] = [
    { key: "pendiente", label: "Pendientes" },
    { key: "confirmado", label: "Tomados" },
    { key: "en_preparacion", label: "Preparado" },
    { key: "en_camino", label: "En ruta" },
    { key: "entregado", label: "Entregados" },
  ];

  const statusCounts = (key: string) =>
    (pedidos || []).filter((p: any) => {
      const statusOk = p.estado === key;
      const assignedOk =
        assignedFilter === "todos"
          ? true
          : assignedFilter === "asignado"
            ? Boolean(p.repartidor_id)
            : !p.repartidor_id;
      return statusOk && assignedOk;
    }).length;

  // Filtrar pedidos por búsqueda y filtros
  const pedidosFiltrados = (pedidos || []).filter((p: any) => {
    const statusOk =
      statusFilter === "todos" ? true : p.estado === statusFilter;
    const assignedOk =
      assignedFilter === "todos"
        ? true
        : assignedFilter === "asignado"
          ? Boolean(p.repartidor_id)
          : !p.repartidor_id;

    // Búsqueda por número de pedido o nombre de cliente
    const searchOk =
      !searchQuery ||
      (p.numero_pedido &&
        p.numero_pedido.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.cliente_nombre &&
        p.cliente_nombre.toLowerCase().includes(searchQuery.toLowerCase()));

    return statusOk && assignedOk && searchOk;
  });

  const getEstadoBadgeVariant = (estado?: string | null) => {
    switch (estado) {
      case "entregado":
        return "default";
      case "cancelado":
        return "destructive";
      case "en_camino":
        return "secondary";
      case "pendiente":
        return "outline";
      default:
        return "secondary";
    }
  };

  async function openDetails(p: PedidoRow) {
    setSelected(p);
    setOpen(true);
    setLoadingDetalles(true);
    setDetalles([]);
    setSelectedRepartidor(p.repartidor_id ?? null);
    try {
      const { data: detallesData, error } = await supabase
        .from("detalle_pedidos")
        .select(
          `*, platillo:platillos(id,nombre,descripcion,precio,imagen_url)`,
        )
        .eq("pedido_id", p.id);
      if (error) throw error;
      setDetalles(detallesData || []);
    } catch (err: any) {
      console.error("Error cargando detalles:", err);
      toast({ title: "Error cargando detalles", description: err?.message });
    } finally {
      setLoadingDetalles(false);
    }
  }

  async function assignRepartidor() {
    if (!selected) return;
    try {
      if (!selectedRepartidor) {
        toast({ title: "Selecciona un repartidor" });
        return;
      }

      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(selectedRepartidor)) {
        toast({
          title: "ID inválido",
          description: "El identificador del repartidor no tiene formato UUID",
        });
        return;
      }

      const reps = repartidoresQ.data || [];
      const found = reps.find(
        (r: any) =>
          r.id === selectedRepartidor || r.usuario_id === selectedRepartidor,
      );
      if (!found) {
        toast({
          title: "Repartidor no encontrado",
          description: "El repartidor seleccionado no existe en la lista",
        });
        return;
      }

      // Usar el `id` de la tabla `repartidores` como `repartidor_id` en pedidos (según requerimiento)
      const payload: any = {
        repartidor_id: found.id,
        asignado_en: new Date().toISOString(),
      };

      const res = await supabase
        .from("pedidos")
        .update(payload)
        .eq("id", selected.id)
        .select();
      if (res.error) {
        console.error("Supabase update error:", res);
        const msg = res.error?.message || JSON.stringify(res.error);
        // mostrar mensaje amigable si es FK violation
        if (
          msg.toLowerCase().includes("foreign key") ||
          msg.toLowerCase().includes("violates")
        ) {
          toast({
            title: "Error asignando",
            description:
              "Violación de restricción en la base de datos al asignar repartidor (clave foránea). Verifica usuario en auth.users.",
          });
        } else {
          toast({ title: "Error asignando", description: String(msg) });
        }
        return;
      }
      toast({ title: "Repartidor asignado" });
      setOpen(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["pedidos_operador"] });
      queryClient.invalidateQueries({ queryKey: ["repartidores_list"] });
    } catch (err: any) {
      console.error("Error asignando repartidor:", err);
      toast({ title: "Error asignando", description: err?.message });
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              Total: {pedidos?.length || 0}
            </Badge>
            {!isLoading && pedidos.length === 0 && (
              <Badge variant="destructive" className="text-xs">
                ⚠️ No hay pedidos en la base de datos
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["pedidos_operador"] })
          }
        >
          Recargar
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por número de pedido o nombre del cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <Card
          className={`p-3 cursor-pointer flex-1 ${assignedFilter === "sin_asignar" ? "ring-2 ring-rose-500 bg-rose-50" : ""}`}
          onClick={() =>
            setAssignedFilter((s) =>
              s === "sin_asignar" ? "todos" : "sin_asignar",
            )
          }
        >
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Sin asignar</div>
            <div className="text-xl font-bold">{sinAsignar}</div>
          </CardContent>
        </Card>
        <Card
          className={`p-3 cursor-pointer flex-1 ${assignedFilter === "asignado" ? "ring-2 ring-green-500 bg-green-50" : ""}`}
          onClick={() =>
            setAssignedFilter((s) => (s === "asignado" ? "todos" : "asignado"))
          }
        >
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Asignados</div>
            <div className="text-xl font-bold">{asignados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros por estado (cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {STATUS_ORDER.map((s) => (
          <Card
            key={s.key}
            className={`p-3 cursor-pointer ${statusFilter === s.key ? "ring-2 ring-indigo-500 bg-indigo-50" : ""}`}
            onClick={() =>
              setStatusFilter((cur) =>
                cur === s.key ? "todos" : (s.key as any),
              )
            }
          >
            <CardContent className="p-0">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="text-xl font-bold">{statusCounts(s.key)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards de pedidos */}
      {isLoading ? (
        <p>Cargando pedidos...</p>
      ) : pedidosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No se encontraron pedidos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidosFiltrados.map((pedido) => (
            <Card
              key={pedido.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200"
              onClick={() => setLocation(`/pedido-detalle/${pedido.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      #{pedido.numero_pedido || pedido.id.substring(0, 8)}
                    </CardTitle>
                    <Badge variant={getEstadoBadgeVariant(pedido.estado)}>
                      {pedido.estado || "Sin estado"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      ${pedido.total?.toFixed(2) || "0.00"}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Información del cliente */}
                {pedido.cliente_nombre && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{pedido.cliente_nombre}</span>
                  </div>
                )}

                {/* Información del restaurante */}
                {pedido.restaurante_nombre && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {pedido.restaurante_nombre}
                    </span>
                  </div>
                )}

                {/* Dirección de entrega */}
                {pedido.direccion_entrega && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground line-clamp-2">
                      {pedido.direccion_entrega}
                    </span>
                  </div>
                )}

                {/* Costo de envío */}
                {pedido.costo_envio !== null &&
                  pedido.costo_envio !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Envío: ${pedido.costo_envio.toFixed(2)}
                      </span>
                    </div>
                  )}

                {/* Repartidor asignado */}
                <div className="pt-2 border-t">
                  {pedido.repartidor_nombre ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Repartidor: {pedido.repartidor_nombre}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Sin repartidor asignado
                    </Badge>
                  )}
                </div>

                {/* Fecha de creación */}
                <div className="text-xs text-muted-foreground">
                  {pedido.creado_en
                    ? new Date(pedido.creado_en).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-2">
            {selected && (
              <div>
                <div className="font-semibold">
                  Pedido: {selected.numero_pedido ?? selected.id}
                </div>
                <div>Estado: {selected.estado}</div>
                <div>Total: {selected.total ?? 0}</div>
              </div>
            )}

            <DialogDescription>
              Pedido {selected?.numero_pedido ?? selected?.id}
            </DialogDescription>
            <div>
              <h3 className="font-medium">Productos</h3>
              {loadingDetalles ? (
                <p>Cargando...</p>
              ) : detalles.length === 0 ? (
                <p>No hay productos</p>
              ) : (
                <ul className="list-disc pl-6">
                  {detalles.map((d) => (
                    <li key={d.id}>
                      {d.cantidad}x {d.platillo?.nombre || d.platillo_id} —{" "}
                      {d.subtotal}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-medium">Asignar repartidor</h3>
              <div className="mt-2">
                <Select onValueChange={(v) => setSelectedRepartidor(v)}>
                  <SelectTrigger className="w-64">
                    <SelectValue>
                      {selectedRepartidor ?? "Seleccionar repartidor"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(repartidoresQ.data || []).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nombre_completo}{" "}
                        {r.disponible ? "" : "(no disponible)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={assignRepartidor} disabled={!selected}>
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
