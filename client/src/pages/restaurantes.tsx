import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

type Restaurante = {
  id: string;
  nombre?: string | null;
  activo?: boolean | null;
  descripcion?: string | null;
  imagen_url?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  calificacion?: number | null;
  tiempo_entrega_min?: number | null;
  costo_envio?: number | null;
  emoji?: string | null;
};

export default function Restaurantes() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [estadoFilter, setEstadoFilter] = useState<
    "todos" | "activo" | "inactivo"
  >("todos");

  const {
    data: restaurantes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["restaurantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurantes")
        .select(
          "id, nombre, activo, descripcion, imagen_url, direccion, telefono, calificacion, tiempo_entrega_min, costo_envio, emoji",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Restaurante[];
    },
  });

  const activosCount = (restaurantes || []).filter(
    (r) => (r.activo ?? true) === true,
  ).length;
  const inactivosCount = (restaurantes || []).filter(
    (r) => (r.activo ?? true) === false,
  ).length;

  const restaurantesFiltrados = (restaurantes || []).filter((r) => {
    if (estadoFilter === "todos") return true;
    if (estadoFilter === "activo") return (r.activo ?? true) === true;
    return (r.activo ?? true) === false;
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Restaurantes</h1>
      </div>

      {/* Filtros por activo */}
      <div className="flex gap-4 mb-6">
        <Card
          className={`p-3 cursor-pointer flex-1 ${estadoFilter === "activo" ? "ring-2 ring-green-500 bg-green-50" : ""}`}
          onClick={() =>
            setEstadoFilter((s) => (s === "activo" ? "todos" : "activo"))
          }
        >
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Activos</div>
            <div className="text-xl font-bold">{activosCount}</div>
          </CardContent>
        </Card>

        <Card
          className={`p-3 cursor-pointer flex-1 ${estadoFilter === "inactivo" ? "ring-2 ring-rose-500 bg-rose-50" : ""}`}
          onClick={() =>
            setEstadoFilter((s) => (s === "inactivo" ? "todos" : "inactivo"))
          }
        >
          <CardContent className="p-0">
            <div className="text-sm text-muted-foreground">Inactivos</div>
            <div className="text-xl font-bold">{inactivosCount}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : error ? (
        <div className="text-red-500">
          Error cargando restaurantes: {String((error as any).message ?? error)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {restaurantesFiltrados.map((restaurante) => (
            <Card
              key={restaurante.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
              onClick={() =>
                setLocation(`/restaurante-detalle/${restaurante.id}`)
              }
            >
              {restaurante.imagen_url ? (
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={restaurante.imagen_url}
                    alt={restaurante.nombre || "Restaurante"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 w-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-6xl">{restaurante.emoji || "🍽️"}</span>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">
                    {restaurante.nombre || "Sin nombre"}
                  </CardTitle>
                  <Badge
                    variant={restaurante.activo ? "default" : "destructive"}
                  >
                    {restaurante.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {restaurante.descripcion && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {restaurante.descripcion}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {restaurante.direccion && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">📍</span>
                      <span className="line-clamp-1">
                        {restaurante.direccion}
                      </span>
                    </div>
                  )}

                  {restaurante.telefono && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">📞</span>
                      <span>{restaurante.telefono}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <span>⭐</span>
                      <span className="font-medium">
                        {restaurante.calificacion?.toFixed(1) ?? "N/A"}
                      </span>
                    </div>

                    {restaurante.tiempo_entrega_min && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>🕐</span>
                        <span>{restaurante.tiempo_entrega_min} min</span>
                      </div>
                    )}

                    {restaurante.costo_envio !== null &&
                      restaurante.costo_envio !== undefined && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span>💵</span>
                          <span>${restaurante.costo_envio}</span>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
