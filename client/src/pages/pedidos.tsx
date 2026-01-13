import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
};

export default function Pedidos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PedidoRow | null>(null);
  const [open, setOpen] = useState(false);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [selectedRepartidor, setSelectedRepartidor] = useState<string | null>(null);

  // Obtener pedidos (preferir `pedidos`, fallback a `pedidos_restaurante`)
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos_operador"],
    queryFn: async () => {
      // Intentar tabla `pedidos`
      try {
        const { data, error } = await supabase
          .from("pedidos")
          .select("id,numero_pedido,total,estado,restaurante_id,usuario_id,repartidor_id,creado_en")
          .order("creado_en", { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) return data as PedidoRow[];
      } catch (e) {
        // ignore
      }

      // Fallback a `pedidos_restaurante`
      const { data: d2, error: err2 } = await supabase
        .from("pedidos_restaurante")
        .select("id,numero_pedido,total,estado_pedido,restaurante_id,created_at")
        .order("created_at", { ascending: true });
      if (err2) throw err2;
      if (!d2) return [];
      // Mapear a shape común
      return (d2 as any[]).map((p) => ({
        id: String(p.id),
        numero_pedido: p.numero_pedido,
        total: p.total,
        estado: p.estado_pedido,
        restaurante_id: p.restaurante_id,
        usuario_id: (p as any).usuario_id ?? null,
        repartidor_id: (p as any).repartidor_id ?? null,
        creado_en: p.created_at,
      })) as PedidoRow[];
    },
  });

  const repartidoresQ = useQuery({
    queryKey: ["repartidores_list"],
    queryFn: async () => {
      const { data } = await supabase.from("repartidores").select("id,usuario_id,nombre_completo,disponible");
      return data || [];
    },
  });

  const [assignedFilter, setAssignedFilter] = useState<'todos'|'asignado'|'sin_asignar'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos'|'pendiente'|'confirmado'|'en_preparacion'|'en_camino'|'entregado'>('todos');

  // Conteos: asignados / sin asignar
  const asignados = (pedidos || []).filter((p: any) => (statusFilter === 'todos' ? true : p.estado === statusFilter) && Boolean(p.repartidor_id)).length;
  const sinAsignar = (pedidos || []).filter((p: any) => (statusFilter === 'todos' ? true : p.estado === statusFilter) && !p.repartidor_id).length;

  const STATUS_ORDER: { key: string; label: string }[] = [
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'confirmado', label: 'Tomados' },
    { key: 'en_preparacion', label: 'Preparado' },
    { key: 'en_camino', label: 'En ruta' },
    { key: 'entregado', label: 'Entregados' },
  ];

  const statusCounts = (key: string) => (pedidos || []).filter((p: any) => {
    const statusOk = p.estado === key;
    const assignedOk = assignedFilter === 'todos' ? true : (assignedFilter === 'asignado' ? Boolean(p.repartidor_id) : !p.repartidor_id);
    return statusOk && assignedOk;
  }).length;

  async function openDetails(p: PedidoRow) {
    setSelected(p);
    setOpen(true);
    setLoadingDetalles(true);
    setDetalles([]);
    setSelectedRepartidor(p.repartidor_id ?? null);
    try {
      const { data: detallesData, error } = await supabase
        .from("detalle_pedidos")
        .select(`*, platillo:platillos(id,nombre,descripcion,precio,imagen_url)`)
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

      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(selectedRepartidor)) {
        toast({ title: "ID inválido", description: "El identificador del repartidor no tiene formato UUID" });
        return;
      }

      const reps = repartidoresQ.data || [];
      const found = reps.find((r: any) => r.id === selectedRepartidor || r.usuario_id === selectedRepartidor);
      if (!found) {
        toast({ title: "Repartidor no encontrado", description: "El repartidor seleccionado no existe en la lista" });
        return;
      }

      // Usar el `id` de la tabla `repartidores` como `repartidor_id` en pedidos (según requerimiento)
      const payload: any = { repartidor_id: found.id, asignado_en: new Date().toISOString() };

      const res = await supabase.from("pedidos").update(payload).eq("id", selected.id).select();
      if (res.error) {
        console.error("Supabase update error:", res);
        const msg = res.error?.message || JSON.stringify(res.error);
        // mostrar mensaje amigable si es FK violation
        if (msg.toLowerCase().includes("foreign key") || msg.toLowerCase().includes("violates")) {
          toast({ title: "Error asignando", description: "Violación de restricción en la base de datos al asignar repartidor (clave foránea). Verifica usuario en auth.users." });
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
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <div>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["pedidos_operador"] })}>Recargar</Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <Card className={`p-3 cursor-pointer flex-1 ${assignedFilter === 'sin_asignar' ? 'ring-2 ring-rose-500 bg-rose-50' : ''}`} onClick={() => setAssignedFilter((s) => s === 'sin_asignar' ? 'todos' : 'sin_asignar')}>
          <CardContent>
            <div className="text-sm text-muted-foreground">Sin asignar</div>
            <div className="text-xl font-bold">{sinAsignar}</div>
          </CardContent>
        </Card>
        <Card className={`p-3 cursor-pointer flex-1 ${assignedFilter === 'asignado' ? 'ring-2 ring-green-500 bg-green-50' : ''}`} onClick={() => setAssignedFilter((s) => s === 'asignado' ? 'todos' : 'asignado')}>
          <CardContent>
            <div className="text-sm text-muted-foreground">Asignados</div>
            <div className="text-xl font-bold">{asignados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros por estado (cards) */}
      <div className="flex gap-4 mb-6">
        {STATUS_ORDER.map((s) => (
          <Card key={s.key} className={`p-3 cursor-pointer flex-1 ${statusFilter === s.key ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`} onClick={() => setStatusFilter((cur) => cur === s.key ? 'todos' : (s.key as any))}>
            <CardContent>
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="text-xl font-bold">{statusCounts(s.key)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pedidos (de más viejo a más nuevo)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Repartidor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pedidos || []).filter((p: any) => {
                  const statusOk = statusFilter === 'todos' ? true : p.estado === statusFilter;
                  const assignedOk = assignedFilter === 'todos' ? true : (assignedFilter === 'asignado' ? Boolean(p.repartidor_id) : !p.repartidor_id);
                  return statusOk && assignedOk;
                }).map((p: any) => (
                  <TableRow key={p.id} onClick={() => openDetails(p)} className="cursor-pointer">
                    <TableCell>{p.numero_pedido ?? p.id}</TableCell>
                    <TableCell>{p.estado ?? "-"}</TableCell>
                    <TableCell>{(() => {
                      const reps = repartidoresQ.data || [];
                      const found = reps.find((r: any) => r.usuario_id === p.repartidor_id || r.id === p.repartidor_id);
                      return found ? found.nombre_completo : (p.repartidor_id ? p.repartidor_id : "-");
                    })()}</TableCell>
                    <TableCell>{p.total ?? 0}</TableCell>
                    <TableCell>{p.creado_en ? new Date(p.creado_en).toLocaleString() : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 p-2">
            {selected && (
              <div>
                <div className="font-semibold">Pedido: {selected.numero_pedido ?? selected.id}</div>
                <div>Estado: {selected.estado}</div>
                <div>Total: {selected.total ?? 0}</div>
              </div>
            )}

            <DialogDescription>Pedido {selected?.numero_pedido ?? selected?.id}</DialogDescription>
            <div>
              <h3 className="font-medium">Productos</h3>
              {loadingDetalles ? (
                <p>Cargando...</p>
              ) : detalles.length === 0 ? (
                <p>No hay productos</p>
              ) : (
                <ul className="list-disc pl-6">
                  {detalles.map((d) => (
                    <li key={d.id}>{d.cantidad}x {d.platillo?.nombre || d.platillo_id} — {d.subtotal}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-medium">Asignar repartidor</h3>
              <div className="mt-2">
                <Select onValueChange={(v) => setSelectedRepartidor(v)}>
                  <SelectTrigger className="w-64">
                    <SelectValue>{selectedRepartidor ?? "Seleccionar repartidor"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(repartidoresQ.data || []).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.nombre_completo} {r.disponible ? '' : '(no disponible)'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button onClick={assignRepartidor} disabled={!selected}>Asignar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
