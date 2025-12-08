import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, DollarSign, FileText, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Egreso {
  id: string;
  monto: number;
  motivo: string;
  categoria_id?: string | null;
  fecha: string;
  created_at: string;
  updated_at: string;
}

export default function EgresoDetallePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const {
    data: egreso,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["egreso", params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("egresos")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      return data as Egreso;
    },
    enabled: !!params.id,
  });

  // Obtener nombre de la categoría si aplica
  const { data: categoria } = useQuery({
    queryKey: ["egreso_categoria", egreso?.categoria_id],
    queryFn: async () => {
      if (!egreso?.categoria_id) return null;
      const { data, error } = await supabase
        .from("egreso_categorias")
        .select("nombre")
        .eq("id", egreso.categoria_id)
        .single();
      if (error) throw error;
      return data as { nombre: string } | null;
    },
    enabled: !!egreso?.categoria_id,
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12 text-muted-foreground">
          Cargando detalles del egreso...
        </div>
      </div>
    );
  }

  if (error || !egreso) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No se encontró el egreso</p>
          <Button variant="outline" onClick={() => navigate("/egresos")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Egresos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/egresos")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Detalle del Egreso
          </h1>
          <p className="text-muted-foreground mt-1">
            Información completa del registro
          </p>
        </div>
      </div>

      {/* Card principal */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Información del Egreso</CardTitle>
            <Badge variant="destructive" className="text-sm">
              Egreso
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monto */}
          <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Monto</p>
              <p className="text-3xl font-bold text-red-600">
                -{formatCurrency(Number(egreso.monto))}
              </p>
            </div>
          </div>

          {/* Motivo */}
          <div className="p-4 bg-muted/40 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Motivo
              </p>
            </div>
            <p className="text-base">{egreso.motivo}</p>
          </div>

          {/* Categoria (responsive) */}
          {categoria && categoria.nombre && (
            <div className="p-4 md:p-6 bg-muted/40 rounded-lg w-full">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm md:text-base font-medium text-muted-foreground truncate">
                  Categoría
                </p>
              </div>
              <p
                className="text-base md:text-lg font-medium truncate break-words"
                title={categoria.nombre}
              >
                {categoria.nombre}
              </p>
            </div>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Fecha del Egreso
                </p>
              </div>
              <p className="text-base font-medium">
                {formatDate(egreso.fecha)}
              </p>
            </div>

            <div className="p-4 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Fecha de Creación
                </p>
              </div>
              <p className="text-base font-medium">
                {formatDate(egreso.created_at)}
              </p>
            </div>
          </div>

          {/* ID del registro */}
          <div className="p-4 bg-muted/40 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              ID del Registro
            </p>
            <p className="text-xs font-mono text-muted-foreground">
              {egreso.id}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botón de regreso */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => navigate("/egresos")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Egresos
        </Button>
      </div>
    </div>
  );
}
