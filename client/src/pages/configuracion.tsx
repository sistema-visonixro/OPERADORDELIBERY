import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
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

export default function Configuracion() {
  const { toast } = useToast();

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
     

      <div className="mt-6 max-w-3xl">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Datos</h2>
                <p className="text-sm text-muted-foreground">
                  Información que aparece en facturas y documentos.
                </p>
              </div>
              <div>
                <Button onClick={() => setOpen(true)}>Editar</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{cfg?.nombre ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RTN</p>
                <p className="font-medium">{cfg?.rtn ?? "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p className="font-medium">{cfg?.direccion ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proyecto</p>
                <p className="font-medium">{cfg?.proyecto ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{cfg?.telefono ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clave</p>
                <p className="font-medium">{cfg?.clave ? "********" : "-"}</p>
              </div>
            </div>

            {cfg && cfg.updated_at && (
              <div className="text-sm text-muted-foreground mt-4">
                Última actualización: {formatDate(cfg.updated_at)}
              </div>
            )}
          </CardContent>
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
                  variant="secondary"
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
