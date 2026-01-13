import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

type Repartidor = {
  id: string;
  usuario_id?: string | null;
  nombre_completo?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  estado?: string | null;
  disponible?: boolean | null;
  codigo?: string | null;
  clave_hash?: string | null;
  clave_salt?: string | null;
  tipo_vehiculo?: string | null;
  placa_vehiculo?: string | null;
};

export default function Repartidores() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Repartidor | null>(null);
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activo' | 'inactivo'>('todos');

  const { data: repartidores, isLoading, refetch, error: fetchError } = useQuery({
    queryKey: ["repartidores"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("repartidores")
          .select(
            `id, usuario_id, nombre_completo, telefono, foto_url, estado, disponible, codigo`
          )
          .order("creado_en", { ascending: false });
        if (error) throw error;
        return data as Repartidor[];
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("Error fetching repartidores:", err);
        throw err;
      }
    },
  });

  const form = useForm<Partial<Repartidor>>({
    defaultValues: { nombre_completo: "", telefono: "", codigo: "", tipo_vehiculo: "", placa_vehiculo: "", estado: "inactivo", disponible: false },
  });

  function startCreate() {
    setEditing(null);
    form.reset({ nombre_completo: "", telefono: "", codigo: "", tipo_vehiculo: "", placa_vehiculo: "", estado: "inactivo", disponible: false });
    setOpen(true);
  }

  function startEdit(r: Repartidor) {
    setEditing(r);
    form.reset({ nombre_completo: r.nombre_completo ?? "", telefono: r.telefono ?? "", codigo: r.codigo ?? "", tipo_vehiculo: r.tipo_vehiculo ?? "", placa_vehiculo: r.placa_vehiculo ?? "", estado: r.estado ?? "inactivo", disponible: Boolean(r.disponible) });
    setOpen(true);
  }

  async function deriveHash(password: string) {
    const enc = new TextEncoder();
    const pwKey = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const saltArr = crypto.getRandomValues(new Uint8Array(16));
    const derived = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltArr, iterations: 100000, hash: "SHA-256" },
      pwKey,
      256
    );
    const hashArray = new Uint8Array(derived);
    const toHex = (buf: Uint8Array) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
    return { hashHex: toHex(hashArray), saltHex: toHex(saltArr) };
  }

  async function onSubmit(values: Partial<Repartidor>) {
    try {
      if (editing) {
        const payload: any = {
          nombre_completo: values.nombre_completo ?? editing.nombre_completo,
          telefono: values.telefono ?? editing.telefono,
          codigo: (values as any).codigo ?? editing.codigo,
          tipo_vehiculo: (values as any).tipo_vehiculo ?? (editing as any).tipo_vehiculo,
          placa_vehiculo: (values as any).placa_vehiculo ?? (editing as any).placa_vehiculo,
          estado: (values as any).estado ?? editing?.estado,
          disponible: (values as any).disponible ?? editing?.disponible,
        };

        if ((values as any).clave && (values as any).clave.length > 0) {
          const { hashHex, saltHex } = await deriveHash((values as any).clave as string);
          payload.clave_hash = hashHex;
          payload.clave_salt = saltHex;
        }

        const { error } = await supabase
          .from("repartidores")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Repartidor actualizado" });
      } else {
        const payload: any = {
          usuario_id: (values as any).usuario_id ?? (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : null),
          nombre_completo: values.nombre_completo ?? null,
          telefono: values.telefono ?? null,
          tipo_vehiculo: (values as any).tipo_vehiculo ?? null,
          placa_vehiculo: (values as any).placa_vehiculo ?? null,
          estado: (values as any).estado ?? 'inactivo',
          disponible: (values as any).disponible ?? false,
          codigo: (values as any).codigo ?? null,
          creado_en: new Date().toISOString(),
        };

        if ((values as any).clave && (values as any).clave.length > 0) {
          const { hashHex, saltHex } = await deriveHash((values as any).clave as string);
          payload.clave_hash = hashHex;
          payload.clave_salt = saltHex;
        }

        const { error } = await supabase.from("repartidores").insert([payload]);
        if (error) throw error;
        toast({ title: "Repartidor creado" });
      }
      setOpen(false);
      await refetch();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error saving repartidor:", err);
      toast({ title: "Error", description: err?.message });
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Repartidores</h1>
        <Button onClick={startCreate}>Agregar Repartidor</Button>
      </div>

      {/* Filtros: Activos / Inactivo */}
      <div className="flex gap-4 mb-4">
        <Card
          className={`p-3 cursor-pointer flex-1 ${estadoFilter === 'activo' ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
          onClick={() => setEstadoFilter((s) => (s === 'activo' ? 'todos' : 'activo'))}
        >
          <CardContent>
            <div className="text-sm text-muted-foreground">Activos</div>
            <div className="text-xl font-bold">{(repartidores || []).filter(r => (r.estado ?? 'inactivo') === 'activo').length}</div>
          </CardContent>
        </Card>

        <Card
          className={`p-3 cursor-pointer flex-1 ${estadoFilter === 'inactivo' ? 'ring-2 ring-rose-500 bg-rose-50' : ''}`}
          onClick={() => setEstadoFilter((s) => (s === 'inactivo' ? 'todos' : 'inactivo'))}
        >
          <CardContent>
            <div className="text-sm text-muted-foreground">Inactivos</div>
            <div className="text-xl font-bold">{(repartidores || []).filter(r => (r.estado ?? 'inactivo') === 'inactivo').length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <p>Cargando...</p>
          ) : fetchError ? (
            <div className="text-red-500">Error al cargar repartidores: {String(fetchError.message ?? fetchError)}</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {((repartidores || []).filter(r => estadoFilter === 'todos' ? true : ((r.estado ?? 'inactivo') === estadoFilter))).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>No hay repartidores.</TableCell>
                    </TableRow>
                  ) : (
                    (repartidores || []).filter(r => estadoFilter === 'todos' ? true : ((r.estado ?? 'inactivo') === estadoFilter)).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.id}</TableCell>
                      <TableCell>{r.nombre_completo ?? "-"}</TableCell>
                      <TableCell>{r.telefono ?? "-"}</TableCell>
                      <TableCell>{r.codigo ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => startEdit(r)}>Editar</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Repartidor" : "Agregar Repartidor"}</DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <div>
              <label className="block text-sm mb-1">Código</label>
              <Input {...form.register("codigo")} />
            </div>

            <div>
              <label className="block text-sm mb-1">Clave (mínimo 6 caracteres)</label>
              <Input type="password" {...form.register("clave")} />
            </div>

            <div>
              <label className="block text-sm mb-1">Nombre completo</label>
              <Input {...form.register("nombre_completo")} />
            </div>

            <div>
              <label className="block text-sm mb-1">Teléfono</label>
              <Input {...form.register("telefono")} />
            </div>

            <div>
              <label className="block text-sm mb-1">Tipo de vehículo</label>
              <Input {...form.register("tipo_vehiculo")} />
            </div>

            <div>
              <label className="block text-sm mb-1">Placa vehículo</label>
              <Input {...form.register("placa_vehiculo")} />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm mb-1">Estado</label>
                <select {...form.register("estado")} className="block p-2 rounded-md">
                  <option value="inactivo">Inactivo</option>
                  <option value="activo">Activo</option>
                </select>
              </div>

              <div className="flex items-center">
                <input type="checkbox" {...form.register("disponible")} id="disponible" />
                <label htmlFor="disponible" className="ml-2">Disponible</label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">{editing ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

