import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Clock, MapPin, Phone, Key, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";

export default function Configuracion() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracion")
        .select("*")
        .limit(1);
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });

  const [nombre, setNombre] = useState("");
  const [rtn, setRtn] = useState("");
  const [direccion, setDireccion] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [clave, setClave] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cfg) {
      setNombre(cfg.nombre ?? "");
      setRtn(cfg.rtn ?? "");
      setDireccion(cfg.direccion ?? "");
      setProyecto(cfg.proyecto ?? "");
      setTelefono(cfg.telefono ?? "");
      setClave(cfg.clave ?? "");
    }
  }, [cfg]);

  async function onSave() {
    try {
      const payload = {
        nombre: nombre || null,
        rtn: rtn || null,
        direccion: direccion || null,
        proyecto: proyecto || null,
        telefono: telefono || null,
        clave: clave || null,
        updated_at: new Date().toISOString(),
      } as any;

      if (cfg && cfg.id) {
        const { error } = await supabase
          .from("configuracion")
          .update(payload)
          .eq("id", cfg.id);
        if (error) throw error;
        toast({ title: "Configuración guardada" });
      } else {
        // Insert new row (trigger in DB should prevent duplicates if table already has a row)
        const { error } = await supabase
          .from("configuracion")
          .insert([payload]);
        if (error) throw error;
        toast({ title: "Configuración creada" });
      }

      queryClient.invalidateQueries({ queryKey: ["configuracion"] });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error guardando configuración:", err);
      toast({
        title: "Error guardando configuración",
        description: err?.message ?? String(err),
      });
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="bg-gradient-to-br from-primary/10 to-secondary/10">
              <AvatarFallback>{(cfg?.nombre || "-").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold">Configuración</h1>
              <p className="text-sm text-muted-foreground">
                Ajustes generales y datos de la organización
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocation("/dispositivos")}
              className="gap-2"
            >
              <Smartphone className="w-4 h-4" />
              Dispositivos
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Datos</CardTitle>
            <CardDescription>
              Información que aparece en facturas y documentos.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between bg-muted/40 rounded-lg p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium text-lg">{cfg?.nombre ?? "-"}</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  RTN <div className="font-medium">{cfg?.rtn ?? "-"}</div>
                </div>
              </div>

              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Dirección
                </p>
                <p className="font-medium mt-1">{cfg?.direccion ?? "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Key className="w-4 h-4" /> Proyecto
                  </p>
                  <p className="font-medium mt-1">{cfg?.proyecto ?? "-"}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Teléfono
                  </p>
                  <p className="font-medium mt-1">{cfg?.telefono ?? "-"}</p>
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg bg-gradient-to-br from-white/60 to-muted/10 p-4 shadow-sm">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Última actualización
                </p>
                <p className="font-medium mt-1">
                  {cfg && cfg.updated_at ? formatDate(cfg.updated_at) : "-"}
                </p>
              </div>

              <div className="rounded-lg p-4 border border-border flex flex-col gap-2">
                <Button size="sm" onClick={() => setOpen(true)}>
                  <Edit className="w-4 h-4" />
                  Editar datos
                </Button>
              </div>
            </aside>
          </CardContent>

          {/* CardFooter removed: Reset button intentionally removed per request */}
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar configuración</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">RTN</label>
                <Input value={rtn} onChange={(e) => setRtn(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Dirección
                </label>
                <Textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Proyecto
                  </label>
                  <Input
                    value={proyecto}
                    onChange={(e) => setProyecto(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Teléfono
                  </label>
                  <Input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Clave</label>
                <Input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // reset to original
                    if (cfg) {
                      setNombre(cfg.nombre ?? "");
                      setRtn(cfg.rtn ?? "");
                      setDireccion(cfg.direccion ?? "");
                      setProyecto(cfg.proyecto ?? "");
                      setTelefono(cfg.telefono ?? "");
                      setClave(cfg.clave ?? "");
                    } else {
                      setNombre("");
                      setRtn("");
                      setDireccion("");
                      setProyecto("");
                      setTelefono("");
                      setClave("");
                    }
                    setOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await onSave();
                    setOpen(false);
                  }}
                >
                  Guardar
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
