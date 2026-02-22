import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import LocationPicker from "@/components/location-picker";

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
  precio_extra_por_km?: number | null;
  distancia_minima_km?: number | null;
  emoji?: string | null;
  color_tema?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

export default function Restaurantes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [estadoFilter, setEstadoFilter] = useState<
    "todos" | "activo" | "inactivo"
  >("todos");
  const [isCreatingRestaurante, setIsCreatingRestaurante] = useState(false);
  const [nuevoRestauranteForm, setNuevoRestauranteForm] = useState<
    Partial<Restaurante>
  >({
    nombre: "",
    descripcion: "",
    imagen_url: null,
    direccion: "",
    telefono: "",
    calificacion: 0,
    tiempo_entrega_min: 30,
    costo_envio: 0,
    precio_extra_por_km: 0,
    distancia_minima_km: 0,
    emoji: "🍽️",
    activo: true,
    color_tema: "#ff6b6b",
    latitud: null,
    longitud: null,
  });

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

  // Función para resetear el formulario
  const resetNuevoRestauranteForm = () => {
    setNuevoRestauranteForm({
      nombre: "",
      descripcion: "",
      imagen_url: null,
      direccion: "",
      telefono: "",
      calificacion: 0,
      tiempo_entrega_min: 30,
      costo_envio: 0,
      precio_extra_por_km: 0,
      distancia_minima_km: 0,
      emoji: "🍽️",
      activo: true,
      color_tema: "#ff6b6b",
      latitud: null,
      longitud: null,
    });
  };

  // Mutación para crear restaurante
  const createRestauranteMutation = useMutation({
    mutationFn: async (data: Partial<Restaurante>) => {
      const insertData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log("Creando restaurante en Supabase:", insertData);
      const { data: result, error } = await supabase
        .from("restaurantes")
        .insert(insertData)
        .select();

      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }

      console.log("Respuesta de Supabase:", result);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["restaurantes"] });
      toast({ title: "Restaurante creado correctamente" });
      setIsCreatingRestaurante(false);
      resetNuevoRestauranteForm();
      // Navegar al detalle del nuevo restaurante
      if (result && result[0]) {
        setLocation(`/restaurante-detalle/${result[0].id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear restaurante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Restaurantes</h1>
        <Dialog
          open={isCreatingRestaurante}
          onOpenChange={(open) => {
            if (!open) {
              resetNuevoRestauranteForm();
            }
            setIsCreatingRestaurante(open);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear Restaurante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Restaurante</DialogTitle>
              <DialogDescription>
                Modifica la información del restaurante
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nuevoRestauranteForm.nombre || ""}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      nombre: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={nuevoRestauranteForm.descripcion || ""}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      descripcion: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <ImageUpload
                currentImageUrl={nuevoRestauranteForm.imagen_url}
                bucketName="Restaurantes"
                onImageUploaded={(url) =>
                  setNuevoRestauranteForm({
                    ...nuevoRestauranteForm,
                    imagen_url: url,
                  })
                }
                onImageRemoved={() =>
                  setNuevoRestauranteForm({
                    ...nuevoRestauranteForm,
                    imagen_url: null,
                  })
                }
                label="Imagen del restaurante"
                entityId="nuevo"
              />

              <div className="grid gap-2">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={nuevoRestauranteForm.emoji || ""}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      emoji: e.target.value,
                    })
                  }
                  placeholder="🍽️"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={nuevoRestauranteForm.direccion || ""}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      direccion: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={nuevoRestauranteForm.telefono || ""}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      telefono: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="calificacion">Calificación</Label>
                  <Input
                    id="calificacion"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={nuevoRestauranteForm.calificacion || 0}
                    onChange={(e) =>
                      setNuevoRestauranteForm({
                        ...nuevoRestauranteForm,
                        calificacion: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tiempo_entrega_min">
                    Tiempo entrega (min)
                  </Label>
                  <Input
                    id="tiempo_entrega_min"
                    type="number"
                    min="0"
                    value={nuevoRestauranteForm.tiempo_entrega_min || 0}
                    onChange={(e) =>
                      setNuevoRestauranteForm({
                        ...nuevoRestauranteForm,
                        tiempo_entrega_min: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="costo_envio">Costo de envío</Label>
                <Input
                  id="costo_envio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoRestauranteForm.costo_envio || 0}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      costo_envio: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="precio_extra_por_km">Precio extra por km</Label>
                <Input
                  id="precio_extra_por_km"
                  type="number"
                  step="0.01"
                  min="0"
                  value={nuevoRestauranteForm.precio_extra_por_km || 0}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      precio_extra_por_km: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="distancia_minima_km">
                  Distancia mínima (km)
                </Label>
                <Input
                  id="distancia_minima_km"
                  type="number"
                  step="0.1"
                  min="0"
                  value={nuevoRestauranteForm.distancia_minima_km || 0}
                  onChange={(e) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      distancia_minima_km: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="color_tema">Color tema</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="color_tema"
                    type="color"
                    value={nuevoRestauranteForm.color_tema || "#ff6b6b"}
                    onChange={(e) =>
                      setNuevoRestauranteForm({
                        ...nuevoRestauranteForm,
                        color_tema: e.target.value,
                      })
                    }
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={nuevoRestauranteForm.color_tema || ""}
                    onChange={(e) =>
                      setNuevoRestauranteForm({
                        ...nuevoRestauranteForm,
                        color_tema: e.target.value,
                      })
                    }
                    placeholder="#ff6b6b"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={nuevoRestauranteForm.activo ?? true}
                  onCheckedChange={(checked) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      activo: checked,
                    })
                  }
                />
                <Label htmlFor="activo">Restaurante activo</Label>
              </div>

              {/* Selector de ubicación */}
              <div className="col-span-2">
                <LocationPicker
                  latitude={nuevoRestauranteForm.latitud}
                  longitude={nuevoRestauranteForm.longitud}
                  onLocationChange={(lat, lng) =>
                    setNuevoRestauranteForm({
                      ...nuevoRestauranteForm,
                      latitud: lat,
                      longitud: lng,
                    })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreatingRestaurante(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  console.log("Creando restaurante:", nuevoRestauranteForm);
                  createRestauranteMutation.mutate(nuevoRestauranteForm);
                }}
                disabled={createRestauranteMutation.isPending}
              >
                {createRestauranteMutation.isPending
                  ? "Creando..."
                  : "Crear Restaurante"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
