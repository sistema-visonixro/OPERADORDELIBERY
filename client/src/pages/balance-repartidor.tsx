import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  DollarSign,
  Calendar,
  Package
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Repartidor = {
  id: string;
  nombre_completo: string;
  telefono?: string;
};

type PedidoRealizado = {
  id: string;
  pedido_id: string;
  numero_pedido?: string;
  total?: number;
  costo_envio: number;
  entregado_en: string;
  direccion_entrega?: string;
  estado: string;
};

type Pago = {
  id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  referencia?: string;
  notas?: string;
};

type PagoForm = {
  monto: number;
  metodo_pago: string;
  referencia: string;
  notas: string;
};

export default function BalanceRepartidor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const repartidorId = params.id as string;

  const [showPagoDialog, setShowPagoDialog] = useState(false);
  const [pagoForm, setPagoForm] = useState<PagoForm>({
    monto: 0,
    metodo_pago: "efectivo",
    referencia: "",
    notas: "",
  });

  // Obtener datos del repartidor
  const { data: repartidor, isLoading: loadingRepartidor } = useQuery({
    queryKey: ["repartidor", repartidorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repartidores")
        .select("id, nombre_completo, telefono")
        .eq("id", repartidorId)
        .single();
      if (error) throw error;
      return data as Repartidor;
    },
  });

  // Obtener pedidos realizados
  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ["pedidos_repartidor", repartidorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_realizados_de_repartidor")
        .select("*")
        .eq("repartidor_id", repartidorId)
        .order("entregado_en", { ascending: false });
      if (error) throw error;
      return (data || []) as PedidoRealizado[];
    },
  });

  // Obtener pagos realizados
  const { data: pagos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ["pagos_repartidor", repartidorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pagos_repartidores")
        .select("*")
        .eq("repartidor_id", repartidorId)
        .order("fecha_pago", { ascending: false });
      if (error) throw error;
      return (data || []) as Pago[];
    },
  });

  // Calcular totales
  const totalGanado = pedidos.reduce((sum, p) => sum + (p.costo_envio || 0), 0);
  const totalPagado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const balance = totalGanado - totalPagado;

  // Registrar nuevo pago
  const registrarPagoMutation = useMutation({
    mutationFn: async (pago: PagoForm) => {
      const { error } = await supabase.from("pagos_repartidores").insert({
        repartidor_id: repartidorId,
        monto: pago.monto,
        metodo_pago: pago.metodo_pago,
        referencia: pago.referencia || null,
        notas: pago.notas || null,
        fecha_pago: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagos_repartidor", repartidorId] });
      queryClient.invalidateQueries({ queryKey: ["repartidores_balance"] });
      toast({ title: "Pago registrado correctamente" });
      setShowPagoDialog(false);
      setPagoForm({
        monto: 0,
        metodo_pago: "efectivo",
        referencia: "",
        notas: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al registrar pago",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (loadingRepartidor) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!repartidor) {
    return <div className="p-6">Repartidor no encontrado</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => setLocation("/ganancia-repartidores")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Ganancia de Repartidores
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{repartidor.nombre_completo}</h1>
            {repartidor.telefono && (
              <p className="text-muted-foreground">{repartidor.telefono}</p>
            )}
          </div>
          
          <Button onClick={() => setShowPagoDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Pago
          </Button>
        </div>
      </div>

      {/* Resumen de Balance */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Total Ganado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ganado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${totalGanado.toFixed(2)}
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pedidos.length} pedidos entregados
            </p>
          </CardContent>
        </Card>

        {/* Total Pagado */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${totalPagado.toFixed(2)}
              </div>
              <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pagos.length} pagos realizados
            </p>
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card className={
          balance > 0
            ? "border-orange-500 dark:border-orange-400"
            : balance < 0
            ? "border-red-500 dark:border-red-400"
            : "border-green-500 dark:border-green-400"
        }>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {balance > 0 ? "Saldo Pendiente" : balance < 0 ? "Sobrepagado" : "Saldado"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${
                balance > 0
                  ? "text-orange-600 dark:text-orange-400"
                  : balance < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
                ${Math.abs(balance).toFixed(2)}
              </div>
              <Wallet className={`h-8 w-8 ${
                balance > 0
                  ? "text-orange-600 dark:text-orange-400"
                  : balance < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lista de Pedidos Realizados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pedidos Entregados ({pedidos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPedidos ? (
              <p>Cargando pedidos...</p>
            ) : pedidos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay pedidos entregados
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pedidos.map((pedido) => (
                  <div 
                    key={pedido.id} 
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">
                          #{pedido.numero_pedido || pedido.pedido_id.substring(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(pedido.entregado_en).toLocaleString("es-ES")}
                        </p>
                      </div>
                      <Badge variant="outline">
                        ${pedido.costo_envio.toFixed(2)}
                      </Badge>
                    </div>
                    {pedido.direccion_entrega && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {pedido.direccion_entrega}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Pagos Realizados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pagos Realizados ({pagos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPagos ? (
              <p>Cargando pagos...</p>
            ) : pagos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay pagos registrados
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {pagos.map((pago) => (
                  <div 
                    key={pago.id} 
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold capitalize">{pago.metodo_pago}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(pago.fecha_pago).toLocaleString("es-ES")}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        ${pago.monto.toFixed(2)}
                      </Badge>
                    </div>
                    {pago.referencia && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {pago.referencia}
                      </p>
                    )}
                    {pago.notas && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {pago.notas}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para registrar pago */}
      <Dialog open={showPagoDialog} onOpenChange={setShowPagoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago a {repartidor.nombre_completo}</DialogTitle>
            <DialogDescription>
              Registra un nuevo pago realizado al repartidor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="monto">Monto *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                value={pagoForm.monto}
                onChange={(e) =>
                  setPagoForm({ ...pagoForm, monto: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="metodo_pago">Método de pago *</Label>
              <Select
                value={pagoForm.metodo_pago}
                onValueChange={(value) =>
                  setPagoForm({ ...pagoForm, metodo_pago: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="referencia">Referencia/Comprobante</Label>
              <Input
                id="referencia"
                value={pagoForm.referencia}
                onChange={(e) =>
                  setPagoForm({ ...pagoForm, referencia: e.target.value })
                }
                placeholder="Número de transacción, comprobante, etc."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={pagoForm.notas}
                onChange={(e) =>
                  setPagoForm({ ...pagoForm, notas: e.target.value })
                }
                placeholder="Notas adicionales sobre el pago..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPagoDialog(false);
                setPagoForm({
                  monto: 0,
                  metodo_pago: "efectivo",
                  referencia: "",
                  notas: "",
                });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => registrarPagoMutation.mutate(pagoForm)}
              disabled={registrarPagoMutation.isPending || pagoForm.monto <= 0}
            >
              {registrarPagoMutation.isPending ? "Registrando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
