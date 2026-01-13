import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  getHondurasDayStartUTC,
  getHondurasDayEndUTC,
} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const STATUS_MAP: { key: string; label: string }[] = [
  ["pendiente", "Pendientes"],
  ["confirmado", "Tomados"],
  ["en_preparacion", "Preparado"],
  ["en_camino", "En ruta"],
  ["entregado", "Entregados"],
] as any;

export default function MisPedidos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const restauranteStorage =
    typeof window !== "undefined"
      ? localStorage.getItem("restaurante_id")
      : null;
  const restauranteId = restauranteStorage
    ? restauranteStorage
        .toString()
        .replace(/['"\s]+/g, "")
        .trim()
    : null;

  const [filterStatus, setFilterStatus] = useState<string | null>("pendiente");
  const [selected, setSelected] = useState<any | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [numeroPedido, setNumeroPedido] = useState<string>("");
  const [detallesPedido, setDetallesPedido] = useState<any[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: [
      "pedidos",
      restauranteId,
      startDate,
      endDate,
      numeroPedido,
      filterStatus,
    ],
    queryFn: async () => {
      if (!restauranteId) return [];
      let qb: any = supabase
        .from("pedidos")
        .select("*")
        .eq("restaurante_id", restauranteId);
      if (numeroPedido && numeroPedido.trim().length > 0)
        qb = qb.ilike("numero_pedido", `%${numeroPedido}%`);
      if (startDate)
        qb = qb.gte("creado_en", getHondurasDayStartUTC(startDate));
      if (endDate) qb = qb.lte("creado_en", getHondurasDayEndUTC(endDate));
      if (filterStatus) qb = qb.eq("estado", filterStatus);
      const { data, error } = await qb.order("creado_en", { ascending: false });
      if (error) throw error;
      const pedidosData: any[] = data || [];
      if (pedidosData.length === 0) return pedidosData;

      // Traer nombres de usuarios en lote
      const usuarioIds = Array.from(
        new Set(pedidosData.map((p) => p.usuario_id).filter(Boolean))
      );
      if (usuarioIds.length > 0) {
        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuarios")
          .select("id,nombre")
          .in("id", usuarioIds);
        if (usuariosError) {
          // eslint-disable-next-line no-console
          console.warn("No se pudieron traer usuarios:", usuariosError);
        } else if (usuariosData) {
          const map = (usuariosData as any[]).reduce((acc: any, u: any) => {
            acc[u.id] = u;
            return acc;
          }, {} as any);
          // adjuntar nombre_cliente a cada pedido
          pedidosData.forEach((p) => {
            p.nombre_cliente = map[p.usuario_id]?.nombre || null;
          });
        }
      }

      return pedidosData;
    },
    enabled: Boolean(restauranteId),
  });

  // Query adicional para obtener pedidos SIN filtrar por estado (se usa para mostrar los conteos)
  const { data: pedidosCounts = [] } = useQuery({
    queryKey: [
      "pedidos_counts",
      restauranteId,
      startDate,
      endDate,
      numeroPedido,
    ],
    queryFn: async () => {
      if (!restauranteId) return [];
      let qb: any = supabase
        .from("pedidos")
        .select("*")
        .eq("restaurante_id", restauranteId);
      if (numeroPedido && numeroPedido.trim().length > 0)
        qb = qb.ilike("numero_pedido", `%${numeroPedido}%`);
      if (startDate)
        qb = qb.gte("creado_en", getHondurasDayStartUTC(startDate));
      if (endDate) qb = qb.lte("creado_en", getHondurasDayEndUTC(endDate));
      const { data, error } = await qb.order("creado_en", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: Boolean(restauranteId),
  });

  // counts per status (usar pedidosCounts si está disponible para no depender del filtro de estado)
  const counts = (key: string) => {
    const source =
      pedidosCounts && (pedidosCounts as any[]).length > 0
        ? pedidosCounts
        : pedidos;
    return (source || []).filter((p: any) => p.estado === key).length;
  };

  // Validar transiciones de estado para evitar regresar a estados anteriores
  function allowedNextStates(current: string | undefined | null) {
    switch (current) {
      case "pendiente":
        return ["confirmado"];
      case "confirmado":
        return ["en_preparacion"];
      case "en_preparacion":
        return ["en_camino"];
      case "en_camino":
        return ["entregado"];
      default:
        return [];
    }
  }

  async function openDetails(p: any) {
    setSelected(p);
    setOpenModal(true);
    setDetallesPedido([]);
    setLoadingDetalles(true);

    try {
      // Obtener detalles del pedido con información de platillos
      const { data: detalles, error } = await supabase
        .from("detalle_pedidos")
        .select(
          `
          *,
          platillo:platillos(
            id,
            nombre,
            descripcion,
            precio,
            imagen_url
          )
        `
        )
        .eq("pedido_id", p.id);

      if (error) throw error;
      setDetallesPedido(detalles || []);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error cargando detalles del pedido:", err);
      toast({
        title: "Error cargando detalles",
        description: err?.message,
        variant: "destructive",
      });
      setDetallesPedido([]);
    } finally {
      setLoadingDetalles(false);
    }
  }

  async function updateEstado(nuevoEstado: string) {
    if (!selected) return;
    // validar transición: sólo permitir avanzar en la secuencia
    const allowed = allowedNextStates(selected.estado);
    if (selected.estado === nuevoEstado) {
      toast({ title: "El pedido ya tiene ese estado" });
      return;
    }
    if (!allowed.includes(nuevoEstado)) {
      toast({
        title: "Transición inválida",
        description: `No se puede cambiar de ${selected.estado} a ${nuevoEstado}`,
      });
      return;
    }
    try {
      const payload: any = {
        estado: nuevoEstado,
        actualizado_en: new Date().toISOString(),
      };
      if (nuevoEstado === "confirmado")
        payload.confirmado_en = new Date().toISOString();
      if (nuevoEstado === "en_preparacion")
        payload.asignado_en = new Date().toISOString();
      if (nuevoEstado === "en_camino")
        payload.asignado_en = new Date().toISOString();
      if (nuevoEstado === "entregado")
        payload.entregado_en = new Date().toISOString();

      const res = await supabase
        .from("pedidos")
        .update(payload)
        .eq("id", selected.id)
        .select();
      // debug
      // eslint-disable-next-line no-console
      console.log("Supabase update result:", res);
      if (res.error) throw res.error;
      toast({ title: "Estado actualizado" });
      setOpenModal(false);
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["pedidos_counts"] });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error actualizando estado:", err);
      toast({ title: "Error actualizando estado", description: err?.message });
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Mis pedidos</h1>
          <div>
            <Button
              disabled={isLoading}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["pedidos"] });
                queryClient.invalidateQueries({ queryKey: ["pedidos_counts"] });
              }}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Cargando..." : "Recargar"}
            </Button>
          </div>
        </div>

        {/* Debug / estado de sesión */}
        {!restauranteId && (
          <div className="mb-4 text-sm text-yellow-600">
            No se encontró `restaurante_id` en localStorage. Asegúrate de haber
            iniciado sesión con un usuario de restaurante.
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div>
            <label className="text-sm block mb-1">Desde</label>
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => setStartDate(e.target.value || null)}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
          <div>
            <label className="text-sm block mb-1">Hasta</label>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => setEndDate(e.target.value || null)}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm block mb-1">Número de pedido</label>
            <div className="flex gap-2">
              <input
                placeholder="Buscar por número"
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
                className="border px-2 py-1 rounded w-full"
              />
              <Button
                onClick={() => {
                  const d = new Date();
                  const s = d.toISOString().slice(0, 10);
                  setStartDate(s);
                  setEndDate(s);
                }}
              >
                Hoy
              </Button>
              <Button
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  setNumeroPedido("");
                  setFilterStatus("pendiente");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {STATUS_MAP.map(([key, label]: any) => (
            <Card
              key={key}
              className={`p-4 cursor-pointer`}
              onClick={() => setFilterStatus(key)}
            >
              <CardHeader>
                <CardTitle className="text-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{counts(key)}</div>
              </CardContent>
            </Card>
          ))}
          <div />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Pedidos {filterStatus ? `- ${filterStatus}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">#</th>
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Dirección</th>
                    <th className="p-2">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {(pedidos || [])
                    .filter((p: any) =>
                      filterStatus ? p.estado === filterStatus : true
                    )
                    .map((p: any) => (
                      <tr
                        key={p.id}
                        className="border-b hover:bg-muted/10 cursor-pointer"
                        onClick={() => openDetails(p)}
                      >
                        <td className="p-2">{p.numero_pedido}</td>
                        <td className="p-2">{p.nombre_cliente || "-"}</td>
                        <td className="p-2">{p.estado}</td>
                        <td className="p-2">{p.total}</td>
                        <td className="p-2">{p.direccion_entrega}</td>
                        <td className="p-2">
                          {p.creado_en ? formatDate(p.creado_en) : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {openModal && selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl text-black max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-2">
                Pedido {selected.numero_pedido}
              </h2>
              <div className="space-y-2 mb-4">
                <p className="text-sm">
                  <span className="font-medium">Estado:</span> {selected.estado}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Cliente:</span>{" "}
                  {selected.nombre_cliente || "N/A"}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Dirección:</span>{" "}
                  {selected.direccion_entrega || "N/A"}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Total:</span> L {selected.total}
                </p>
                {selected.observaciones && (
                  <p className="text-sm">
                    <span className="font-medium">Observaciones:</span>{" "}
                    {selected.observaciones}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-medium">Creado:</span>{" "}
                  {selected.creado_en ? formatDate(selected.creado_en) : "N/A"}
                </p>
              </div>

              {/* Detalles de productos */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-3">
                  Productos del pedido
                </h3>
                {loadingDetalles ? (
                  <div className="text-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Cargando productos...
                    </p>
                  </div>
                ) : detallesPedido.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay productos en este pedido
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detallesPedido.map((detalle: any) => (
                      <div
                        key={detalle.id}
                        className="border rounded-lg p-3 flex gap-3"
                      >
                        {detalle.platillo?.imagen_url && (
                          <img
                            src={detalle.platillo.imagen_url}
                            alt={detalle.platillo.nombre}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {detalle.platillo?.nombre || "Producto sin nombre"}
                          </h4>
                          {detalle.platillo?.descripcion && (
                            <p className="text-xs text-muted-foreground">
                              {detalle.platillo.descripcion}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm">
                              Cantidad: {detalle.cantidad}
                            </span>
                            <span className="text-sm">
                              Precio: L {detalle.precio_unitario}
                            </span>
                          </div>
                          <div className="text-sm font-medium mt-1">
                            Subtotal: L {detalle.subtotal}
                          </div>
                          {detalle.notas && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Notas:</span>{" "}
                              {detalle.notas}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap pt-4 border-t">
                {(() => {
                  const allowed = allowedNextStates(selected?.estado);
                  return (
                    <>
                      <Button
                        disabled={!allowed.includes("confirmado")}
                        onClick={() => updateEstado("confirmado")}
                      >
                        Marcar Tomado
                      </Button>
                      <Button
                        disabled={!allowed.includes("en_preparacion")}
                        onClick={() => updateEstado("en_preparacion")}
                      >
                        Marcar Preparado
                      </Button>
                      <Button
                        disabled={!allowed.includes("en_camino")}
                        onClick={() => updateEstado("en_camino")}
                      >
                        Marcar En ruta
                      </Button>
                    </>
                  );
                })()}
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpenModal(false);
                    setSelected(null);
                    setDetallesPedido([]);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
