import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type VentaRow = {
  id?: string;
  fecha?: string | null;
  cliente?: string | null;
  proyecto?: string | null;
  tipo_de_venta?: string | null; // suscripcion | venta_total
  pago_inicial?: number | null;
  cantidad_de_pagos?: number | null;
  total_a_pagar?: number | null;
  mensualidad?: number | null;
  dia_de_pago_mensual?: number | null;
};

export type VentaFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  initialData?: Partial<VentaRow> | null;
};

export default function VentaForm({
  open,
  onOpenChange,
  onCreated,
  initialData = null,
}: VentaFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [projectsList, setProjectsList] = useState<
    Array<{ id: string; nombre?: string | null }>
  >([]);
  const [clientsList, setClientsList] = useState<
    Array<{ id: string; nombre?: string | null }>
  >([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const form = useForm<Partial<VentaRow>>({
    defaultValues: {
      tipo_de_venta: "suscripcion",
      cantidad_de_pagos: 1,
    },
  });

  useEffect(() => {
    if (open) {
      loadProjectsAndClients();
      form.reset(initialData ?? {});
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadProjectsAndClients() {
    try {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase
          .from("proyectos")
          .select("id,nombre")
          .order("creacion", { ascending: false }),
        // Algunos esquemas no tienen `created_at` en clientes; ordenar por nombre es más seguro
        supabase
          .from("clientes")
          .select("id,nombre")
          .order("nombre", { ascending: true }),
      ]);
      setProjectsList(Array.isArray(p) ? p : []);
      setClientsList(Array.isArray(c) ? c : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando proyectos/clientes:", err);
    }
  }

  const onSubmit = async (values: Partial<VentaRow>) => {
    try {
      // Validaciones básicas
      if (!values.proyecto) {
        toast({ title: "Selecciona un proyecto" });
        return;
      }
      if (!values.cliente) {
        toast({ title: "Selecciona un cliente" });
        return;
      }

      const pago_inicial = values.pago_inicial
        ? Number(values.pago_inicial)
        : 0;
      const cantidad_de_pagos = values.cantidad_de_pagos
        ? Number(values.cantidad_de_pagos)
        : 1;
      const total_a_pagar = values.total_a_pagar
        ? Number(values.total_a_pagar)
        : 0;
      const mensualidad = values.mensualidad
        ? Number(values.mensualidad)
        : cantidad_de_pagos > 0
        ? Number((total_a_pagar / cantidad_de_pagos).toFixed(2))
        : 0;

      // Validaciones por tipo
      const tipo = values.tipo_de_venta ?? "suscripcion";
      if (tipo === "venta_total") {
        if (!total_a_pagar || total_a_pagar <= 0) {
          toast({ title: "Total a pagar debe ser mayor que 0" });
          return;
        }
      }
      if (tipo === "suscripcion") {
        if (!mensualidad || mensualidad <= 0) {
          toast({ title: "Mensualidad debe ser mayor que 0" });
          return;
        }
      }

      const payload: any = {
        fecha: new Date().toISOString(),
        cliente: String(values.cliente), // guardar id del cliente
        proyecto: String(values.proyecto), // guardar id del proyecto
        tipo_de_venta: tipo,
        pago_inicial,
        cantidad_de_pagos,
        total_a_pagar,
        mensualidad,
        dia_de_pago_mensual: values.dia_de_pago_mensual
          ? Number(values.dia_de_pago_mensual)
          : null,
      };

      const { error: e } = await supabase.from("venta").insert([payload]);
      if (e) throw e;
      toast({ title: "Venta registrada" });

      // Registrar en estado_cuenta según el tipo
      try {
        if (tipo === "venta_total") {
          // CONTRATO: Registrar dos movimientos
          // 1. Registro del contrato adquirido (monto total)
          await supabase.from("estado_cuenta").insert([{
            cliente_id: payload.cliente,
            proyecto_id: payload.proyecto,
            tipo: "contrato",
            monto: total_a_pagar,
            saldo_actual: total_a_pagar,
            nota: "CONTRATO ADQUIRIDO",
            fecha: payload.fecha,
          }]);

          // 2. Registro del pago inicial
          if (pago_inicial > 0) {
            await supabase.from("estado_cuenta").insert([{
              cliente_id: payload.cliente,
              proyecto_id: payload.proyecto,
              tipo: "contrato",
              monto: pago_inicial,
              saldo_actual: total_a_pagar - pago_inicial,
              nota: "PAGO INICIAL",
              fecha: payload.fecha,
            }]);
          }
        } else if (tipo === "suscripcion") {
          // SUSCRIPCIÓN: Registrar pago inicial
          if (pago_inicial > 0) {
            await supabase.from("estado_cuenta").insert([{
              cliente_id: payload.cliente,
              proyecto_id: payload.proyecto,
              tipo: "suscripcion",
              monto: pago_inicial,
              saldo_actual: pago_inicial,
              nota: "PAGO INICIAL",
              fecha: payload.fecha,
            }]);
          }
        }
      } catch (estErr) {
        console.error("Error registrando en estado_cuenta:", estErr);
        // No bloquear la venta por esto
      }

      // Si es suscripción, crear registro en la tabla `suscripciones`
      if (tipo === "suscripcion") {
        try {
          const dia = payload.dia_de_pago_mensual ?? null;
          const prox = computeNextPaymentDate(dia);
          const subPayload: any = {
            fecha_de_creacion: payload.fecha,
            proyecto: payload.proyecto,
            cliente: payload.cliente,
            mensualidad: payload.mensualidad,
            dia_de_pago_mensual: payload.dia_de_pago_mensual,
            proxima_fecha_de_pago: prox,
          };
          const { error: subErr } = await supabase
            .from("suscripciones")
            .insert([subPayload]);
          if (subErr) {
            // no bloqueamos la creación de la venta si falla esto
            // eslint-disable-next-line no-console
            console.error("Error creando suscripción:", subErr);
            toast({
              title: "Venta registrada",
              description: "Pero no se pudo crear la suscripción",
            });
          } else {
            toast({ title: "Suscripción creada" });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error al insertar suscripción:", err);
        }
      }
      // Si es venta total, registrar en tabla `contratos`
      if (tipo === "venta_total") {
        try {
          const contratoPayload: any = {
            fecha_de_creacion: payload.fecha,
            cliente: payload.cliente,
            proyecto: payload.proyecto,
            monto_total: payload.total_a_pagar ?? 0,
            cantidad_de_pagos: payload.cantidad_de_pagos ?? 1,
            pago_inicial: payload.pago_inicial ?? 0,
            estado: "activo",
          };
          const { error: cErr } = await supabase
            .from("contratos")
            .insert([contratoPayload]);
          if (cErr) {
            // no bloqueamos la creación de la venta si falla esto
            // eslint-disable-next-line no-console
            console.error("Error creando contrato:", cErr);
            toast({
              title: "Venta registrada",
              description: "Pero no se pudo crear el contrato",
            });
          } else {
            toast({ title: "Contrato creado" });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error al insertar contrato:", err);
        }
      }
      onOpenChange(false);
      form.reset();
      onCreated?.();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error creando venta:", err);
      toast({
        title: "Error al crear venta",
        description: err?.message ?? String(err),
      });
    }
  };

  function computeNextPaymentDate(dia: number | null | undefined) {
    if (!dia || dia < 1 || dia > 31) return null;
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth(); // 0-based

    // Si el día del mes aún no ha pasado, usar este mes, sino el siguiente
    if (today.getDate() > dia) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    // Determinar último día del mes objetivo
    const lastDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(dia, lastDay);
    const result = new Date(year, month, day);
    return result.toISOString();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Venta" : "Crear Venta"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="text-sm font-medium">Paso {step} de 4</div>

            {step === 1 && (
              <div className="space-y-3">
                <FormItem>
                  <FormLabel>Tipo de venta</FormLabel>
                  <FormControl>
                    <Select
                      value={String(form.watch("tipo_de_venta") ?? "")}
                      onValueChange={(v) => form.setValue("tipo_de_venta", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suscripcion">Suscripción</SelectItem>
                        <SelectItem value="venta_total">Venta total</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setStep(2)}>Siguiente</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <FormItem>
                  <FormLabel>Buscar Proyecto</FormLabel>
                  <FormControl>
                    <Input
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      placeholder="Filtrar proyectos..."
                    />
                  </FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel>Proyecto</FormLabel>
                  <FormControl>
                    <Select
                      value={String(form.watch("proyecto") ?? "")}
                      onValueChange={(v) => form.setValue("proyecto", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="— Selecciona —" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectsList
                          .filter((pr) =>
                            (pr.nombre ?? "")
                              .toLowerCase()
                              .includes(projectFilter.toLowerCase())
                          )
                          .map((pr) => (
                            <SelectItem key={pr.id} value={pr.id}>
                              {pr.nombre ?? pr.id}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Atrás
                  </Button>
                  <Button onClick={() => setStep(3)}>Siguiente</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <FormItem>
                  <FormLabel>Buscar Cliente</FormLabel>
                  <FormControl>
                    <Input
                      value={clientFilter}
                      onChange={(e) => setClientFilter(e.target.value)}
                      placeholder="Filtrar clientes..."
                    />
                  </FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Select
                      value={String(form.watch("cliente") ?? "")}
                      onValueChange={(v) => form.setValue("cliente", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="— Selecciona —" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientsList
                          .filter((cl) =>
                            (cl.nombre ?? "")
                              .toLowerCase()
                              .includes(clientFilter.toLowerCase())
                          )
                          .map((cl) => (
                            <SelectItem key={cl.id} value={cl.id}>
                              {cl.nombre ?? cl.id}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Atrás
                  </Button>
                  <Button onClick={() => setStep(4)}>Siguiente</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                {form.watch("tipo_de_venta") === "suscripcion" ? (
                  <>
                    <FormItem>
                      <FormLabel>Pago inicial</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("pago_inicial" as const)}
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Mensualidad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("mensualidad" as const)}
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Día de pago mensual (1-31)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          {...form.register("dia_de_pago_mensual" as const)}
                          placeholder="Día del mes"
                        />
                      </FormControl>
                    </FormItem>
                  </>
                ) : (
                  <>
                    <FormItem>
                      <FormLabel>Pago total</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("total_a_pagar" as const)}
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Cantidad de pagos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...form.register("cantidad_de_pagos" as const)}
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Pago inicial</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register("pago_inicial" as const)}
                        />
                      </FormControl>
                    </FormItem>
                  </>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Atrás
                  </Button>
                  <Button type="submit">Crear venta</Button>
                </div>
              </div>
            )}
          </form>
        </Form>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
