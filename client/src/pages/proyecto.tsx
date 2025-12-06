import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

type ProyectoRow = {
  id: string;
  creacion?: string | null;
  nombre?: string | null;
  tipo?: string | null;
  correo_administracion?: string | null;
  contrasena?: string | null;
};

export default function Proyecto() {
  const [proyectos, setProyectos] = useState<ProyectoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProyectoRow | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<Partial<ProyectoRow>>({
    defaultValues: {
      nombre: "",
      tipo: "",
      correo_administracion: "",
      contrasena: "",
    },
  });

  const sanitizeValues = (vals: Partial<ProyectoRow> | null) => ({
    nombre: vals?.nombre?.toString().trim() ?? "",
    tipo: vals?.tipo?.toString().trim() ?? "",
    correo_administracion: vals?.correo_administracion?.toString().trim() ?? "",
    contrasena: vals?.contrasena?.toString().trim() ?? "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from<ProyectoRow>("proyectos")
      .select("*")
      .order("creacion", { ascending: false });

    if (e) {
      setError(e.message ?? "Error al cargar proyectos");
      setProyectos([]);
    } else if (Array.isArray(data)) {
      setProyectos(data);
    } else {
      setProyectos([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: Partial<ProyectoRow>) => {
    try {
      if (editing) {
        const { error: e } = await supabase
          .from("proyectos")
          .update({
            nombre: values.nombre,
            tipo: values.tipo,
            correo_administracion: values.correo_administracion,
            contrasena: values.contrasena,
          })
          .eq("id", editing.id)
          .select();
        if (e) throw e;
        toast({ title: "Proyecto actualizado" });
      } else {
        const { error: e } = await supabase.from("proyectos").insert([
          {
            nombre: values.nombre,
            tipo: values.tipo,
            correo_administracion: values.correo_administracion,
            contrasena: values.contrasena,
          },
        ]);
        if (e) throw e;
        toast({ title: "Proyecto creado" });
      }
      setDialogOpen(false);
      setEditing(null);
      form.reset();
      await load();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error guardando proyecto:", err);
      toast({
        title: "Error al guardar proyecto",
        description: err?.message ?? String(err),
      });
    }
  };

  const startEdit = (p: ProyectoRow) => {
    setEditing(p);
    form.reset(sanitizeValues(p));
    setDialogOpen(true);
  };

  // Clave confirmation state for edit/delete
  const [claveOpen, setClaveOpen] = useState(false);
  const [claveValue, setClaveValue] = useState("");
  const [pendingEditProyecto, setPendingEditProyecto] =
    useState<ProyectoRow | null>(null);
  const [pendingDeleteProyectoId, setPendingDeleteProyectoId] = useState<
    string | null
  >(null);
  const [claveLoading, setClaveLoading] = useState(false);

  const deleteProject = async (id: string) => {
    try {
      const { error: e } = await supabase
        .from("proyectos")
        .delete()
        .eq("id", id);
      if (e) throw e;
      toast({ title: "Proyecto eliminado" });
      await load();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error eliminando proyecto:", err);
      toast({
        title: "Error al eliminar proyecto",
        description: err?.message ?? String(err),
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Proyectos</h1>
          <p className="text-muted-foreground mt-1">
            Lista de proyectos. Los datos provienen de la tabla{" "}
            <code>proyectos</code> en Supabase.
          </p>
        </div>
        <div>
          <Button
            onClick={() => {
              setEditing(null);
              form.reset(sanitizeValues(null));
              setDialogOpen(true);
            }}
          >
            Crear Proyecto
          </Button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o tipo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div>
        {loading && <p>Cargando proyectos...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && proyectos.length === 0 && !error && (
          <Card>
            <CardContent className="p-6">No hay proyectos todavía.</CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {proyectos
            .filter((p) => {
              if (!searchQuery) return true;
              const search = searchQuery.toLowerCase();
              const nombre = (p.nombre || "").toLowerCase();
              const tipo = (p.tipo || "").toLowerCase();
              return nombre.includes(search) || tipo.includes(search);
            })
            .map((p) => (
            <Card
              key={p.id}
              className="hover-elevate shadow-sm cursor-pointer transition-all"
              onClick={() => setLocation(`/clientes/proyecto/${p.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                    <div className="min-w-0 sm:col-span-2">
                      <h3 className="text-lg font-semibold truncate">
                        {p.nombre ?? "Sin nombre"}
                      </h3>
                      <Badge variant="secondary" className="mt-1">{p.tipo ?? "—"}</Badge>
                    </div>
                    
                    <div className="text-sm min-w-0">
                      <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                        Admin
                      </div>
                      <div className="truncate">{p.correo_administracion ?? "—"}</div>
                    </div>

                    <div className="text-sm min-w-0">
                      <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                        Contraseña
                      </div>
                      <div className="truncate font-mono">{p.contrasena ? "********" : "—"}</div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        {p.creacion
                          ? new Date(p.creacion).toLocaleDateString()
                          : "—"}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingEditProyecto(p);
                          setClaveValue("");
                          setClaveOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteProyectoId(p.id);
                          setClaveValue("");
                          setClaveOpen(true);
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) {
            setEditing(null);
            form.reset(sanitizeValues(null));
          } else {
            if (editing) form.reset(sanitizeValues(editing));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Proyecto" : "Nuevo Proyecto"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...form.register("nombre", { required: true })} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <Input {...form.register("tipo")} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Correo administración</FormLabel>
                <FormControl>
                  <Input {...form.register("correo_administracion")} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input {...form.register("contrasena")} />
                </FormControl>
              </FormItem>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">{editing ? "Guardar" : "Crear"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialogo para pedir clave antes de editar/eliminar proyecto */}
      <Dialog open={claveOpen} onOpenChange={(v) => setClaveOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-blue-600 dark:text-blue-400">Confirmar acción</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-muted-foreground">
              Ingresa la clave de acceso para continuar
            </p>
            <label className="block text-sm font-medium">Clave</label>
            <input
              type="password"
              value={claveValue}
              onChange={(e) => setClaveValue(e.target.value)}
              className="block w-full rounded-md border p-2 text-blue-600 dark:text-blue-400"
            />
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setClaveOpen(false);
                  setPendingEditProyecto(null);
                  setPendingDeleteProyectoId(null);
                  setClaveValue("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setClaveLoading(true);
                    const { data, error } = await supabase
                      .from("configuracion")
                      .select("clave")
                      .limit(1)
                      .single();
                    if (error) throw error;
                    const stored = data?.clave ?? null;
                    if (!stored) {
                      toast({ title: "No hay clave configurada" });
                      return;
                    }
                    if (claveValue !== stored) {
                      toast({ title: "Clave incorrecta" });
                      return;
                    }

                    if (pendingEditProyecto) {
                      startEdit(pendingEditProyecto);
                    }
                    if (pendingDeleteProyectoId) {
                      await deleteProject(pendingDeleteProyectoId);
                    }

                    setClaveOpen(false);
                    setPendingEditProyecto(null);
                    setPendingDeleteProyectoId(null);
                    setClaveValue("");
                  } catch (err: any) {
                    // eslint-disable-next-line no-console
                    console.error("Error verificando clave:", err);
                    toast({
                      title: "Error verificando clave",
                      description: err?.message ?? String(err),
                    });
                  } finally {
                    setClaveLoading(false);
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
