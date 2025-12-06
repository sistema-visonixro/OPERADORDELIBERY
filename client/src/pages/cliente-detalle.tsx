import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ClienteDetalle() {
  const [match, params] = useRoute("/clientes/:id");
  const id = params?.id as string | undefined;
  const [cliente, setCliente] = useState<any | null>(null);
  const [pagos, setPagos] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [suscripciones, setSuscripciones] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Estados para modales de contratos
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [editingDateContract, setEditingDateContract] = useState<string | null>(null);
  const [isEditingProximoPago, setIsEditingProximoPago] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const [contractPayments, setContractPayments] = useState<any[]>([]);
  const [contractPaymentsLoading, setContractPaymentsLoading] = useState(false);

  // Estados para modales de suscripciones
  const [selectedSuscripcion, setSelectedSuscripcion] = useState<any | null>(null);
  const [suscripcionModalOpen, setSuscripcionModalOpen] = useState(false);
  const [suscripcionPayments, setSuscripcionPayments] = useState<any[]>([]);
  const [suscripcionPaymentsLoading, setSuscripcionPaymentsLoading] = useState(false);
  const [isEditingSuscripcion, setIsEditingSuscripcion] = useState(false);
  const [editingMensualidad, setEditingMensualidad] = useState("");
  const [editingProximaFecha, setEditingProximaFecha] = useState("");
  const [confirmUpdateSuscripcionOpen, setConfirmUpdateSuscripcionOpen] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const [cRes, pagosRes, contratosRes, subsRes] = await Promise.all([
          supabase.from("clientes").select("*").eq("id", id).limit(1).single(),
          supabase
            .from("pagos")
            .select(
              "id,fecha_de_creacion,tipo,proyecto,monto,notas,referencia_id,created_at"
            )
            .eq("cliente", id)
            .order("fecha_de_creacion", { ascending: false }),
          supabase
            .from("contratos")
            .select(
              "id,monto_total,pago_inicial,cantidad_de_pagos,proximo_pago,proyecto,estado"
            )
            .eq("cliente", id),
          supabase
            .from("suscripciones")
            .select("id,mensualidad,proxima_fecha_de_pago,proyecto,is_active")
            .eq("cliente", id),
        ]);

        if (!cRes.error) setCliente(cRes.data);
        setPagos(Array.isArray(pagosRes.data) ? pagosRes.data : []);
        setContratos(Array.isArray(contratosRes.data) ? contratosRes.data : []);
        setSuscripciones(Array.isArray(subsRes.data) ? subsRes.data : []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error cargando detalle de cliente:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Funciones para el modal de contratos
  async function openContractModal(contract: any) {
    setSelectedContract(contract);
    const val = contract?.proximo_pago
      ? new Date(contract.proximo_pago).toISOString().slice(0, 16)
      : "";
    setEditingDateContract(val || null);
    setIsEditingProximoPago(false);
    setContractModalOpen(true);
    await loadContractPayments(contract?.id);
  }

  async function loadContractPayments(contractId: string) {
    if (!contractId) return;
    try {
      setContractPaymentsLoading(true);
      const { data, error } = await supabase
        .from("pagos")
        .select("id,fecha_de_creacion,monto,notas,created_at")
        .eq("referencia_id", contractId)
        .eq("tipo", "contrato")
        .order("fecha_de_creacion", { ascending: false });
      if (error) throw error;
      setContractPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando pagos del contrato:", err);
      toast({ title: "Error cargando pagos", description: String(err) });
      setContractPayments([]);
    } finally {
      setContractPaymentsLoading(false);
    }
  }

  async function updateProximoPago() {
    if (!selectedContract) return;
    try {
      const iso = editingDateContract ? new Date(editingDateContract).toISOString() : null;
      const { error } = await supabase
        .from("contratos")
        .update({ proximo_pago: iso })
        .eq("id", selectedContract.id);
      if (error) throw error;
      toast({ title: "Próximo pago actualizado" });
      
      // Recargar datos
      const { data } = await supabase
        .from("contratos")
        .select("id,monto_total,pago_inicial,cantidad_de_pagos,proximo_pago,proyecto,estado")
        .eq("cliente", id);
      setContratos(Array.isArray(data) ? data : []);
      
      setConfirmUpdateOpen(false);
      setIsEditingProximoPago(false);
      setSelectedContract({ ...selectedContract, proximo_pago: iso });
    } catch (err: any) {
      console.error("Error actualizando próximo pago:", err);
      toast({
        title: "Error actualizando próximo pago",
        description: err?.message ?? String(err),
      });
    }
  }

  // Funciones para el modal de suscripciones
  async function openSuscripcionModal(suscripcion: any) {
    setSelectedSuscripcion(suscripcion);
    setEditingMensualidad(String(suscripcion?.mensualidad ?? ""));
    const fechaVal = suscripcion?.proxima_fecha_de_pago
      ? new Date(suscripcion.proxima_fecha_de_pago).toISOString().slice(0, 10)
      : "";
    setEditingProximaFecha(fechaVal);
    setIsEditingSuscripcion(false);
    setSuscripcionModalOpen(true);
    await loadSuscripcionPayments(suscripcion?.id);
  }

  async function loadSuscripcionPayments(suscripcionId: string) {
    if (!suscripcionId) return;
    try {
      setSuscripcionPaymentsLoading(true);
      const { data, error } = await supabase
        .from("pagos")
        .select("id,fecha_de_creacion,monto,notas,created_at")
        .eq("referencia_id", suscripcionId)
        .eq("tipo", "suscripcion")
        .order("fecha_de_creacion", { ascending: false });
      if (error) throw error;
      setSuscripcionPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando pagos de suscripción:", err);
      toast({ title: "Error cargando pagos", description: String(err) });
      setSuscripcionPayments([]);
    } finally {
      setSuscripcionPaymentsLoading(false);
    }
  }

  async function updateSuscripcion() {
    if (!selectedSuscripcion) return;
    try {
      const { error } = await supabase
        .from("suscripciones")
        .update({
          mensualidad: Number(editingMensualidad),
          proxima_fecha_de_pago: editingProximaFecha || null,
        })
        .eq("id", selectedSuscripcion.id);
      if (error) throw error;
      toast({ title: "Suscripción actualizada" });
      
      // Recargar datos
      const { data } = await supabase
        .from("suscripciones")
        .select("id,mensualidad,proxima_fecha_de_pago,proyecto,is_active")
        .eq("cliente", id);
      setSuscripciones(Array.isArray(data) ? data : []);
      
      setConfirmUpdateSuscripcionOpen(false);
      setIsEditingSuscripcion(false);
      setSelectedSuscripcion({
        ...selectedSuscripcion,
        mensualidad: Number(editingMensualidad),
        proxima_fecha_de_pago: editingProximaFecha || null,
      });
    } catch (err: any) {
      console.error("Error actualizando suscripción:", err);
      toast({
        title: "Error actualizando suscripción",
        description: err?.message ?? String(err),
      });
    }
  }

  async function toggleSuscripcionStatus() {
    if (!selectedSuscripcion) return;
    try {
      const newStatus = !selectedSuscripcion.is_active;
      const { error } = await supabase
        .from("suscripciones")
        .update({ is_active: newStatus })
        .eq("id", selectedSuscripcion.id);
      if (error) throw error;
      toast({
        title: newStatus ? "Suscripción reactivada" : "Suscripción pausada",
      });
      
      // Recargar datos
      const { data } = await supabase
        .from("suscripciones")
        .select("id,mensualidad,proxima_fecha_de_pago,proyecto,is_active")
        .eq("cliente", id);
      setSuscripciones(Array.isArray(data) ? data : []);
      
      setSelectedSuscripcion({ ...selectedSuscripcion, is_active: newStatus });
    } catch (err: any) {
      console.error("Error cambiando estado de suscripción:", err);
      toast({
        title: "Error",
        description: err?.message ?? String(err),
      });
    }
  }

  // Derived calculations
  const pagosRealizados = pagos || [];

  // calcular saldo de contratos: monto_total - pago_inicial - pagos registrados (por contrato)
  const contratosWithRestante = contratos.map((ct: any) => {
    const paid = (pagosRealizados || [])
      .filter(
        (p: any) =>
          p.tipo === "contrato" && String(p.referencia_id) === String(ct.id)
      )
      .reduce((s: number, p: any) => s + Number(p.monto ?? 0), 0);
    const restante =
      Number(ct.monto_total ?? 0) - Number(ct.pago_inicial ?? 0) - paid;
    return { ...ct, pagos_registrados: paid, restante };
  });

  const totalContratoRestante = contratosWithRestante.reduce(
    (s: number, c: any) => s + Math.max(0, Number(c.restante ?? 0)),
    0
  );

  // suscripciones vencidas: proxima_fecha_de_pago < now && is_active
  const now = new Date();
  const susVencidas = (suscripciones || [])
    .filter((s: any) => {
      const next = s.proxima_fecha_de_pago
        ? new Date(s.proxima_fecha_de_pago)
        : null;
      return s.is_active && next && next < now;
    })
    .map((s: any) => ({
      ...s,
      monto_due: Number(s.mensualidad ?? 0),
      fecha: s.proxima_fecha_de_pago,
    }));

  const totalSusVencidas = susVencidas.reduce(
    (s: number, x: any) => s + Number(x.monto_due ?? 0),
    0
  );

  const totalSaldo = totalContratoRestante + totalSusVencidas;

  // pagos vencidos (list) — desde contratos (proximo_pago < now) y suscripciones (proxima_fecha_de_pago < now)
  const vencimientos: any[] = [];
  contratosWithRestante.forEach((c: any) => {
    if (c.proximo_pago) {
      const d = new Date(c.proximo_pago);
      if (d < now && c.estado === "activo") {
        const cuota =
          Number(c.cantidad_de_pagos ?? 1) > 0
            ? (Number(c.monto_total ?? 0) - Number(c.pago_inicial ?? 0)) /
              Number(c.cantidad_de_pagos ?? 1)
            : 0;
        vencimientos.push({
          tipo: "contrato",
          proyecto: c.proyecto,
          fecha: c.proximo_pago,
          monto: cuota,
          contratoId: c.id,
        });
      }
    }
  });
  susVencidas.forEach((s: any) => {
    vencimientos.push({
      tipo: "suscripcion",
      proyecto: s.proyecto,
      fecha: s.fecha,
      monto: s.monto_due,
      suscripcionId: s.id,
    });
  });

  if (!id) return <div className="p-6">ID de cliente no proporcionado.</div>;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Detalle de Cliente</h1>
      <div className="mt-6">
        {loading && <p>Cargando...</p>}
        {!loading && !cliente && <p>No se encontró el cliente.</p>}
        {cliente && (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div>
                    <strong>Nombre:</strong> {cliente.nombre}
                  </div>
                  <div>
                    <strong>Teléfono:</strong> {cliente.telefono ?? "—"}
                  </div>
                  <div>
                    <strong>RTN:</strong> {cliente.rtn ?? "—"}
                  </div>
                  <div>
                    <strong>Oficio:</strong> {cliente.oficio ?? "—"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Saldo total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalSaldo)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Suma de contratos pendientes y suscripciones vencidas
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Saldo contratos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {formatCurrency(totalContratoRestante)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Total restante en contratos
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Suscripciones vencidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-semibold">
                    {formatCurrency(totalSusVencidas)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Total mensualidades vencidas
                  </div>
                </CardContent>
              </Card>
              {/* Próximos pagos se coloca abajo en su propia fila para mostrarse amplia */}
            </div>

            {/* Card amplia de Próximos pagos */}
            <div className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Próximos pagos</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const upcoming: any[] = [];
                    contratosWithRestante.forEach((c: any) => {
                      if (c.proximo_pago) {
                        const d = new Date(c.proximo_pago);
                        if (
                          d >= new Date(new Date().setHours(0, 0, 0, 0)) &&
                          c.estado === "activo"
                        ) {
                          const cuota =
                            Number(c.cantidad_de_pagos ?? 1) > 0
                              ? (Number(c.monto_total ?? 0) -
                                  Number(c.pago_inicial ?? 0)) /
                                Number(c.cantidad_de_pagos ?? 1)
                              : 0;
                          upcoming.push({
                            tipo: "contrato",
                            proyecto: c.proyecto,
                            fecha: c.proximo_pago,
                            monto: cuota,
                            contratoId: c.id,
                          });
                        }
                      }
                    });
                    (suscripciones || []).forEach((s: any) => {
                      if (s.proxima_fecha_de_pago) {
                        const d = new Date(s.proxima_fecha_de_pago);
                        if (
                          d >= new Date(new Date().setHours(0, 0, 0, 0)) &&
                          s.is_active
                        ) {
                          upcoming.push({
                            tipo: "suscripcion",
                            proyecto: s.proyecto,
                            fecha: s.proxima_fecha_de_pago,
                            monto: Number(s.mensualidad ?? 0),
                            suscripcionId: s.id,
                          });
                        }
                      }
                    });
                    upcoming.sort(
                      (a, b) =>
                        new Date(a.fecha).getTime() -
                        new Date(b.fecha).getTime()
                    );
                    const next = upcoming.slice(0, 5);
                    if (next.length === 0)
                      return (
                        <div className="text-sm text-muted-foreground">
                          No hay próximos pagos
                        </div>
                      );
                    return (
                      <div className="space-y-2">
                        {next.map((n, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="text-sm">
                              <div className="font-medium">
                                {n.tipo === "contrato"
                                  ? "Contrato"
                                  : "Suscripción"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {n.proyecto ?? "-"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatCurrency(Number(n.monto ?? 0))}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(n.fecha)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Nuevas tablas: Contratos activos y Suscripciones activas */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tabla de Contratos Activos */}
              <Card>
                <CardHeader>
                  <CardTitle>Contratos activos</CardTitle>
                </CardHeader>
                <CardContent>
                  {contratosWithRestante.filter((c: any) => c.estado === "activo").length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No hay contratos activos
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Monto total</TableHead>
                            <TableHead>Saldo</TableHead>
                            <TableHead>Próximo pago</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contratosWithRestante
                            .filter((c: any) => c.estado === "activo")
                            .map((c) => (
                              <TableRow
                                key={c.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => openContractModal(c)}
                              >
                                <TableCell className="font-medium">
                                  {c.proyecto ?? "-"}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(Number(c.monto_total ?? 0))}
                                </TableCell>
                                <TableCell className="text-primary font-medium">
                                  {formatCurrency(Number(c.restante ?? 0))}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {c.proximo_pago ? formatDate(c.proximo_pago) : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabla de Suscripciones Activas */}
              <Card>
                <CardHeader>
                  <CardTitle>Suscripciones activas</CardTitle>
                </CardHeader>
                <CardContent>
                  {suscripciones.filter((s: any) => s.is_active).length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No hay suscripciones activas
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Mensualidad</TableHead>
                            <TableHead>Próximo pago</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suscripciones
                            .filter((s: any) => s.is_active)
                            .map((s) => (
                              <TableRow
                                key={s.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => openSuscripcionModal(s)}
                              >
                                <TableCell className="font-medium">
                                  {s.proyecto ?? "-"}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(Number(s.mensualidad ?? 0))}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {s.proxima_fecha_de_pago
                                    ? formatDate(s.proxima_fecha_de_pago)
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const today = new Date();
                                    const nextDate = s.proxima_fecha_de_pago
                                      ? new Date(s.proxima_fecha_de_pago)
                                      : null;
                                    today.setHours(0, 0, 0, 0);
                                    if (nextDate) nextDate.setHours(0, 0, 0, 0);
                                    const isOverdue = nextDate && today > nextDate;
                                    return (
                                      <Badge
                                        variant={isOverdue ? "destructive" : "secondary"}
                                      >
                                        {isOverdue ? "Vencida" : "Al día"}
                                      </Badge>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pagos realizados</CardTitle>
                </CardHeader>
                <CardContent>
                  {pagosRealizados.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No hay pagos registrados
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Notas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagosRealizados.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>
                                {formatDate(
                                  p.fecha_de_creacion ?? p.created_at
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.tipo}
                              </TableCell>
                              <TableCell className="text-sm">
                                {p.proyecto ?? "-"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(p.monto ?? 0))}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.notas ?? "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pagos vencidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {vencimientos.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No hay vencimientos
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Proyecto</TableHead>
                            <TableHead>Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vencimientos.map((v, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{formatDate(v.fecha)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {v.tipo}
                              </TableCell>
                              <TableCell className="text-sm">
                                {v.proyecto ?? "-"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(Number(v.monto ?? 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalle del Contrato */}
      <Dialog
        open={contractModalOpen}
        onOpenChange={(v) => {
          if (!v) {
            setContractModalOpen(false);
            setSelectedContract(null);
            setIsEditingProximoPago(false);
          } else setContractModalOpen(true);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del contrato</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header info */}
            <div>
              <p className="text-sm text-muted-foreground">Proyecto</p>
              <p className="font-medium text-lg">
                {selectedContract?.proyecto ?? "-"}
              </p>
            </div>

            {/* Summary row: monto total / monto pagado / saldo actual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Monto total</p>
                <p className="font-semibold text-lg">
                  {formatCurrency(selectedContract?.monto_total ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto pagado</p>
                <p className="font-semibold text-lg text-green-600">
                  {formatCurrency(selectedContract?.pagos_registrados ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo actual</p>
                <p className="font-semibold text-lg text-primary">
                  {formatCurrency(selectedContract?.restante ?? 0)}
                </p>
              </div>
            </div>

            {/* Additional info row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Pago inicial</p>
                <p className="font-medium">
                  {formatCurrency(selectedContract?.pago_inicial ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cantidad de pagos</p>
                <p className="font-medium">
                  {selectedContract?.cantidad_de_pagos ?? "-"}
                </p>
              </div>
            </div>

            {/* Próximo pago */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Próximo pago
                </p>
                {!isEditingProximoPago && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProximoPago(true)}
                  >
                    Editar
                  </Button>
                )}
              </div>

              {isEditingProximoPago ? (
                <div className="space-y-2">
                  <input
                    type="datetime-local"
                    value={editingDateContract ?? ""}
                    onChange={(e) => setEditingDateContract(e.target.value || null)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const val = selectedContract?.proximo_pago
                          ? new Date(selectedContract.proximo_pago).toISOString().slice(0, 16)
                          : "";
                        setEditingDateContract(val || null);
                        setIsEditingProximoPago(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setConfirmUpdateOpen(true)}
                    >
                      Guardar cambios
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="font-medium text-lg">
                  {selectedContract?.proximo_pago
                    ? formatDate(selectedContract.proximo_pago)
                    : "No establecido"}
                </p>
              )}
            </div>

            {/* Pagos realizados */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Pagos realizados</p>
              <div className="max-h-48 overflow-auto border rounded-md">
                {contractPaymentsLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Cargando...</div>
                ) : contractPayments.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No hay pagos registrados
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="px-3 py-2 text-xs text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2 text-xs text-muted-foreground">Monto</th>
                        <th className="px-3 py-2 text-xs text-muted-foreground">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractPayments.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2 align-top">
                            {p.fecha_de_creacion
                              ? formatDate(p.fecha_de_creacion)
                              : formatDate(p.created_at)}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {formatCurrency(Number(p.monto ?? 0))}
                          </td>
                          <td className="px-3 py-2 align-top text-muted-foreground">
                            {p.notas ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setContractModalOpen(false);
                setSelectedContract(null);
                setIsEditingProximoPago(false);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para actualizar próximo pago */}
      <Dialog open={confirmUpdateOpen} onOpenChange={(v) => setConfirmUpdateOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar actualización</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas actualizar la fecha del próximo pago?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Fecha actual:</p>
              <p className="font-medium">
                {selectedContract?.proximo_pago
                  ? formatDate(selectedContract.proximo_pago)
                  : "No establecido"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nueva fecha:</p>
              <p className="font-medium">
                {editingDateContract
                  ? new Date(editingDateContract).toLocaleString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "No establecido"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUpdateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={async () => await updateProximoPago()}>
              Confirmar actualización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle de Suscripción */}
      <Dialog
        open={suscripcionModalOpen}
        onOpenChange={(v) => {
          if (!v) {
            setSuscripcionModalOpen(false);
            setSelectedSuscripcion(null);
            setIsEditingSuscripcion(false);
          } else setSuscripcionModalOpen(true);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Suscripción</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header info */}
            <div>
              <p className="text-sm text-muted-foreground">Proyecto</p>
              <p className="font-medium text-lg">
                {selectedSuscripcion?.proyecto ?? "-"}
              </p>
            </div>

            {/* Estado */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Estado</p>
              <Badge
                variant={selectedSuscripcion?.is_active ? "default" : "secondary"}
              >
                {selectedSuscripcion?.is_active ? "Activa" : "Pausada"}
              </Badge>
            </div>

            {/* Información editable */}
            {isEditingSuscripcion ? (
              <div className="space-y-4 border rounded-lg p-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Mensualidad
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingMensualidad}
                    onChange={(e) => setEditingMensualidad(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Próxima fecha de pago
                  </label>
                  <input
                    type="date"
                    value={editingProximaFecha}
                    onChange={(e) => setEditingProximaFecha(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMensualidad(String(selectedSuscripcion?.mensualidad ?? ""));
                      const fechaVal = selectedSuscripcion?.proxima_fecha_de_pago
                        ? new Date(selectedSuscripcion.proxima_fecha_de_pago)
                            .toISOString()
                            .slice(0, 10)
                        : "";
                      setEditingProximaFecha(fechaVal);
                      setIsEditingSuscripcion(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => setConfirmUpdateSuscripcionOpen(true)}>
                    Guardar cambios
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mensualidad</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(Number(selectedSuscripcion?.mensualidad ?? 0))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Próximo pago</p>
                  <p className="font-semibold text-lg">
                    {selectedSuscripcion?.proxima_fecha_de_pago
                      ? formatDate(selectedSuscripcion.proxima_fecha_de_pago)
                      : "No establecido"}
                  </p>
                </div>
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingSuscripcion(true)}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            )}

            {/* Pagos realizados */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Pagos realizados</p>
              <div className="max-h-48 overflow-auto border rounded-md">
                {suscripcionPaymentsLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Cargando...</div>
                ) : suscripcionPayments.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No hay pagos registrados
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="px-3 py-2 text-xs text-muted-foreground">Fecha</th>
                        <th className="px-3 py-2 text-xs text-muted-foreground">Monto</th>
                        <th className="px-3 py-2 text-xs text-muted-foreground">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suscripcionPayments.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-3 py-2 align-top">
                            {p.fecha_de_creacion
                              ? formatDate(p.fecha_de_creacion)
                              : formatDate(p.created_at)}
                          </td>
                          <td className="px-3 py-2 align-top">
                            {formatCurrency(Number(p.monto ?? 0))}
                          </td>
                          <td className="px-3 py-2 align-top text-muted-foreground">
                            {p.notas ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-2 justify-between w-full">
              <Button
                variant={selectedSuscripcion?.is_active ? "destructive" : "default"}
                onClick={toggleSuscripcionStatus}
              >
                {selectedSuscripcion?.is_active
                  ? "Pausar suscripción"
                  : "Reactivar suscripción"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuscripcionModalOpen(false);
                  setSelectedSuscripcion(null);
                  setIsEditingSuscripcion(false);
                }}
              >
                Cerrar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para actualizar suscripción */}
      <Dialog
        open={confirmUpdateSuscripcionOpen}
        onOpenChange={(v) => setConfirmUpdateSuscripcionOpen(v)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar actualización</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas actualizar esta suscripción?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div>
              <p className="text-sm text-muted-foreground">Mensualidad actual:</p>
              <p className="font-medium">
                {formatCurrency(Number(selectedSuscripcion?.mensualidad ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nueva mensualidad:</p>
              <p className="font-medium">
                {formatCurrency(Number(editingMensualidad ?? 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nueva fecha de pago:</p>
              <p className="font-medium">
                {editingProximaFecha
                  ? new Date(editingProximaFecha).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "No establecido"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmUpdateSuscripcionOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={async () => await updateSuscripcion()}>
              Confirmar actualización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
