import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import Factura from "@/components/factura";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
};

export default function CobroForm({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [tipo, setTipo] = useState<"suscripcion" | "contrato" | "">("");

  // suscripciones
  const [subsList, setSubsList] = useState<any[]>([]);
  const [subsFilter, setSubsFilter] = useState("");
  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  // contratos
  const [contratosList, setContratosList] = useState<any[]>([]);
  const [contratosFilter, setContratosFilter] = useState("");
  const [selectedContrato, setSelectedContrato] = useState<any | null>(null);
  const [contratoRestante, setContratoRestante] = useState<number | null>(null);

  // meta maps for display names
  const [projectsMap, setProjectsMap] = useState<Record<string, string>>({});
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({});

  const [amount, setAmount] = useState<string>("");
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceAutoPrint, setInvoiceAutoPrint] = useState(false);
  const invoiceFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState<string | null>(null);

  // Fallback: when invoice modal opens and autoPrint is requested,
  // trigger print after a short delay to ensure iframe content rendered.
  useEffect(() => {
    if (!invoiceOpen || !invoiceAutoPrint || !invoiceHtml) return;
    const t = setTimeout(() => {
      try {
        const iframe = document.querySelector(
          'iframe[title="Factura"]'
        ) as HTMLIFrameElement | null;
        const w = iframe?.contentWindow;
        if (w) {
          w.focus();
          w.print();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error auto-imprimiendo factura (fallback):", err);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [invoiceOpen, invoiceAutoPrint, invoiceHtml]);

  useEffect(() => {
    if (open) reset();
  }, [open]);

  function reset() {
    setStep(1);
    setTipo("");
    setSubsList([]);
    setContratosList([]);
    setSelectedSub(null);
    setSelectedContrato(null);
    setAmount("");
    setSubsFilter("");
    setContratosFilter("");
    setNextPaymentDate(null);
  }

  async function loadSubs() {
    try {
      const { data, error } = await supabase
        .from("suscripciones")
        .select(
          "id,cliente,proyecto,mensualidad,proxima_fecha_de_pago,dia_de_pago_mensual"
        )
        .order("fecha_de_creacion", { ascending: false });
      if (error) throw error;
      setSubsList(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando suscripciones:", err);
    }
  }

  async function loadContratos() {
    try {
      const { data, error } = await supabase
        .from("contratos")
        .select("id,cliente,proyecto,monto_total,pago_inicial")
        .order("fecha_de_creacion", { ascending: false });
      if (error) throw error;
      setContratosList(Array.isArray(data) ? data : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando contratos:", err);
    }
  }

  async function loadMeta() {
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
      console.error("Error cargando meta en CobroForm:", err);
    }
  }

  async function onNextFromTipo() {
    if (!tipo) {
      toast({ title: "Selecciona el tipo de pago" });
      return;
    }
    // load meta (clients/projects) first so we can show names in the lists
    await loadMeta();
    if (tipo === "suscripcion") {
      await loadSubs();
    } else {
      await loadContratos();
    }
    setStep(2);
  }

  function calcularValorLabelSus(sub: any) {
    if (!sub) return 0;
    const mensual = Number(sub.mensualidad ?? 0);
    // si no hay fecha próxima, cobrar al menos 1 mensualidad
    if (!sub.proxima_fecha_de_pago) return mensual;

    // Si la próxima fecha de pago está en el futuro, no corresponde cobrar ahora
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const prox = new Date(sub.proxima_fecha_de_pago);
      prox.setHours(0, 0, 0, 0);
      if (prox > today) return 0;
    } catch (err) {
      // si hay error al parsear, seguimos con la lógica por defecto
    }

    const months = computeMonthsDueCount(
      sub.proxima_fecha_de_pago,
      sub.dia_de_pago_mensual
    );
    return mensual * Math.max(1, months);
  }

  function addMonthsKeepDay(dateLike: string | Date, months: number) {
    const d =
      typeof dateLike === "string" ? new Date(dateLike) : new Date(dateLike);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    const targetMonth = month + months;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const targetDay = Math.min(day, lastDay);
    const result = new Date(targetYear, normalizedMonth, targetDay);
    return result.toISOString();
  }

  function computeMonthsDueCount(
    proximaIso: string,
    dia_de_pago_mensual?: number | null
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let cursor = new Date(proximaIso);
      cursor.setHours(0, 0, 0, 0);
      let count = 0;
      // advance month by month until cursor > today
      while (cursor <= today) {
        count += 1;
        const nextIso = addMonthsKeepDay(cursor, 1);
        cursor = new Date(nextIso);
      }
      return count;
    } catch (err) {
      return 1;
    }
  }

  async function calcularRestanteContrato(contr: any) {
    if (!contr) return 0;
    try {
      const { data, error } = await supabase
        .from("pagos")
        .select("monto")
        .eq("tipo", "contrato")
        .eq("referencia_id", contr.id);
      if (error) throw error;
      const totalPagos = Array.isArray(data)
        ? data.reduce((s: number, r: any) => s + Number(r.monto ?? 0), 0)
        : 0;
      const restante =
        Number(contr.monto_total ?? 0) -
        Number(contr.pago_inicial ?? 0) -
        totalPagos;
      return restante;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error calculando restante:", err);
      return Number(contr.monto_total ?? 0) - Number(contr.pago_inicial ?? 0);
    }
  }

  async function fetchConfigRow() {
    try {
      const { data } = await supabase
        .from("configuracion")
        .select("*")
        .limit(1);
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error cargando configuración para factura:", err);
      return null;
    }
  }

  function renderInvoiceHtml(config: any, pago: any, extra: any = {}) {
    const negocio = {
      nombre: config?.proyecto ?? config?.nombre ?? "",
      propietario: config?.propietario ?? config?.nombre ?? "",
      direccion: config?.direccion ?? "",
      telefono: config?.telefono ?? "",
      rtn: config?.rtn ?? "",
    };

    const clientName = clientsMap[pago.cliente] ?? pago.cliente ?? "Cliente";
    const projectName =
      projectsMap[pago.proyecto] ?? pago.proyecto ?? "Proyecto";
    const fecha = pago.fecha_de_creacion
      ? new Date(pago.fecha_de_creacion).toLocaleString()
      : new Date().toLocaleString();
    const monto = Number(pago.monto ?? 0);
    const invoiceNumber =
      pago.id ?? pago.referencia_id ?? Math.floor(Math.random() * 1000000);

    // attempt to pull subscription data if provided
    const proximaFecha =
      extra?.proxima_fecha_de_pago ?? extra?.proximaFecha ?? "-";

    const cliente = {
      identidad: extra?.clientRtn ?? pago.cliente ?? "",
      nombre: extra?.clientNombre ?? clientName,
      producto: projectName,
      // Valor a Pagar debe ser el "mínimo" cuando se provea (ej. suscripción)
      valorPagar: formatCurrency(Number(extra?.minimo ?? monto)),
      // Valor pagado sigue siendo el monto efectivamente pagado
      valorPagado: formatCurrency(monto),
      proximaFecha: proximaFecha ? formatDate(proximaFecha) : "-",
      // contrato-specific
      prevRestante:
        typeof extra?.prevRestante === "number" ? extra.prevRestante : null,
      saldoActual:
        typeof extra?.saldoActual === "number" ? extra.saldoActual : null,
    };

    const receiptTitle =
      (extra?.tipo ?? pago.tipo) === "contrato"
        ? "Recibo de Pago de Contrato"
        : "Recibo de Pago de Suscripción";

    return `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Recibo - ${invoiceNumber}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 100%; height: 100vh; background-color: #f7f7f7; }
          .container { width: 90%; margin: 0 auto; padding: 40px; background-color: rgba(255,255,255,0.9); box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 9px; background-size: contain; background-repeat: no-repeat; background-position: center; }
          h1, h2 { text-align: center; color: #2196F3; font-weight: bold; }
          .header { text-align:center; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; position: relative; }
          .header img { height: 120px; display: block; position: absolute; top: 20px; right: 30px; }
          .business-info, .client-info { margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
          .business-info p, .client-info p { margin: 4px 0; color: #333; }
          .client-info h3 { text-align: left; color: #2196F3; font-weight: bold; }
          .footer { text-align: center; margin-top: 0; font-size: 12px; color: #555; }
          .value { font-weight: bold; color: black; }
          .separator { border-top: 2px dashed #2196F3; margin-top: 20px; margin-bottom: 20px; }
          .print-button { display: block; margin: 20px auto; padding: 10px 20px; font-size: 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; }
          @media print { .no-print { display: none; } body { background-color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .container { width: 100%; background-size: contain; box-shadow: none; border-radius: 0; padding: 10px; } }
        </style>
        <script>function imprimirRecibo(){window.print();}</script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${negocio.nombre}</h1>
            <img src="/vsr.png" alt="Logo" />
          </div>
          <h2>${receiptTitle}</h2>

          <div class="business-info">
            <p><strong>Propietario:</strong> ${negocio.propietario}</p>
            <p><strong>Dirección:</strong> ${negocio.direccion}</p>
            <p><strong>Teléfono:</strong> ${negocio.telefono}</p>
            <p><strong>RTN:</strong> ${negocio.rtn}</p>
          </div>

          <div class="separator"></div>

            <div class="client-info">
            <h3>Datos del Cliente</h3>
            <p><strong>Identidad:</strong> <span class="value"> ${
              cliente.identidad
            }</span></p>
            <p><strong>Nombre:</strong>  <span class="value">${
              cliente.nombre
            }</span></p>
            <p><strong>Producto:</strong>  <span class="value">${
              cliente.producto
            }</span></p>
            ${
              (extra?.tipo ?? pago.tipo) === "contrato"
                ? `
              <p><strong>Saldo:</strong> <span class="value"> ${formatCurrency(
                Number(cliente.prevRestante ?? 0)
              )}</span></p>
              <p><strong>Valor Pagado:</strong> <span class="value">${
                cliente.valorPagado
              }</span></p>
              <p><strong>Saldo actual:</strong> <span class="value">${formatCurrency(
                Number(cliente.saldoActual ?? 0)
              )}</span></p>
            `
                : `
              <p><strong>Valor a Pagar:</strong> <span class="value">${cliente.valorPagar}</span></p>
              <p><strong>Valor Pagado:</strong> <span class="value">${cliente.valorPagado}</span></p>
              <p><strong>Próxima Fecha de Pago:</strong> ${cliente.proximaFecha}</p>
            `
            }
          </div>

          <div class="separator"></div>

          <div class="footer">
            <p>¡Gracias por su preferencia!</p>
          </div>

          <button class="print-button no-print" onclick="imprimirRecibo()">Imprimir Recibo</button>
        </div>
      </body>
      </html>`;
  }

  async function generateAndOpenInvoice(pagoRecord: any, extraInput: any = {}) {
    try {
      const config = await fetchConfigRow();
      // allow caller to provide extra data (e.g. minimo) and augment with fetched values
      let extra: any = { ...(extraInput ?? {}) };
      // ensure tipo is present so the invoice title can reflect the payment type
      if (!extra.tipo && pagoRecord?.tipo) extra.tipo = pagoRecord.tipo;
      try {
        if (pagoRecord?.tipo === "suscripcion" && pagoRecord?.referencia_id) {
          const { data: sdata, error: serr } = await supabase
            .from("suscripciones")
            .select("proxima_fecha_de_pago")
            .eq("id", pagoRecord.referencia_id)
            .limit(1)
            .single();
          if (!serr && sdata)
            extra.proxima_fecha_de_pago = sdata.proxima_fecha_de_pago;
        }
        // fetch client RTN and name when possible
        if (pagoRecord?.cliente) {
          try {
            const { data: cdata, error: cerr } = await supabase
              .from("clientes")
              .select("id,nombre,rtn")
              .eq("id", pagoRecord.cliente)
              .limit(1)
              .single();
            if (!cerr && cdata) {
              extra.clientRtn = cdata.rtn ?? null;
              extra.clientNombre = cdata.nombre ?? null;
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore extra fetch errors
      }

      const html = renderInvoiceHtml(config, pagoRecord, extra);
      setInvoiceHtml(html);
      // close cobro dialog happens elsewhere; open invoice modal in-app
      setInvoiceOpen(true);
      setInvoiceAutoPrint(Boolean(extra.tipo === "contrato"));
      // iframe will render the HTML; printing will be triggered automatically for contratos
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error generando/iniciando factura:", err);
    }
  }

  async function onSave() {
    try {
      let pagoRecord: any = null;
      let extra: any = {};

      if (tipo === "suscripcion") {
        if (!selectedSub) {
          toast({ title: "Selecciona una suscripción" });
          return;
        }
        const labelVal = calcularValorLabelSus(selectedSub);
        const monto = Number(amount);
        if (isNaN(monto) || monto <= 0) {
          toast({ title: "Ingresa un monto válido" });
          return;
        }
        if (monto < labelVal) {
          toast({ title: `El monto debe ser >= ${formatCurrency(labelVal)}` });
          return;
        }

        const payload = {
          fecha_de_creacion: new Date().toISOString(),
          tipo: "suscripcion",
          referencia_id: selectedSub.id,
          cliente: selectedSub.cliente,
          proyecto: selectedSub.proyecto,
          monto: monto,
        };
        const { data: insertedData, error: insertErr } = await supabase
          .from("pagos")
          .insert([payload])
          .select()
          .single();
        if (insertErr) throw insertErr;
        toast({ title: "Pago registrado" });
        // Actualizar la suscripción: avanzar al siguiente mes usando dia_de_pago_mensual
        try {
          const today = new Date();
          const diaActual = today.getDate();
          const mesActual = today.getMonth();
          const añoActual = today.getFullYear();
          
          // Obtener el día de pago mensual (por defecto el día actual si no existe)
          const diaDePago = selectedSub.dia_de_pago_mensual ?? diaActual;
          
          // Calcular el siguiente mes
          let siguienteMes = mesActual + 1;
          let siguienteAño = añoActual;
          
          if (siguienteMes > 11) {
            siguienteMes = 0;
            siguienteAño += 1;
          }
          
          // Obtener el último día del siguiente mes para validar
          const ultimoDiaDelMes = new Date(siguienteAño, siguienteMes + 1, 0).getDate();
          const diaValido = Math.min(diaDePago, ultimoDiaDelMes);
          
          // Crear la nueva fecha de próximo pago
          const nuevaFecha = new Date(siguienteAño, siguienteMes, diaValido);
          const newProx = nuevaFecha.toISOString();
          
          const { error: upErr } = await supabase
            .from("suscripciones")
            .update({ proxima_fecha_de_pago: newProx })
            .eq("id", selectedSub.id);
          if (upErr) {
            // eslint-disable-next-line no-console
            console.error("Error actualizando proxima_fecha_de_pago:", upErr);
          } else {
            // actualizar seleccionada localmente
            setSelectedSub({ ...selectedSub, proxima_fecha_de_pago: newProx });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error al actualizar suscripción tras pago:", err);
        }

        // generar factura e imprimir
        try {
          pagoRecord = insertedData ?? payload;
          // pasar el valor mínimo calculado para que en la impresión "Valor a Pagar" sea ese mínimo
          await generateAndOpenInvoice(pagoRecord, { minimo: labelVal });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error generando factura:", err);
        }
      } else if (tipo === "contrato") {
        if (!selectedContrato) {
          toast({ title: "Selecciona un contrato" });
          return;
        }
        const monto = Number(amount);
        if (isNaN(monto) || monto <= 0) {
          toast({ title: "Ingresa un monto válido" });
          return;
        }
        // calcular restante actual (asegurar valor reciente)
        const restante = await calcularRestanteContrato(selectedContrato);
        if (monto > restante + 0.0001) {
          toast({
            title: "El monto no puede ser mayor al valor restante",
            description: formatCurrency(restante),
          });
          return;
        }
        const payload: any = {
          fecha_de_creacion: new Date().toISOString(),
          tipo: "contrato",
          referencia_id: selectedContrato.id,
          cliente: selectedContrato.cliente,
          proyecto: selectedContrato.proyecto,
          monto,
        };
        const { data: insertedData, error: insertErr } = await supabase
          .from("pagos")
          .insert([payload])
          .select()
          .single();
        if (insertErr) throw insertErr;
        toast({ title: "Pago registrado" });
        // Si el pago completa el restante, actualizar el estado del contrato a 'cancelado'
        const epsilon = 0.005;
        if (Math.abs(monto - restante) <= epsilon) {
          try {
            const { error: upErr } = await supabase
              .from("contratos")
              .update({ estado: "cancelado" })
              .eq("id", selectedContrato.id);
            if (upErr) {
              // eslint-disable-next-line no-console
              console.error("Error actualizando estado de contrato:", upErr);
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Error marcando contrato como cancelado:", err);
          }
        }

        pagoRecord = insertedData ?? payload;

        // If user provided a next payment date, update the contrato.proximo_pago
        try {
          if (nextPaymentDate) {
            const isoNext = new Date(nextPaymentDate).toISOString();
            const { error: upNextErr } = await supabase
              .from("contratos")
              .update({ proximo_pago: isoNext })
              .eq("id", selectedContrato.id);
            if (upNextErr) {
              // eslint-disable-next-line no-console
              console.error(
                "Error actualizando proximo_pago en contrato:",
                upNextErr
              );
            } else {
              // update local selectedContrato
              setSelectedContrato({
                ...selectedContrato,
                proximo_pago: isoNext,
              });
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Error al actualizar proximo_pago:", e);
        }

        // compute remaining balance before and after this payment to include in invoice extra
        try {
          const { data: contrData, error: contrErr } = await supabase
            .from("contratos")
            .select("id,monto_total,pago_inicial")
            .eq("id", selectedContrato.id)
            .limit(1)
            .single();
          if (!contrErr && contrData) {
            // sum pagos (including the one just inserted)
            const { data: pagosData, error: pagosErr } = await supabase
              .from("pagos")
              .select("monto")
              .eq("tipo", "contrato")
              .eq("referencia_id", contrData.id);
            let totalPagos = 0;
            if (!pagosErr && Array.isArray(pagosData)) {
              totalPagos = pagosData.reduce(
                (s: number, r: any) => s + Number(r.monto ?? 0),
                0
              );
            }
            const restanteAfter =
              Number(contrData.monto_total ?? 0) -
              Number(contrData.pago_inicial ?? 0) -
              totalPagos;
            const pagoMonto = Number(pagoRecord.monto ?? 0);
            const prevRestante = restanteAfter + pagoMonto;
            const saldoActual = Math.max(0, prevRestante - pagoMonto);
            extra.prevRestante = prevRestante;
            extra.saldoActual = saldoActual;
            extra.restanteAfter = restanteAfter;
          }
        } catch (e) {
          // ignore
        }

        // generar factura e imprimir pasando extra/minimo/tipo
        try {
          await generateAndOpenInvoice(pagoRecord, {
            ...extra,
            minimo: monto,
            tipo: "contrato",
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error generando factura:", err);
        }
      }

      onOpenChange(false);
      onCreated?.();
      queryClient.invalidateQueries({ queryKey: ["pagos"] });
      queryClient.invalidateQueries({ queryKey: ["suscripciones"] });
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error guardando pago:", err);
      toast({
        title: "Error guardando pago",
        description: err?.message ?? String(err),
      });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Cobro</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {step === 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de pago
                </label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suscripcion">Suscripción</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={onNextFromTipo}>Siguiente</Button>
                </div>
              </div>
            )}

            {step === 2 && tipo === "suscripcion" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Buscar Suscripción (cliente o proyecto)
                </label>
                <Input
                  placeholder="Filtrar..."
                  value={subsFilter}
                  onChange={(e) => setSubsFilter(e.target.value)}
                />
                <div className="max-h-48 overflow-auto mt-2 space-y-2">
                  {subsList
                    .filter((s) => {
                      const clientName =
                        clientsMap[s.cliente] ?? String(s.cliente);
                      const projectName =
                        projectsMap[s.proyecto] ?? String(s.proyecto);
                      return (clientName + " " + projectName)
                        .toLowerCase()
                        .includes(subsFilter.toLowerCase());
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        className={`p-2 border rounded ${
                          selectedSub?.id === s.id ? "border-primary" : ""
                        }`}
                        onClick={() => setSelectedSub(s)}
                      >
                        <div className="text-sm font-medium">
                          {clientsMap[s.cliente] ?? s.cliente} —{" "}
                          {projectsMap[s.proyecto] ?? s.proyecto}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mensualidad:{" "}
                          {formatCurrency(Number(s.mensualidad ?? 0))} —
                          Próxima:{" "}
                          {s.proxima_fecha_de_pago
                            ? formatDate(s.proxima_fecha_de_pago)
                            : "-"}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Atrás
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!selectedSub}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && tipo === "contrato" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Buscar Contrato (cliente o proyecto)
                </label>
                <Input
                  placeholder="Filtrar..."
                  value={contratosFilter}
                  onChange={(e) => setContratosFilter(e.target.value)}
                />
                <div className="max-h-48 overflow-auto mt-2 space-y-2">
                  {contratosList
                    .filter((c) => {
                      const clientName =
                        clientsMap[c.cliente] ?? String(c.cliente);
                      const projectName =
                        projectsMap[c.proyecto] ?? String(c.proyecto);
                      return (clientName + " " + projectName)
                        .toLowerCase()
                        .includes(contratosFilter.toLowerCase());
                    })
                    .map((c) => (
                      <div
                        key={c.id}
                        className={`p-2 border rounded ${
                          selectedContrato?.id === c.id ? "border-primary" : ""
                        }`}
                        onClick={async () => {
                          setSelectedContrato(c);
                          // initialize nextPaymentDate from contrato if available
                          try {
                            const val = c?.proximo_pago
                              ? new Date(c.proximo_pago)
                                  .toISOString()
                                  .slice(0, 16)
                              : "";
                            setNextPaymentDate(val || null);
                          } catch (e) {
                            setNextPaymentDate(null);
                          }
                          try {
                            const restante = await calcularRestanteContrato(c);
                            setContratoRestante(restante);
                          } catch (err) {
                            // eslint-disable-next-line no-console
                            console.error(
                              "Error calculando restante al seleccionar contrato:",
                              err
                            );
                            setContratoRestante(null);
                          }
                        }}
                      >
                        <div className="text-sm font-medium">
                          {clientsMap[c.cliente] ?? c.cliente} —{" "}
                          {projectsMap[c.proyecto] ?? c.proyecto}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: {formatCurrency(Number(c.monto_total ?? 0))} —
                          Inicial: {formatCurrency(Number(c.pago_inicial ?? 0))}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Atrás
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!selectedContrato}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && tipo === "suscripcion" && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Valor a cobrar (mínimo):{" "}
                  {formatCurrency(calcularValorLabelSus(selectedSub))}
                </div>
                <label className="block text-sm font-medium mb-1 mt-2">
                  Monto a cobrar
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Atrás
                  </Button>
                  <Button onClick={onSave}>Guardar</Button>
                </div>
              </div>
            )}

            {step === 3 && tipo === "contrato" && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Valor restante:{" "}
                  {selectedContrato
                    ? formatCurrency(contratoRestante ?? 0)
                    : "-"}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  (Se actualizará al seleccionar contrato)
                </div>
                <label className="block text-sm font-medium mb-1 mt-2">
                  Monto a cobrar
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <label className="block text-sm font-medium mb-1 mt-3">
                  Próximo pago (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={nextPaymentDate ?? ""}
                  onChange={(e) => setNextPaymentDate(e.target.value || null)}
                  className="mt-1 block w-full rounded-md border p-2"
                />
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Atrás
                  </Button>
                  <Button onClick={onSave}>Guardar</Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter />
        </DialogContent>
      </Dialog>

      {invoiceOpen && invoiceHtml ? (
        <Dialog
          open={invoiceOpen}
          onOpenChange={(v) => {
            setInvoiceOpen(v);
            if (!v) {
              setInvoiceHtml(null);
              setInvoiceAutoPrint(false);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Factura</DialogTitle>
            </DialogHeader>

            <div className="mt-2">
              <Factura
                open={invoiceOpen}
                html={invoiceHtml}
                onOpenChange={(v) => {
                  setInvoiceOpen(v);
                  if (!v) {
                    setInvoiceHtml(null);
                    setInvoiceAutoPrint(false);
                  }
                }}
                autoPrint={invoiceAutoPrint}
              />
            </div>

            <DialogFooter>
              <div className="flex gap-2 justify-end w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInvoiceOpen(false);
                    setInvoiceHtml(null);
                    setInvoiceAutoPrint(false);
                  }}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    const iframe = document.querySelector(
                      'iframe[title="Factura"]'
                    ) as HTMLIFrameElement | null;
                    const w = iframe?.contentWindow;
                    if (w) {
                      try {
                        w.focus();
                        w.print();
                      } catch (err) {
                        // eslint-disable-next-line no-console
                        console.error("Error imprimiendo factura:", err);
                      }
                    }
                  }}
                >
                  Imprimir
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
