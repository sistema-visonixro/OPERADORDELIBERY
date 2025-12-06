import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatDate } from "@/lib/utils";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/use-clientes";
import { mockClients } from "@/lib/mockData";
import { queryClient } from "@/lib/queryClient";

type Cliente = {
  id: string;
  nombre: string;
  telefono?: string | null;
  rtn?: string | null;
  oficio?: string | null;
  created_at?: string | null;
};

export default function Clients() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const {
    clientes,
    isLoading,
    createCliente,
    updateCliente,
    deleteCliente,
    createClienteAsync,
    updateClienteAsync,
    deleteClienteAsync,
  } = useClientes();

  const [localMock, setLocalMock] = useState<Cliente[] | null>(null);
  const [debugResult, setDebugResult] = useState<any>(null);

  const form = useForm<Partial<Cliente>>({
    defaultValues: { nombre: "", telefono: "", rtn: "", oficio: "" },
  });

  const sanitizeValues = (vals: Partial<Cliente> | null) => ({
    nombre: vals?.nombre?.toString().trim() ?? "",
    telefono: vals?.telefono?.toString().trim() ?? "",
    rtn: vals?.rtn?.toString().trim() ?? "",
    oficio: vals?.oficio?.toString().trim() ?? "",
  });
  const onSubmit = async (values: Partial<Cliente>) => {
    try {
      if (editing) {
        await updateClienteAsync({ ...(values as any), id: editing.id });
      } else {
        await createClienteAsync(values);
      }
      setDialogOpen(false);
      setEditing(null);
      form.reset();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error saving cliente:", e);
    }
  };

  const startEdit = (c: Cliente) => {
    setEditing(c);
    form.reset(sanitizeValues(c));
    setDialogOpen(true);
  };

  // States for clave confirmation before edit/delete
  const [claveOpen, setClaveOpen] = useState(false);
  const [claveValue, setClaveValue] = useState("");
  const [pendingEditCliente, setPendingEditCliente] = useState<Cliente | null>(
    null
  );
  const [pendingDeleteClienteId, setPendingDeleteClienteId] = useState<
    string | null
  >(null);
  const [claveLoading, setClaveLoading] = useState(false);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            form.reset(sanitizeValues(null));
            setDialogOpen(true);
          }}
        >
          Agregar Cliente
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o RTN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div>
        {isLoading ? (
          <p>Cargando...</p>
        ) : (clientes && clientes.length > 0) ||
          (localMock && localMock.length > 0) ? (
          <div className="space-y-3">
            {(localMock ?? clientes)
              .filter((c) => {
                if (!searchQuery) return true;
                const search = searchQuery.toLowerCase();
                const nombre = (c.nombre || "").toLowerCase();
                const telefono = (c.telefono || "").toLowerCase();
                const rtn = (c.rtn || "").toLowerCase();
                return nombre.includes(search) || telefono.includes(search) || rtn.includes(search);
              })
              .map((c) => (
              <Card
                key={c.id}
                className="hover-elevate shadow-sm cursor-pointer transition-all"
                onClick={() => setLocation(`/clientes/${c.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(c.nombre || "?")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      <div className="min-w-0">
                        <div className="font-semibold text-base truncate">
                          {c.nombre}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {c.oficio ?? "-"}
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                          Teléfono
                        </div>
                        <a
                          className="text-foreground hover:underline"
                          href={`tel:${c.telefono ?? ""}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.telefono ?? "-"}
                        </a>
                      </div>

                      <div className="text-sm">
                        <div className="text-xs uppercase font-medium text-muted-foreground mb-1">
                          RTN
                        </div>
                        <div className="truncate">{c.rtn ?? "-"}</div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <div className="text-xs text-muted-foreground hidden sm:block">
                          {c.created_at ? formatDate(c.created_at) : null}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingEditCliente(c);
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
                            setPendingDeleteClienteId(c.id);
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
        ) : (
          <div className="space-y-3">
            <p>No hay clientes.</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // map mockClients shape to Cliente
                  const mapped = mockClients.map((m: any) => ({
                    id: m.id,
                    nombre: m.name || m.nombre || "",
                    telefono: m.phone || m.telefono || null,
                    rtn: m.rtn ?? null,
                    oficio: m.oficio ?? null,
                    created_at:
                      (m.createdAt || m.created_at)?.toString?.() ?? null,
                  }));
                  setLocalMock(mapped);
                  toast({ title: "Cargando ejemplo local" });
                }}
              >
                Cargar ejemplo
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    const res = await (await import("@/lib/supabase")).supabase
                      .from("clientes")
                      .select("*");
                    setDebugResult(res);
                  } catch (e) {
                    setDebugResult(e);
                  }
                }}
              >
                Comprobar Supabase
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["clientes"] });
                  toast({ title: "Refrescando clientes" });
                }}
              >
                Refrescar
              </Button>
            </div>
            {debugResult && (
              <pre className="mt-2 text-xs max-h-40 overflow-auto bg-surface p-2 rounded">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) {
            setEditing(null);
            form.reset(sanitizeValues(null));
          } else {
            // If dialog opened and editing is set, ensure form is populated and sanitized
            if (editing) form.reset(sanitizeValues(editing));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Cliente" : "Nuevo Cliente"}
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
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...form.register("telefono")} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>RTN</FormLabel>
                <FormControl>
                  <Input {...form.register("rtn")} />
                </FormControl>
              </FormItem>
              <FormItem>
                <FormLabel>Oficio</FormLabel>
                <FormControl>
                  <Input {...form.register("oficio")} />
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

      {/* Dialogo para pedir clave antes de editar/eliminar cliente */}
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
                  setPendingEditCliente(null);
                  setPendingDeleteClienteId(null);
                  setClaveValue("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setClaveLoading(true);
                    const { data, error } = await (
                      await import("@/lib/supabase")
                    ).supabase
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

                    // If editing was requested, proceed to open edit dialog
                    if (pendingEditCliente) {
                      startEdit(pendingEditCliente);
                    }

                    // If deletion requested, call delete
                    if (pendingDeleteClienteId) {
                      // call delete mutation (async variant) from hook
                      if (deleteClienteAsync) {
                        await deleteClienteAsync(pendingDeleteClienteId);
                      } else {
                        // fallback to non-async mutate
                        deleteCliente(pendingDeleteClienteId);
                      }
                    }

                    setClaveOpen(false);
                    setPendingEditCliente(null);
                    setPendingDeleteClienteId(null);
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
