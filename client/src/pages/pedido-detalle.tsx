import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  User,
  Store,
  MapPin,
  Phone,
  DollarSign,
  Package,
  Truck,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Pedido = {
  id: string;
  numero_pedido?: string | null;
  total?: number | null;
  estado?: string | null;
  restaurante_id?: string | null;
  usuario_id?: string | null;
  repartidor_id?: string | null;
  creado_en?: string | null;
  direccion_entrega?: string | null;
  costo_envio?: number | null;
  notas_cliente?: string | null;
  notas_repartidor?: string | null;
  tipo_pago?: string | null;
  confirmado_en?: string | null;
  asignado_en?: string | null;
  entregado_en?: string | null;
};

type Cliente = {
  nombre?: string | null;
  telefono?: string | null;
  direccion?: string | null;
};

type Restaurante = {
  nombre?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  imagen_url?: string | null;
};

type Repartidor = {
  nombre_completo?: string | null;
  telefono?: string | null;
};

type DetallePedido = {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas?: string | null;
  platillo?: {
    id: string;
    nombre: string;
    descripcion?: string | null;
    imagen_url?: string | null;
    precio: number;
  };
};

export default function PedidoDetalle() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pedidoId = params.id as string;

  const [editingEstado, setEditingEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [editingRepartidor, setEditingRepartidor] = useState(false);
  const [nuevoRepartidorId, setNuevoRepartidorId] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Obtener datos del pedido
  const { data: pedido, isLoading: loadingPedido } = useQuery({
    queryKey: ["pedido", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("id", pedidoId)
        .single();
      if (error) throw error;
      return data as Pedido;
    },
  });

  // Obtener datos del cliente
  const { data: cliente } = useQuery({
    queryKey: ["cliente", pedido?.usuario_id],
    enabled: !!pedido?.usuario_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("nombre, telefono, direccion")
        .eq("id", pedido?.usuario_id!)
        .single();
      if (error) {
        console.error("Error obteniendo cliente:", error);
        return null;
      }
      return data as Cliente;
    },
  });

  // Obtener datos del restaurante
  const { data: restaurante } = useQuery({
    queryKey: ["restaurante", pedido?.restaurante_id],
    enabled: !!pedido?.restaurante_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurantes")
        .select("nombre, direccion, telefono, imagen_url")
        .eq("id", pedido?.restaurante_id!)
        .single();
      if (error) {
        console.error("Error obteniendo restaurante:", error);
        return null;
      }
      return data as Restaurante;
    },
  });

  // Obtener datos del repartidor
  const { data: repartidor } = useQuery({
    queryKey: ["repartidor", pedido?.repartidor_id],
    enabled: !!pedido?.repartidor_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repartidores")
        .select("nombre_completo, telefono")
        .eq("id", pedido?.repartidor_id!)
        .single();
      if (error) {
        console.error("Error obteniendo repartidor:", error);
        return null;
      }
      return data as Repartidor;
    },
  });

  // Obtener lista de todos los repartidores
  const { data: repartidores = [] } = useQuery({
    queryKey: ["repartidores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repartidores")
        .select("id, nombre_completo, telefono, estado, disponible")
        .order("nombre_completo");
      if (error) throw error;
      return data || [];
    },
  });

  // Obtener detalles del pedido (productos)
  const { data: detalles = [], isLoading: loadingDetalles } = useQuery({
    queryKey: ["detalles_pedido", pedidoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detalle_pedidos")
        .select(
          `
          id,
          cantidad,
          precio_unitario,
          subtotal,
          notas,
          platillos(id, nombre, descripcion, imagen_url, precio)
        `,
        )
        .eq("pedido_id", pedidoId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        platillo: item.platillos,
      })) as DetallePedido[];
    },
  });

  // Actualizar repartidor del pedido
  const updateRepartidorMutation = useMutation({
    mutationFn: async (repartidorId: string) => {
      const updateData: any = {
        repartidor_id: repartidorId,
        actualizado_en: new Date().toISOString(),
      };

      // Si es la primera asignación, marcar el timestamp
      if (!pedido?.asignado_en) {
        updateData.asignado_en = new Date().toISOString();
      }

      const { error } = await supabase
        .from("pedidos")
        .update(updateData)
        .eq("id", pedidoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] });
      queryClient.invalidateQueries({ queryKey: ["pedidos_operador"] });
      toast({ title: "Repartidor asignado correctamente" });
      setEditingRepartidor(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al asignar repartidor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actualizar estado del pedido
  const updateEstadoMutation = useMutation({
    mutationFn: async (estado: string) => {
      const updateData: any = {
        estado,
        actualizado_en: new Date().toISOString(),
      };

      // Actualizar timestamps según el estado
      if (estado === "confirmado" && !pedido?.confirmado_en) {
        updateData.confirmado_en = new Date().toISOString();
      } else if (estado === "entregado" && !pedido?.entregado_en) {
        updateData.entregado_en = new Date().toISOString();
      }

      const { error } = await supabase
        .from("pedidos")
        .update(updateData)
        .eq("id", pedidoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] });
      queryClient.invalidateQueries({ queryKey: ["pedidos_operador"] });
      toast({ title: "Estado actualizado correctamente" });
      setEditingEstado(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar estado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Eliminar pedido
  const deletePedidoMutation = useMutation({
    mutationFn: async () => {
      // Primero eliminar detalles del pedido
      const { error: errorDetalles } = await supabase
        .from("detalle_pedidos")
        .delete()
        .eq("pedido_id", pedidoId);

      if (errorDetalles) throw errorDetalles;

      // Luego eliminar el pedido
      const { error } = await supabase
        .from("pedidos")
        .delete()
        .eq("id", pedidoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos_operador"] });
      toast({ title: "Pedido eliminado correctamente" });
      setLocation("/pedidos");
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getEstadoBadgeVariant = (estado?: string | null) => {
    switch (estado) {
      case "entregado":
        return "default";
      case "cancelado":
        return "destructive";
      case "en_camino":
        return "secondary";
      case "pendiente":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (loadingPedido) {
    return <div className="p-6">Cargando pedido...</div>;
  }

  if (!pedido) {
    return <div className="p-6">Pedido no encontrado</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/pedidos")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a pedidos
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Pedido #{pedido.numero_pedido || pedido.id.substring(0, 8)}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant={getEstadoBadgeVariant(pedido.estado)}
                className="text-sm"
              >
                {pedido.estado || "Sin estado"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNuevoEstado(pedido.estado || "pendiente");
                  setEditingEstado(true);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Cambiar estado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNuevoRepartidorId(pedido.repartidor_id || "");
                  setEditingRepartidor(true);
                }}
              >
                <Truck className="mr-2 h-4 w-4" />
                {pedido.repartidor_id ? "Reasignar" : "Asignar"} Repartidor
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground mb-1">
              Total del pedido
            </div>
            <div className="text-4xl font-bold text-primary">
              ${pedido.total?.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cliente ? (
              <>
                <div>
                  <Label className="text-muted-foreground">Nombre</Label>
                  <p className="font-medium">
                    {cliente.nombre || "No disponible"}
                  </p>
                </div>
                {cliente.telefono && (
                  <div>
                    <Label className="text-muted-foreground">Teléfono</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{cliente.telefono}</p>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">
                    Dirección de entrega
                  </Label>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <p>
                      {pedido.direccion_entrega ||
                        cliente.direccion ||
                        "No especificada"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                Cargando información del cliente...
              </p>
            )}

            {pedido.notas_cliente && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">
                    Notas del cliente
                  </Label>
                  <p className="text-sm">{pedido.notas_cliente}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Información del Restaurante */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Información del Restaurante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {restaurante ? (
              <>
                {restaurante.imagen_url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden">
                    <img
                      src={restaurante.imagen_url}
                      alt={restaurante.nombre || "Restaurante"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Nombre</Label>
                  <p className="font-medium">
                    {restaurante.nombre || "No disponible"}
                  </p>
                </div>
                {restaurante.direccion && (
                  <div>
                    <Label className="text-muted-foreground">Dirección</Label>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="text-sm">{restaurante.direccion}</p>
                    </div>
                  </div>
                )}
                {restaurante.telefono && (
                  <div>
                    <Label className="text-muted-foreground">Teléfono</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{restaurante.telefono}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                Cargando información del restaurante...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Información del Repartidor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {pedido.repartidor_id
                  ? "Repartidor Asignado"
                  : "Sin Repartidor"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNuevoRepartidorId(pedido.repartidor_id || "");
                  setEditingRepartidor(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pedido.repartidor_id ? (
              repartidor ? (
                <>
                  <div>
                    <Label className="text-muted-foreground">Nombre</Label>
                    <p className="font-medium">
                      {repartidor.nombre_completo || "No disponible"}
                    </p>
                  </div>
                  {repartidor.telefono && (
                    <div>
                      <Label className="text-muted-foreground">Teléfono</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p>{repartidor.telefono}</p>
                      </div>
                    </div>
                  )}
                  {pedido.asignado_en && (
                    <div>
                      <Label className="text-muted-foreground">
                        Asignado el
                      </Label>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">
                          {new Date(pedido.asignado_en).toLocaleString("es-ES")}
                        </p>
                      </div>
                    </div>
                  )}
                  {pedido.notas_repartidor && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">
                          Notas del repartidor
                        </Label>
                        <p className="text-sm">{pedido.notas_repartidor}</p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Cargando información del repartidor...
                </p>
              )
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  Este pedido aún no tiene repartidor asignado
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNuevoRepartidorId("");
                    setEditingRepartidor(true);
                  }}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Asignar Repartidor
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de Pago y Envío */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Detalles de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Subtotal</Label>
              <p className="font-medium">
                ${((pedido.total || 0) - (pedido.costo_envio || 0)).toFixed(2)}
              </p>
            </div>
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Costo de envío</Label>
              <p className="font-medium">
                ${pedido.costo_envio?.toFixed(2) || "0.00"}
              </p>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <Label className="font-semibold">Total</Label>
              <p className="text-xl font-bold text-primary">
                ${pedido.total?.toFixed(2) || "0.00"}
              </p>
            </div>
            {pedido.tipo_pago && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">
                    Método de pago
                  </Label>
                  <p className="capitalize">{pedido.tipo_pago}</p>
                </div>
              </>
            )}

            {/* Timestamps */}
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creado:</span>
                <span>
                  {pedido.creado_en
                    ? new Date(pedido.creado_en).toLocaleString("es-ES")
                    : "-"}
                </span>
              </div>
              {pedido.confirmado_en && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmado:</span>
                  <span>
                    {new Date(pedido.confirmado_en).toLocaleString("es-ES")}
                  </span>
                </div>
              )}
              {pedido.entregado_en && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entregado:</span>
                  <span>
                    {new Date(pedido.entregado_en).toLocaleString("es-ES")}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalles del Pedido (Productos) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos del Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDetalles ? (
            <p>Cargando productos...</p>
          ) : detalles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay productos en este pedido
            </p>
          ) : (
            <div className="space-y-4">
              {detalles.map((detalle) => (
                <div
                  key={detalle.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  {detalle.platillo?.imagen_url ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={detalle.platillo.imagen_url}
                        alt={detalle.platillo.nombre}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1">
                    <h4 className="font-medium">
                      {detalle.platillo?.nombre || "Producto"}
                    </h4>
                    {detalle.platillo?.descripcion && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {detalle.platillo.descripcion}
                      </p>
                    )}
                    {detalle.notas && (
                      <p className="text-sm text-muted-foreground italic mt-1">
                        Nota: {detalle.notas}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {detalle.cantidad} x ${detalle.precio_unitario.toFixed(2)}
                    </div>
                    <div className="font-semibold">
                      ${detalle.subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para editar estado */}
      {editingEstado && (
        <Card className="fixed bottom-4 right-4 w-96 shadow-2xl z-50">
          <CardHeader>
            <CardTitle>Cambiar Estado del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>
                Estado actual:{" "}
                <Badge variant={getEstadoBadgeVariant(pedido.estado)}>
                  {pedido.estado}
                </Badge>
              </Label>
            </div>
            <div>
              <Label>Nuevo estado</Label>
              <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="en_preparacion">En Preparación</SelectItem>
                  <SelectItem value="listo">Listo</SelectItem>
                  <SelectItem value="en_camino">En Camino</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingEstado(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => updateEstadoMutation.mutate(nuevoEstado)}
                disabled={
                  updateEstadoMutation.isPending ||
                  nuevoEstado === pedido.estado
                }
              >
                {updateEstadoMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo para asignar/reasignar repartidor */}
      {editingRepartidor && (
        <Card className="fixed bottom-4 right-4 w-96 shadow-2xl z-50">
          <CardHeader>
            <CardTitle>
              {pedido.repartidor_id ? "Reasignar" : "Asignar"} Repartidor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pedido.repartidor_id && repartidor && (
              <div>
                <Label>
                  Repartidor actual:{" "}
                  <span className="font-semibold">
                    {repartidor.nombre_completo}
                  </span>
                </Label>
              </div>
            )}
            <div>
              <Label>Seleccionar repartidor</Label>
              <Select
                value={nuevoRepartidorId}
                onValueChange={setNuevoRepartidorId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un repartidor" />
                </SelectTrigger>
                <SelectContent>
                  {repartidores.map((rep: any) => (
                    <SelectItem key={rep.id} value={rep.id}>
                      {rep.nombre_completo} {rep.disponible ? "🟢" : "🔴"}
                      {rep.telefono && ` - ${rep.telefono}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                🟢 Disponible | 🔴 No disponible
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditingRepartidor(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  updateRepartidorMutation.mutate(nuevoRepartidorId)
                }
                disabled={
                  updateRepartidorMutation.isPending ||
                  !nuevoRepartidorId ||
                  nuevoRepartidorId === pedido.repartidor_id
                }
              >
                {updateRepartidorMutation.isPending
                  ? "Guardando..."
                  : "Asignar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              pedido
              <strong> #{pedido.numero_pedido}</strong> y todos sus detalles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePedidoMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePedidoMutation.isPending
                ? "Eliminando..."
                : "Eliminar pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
