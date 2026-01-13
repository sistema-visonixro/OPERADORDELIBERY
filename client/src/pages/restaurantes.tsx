import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Restaurante = {
  id: string;
  nombre?: string | null;
  activo?: boolean | null;
};

export default function Restaurantes() {
  const { toast } = useToast();
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activo' | 'inactivo'>('todos');

  const { data: restaurantes, isLoading, error } = useQuery({
    queryKey: ["restaurantes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurantes").select("id, nombre, activo").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Restaurante[];
    },
  });

  // Obtener conteos agregados por restaurante (parallel)
  const { data: agregados, isLoading: loadingAgregados } = useQuery({
    queryKey: ["restaurantes-agregados", restaurantes],
    enabled: Array.isArray(restaurantes),
    queryFn: async () => {
      if (!restaurantes) return {} as Record<string, any>;
      const result: Record<string, any> = {};
      await Promise.all(
        restaurantes.map(async (r) => {
          try {
            const platillosResp = await supabase.from("platillos").select("id", { count: "exact", head: true }).eq("restaurante_id", r.id);
            const platillosCount = (platillosResp as any)?.count ?? 0;
            const bebidasCount = 0; // no 'tipo' column available in platillos schema

            // Helper to try multiple status column names across possible tables
            async function countByStatus(table: string, columnCandidates: string[], statuses: string[]) {
              for (const col of columnCandidates) {
                try {
                  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("restaurante_id", r.id).in(col, statuses) as any;
                  if (typeof count === "number") return count;
                } catch (e) {
                  // ignore and try next column name
                }
              }
              return 0;
            }

            const statusCols = ["estado_pedido", "status", "estado"];
            const realizadosVals = ["entregado", "realizado", "completado"];
            const rechazadosVals = ["cancelado", "rechazado"];
            const pendientesVals = ["pendiente", "en_preparacion", "enviado"];

            const [pedidosRealizados1, pedidosRechazados1, pedidosPendientes1] = await Promise.all([
              countByStatus("pedidos_restaurante", statusCols, realizadosVals),
              countByStatus("pedidos_restaurante", statusCols, rechazadosVals),
              countByStatus("pedidos_restaurante", statusCols, pendientesVals),
            ]);

            const [pedidosRealizados2, pedidosRechazados2, pedidosPendientes2] = await Promise.all([
              countByStatus("pedidos", statusCols, realizadosVals),
              countByStatus("pedidos", statusCols, rechazadosVals),
              countByStatus("pedidos", statusCols, pendientesVals),
            ]);

            const pedidosRealizados = (pedidosRealizados1 ?? 0) + (pedidosRealizados2 ?? 0);
            const pedidosRechazados = (pedidosRechazados1 ?? 0) + (pedidosRechazados2 ?? 0);
            const pedidosPendientes = (pedidosPendientes1 ?? 0) + (pedidosPendientes2 ?? 0);
            result[r.id] = {
              platillos: platillosCount,
              bebidas: bebidasCount,
              pedidos_realizados: pedidosRealizados,
              pedidos_rechazados: pedidosRechazados,
              pedidos_pendientes: pedidosPendientes,
            };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Error agregando conteos por restaurante", e);
            result[r.id] = { platillos: 0, bebidas: 0, pedidos_realizados: 0, pedidos_rechazados: 0, pedidos_pendientes: 0 };
          }
        })
      );
      return result;
    },
  });

  const activosCount = (restaurantes || []).filter(r => (r.activo ?? true) === true).length;
  const inactivosCount = (restaurantes || []).filter(r => (r.activo ?? true) === false).length;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Restaurantes</h1>
        <div className="flex gap-2">
          <Button onClick={() => setEstadoFilter('todos')}>Todos</Button>
        </div>
      </div>
      {/* Filtros por activo */}
      <div className="flex gap-4 mb-4">
        <Card className={`p-3 cursor-pointer flex-1 ${estadoFilter === 'activo' ? 'ring-2 ring-green-500 bg-green-50' : ''}`} onClick={() => setEstadoFilter((s) => (s === 'activo' ? 'todos' : 'activo'))}>
          <CardContent>
            <div className="text-sm text-muted-foreground">Activos</div>
            <div className="text-xl font-bold">{activosCount}</div>
          </CardContent>
        </Card>

        <Card className={`p-3 cursor-pointer flex-1 ${estadoFilter === 'inactivo' ? 'ring-2 ring-rose-500 bg-rose-50' : ''}`} onClick={() => setEstadoFilter((s) => (s === 'inactivo' ? 'todos' : 'inactivo'))}>
          <CardContent>
            <div className="text-sm text-muted-foreground">Inactivos</div>
            <div className="text-xl font-bold">{inactivosCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          {isLoading || loadingAgregados ? (
            <p>Cargando...</p>
          ) : error ? (
            <div className="text-red-500">Error cargando restaurantes: {String((error as any).message ?? error)}</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Platillos</TableHead>
                    <TableHead>Bebidas</TableHead>
                    <TableHead>Pedidos Realizados</TableHead>
                    <TableHead>Rechazados</TableHead>
                    <TableHead>Pendientes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(restaurantes || []).filter(r => (estadoFilter === 'todos' ? true : ((estadoFilter === 'activo') ? (r.activo ?? true) === true : (r.activo ?? true) === false))).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.id}</TableCell>
                      <TableCell>{r.nombre ?? "-"}</TableCell>
                      <TableCell>{(r.activo ?? true) ? 'Activo' : 'Inactivo'}</TableCell>
                      <TableCell>{(agregados && agregados[r.id]?.platillos) ?? 0}</TableCell>
                      <TableCell>{(agregados && agregados[r.id]?.bebidas) ?? 0}</TableCell>
                      <TableCell>{(agregados && agregados[r.id]?.pedidos_realizados) ?? 0}</TableCell>
                      <TableCell>{(agregados && agregados[r.id]?.pedidos_rechazados) ?? 0}</TableCell>
                      <TableCell>{(agregados && agregados[r.id]?.pedidos_pendientes) ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
