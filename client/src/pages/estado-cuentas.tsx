import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Factura from "@/components/factura";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { formatCurrency, formatDate, getPaymentTypeLabel } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

export default function EstadoCuentas() {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [searchRtn, setSearchRtn] = useState<string>("");
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<"all" | "suscripcion" | "contrato">("all");
  const [selectedProyecto, setSelectedProyecto] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [pagosResults, setPagosResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id,nombre,rtn");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["proyectos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proyectos").select("id,nombre");
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: suscripciones = [] } = useQuery({
    queryKey: ["suscripciones", selectedClient],
    enabled: selectedTipo === "suscripcion" && !!selectedClient,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suscripciones")
        .select("id,cliente,proyecto")
        .eq("cliente", selectedClient);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ["contratos", selectedClient],
    enabled: selectedTipo === "contrato" && !!selectedClient,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id,cliente,proyecto")
        .eq("cliente", selectedClient);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    },
  });

  useEffect(() => {
    // reset proyecto when tipo or cliente changes
    setSelectedProyecto("");
  }, [selectedClient, selectedTipo]);

  const projectName = (projId: string) => {
    const p = projects.find((x: any) => x.id === projId);
    return p ? p.nombre : projId;
  };

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);

  // build options for proyecto select depending on tipo
  const proyectoOptions =
    selectedTipo === "suscripcion"
      ? (suscripciones || []).map((s: any) => ({ id: s.proyecto, label: projectName(s.proyecto) }))
      : selectedTipo === "contrato"
      ? (contratos || []).map((c: any) => ({ id: c.proyecto, label: projectName(c.proyecto) }))
      : [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Estado de Cuentas</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">RTN / Cliente</label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between font-normal"
                  >
                    {selectedClient
                      ? (() => {
                          const client = clients.find((c: any) => c.id === selectedClient);
                          return client?.rtn ? `${client.rtn} — ${client.nombre}` : client?.nombre;
                        })()
                      : "Buscar por RTN o nombre..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Escribir RTN o nombre del cliente..."
                      value={searchRtn}
                      onValueChange={setSearchRtn}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup>
                        {clients
                          .filter((c: any) => {
                            if (!searchRtn) return true;
                            const search = searchRtn.toLowerCase();
                            const rtn = (c.rtn || "").toLowerCase();
                            const nombre = (c.nombre || "").toLowerCase();
                            return rtn.includes(search) || nombre.includes(search);
                          })
                          .map((client: any) => (
                            <CommandItem
                              key={client.id}
                              value={client.rtn ? `${client.rtn} — ${client.nombre}` : client.nombre}
                              onSelect={() => {
                                setSelectedClient(client.id);
                                setSearchRtn("");
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedClient === client.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {client.rtn ? `${client.rtn} — ${client.nombre}` : client.nombre}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo de contrato</label>
              <Select value={selectedTipo} onValueChange={(v) => setSelectedTipo(v as any)}>
                <SelectTrigger>
                  <SelectValue>{selectedTipo === "all" ? "Todos" : selectedTipo || "Todos"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="suscripcion">Suscripción</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Proyecto</label>
              <Select
                value={selectedProyecto}
                onValueChange={(v) => setSelectedProyecto(v)}
                disabled={!selectedClient || selectedTipo === "all"}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(!selectedClient || selectedTipo === "all")
                      ? "Seleccione cliente y tipo"
                      : proyectoOptions.find((p) => p.id === selectedProyecto)?.label ?? "Seleccione proyecto"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {proyectoOptions.length === 0 ? (
                    <SelectItem value="none" disabled>No hay proyectos</SelectItem>
                  ) : (
                    proyectoOptions.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha desde</label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Fecha hasta</label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    let q = supabase.from("estado_cuenta").select(
                      "id,fecha,tipo,cliente_id,proyecto_id,monto,saldo_actual,nota"
                    );
                    if (selectedClient) q = q.eq("cliente_id", selectedClient);
                    if (selectedTipo && selectedTipo !== "all") q = q.eq("tipo", selectedTipo);
                    if (selectedProyecto && selectedProyecto !== "none") q = q.eq("proyecto_id", selectedProyecto);
                    if (fechaDesde) q = q.gte("fecha", fechaDesde);
                    if (fechaHasta) q = q.lte("fecha", fechaHasta);
                    const { data, error } = await q.order("fecha", { ascending: false });
                    if (error) throw error;
                    setPagosResults(Array.isArray(data) ? data : []);
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error("Error buscando movimientos:", err);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={
                  !selectedClient || 
                  !selectedTipo || 
                  selectedTipo === "all" || 
                  !selectedProyecto || 
                  !fechaDesde || 
                  !fechaHasta
                }
              >
                Buscar
              </Button>
              <Button variant="ghost" onClick={() => {
                setSelectedClient("");
                setSearchRtn("");
                setSelectedTipo("all");
                setSelectedProyecto("");
                setFechaDesde("");
                setFechaHasta("");
                setPagosResults([]);
                // Invalidate queries so selects recarguen sus datos
                queryClient.invalidateQueries({ queryKey: ["clientes"] });
                queryClient.invalidateQueries({ queryKey: ["proyectos"] });
                queryClient.invalidateQueries({ queryKey: ["suscripciones"] });
                queryClient.invalidateQueries({ queryKey: ["contratos"] });
                queryClient.invalidateQueries({ queryKey: ["pagos"] });
              }}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Resultados</CardTitle>
            <div>
              <Button
                size="sm"
                onClick={() => {
                  const client: any = clients.find((c: any) => c.id === selectedClient) || {};
                  const proyecto: any = projects.find((p: any) => p.id === selectedProyecto) || {};
                  const tipoLabel = selectedTipo === "contrato" ? "Contrato" : selectedTipo === "suscripcion" ? "Suscripción" : "Todos";
                  
                  const rows = (pagosResults || [])
                    .map(
                      (p: any) => `
                        <tr>
                          <td style="padding:8px;border:1px solid #ddd">${client.nombre ?? (p.cliente_id ?? "-")}</td>
                          <td style="padding:8px;border:1px solid #ddd">${client.rtn ?? "-"}</td>
                          <td style="padding:8px;border:1px solid #ddd;text-transform:capitalize">${p.tipo}</td>
                          <td style="padding:8px;border:1px solid #ddd">${projects.find((pr: any) => pr.id === p.proyecto_id)?.nombre ?? p.proyecto_id}</td>
                          <td style="padding:8px;border:1px solid #ddd">${formatDate(p.fecha)}</td>
                          <td style="padding:8px;border:1px solid #ddd">${formatCurrency(Number(p.monto ?? 0))}</td>
                          <td style="padding:8px;border:1px solid #ddd">${formatCurrency(Number(p.saldo_actual ?? 0))}</td>
                          <td style="padding:8px;border:1px solid #ddd">${p.nota ?? "-"}</td>
                        </tr>`
                    )
                    .join("\n");

                  const html = `
                    <html>
                      <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width,initial-scale=1" />
                        <title>Estado de Cuenta</title>
                        <style>
                          body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 24px; color:#111827 }
                          .header { display:flex; align-items:center; gap:16px; margin-bottom: 20px; }
                          .logo { height:56px }
                          .info-section { margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; }
                          .info-row { display: flex; gap: 32px; margin-bottom: 8px; }
                          .info-label { font-weight: 600; min-width: 100px; }
                          table { border-collapse: collapse; width:100%; margin-top:16px }
                          th, td { padding:8px; border:1px solid #ddd; text-align:left }
                          th { background:#f3f4f6; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <img src="/vsr.png" class="logo" alt="logo" />
                          <div>
                            <h2 style="margin: 0 0 8px 0;">Estado de Cuenta</h2>
                            <div style="color: #6b7280; font-size: 14px;">Reporte de Movimientos Financieros</div>
                          </div>
                        </div>
                        
                        <div class="info-section">
                          <div class="info-row">
                            <div><span class="info-label">Cliente:</span> ${client.nombre ?? "-"}</div>
                            <div><span class="info-label">RTN:</span> ${client.rtn ?? "-"}</div>
                          </div>
                          <div class="info-row">
                            <div><span class="info-label">Proyecto:</span> ${proyecto.nombre ?? "-"}</div>
                            <div><span class="info-label">Tipo:</span> ${tipoLabel}</div>
                          </div>
                          <div class="info-row">
                            <div><span class="info-label">Fecha desde:</span> ${fechaDesde ? formatDate(fechaDesde) : "-"}</div>
                            <div><span class="info-label">Fecha hasta:</span> ${fechaHasta ? formatDate(fechaHasta) : "-"}</div>
                          </div>
                        </div>
                        
                        <table>
                          <thead>
                            <tr>
                              <th>Cliente</th>
                              <th>RTN</th>
                              <th>Tipo</th>
                              <th>Proyecto</th>
                              <th>Fecha</th>
                              <th>Monto</th>
                              <th>Saldo Actual</th>
                              <th>Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${rows}
                          </tbody>
                        </table>
                      </body>
                    </html>`;

                  setInvoiceHtml(html);
                  setInvoiceOpen(true);
                }}
                disabled={!selectedClient || (pagosResults || []).length === 0}
              >
                Imprimir estado de cuenta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>RTN</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Saldo Actual</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagosResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">No hay datos que mostrar.</TableCell>
                </TableRow>
              ) : (
                pagosResults.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{clients.find((c: any) => c.id === p.cliente_id)?.nombre ?? p.cliente_id}</TableCell>
                    <TableCell>{clients.find((c: any) => c.id === p.cliente_id)?.rtn ?? "-"}</TableCell>
                    <TableCell className="capitalize">{p.tipo}</TableCell>
                    <TableCell>{projects.find((pr: any) => pr.id === p.proyecto_id)?.nombre ?? p.proyecto_id}</TableCell>
                    <TableCell>{formatDate(p.fecha)}</TableCell>
                    <TableCell>{formatCurrency(Number(p.monto ?? 0))}</TableCell>
                    <TableCell>{formatCurrency(Number(p.saldo_actual ?? 0))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.nota ?? "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {invoiceOpen && invoiceHtml ? (
        <Dialog
          open={invoiceOpen}
          onOpenChange={(v) => {
            setInvoiceOpen(v);
            if (!v) setInvoiceHtml(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Estado de Cuenta</DialogTitle>
            </DialogHeader>

            <div className="mt-2">
              <Factura
                open={invoiceOpen}
                html={invoiceHtml}
                onOpenChange={(v) => {
                  setInvoiceOpen(v);
                  if (!v) setInvoiceHtml(null);
                }}
                autoPrint={false}
              />
            </div>

            <DialogFooter>
              <div className="flex gap-2 justify-end w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setInvoiceOpen(false);
                    setInvoiceHtml(null);
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
                        console.error("Error imprimiendo estado de cuenta:", err);
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
    </div>
  );
}

