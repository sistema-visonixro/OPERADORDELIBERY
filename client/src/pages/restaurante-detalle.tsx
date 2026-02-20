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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";
import ImageUpload from "@/components/image-upload";
import LocationPicker from "@/components/location-picker";

type Restaurante = {
  id: string;
  nombre: string;
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
  activo?: boolean | null;
  color_tema?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

type Platillo = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  precio: number;
  descuento_porcentaje?: number | null;
  disponible?: boolean | null;
  tiempo_preparacion?: number | null;
  calorias?: number | null;
  es_vegetariano?: boolean | null;
  es_picante?: boolean | null;
  categoria_tipo?: string | null;
};

export default function RestauranteDetalle() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const restauranteId = params.id as string;

  const [isEditingRestaurante, setIsEditingRestaurante] = useState(false);
  const [isAddingPlatillo, setIsAddingPlatillo] = useState(false);
  const [editingPlatillo, setEditingPlatillo] = useState<Platillo | null>(null);

  // Formulario del restaurante
  const [restauranteForm, setRestauranteForm] = useState<Partial<Restaurante>>(
    {},
  );

  // Formulario del platillo
  const [platilloForm, setPlatilloForm] = useState<Partial<Platillo>>({
    nombre: "",
    descripcion: "",
    imagen_url: "",
    precio: 0,
    descuento_porcentaje: 0,
    disponible: true,
    tiempo_preparacion: 15,
    calorias: 0,
    es_vegetariano: false,
    es_picante: false,
    categoria_tipo: "comida",
  });

  // Obtener datos del restaurante
  const { data: restaurante, isLoading: loadingRestaurante } = useQuery({
    queryKey: ["restaurante", restauranteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurantes")
        .select("*")
        .eq("id", restauranteId)
        .single();
      if (error) throw error;
      return data as Restaurante;
    },
  });

  // Actualizar el formulario cuando cambie el restaurante
  React.useEffect(() => {
    if (restaurante) {
      setRestauranteForm(restaurante);
    }
  }, [restaurante]);

  // Obtener platillos del restaurante
  const { data: platillos, isLoading: loadingPlatillos } = useQuery({
    queryKey: ["platillos", restauranteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platillos")
        .select("*")
        .eq("restaurante_id", restauranteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Platillo[];
    },
  });

  // Actualizar restaurante
  const updateRestauranteMutation = useMutation({
    mutationFn: async (data: Partial<Restaurante>) => {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };
      console.log("Enviando actualización a Supabase:", updateData);
      const { data: result, error } = await supabase
        .from("restaurantes")
        .update(updateData)
        .eq("id", restauranteId)
        .select();

      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }

      console.log("Respuesta de Supabase:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["restaurante", restauranteId],
      });
      queryClient.invalidateQueries({ queryKey: ["restaurantes"] });
      toast({ title: "Restaurante actualizado correctamente" });
      setIsEditingRestaurante(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar restaurante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Crear platillo
  const createPlatilloMutation = useMutation({
    mutationFn: async (data: Partial<Platillo>) => {
      const { error } = await supabase
        .from("platillos")
        .insert({ ...data, restaurante_id: restauranteId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platillos", restauranteId] });
      toast({ title: "Platillo agregado correctamente" });
      setIsAddingPlatillo(false);
      resetPlatilloForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error al agregar platillo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actualizar platillo
  const updatePlatilloMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Platillo>;
    }) => {
      const { error } = await supabase
        .from("platillos")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platillos", restauranteId] });
      toast({ title: "Platillo actualizado correctamente" });
      setEditingPlatillo(null);
      resetPlatilloForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar platillo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Eliminar platillo
  const deletePlatilloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platillos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platillos", restauranteId] });
      toast({ title: "Platillo eliminado correctamente" });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar platillo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPlatilloForm = () => {
    setPlatilloForm({
      nombre: "",
      descripcion: "",
      imagen_url: "",
      precio: 0,
      descuento_porcentaje: 0,
      disponible: true,
      tiempo_preparacion: 15,
      calorias: 0,
      es_vegetariano: false,
      es_picante: false,
      categoria_tipo: "comida",
    });
  };

  const handleEditPlatillo = (platillo: Platillo) => {
    setEditingPlatillo(platillo);
    setPlatilloForm(platillo);
  };

  if (loadingRestaurante) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!restaurante) {
    return <div className="p-6">Restaurante no encontrado</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/restaurantes")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a restaurantes
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{restaurante.nombre}</h1>
            <Badge variant={restaurante.activo ? "default" : "destructive"}>
              {restaurante.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Dialog
              open={isEditingRestaurante}
              onOpenChange={(open) => {
                if (open && restaurante) {
                  // Reinicializar formulario con datos actuales al abrir
                  setRestauranteForm(restaurante);
                }
                setIsEditingRestaurante(open);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Restaurante
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Restaurante</DialogTitle>
                  <DialogDescription>
                    Modifica la información del restaurante
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={restauranteForm.nombre || ""}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
                          nombre: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={restauranteForm.descripcion || ""}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
                          descripcion: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <ImageUpload
                    currentImageUrl={restauranteForm.imagen_url}
                    bucketName="Restaurantes"
                    onImageUploaded={(url) =>
                      setRestauranteForm({
                        ...restauranteForm,
                        imagen_url: url,
                      })
                    }
                    onImageRemoved={() =>
                      setRestauranteForm({
                        ...restauranteForm,
                        imagen_url: null,
                      })
                    }
                    label="Imagen del restaurante"
                    entityId={restauranteId}
                  />

                  <div className="grid gap-2">
                    <Label htmlFor="emoji">Emoji</Label>
                    <Input
                      id="emoji"
                      value={restauranteForm.emoji || ""}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
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
                      value={restauranteForm.direccion || ""}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
                          direccion: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={restauranteForm.telefono || ""}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
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
                        value={restauranteForm.calificacion || 0}
                        onChange={(e) =>
                          setRestauranteForm({
                            ...restauranteForm,
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
                        value={restauranteForm.tiempo_entrega_min || 0}
                        onChange={(e) =>
                          setRestauranteForm({
                            ...restauranteForm,
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
                      value={restauranteForm.costo_envio || 0}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
                          costo_envio: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="precio_extra_por_km">
                      Precio extra por km
                    </Label>
                    <Input
                      id="precio_extra_por_km"
                      type="number"
                      step="0.01"
                      min="0"
                      value={restauranteForm.precio_extra_por_km || 0}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
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
                      value={restauranteForm.distancia_minima_km || 0}
                      onChange={(e) =>
                        setRestauranteForm({
                          ...restauranteForm,
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
                        value={restauranteForm.color_tema || "#ff6b6b"}
                        onChange={(e) =>
                          setRestauranteForm({
                            ...restauranteForm,
                            color_tema: e.target.value,
                          })
                        }
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={restauranteForm.color_tema || ""}
                        onChange={(e) =>
                          setRestauranteForm({
                            ...restauranteForm,
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
                      checked={restauranteForm.activo ?? true}
                      onCheckedChange={(checked) =>
                        setRestauranteForm({
                          ...restauranteForm,
                          activo: checked,
                        })
                      }
                    />
                    <Label htmlFor="activo">Restaurante activo</Label>
                  </div>

                  {/* Selector de ubicación */}
                  <div className="col-span-2">
                    <LocationPicker
                      latitude={restauranteForm.latitud}
                      longitude={restauranteForm.longitud}
                      onLocationChange={(lat, lng) =>
                        setRestauranteForm({
                          ...restauranteForm,
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
                    onClick={() => setIsEditingRestaurante(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      console.log("Guardando restaurante:", restauranteForm);
                      updateRestauranteMutation.mutate(restauranteForm);
                    }}
                    disabled={updateRestauranteMutation.isPending}
                  >
                    {updateRestauranteMutation.isPending
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Información del restaurante */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              {restaurante.imagen_url ? (
                <img
                  src={restaurante.imagen_url}
                  alt={restaurante.nombre}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-9xl">{restaurante.emoji || "🍽️"}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {restaurante.descripcion && (
                <div>
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <p className="text-muted-foreground">
                    {restaurante.descripcion}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {restaurante.direccion && (
                  <div>
                    <h3 className="font-semibold mb-1">Dirección</h3>
                    <p className="text-sm text-muted-foreground">
                      {restaurante.direccion}
                    </p>
                  </div>
                )}

                {restaurante.telefono && (
                  <div>
                    <h3 className="font-semibold mb-1">Teléfono</h3>
                    <p className="text-sm text-muted-foreground">
                      {restaurante.telefono}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-1">Calificación</h3>
                  <p className="text-sm text-muted-foreground">
                    ⭐ {restaurante.calificacion?.toFixed(1) || "N/A"}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1">Tiempo de entrega</h3>
                  <p className="text-sm text-muted-foreground">
                    {restaurante.tiempo_entrega_min || "N/A"} min
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-1">Costo de envío</h3>
                  <p className="text-sm text-muted-foreground">
                    ${restaurante.costo_envio || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de platillos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Platillos</h2>
          <Dialog
            open={isAddingPlatillo || editingPlatillo !== null}
            onOpenChange={(open) => {
              if (!open) {
                setIsAddingPlatillo(false);
                setEditingPlatillo(null);
                resetPlatilloForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddingPlatillo(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Platillo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlatillo ? "Editar Platillo" : "Agregar Platillo"}
                </DialogTitle>
                <DialogDescription>
                  {editingPlatillo
                    ? "Modifica la información del platillo"
                    : "Agrega un nuevo platillo al menú"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="platillo_nombre">Nombre</Label>
                  <Input
                    id="platillo_nombre"
                    value={platilloForm.nombre || ""}
                    onChange={(e) =>
                      setPlatilloForm({
                        ...platilloForm,
                        nombre: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="platillo_descripcion">Descripción</Label>
                  <Textarea
                    id="platillo_descripcion"
                    value={platilloForm.descripcion || ""}
                    onChange={(e) =>
                      setPlatilloForm({
                        ...platilloForm,
                        descripcion: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <ImageUpload
                  currentImageUrl={platilloForm.imagen_url}
                  bucketName="platos"
                  onImageUploaded={(url) =>
                    setPlatilloForm({ ...platilloForm, imagen_url: url })
                  }
                  onImageRemoved={() =>
                    setPlatilloForm({ ...platilloForm, imagen_url: null })
                  }
                  label="Imagen del platillo"
                  entityId={editingPlatillo?.id || restauranteId}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="platillo_precio">Precio</Label>
                    <Input
                      id="platillo_precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={platilloForm.precio || 0}
                      onChange={(e) =>
                        setPlatilloForm({
                          ...platilloForm,
                          precio: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="platillo_descuento">Descuento (%)</Label>
                    <Input
                      id="platillo_descuento"
                      type="number"
                      min="0"
                      max="100"
                      value={platilloForm.descuento_porcentaje || 0}
                      onChange={(e) =>
                        setPlatilloForm({
                          ...platilloForm,
                          descuento_porcentaje: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="platillo_tiempo">
                      Tiempo preparación (min)
                    </Label>
                    <Input
                      id="platillo_tiempo"
                      type="number"
                      min="0"
                      value={platilloForm.tiempo_preparacion || 0}
                      onChange={(e) =>
                        setPlatilloForm({
                          ...platilloForm,
                          tiempo_preparacion: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="platillo_calorias">Calorías</Label>
                    <Input
                      id="platillo_calorias"
                      type="number"
                      min="0"
                      value={platilloForm.calorias || 0}
                      onChange={(e) =>
                        setPlatilloForm({
                          ...platilloForm,
                          calorias: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="platillo_tipo">Tipo de categoría</Label>
                  <select
                    id="platillo_tipo"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={platilloForm.categoria_tipo || "comida"}
                    onChange={(e) =>
                      setPlatilloForm({
                        ...platilloForm,
                        categoria_tipo: e.target.value,
                      })
                    }
                  >
                    <option value="comida">Comida</option>
                    <option value="bebida">Bebida</option>
                    <option value="postre">Postre</option>
                    <option value="mandadito">Mandadito</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="platillo_disponible"
                      checked={platilloForm.disponible ?? true}
                      onCheckedChange={(checked) =>
                        setPlatilloForm({
                          ...platilloForm,
                          disponible: checked,
                        })
                      }
                    />
                    <Label htmlFor="platillo_disponible">Disponible</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="platillo_vegetariano"
                      checked={platilloForm.es_vegetariano ?? false}
                      onCheckedChange={(checked) =>
                        setPlatilloForm({
                          ...platilloForm,
                          es_vegetariano: checked,
                        })
                      }
                    />
                    <Label htmlFor="platillo_vegetariano">Vegetariano</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="platillo_picante"
                      checked={platilloForm.es_picante ?? false}
                      onCheckedChange={(checked) =>
                        setPlatilloForm({
                          ...platilloForm,
                          es_picante: checked,
                        })
                      }
                    />
                    <Label htmlFor="platillo_picante">Picante</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingPlatillo(false);
                    setEditingPlatillo(null);
                    resetPlatilloForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (editingPlatillo) {
                      updatePlatilloMutation.mutate({
                        id: editingPlatillo.id,
                        data: platilloForm,
                      });
                    } else {
                      createPlatilloMutation.mutate(platilloForm);
                    }
                  }}
                >
                  {editingPlatillo ? "Guardar cambios" : "Agregar platillo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loadingPlatillos ? (
          <p>Cargando platillos...</p>
        ) : platillos && platillos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platillos.map((platillo) => (
              <Card key={platillo.id}>
                {platillo.imagen_url ? (
                  <div className="h-48 w-full overflow-hidden rounded-t-lg">
                    <img
                      src={platillo.imagen_url}
                      alt={platillo.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center rounded-t-lg">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">
                      {platillo.nombre}
                    </CardTitle>
                    <Badge
                      variant={platillo.disponible ? "default" : "secondary"}
                    >
                      {platillo.disponible ? "Disponible" : "No disponible"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {platillo.descripcion && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {platillo.descripcion}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">
                        ${platillo.precio}
                      </span>
                      {platillo.descuento_porcentaje &&
                        platillo.descuento_porcentaje > 0 && (
                          <Badge variant="destructive">
                            -{platillo.descuento_porcentaje}%
                          </Badge>
                        )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {platillo.es_vegetariano && (
                        <Badge variant="outline">🌱 Vegetariano</Badge>
                      )}
                      {platillo.es_picante && (
                        <Badge variant="outline">🌶️ Picante</Badge>
                      )}
                      {platillo.categoria_tipo && (
                        <Badge variant="outline">
                          {platillo.categoria_tipo}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      {platillo.tiempo_preparacion && (
                        <span>🕐 {platillo.tiempo_preparacion} min</span>
                      )}
                      {platillo.calorias && (
                        <span>🔥 {platillo.calorias} cal</span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPlatillo(platillo);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              ¿Eliminar platillo?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará el
                              platillo "{platillo.nombre}" permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deletePlatilloMutation.mutate(platillo.id)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>
                No hay platillos registrados. Agrega el primer platillo del
                menú.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
