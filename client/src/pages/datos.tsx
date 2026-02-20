import React, { useEffect, useMemo, useState } from "react";
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

function keysFromRows(rows: any[]) {
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
  return Array.from(keys);
}

export default function Datos() {
  const { toast } = useToast();

  // TEL (solo actualizar)
  const { data: telData, isLoading: telLoading, refetch: refetchTel, error: telError } = useQuery({
    queryKey: ["tel"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tel").select("*").order("id", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // CUENTAS BANCARIAS (CRUD)
  const { data: cuentasData, isLoading: cuentasLoading, refetch: refetchCuentas, error: cuentasError } = useQuery({
    queryKey: ["cuentas_bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cuentas_bancarias").select("*").order("id", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Generic helpers to build columns
  const telCols = useMemo(() => keysFromRows((telData as any) || []), [telData]);
  const cuentasCols = useMemo(() => keysFromRows((cuentasData as any) || []), [cuentasData]);

  // Dialog state for editing tel (only update)
  const [telOpen, setTelOpen] = useState(false);
  const [telEditing, setTelEditing] = useState<any>(null);
  const telForm = useForm<any>({ defaultValues: {} });

  // Dialog state for cuentas (create / edit)
  const [ctaOpen, setCtaOpen] = useState(false);
  const [ctaEditing, setCtaEditing] = useState<any | null>(null);
  const ctaForm = useForm<any>({ defaultValues: {} });

  useEffect(() => {
    if (telEditing) telForm.reset(telEditing);
  }, [telEditing]);

  useEffect(() => {
    if (ctaEditing) ctaForm.reset(ctaEditing);
  }, [ctaEditing]);

  // TEL: start edit
  function startEditTel(row: any) {
    setTelEditing(row);
    setTelOpen(true);
  }

  async function submitTel(values: any) {
    try {
      if (!telEditing) return;
      const payload: any = {};
      Object.keys(values).forEach((k) => {
        if (k === "id") return;
        payload[k] = values[k];
      });
      const { error } = await supabase.from("tel").update(payload).eq("id", telEditing.id);
      if (error) throw error;
      toast({ title: "Tel actualizado" });
      setTelOpen(false);
      await refetchTel();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast({ title: "Error", description: err?.message });
    }
  }

  // CUENTAS: create / edit / delete
  function startCreateCta() {
    setCtaEditing(null);
    ctaForm.reset({});
    setCtaOpen(true);
  }

  function startEditCta(row: any) {
    setCtaEditing(row);
    setCtaOpen(true);
  }

  async function submitCta(values: any) {
    try {
      if (ctaEditing) {
        const payload: any = {};
        Object.keys(values).forEach((k) => {
          if (k === "id") return;
          payload[k] = values[k];
        });
        const { error } = await supabase.from("cuentas_bancarias").update(payload).eq("id", ctaEditing.id);
        if (error) throw error;
        toast({ title: "Cuenta actualizada" });
      } else {
        const payload: any = {};
        Object.keys(values).forEach((k) => {
          if (k === "id") return;
          payload[k] = values[k];
        });
        const { error } = await supabase.from("cuentas_bancarias").insert([payload]);
        if (error) throw error;
        toast({ title: "Cuenta creada" });
      }
      setCtaOpen(false);
      await refetchCuentas();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast({ title: "Error", description: err?.message });
    }
  }

  async function deleteCta(id: any) {
    try {
      const { error } = await supabase.from("cuentas_bancarias").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Cuenta eliminada" });
      await refetchCuentas();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast({ title: "Error", description: err?.message });
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Datos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium">Tel</h2>
                <p className="text-sm text-muted-foreground">Registros de teléfono (solo edición)</p>
              </div>
              <div />
            </div>

            {telLoading ? (
              <p>Cargando...</p>
            ) : telError ? (
              <div className="text-red-500">Error: {String((telError as any)?.message ?? telError)}</div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {telCols.map((c) => (
                        <TableHead key={c}>{c}</TableHead>
                      ))}
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(telData || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={telCols.length + 1}>No hay datos.</TableCell>
                      </TableRow>
                    ) : (
                      (telData || []).map((r: any) => (
                        <TableRow key={r.id ?? JSON.stringify(r)}>
                          {telCols.map((k) => (
                            <TableCell key={k}>{String(r[k] ?? "-")}</TableCell>
                          ))}
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => startEditTel(r)}>Editar</Button>
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

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium">Cuentas Bancarias</h2>
                <p className="text-sm text-muted-foreground">Crear, editar y eliminar cuentas bancarias</p>
              </div>
              <Button onClick={startCreateCta}>Nueva Cuenta</Button>
            </div>

            {cuentasLoading ? (
              <p>Cargando...</p>
            ) : cuentasError ? (
              <div className="text-red-500">Error: {String((cuentasError as any)?.message ?? cuentasError)}</div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {cuentasCols.map((c) => (
                        <TableHead key={c}>{c}</TableHead>
                      ))}
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cuentasData || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={cuentasCols.length + 1}>No hay cuentas.</TableCell>
                      </TableRow>
                    ) : (
                      (cuentasData || []).map((r: any) => (
                        <TableRow key={r.id ?? JSON.stringify(r)}>
                          {cuentasCols.map((k) => (
                            <TableCell key={k}>{String(r[k] ?? "-")}</TableCell>
                          ))}
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => startEditCta(r)}>Editar</Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteCta(r.id)}>Eliminar</Button>
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
      </div>

      {/* DIALOG TEL */}
      <Dialog open={telOpen} onOpenChange={setTelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tel</DialogTitle>
          </DialogHeader>
          <form onSubmit={telForm.handleSubmit(submitTel)} className="space-y-4 mt-4">
            {(telCols || []).filter((k) => k !== "id").map((k) => (
              <div key={k}>
                <label className="block text-sm mb-1">{k}</label>
                <Input {...telForm.register(k)} defaultValue={(telEditing && telEditing[k]) ?? ""} />
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTelOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG CUENTAS */}
      <Dialog open={ctaOpen} onOpenChange={setCtaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ctaEditing ? "Editar Cuenta" : "Nueva Cuenta"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={ctaForm.handleSubmit(submitCta)} className="space-y-4 mt-4">
            {(cuentasCols || []).filter((k) => k !== "id").map((k) => (
              <div key={k}>
                <label className="block text-sm mb-1">{k}</label>
                <Input {...ctaForm.register(k)} defaultValue={(ctaEditing && ctaEditing[k]) ?? ""} />
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCtaOpen(false)}>Cancelar</Button>
              <Button type="submit">{ctaEditing ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
