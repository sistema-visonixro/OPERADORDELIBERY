import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function MiUsuario() {
  const { toast } = useToast();
  const usuarioId = typeof window !== "undefined" ? localStorage.getItem("restaurante_usuario_id") : null;

  const [nombre, setNombre] = useState("");
  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmClave, setConfirmClave] = useState("");
  const [loading, setLoading] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (!usuarioId) return;
        const { data, error } = await supabase
          .from("usuarios_restaurante")
          .select("nombre")
          .eq("id", usuarioId)
          .limit(1)
          .single();
        if (error) throw error;
        setNombre(data?.nombre || "");
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("Error cargando usuario:", err);
      }
    }
    load();
  }, [usuarioId]);

  async function onSave() {
    try {
      if (!usuarioId) {
        toast({ title: "Usuario no encontrado" });
        return;
      }
      if (nuevaClave && nuevaClave !== confirmClave) {
        toast({ title: "Las claves no coinciden" });
        return;
      }
      setLoading(true);
      const payload: any = { nombre: nombre || null, updated_at: new Date().toISOString() };
      if (nuevaClave) payload.clave = nuevaClave;

      const { error } = await supabase
        .from("usuarios_restaurante")
        .update(payload)
        .eq("id", usuarioId);
      if (error) throw error;
      toast({ title: "Datos actualizados" });
      setNuevaClave("");
      setConfirmClave("");
      setOpenEdit(false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error actualizando usuario:", err);
      toast({ title: "Error", description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Mi usuario</h1>

        <div className="bg-card p-6 rounded-lg">
          <div className="mb-4">
            <div className="text-xs text-muted-foreground">Nombre</div>
            <div className="font-medium text-lg">{nombre || '-'}</div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-muted-foreground">Usuario ID</div>
            <div className="font-medium text-sm">{usuarioId || '-'}</div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setOpenEdit(true)}>Actualizar datos</Button>
          </div>
        </div>

        {/* Modal de edición */}
        {openEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md text-black">
              <h2 className="text-xl font-semibold mb-4">Actualizar datos</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-muted-foreground">Nombre</label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground">Nueva contraseña</label>
                  <Input type="password" value={nuevaClave} onChange={(e) => setNuevaClave(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground">Confirmar contraseña</label>
                  <Input type="password" value={confirmClave} onChange={(e) => setConfirmClave(e.target.value)} />
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
                <Button onClick={onSave} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
