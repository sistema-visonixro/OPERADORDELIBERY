import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ContratosActivos() {
  function ContractCard({
    contract,
    onClick,
  }: {
    contract: any;
    onClick?: () => void;
  }) {
    const daysAgo = contract.fecha_de_creacion
      ? Math.floor(
          (Date.now() - new Date(contract.fecha_de_creacion).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;
    return (
      <Card
        onClick={onClick}
        className={`hover-elevate cursor-pointer ${
          !contract.estado || contract.estado !== "activo" ? "opacity-70" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(
                    String(contract.clienteName ?? contract.cliente)
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{contract.clienteName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {contract.projectName}
                </p>
              </div>
            </div>
            <Badge
              className={
                contract.estado === "activo"
                  ? "bg-green-500/10 text-green-600"
                  : "bg-muted text-muted-foreground"
              }
            >
              {contract.estado}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monto total</span>
              <span className="font-semibold">
                {formatCurrency(contract.monto_total)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pagos registrados</span>
              <span>{formatCurrency(contract.pagos_registrados)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor restante</span>
              <span className="font-semibold text-primary">
                {formatCurrency(contract.valor_restante)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span className="text-sm">
                {contract.fecha_de_creacion
                  ? formatDate(contract.fecha_de_creacion)
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Próximo pago</span>
              <span className="text-sm">
                {contract.proximo_pago
                  ? formatDate(contract.proximo_pago)
                  : "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modal state for selected contract
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [isEditingProximoPago, setIsEditingProximoPago] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
  const { toast } = useToast();
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [anularOpen, setAnularOpen] = useState(false);
  const [anularClave, setAnularClave] = useState("");
  const [anularLoading, setAnularLoading] = useState(false);

  function openContractModal(contract: any) {
    setSelectedContract(contract);
    // initialize editingDate as local datetime-local string
    const val = contract?.proximo_pago
      ? new Date(contract.proximo_pago).toISOString().slice(0, 16)
      : "";
    setEditingDate(val || null);
    setIsEditingProximoPago(false);
    setModalOpen(true);
    loadContractPayments(contract?.id);
  }

  async function loadContractPayments(contractId: string) {
    if (!contractId) return;
    try {
      setPaymentsLoading(true);
      const { data, error } = await supabase
        .from("pagos")
        .select("id,fecha_de_creacion,monto,notas,created_at")
        .eq("referencia_id", contractId)
        .eq("tipo", "contrato")
        .order("fecha_de_creacion", { ascending: false });
      if (error) throw error;
      setPaymentsList(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando pagos del contrato:", err);
      toast({ title: "Error cargando pagos", description: String(err) });
      setPaymentsList([]);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function updateProximoPago() {
    if (!selectedContract) return;
    try {
      const iso = editingDate ? new Date(editingDate).toISOString() : null;
      const { error } = await supabase
        .from("contratos")
        .update({ proximo_pago: iso })
        .eq("id", selectedContract.id);
      if (error) throw error;
      toast({ title: "Próximo pago actualizado" });
      queryClient.invalidateQueries({ queryKey: ["contratos-activos"] });
      setConfirmUpdateOpen(false);
      setIsEditingProximoPago(false);
      // Actualizar el contrato seleccionado con la nueva fecha
      setSelectedContract({ ...selectedContract, proximo_pago: iso });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error actualizando próximo pago:", err);
      toast({
        title: "Error actualizando próximo pago",
        description: err?.message ?? String(err),
      });
    }
  }

  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<
    "all" | "activo" | "cancelado"
  >("all");

  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          supabase.from("proyectos").select("id,nombre"),
          supabase.from("clientes").select("id,nombre"),
        ]);
        const pData = Array.isArray(pRes.data) ? pRes.data : [];
        const cData = Array.isArray(cRes.data) ? cRes.data : [];
        const pMap: Record<string, string> = {};
        const cMap: Record<string, string> = {};
        pData.forEach((p: any) => {
          if (p?.id) pMap[p.id] = p.nombre ?? p.id;
        });
        cData.forEach((c: any) => {
          if (c?.id) cMap[c.id] = c.nombre ?? c.id;
        });
        setProjectsMap(pMap);
        setClientsMap(cMap);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error cargando meta:", err);
      }
    })();
  }, []);

  const { data: subs, isLoading } = useQuery({
    queryKey: ["contratos-activos"],
    queryFn: async () => {
      const { data: contratosData, error: cErr } = await supabase
        .from("contratos")
        .select("*")
        .order("fecha_de_creacion", { ascending: false });
      if (cErr) throw cErr;
      const contratos = Array.isArray(contratosData) ? contratosData : [];

      // Si no hay contratos, devolver vacío
      if (contratos.length === 0) return [];

      // Obtener todos los pagos de tipo 'contrato' que referencien a estos contratos
      const ids = contratos.map((r: any) => r.id).filter(Boolean);
      const { data: pagosData, error: pErr } = await supabase
        .from("pagos")
        .select("referencia_id,monto,cliente,proyecto")
        .in("referencia_id", ids)
        .eq("tipo", "contrato");
      if (pErr) {
        // si falla la carga de pagos, no rompemos la vista; devolvemos contratos sin totales
        // eslint-disable-next-line no-console
        console.error("Error cargando pagos para contratos:", pErr);
        return contratos;
      }

      const pagos = Array.isArray(pagosData) ? pagosData : [];

      // Construir un mapa de sumas por referencia_id, filtrando por cliente+proyecto para precisión
      const pagosMap: Record<string, number> = {};
      pagos.forEach((p: any) => {
        if (!p || !p.referencia_id) return;
        const key = String(p.referencia_id);
        pagosMap[key] = (pagosMap[key] ?? 0) + Number(p.monto ?? 0);
      });

      // Adjuntar suma de pagos y restante a cada contrato
      const enriched = contratos.map((r: any) => {
        const paid = pagosMap[String(r.id)] ?? 0;
        const restante =
          Number(r.monto_total ?? 0) - Number(r.pago_inicial ?? 0) - paid;
        return { ...r, pagos_registrados: paid, valor_restante: restante };
      });

      return enriched;
    },
  });

  const list = (Array.isArray(subs) ? subs : []).map((r: any) => ({
    id: r.id,
    cliente: r.cliente,
    proyecto: r.proyecto,
    monto_total: Number(r.monto_total ?? 0),
    cantidad_de_pagos: Number(r.cantidad_de_pagos ?? 1),
    pago_inicial: Number(r.pago_inicial ?? 0),
    estado: r.estado ?? "activo",
    fecha_de_creacion: r.fecha_de_creacion ?? r.created_at ?? null,
    pagos_registrados: Number(r.pagos_registrados ?? 0),
    valor_restante: Number(
      r.valor_restante ??
        Number(r.monto_total ?? 0) - Number(r.pago_inicial ?? 0)
    ),
    proximo_pago: r.proximo_pago ?? null,
    clienteName: clientsMap[r.cliente] ?? r.cliente,
    projectName: projectsMap[r.proyecto] ?? r.proyecto,
  }));

  const filtered = list.filter((c) => {
    const matchesSearch = (
      String(c.clienteName ?? "") +
      " " +
      String(c.projectName ?? "")
    )
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    let matchesEstado = true;
    if (filterEstado === "activo") matchesEstado = c.estado === "activo";
    if (filterEstado === "cancelado") matchesEstado = c.estado === "cancelado";
    return matchesSearch && matchesEstado;
  });

  const stats = {
    total: list.length,
    activos: list.filter((l) => l.estado === "activo").length,
    cancelados: list.filter((l) => l.estado === "cancelado").length,
    total_restante: list.reduce((s, r) => s + Number(r.valor_restante ?? 0), 0),
  };

  return (
    <div className="p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Contratos Activos</h1>
        <p className="text-muted-foreground mt-1">
          Listado de suscripciones activas (contratos)
        </p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Card>
            <CardContent> Cargando... </CardContent>
          </Card>
        ) : list.length === 0 ? (
          <Card>
            <CardContent>No hay contratos activos</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold">{stats.activos}</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Cancelados</p>
                  <p className="text-2xl font-bold">{stats.cancelados}</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Total restante
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.total_restante)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o proyecto..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterEstado === "all" ? "secondary" : "ghost"}
                  onClick={() => setFilterEstado("all")}
                >
                  Todas
                </Button>
                <Button
                  variant={filterEstado === "activo" ? "secondary" : "ghost"}
                  onClick={() => setFilterEstado("activo")}
                >
                  Activas
                </Button>
                <Button
                  variant={filterEstado === "cancelado" ? "secondary" : "ghost"}
                  onClick={() => setFilterEstado("cancelado")}
                >
                  Canceladas
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c) => (
                <ContractCard
                  key={c.id}
                  contract={c}
                  onClick={() => openContractModal(c)}
                />
              ))}
            </div>

            {/* Detalle modal al tocar la card */}
            <Dialog
              open={modalOpen}
              onOpenChange={(v) => {
                if (!v) {
                  setModalOpen(false);
                  setSelectedContract(null);
                } else setModalOpen(true);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Detalle del contrato</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Header info */}
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">
                      {selectedContract?.clienteName ?? "-"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Proyecto
                    </p>
                    <p className="font-medium">
                      {selectedContract?.projectName ?? "-"}
                    </p>
                  </div>

                  {/* Summary row: monto total / monto pagado / saldo actual */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monto total
                      </p>
                      <p className="font-semibold text-lg">
                        {formatCurrency(selectedContract?.monto_total ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monto pagado
                      </p>
                      <p className="font-semibold text-lg text-green-600">
                        {formatCurrency(selectedContract?.pagos_registrados ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Saldo actual
                      </p>
                      <p className="font-semibold text-lg text-primary">
                        {formatCurrency(selectedContract?.valor_restante ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Additional info row: pago inicial / cantidad de pagos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Pago inicial
                      </p>
                      <p className="font-medium">
                        {formatCurrency(selectedContract?.pago_inicial ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Cantidad de pagos
                      </p>
                      <p className="font-medium">
                        {selectedContract?.cantidad_de_pagos ?? "-"}
                      </p>
                    </div>
                  </div>

                  {/* Próximo pago - solo editable con botón */}
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
                          value={editingDate ?? ""}
                          onChange={(e) => setEditingDate(e.target.value || null)}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Resetear a la fecha original
                              const val = selectedContract?.proximo_pago
                                ? new Date(selectedContract.proximo_pago).toISOString().slice(0, 16)
                                : "";
                              setEditingDate(val || null);
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

                  {/* Pagos realizados table */}
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Pagos realizados
                    </p>
                    <div className="mt-2 max-h-48 overflow-auto border rounded-md">
                      {paymentsLoading ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Cargando...
                        </div>
                      ) : paymentsList.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          No hay pagos registrados
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="px-3 py-2 text-xs text-muted-foreground">
                                Fecha
                              </th>
                              <th className="px-3 py-2 text-xs text-muted-foreground">
                                Monto
                              </th>
                              <th className="px-3 py-2 text-xs text-muted-foreground">
                                Notas
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {paymentsList.map((p) => (
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
                      variant="destructive"
                      onClick={() => setAnularOpen(true)}
                    >
                      Anular contrato
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalOpen(false);
                        setSelectedContract(null);
                        setIsEditingProximoPago(false);
                      }}
                    >
                      Cerrar
                    </Button>
                  </div>
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
                      {editingDate
                        ? new Date(editingDate).toLocaleString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : "No establecido"}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmUpdateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      await updateProximoPago();
                    }}
                  >
                    Confirmar actualización
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal para confirmar anulación */}
            <Dialog open={anularOpen} onOpenChange={(v) => setAnularOpen(v)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar anulación</DialogTitle>
                  <DialogDescription>
                    Para anular este contrato ingresa la clave de acceso.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <label className="block text-sm font-medium">Clave</label>
                  <input
                    type="password"
                    value={anularClave}
                    onChange={(e) => setAnularClave(e.target.value)}
                    className="block w-full rounded-md border p-2"
                  />
                </div>
                <DialogFooter>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnularOpen(false);
                        setAnularClave("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!selectedContract) return;
                        try {
                          setAnularLoading(true);
                          const { data, error } = await supabase
                            .from("configuracion")
                            .select("clave")
                            .limit(1)
                            .single();
                          if (error) throw error;
                          const stored = data?.clave ?? null;
                          if (!stored) {
                            toast({ title: "No hay clave configurada" });
                            return;
                          }
                          if (anularClave !== stored) {
                            toast({ title: "Clave incorrecta" });
                            return;
                          }

                          const { error: upErr } = await supabase
                            .from("contratos")
                            .update({ estado: "anulado" })
                            .eq("id", selectedContract.id);
                          if (upErr) throw upErr;
                          toast({ title: "Contrato anulado" });
                          setAnularOpen(false);
                          setModalOpen(false);
                          setSelectedContract(null);
                          setAnularClave("");
                          queryClient.invalidateQueries({
                            queryKey: ["contratos-activos"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["contratos"],
                          });
                        } catch (err: any) {
                          // eslint-disable-next-line no-console
                          console.error("Error anulando contrato:", err);
                          toast({
                            title: "Error anulando contrato",
                            description: err?.message ?? String(err),
                          });
                        } finally {
                          setAnularLoading(false);
                        }
                      }}
                    >
                      Confirmar
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
