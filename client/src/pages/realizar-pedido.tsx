import React, { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Pedido = {
  id: number;
  numero_pedido: string;
  total: number;
  direccion_entrega: string | null;
  observaciones: string | null;
  estado_pedido: string;
  enviado_a_operador: boolean;
  restaurante_id: string | null;
  created_at: string | null;
};

export default function RealizarPedido() {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [filter, setFilter] = useState<"all" | "pendiente" | "entregado">("all");

  // Modal / form state
  const [open, setOpen] = useState(false);
  const [numeroPedido, setNumeroPedido] = useState<string>(`P-${Date.now()}`);
  const [total, setTotal] = useState<string>("0.00");
  const [direccion, setDireccion] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");
  const [estadoPedido, setEstadoPedido] = useState<string>("pendiente");
  const [enviarOperador, setEnviarOperador] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPedidos = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from("pedidos_restaurante")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPedidos((data as any) || []);
    } catch (err: any) {
      toast({ title: "Error cargando pedidos", description: err.message || String(err) });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const openModal = () => {
    setNumeroPedido(`P-${Date.now()}`);
    setTotal("0.00");
    setDireccion("");
    setObservaciones("");
    setEstadoPedido("pendiente");
    setEnviarOperador(false);
    setOpen(true);
  };

  const canSubmit = () => {
    return (
      numeroPedido.trim() !== "" &&
      total.toString().trim() !== "" &&
      direccion.trim() !== "" &&
      estadoPedido.trim() !== ""
    );
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSubmit()) return;
    setSubmitting(true);
    const payload = {
      numero_pedido: numeroPedido,
      total: parseFloat(total) || 0,
      direccion_entrega: direccion,
      observaciones: observaciones,
      estado_pedido: estadoPedido,
      enviado_a_operador: enviarOperador,
    } as any;
    try {
      const { data, error } = await supabase.from("pedidos_restaurante").insert(payload).select().single();
      if (error) throw error;
      toast({ title: "Pedido creado", description: `ID: ${data.id}` });
      setOpen(false);
      fetchPedidos();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = pedidos.filter((p) => {
    if (filter === "all") return true;
    if (filter === "pendiente") return p.estado_pedido === "pendiente";
    if (filter === "entregado") return p.estado_pedido === "entregado";
    return true;
  });

  const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : "-");

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Realizar pedido</h1>
          <div className="flex items-center gap-2">
            <button onClick={openModal} className="btn-primary">
              Agregar pedido
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className={`px-3 py-1 rounded ${filter === "all" ? "bg-primary text-white" : "bg-muted"}`} onClick={() => setFilter("all")}>
            Todos
          </button>
          <button className={`px-3 py-1 rounded ${filter === "pendiente" ? "bg-primary text-white" : "bg-muted"}`} onClick={() => setFilter("pendiente")}>
            Pendiente
          </button>
          <button className={`px-3 py-1 rounded ${filter === "entregado" ? "bg-primary text-white" : "bg-muted"}`} onClick={() => setFilter("entregado")}>
            Entregado
          </button>
        </div>

        <div className="mt-6">
          <div className="overflow-auto border rounded">
            <table className="w-full table-fixed">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Número</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Dirección</th>
                  <th className="p-2">Observaciones</th>
                  <th className="p-2">Creado</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center">Cargando...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center">No hay pedidos</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2 align-top">{p.id}</td>
                      <td className="p-2 align-top">{p.numero_pedido}</td>
                      <td className="p-2 align-top">{p.total.toFixed(2)}</td>
                      <td className="p-2 align-top">{p.estado_pedido}</td>
                      <td className="p-2 align-top">{p.direccion_entrega || "-"}</td>
                      <td className="p-2 align-top">{p.observaciones || "-"}</td>
                      <td className="p-2 align-top">{formatDate(p.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal para crear pedido */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            {/* hidden trigger; we open via button */}
            <span />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear pedido</DialogTitle>
              <DialogDescription>Completa los campos para crear un nuevo pedido.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Número de pedido <span className="text-muted">(obligatorio)</span></label>
                  <input value={numeroPedido} onChange={(e) => setNumeroPedido(e.target.value)} className="w-full input bg-white border border-slate-200" placeholder="P-123456789" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total <span className="text-muted">(USD)</span></label>
                  <input value={total} onChange={(e) => setTotal(e.target.value)} type="number" step="0.01" className="w-full input bg-white border border-slate-200" placeholder="0.00" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Dirección de entrega <span className="text-muted">(obligatorio)</span></label>
                  <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full input bg-white border border-slate-200" placeholder="Calle, número, ciudad" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Observaciones</label>
                  <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full input min-h-[120px] resize-none bg-white border border-slate-200 p-2" placeholder="Notas adicionales, alergias, etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estado del pedido</label>
                  <select value={estadoPedido} onChange={(e) => setEstadoPedido(e.target.value)} className="w-full input bg-white border border-slate-200">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_preparacion">En preparación</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input id="enviar" type="checkbox" checked={enviarOperador} onChange={(e) => setEnviarOperador(e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="enviar">Enviar a operador</label>
                </div>
              </div>
              <DialogFooter>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" className="px-4 py-2 rounded-md border border-slate-200 bg-white text-sm" onClick={() => setOpen(false)} disabled={submitting}>
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm shadow" disabled={!canSubmit() || submitting}>
                    {submitting ? "Enviando..." : "Crear pedido"}
                  </button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
