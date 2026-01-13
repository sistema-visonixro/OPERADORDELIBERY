import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function MisDatosRestaurante() {
  const { toast } = useToast();
  const restauranteId = typeof window !== "undefined" ? localStorage.getItem("restaurante_id") : null;
  const restauranteUsuarioId = typeof window !== "undefined" ? localStorage.getItem("restaurante_usuario_id") : null;
  const [restId, setRestId] = useState<string | null>(restauranteId);
  const [openCreate, setOpenCreate] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const { data: rest, isLoading } = useQuery({
    queryKey: ["restaurante", restId],
    queryFn: async () => {
      if (!restId) return null;
      const { data, error } = await supabase
        .from("restaurantes")
        .select("*")
        .eq("id", restId)
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(restId),
  });

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [imagen_url, setImagenUrl] = useState("");

  useEffect(() => {
    if (rest) {
      setNombre(rest.nombre ?? "");
      setDescripcion(rest.descripcion ?? "");
      setTelefono(rest.telefono ?? "");
      setDireccion(rest.direccion ?? "");
      setImagenUrl(rest.imagen_url ?? "");
    }
  }, [rest]);

  async function onSave() {
    try {
      if (!restId) {
        toast({ title: "No hay restaurante asociado" });
        return;
      }

      const payload = {
        nombre: nombre || null,
        descripcion: descripcion || null,
        telefono: telefono || null,
        direccion: direccion || null,
        imagen_url: imagen_url || null,
        updated_at: new Date().toISOString(),
      } as any;

      const { error } = await supabase
        .from("restaurantes")
        .update(payload)
        .eq("id", restId);
      if (error) throw error;
      toast({ title: "Datos guardados" });
      setOpenEdit(false);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error guardando restaurante:", err);
      toast({ title: "Error guardando datos", description: err?.message });
    }
  }

  if (!restId) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto">
          <p className="mb-4">No hay restaurante asociado a la sesión.</p>
          <Button onClick={() => setOpenCreate(true)}>Crear restaurante</Button>

          {/* Dialog para crear restaurante */}
          {openCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-lg p-6 w-full max-w-lg text-black">
                <h2 className="text-xl font-semibold mb-4">Crear restaurante</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm">Nombre</label>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-sm">Descripción</label>
                    <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm">Teléfono</label>
                      <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm">Dirección</label>
                      <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm">Imagen (PNG/JPEG)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                      className="mt-1"
                    />
                    {imageUploading && <p className="text-sm text-muted-foreground">Subiendo imagen...</p>}
                  </div>
                </div>

                <div className="mt-4 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setOpenCreate(false); setImageFile(null); }}>Cancelar</Button>
                  <Button onClick={createRestaurante} disabled={creating}>{creating ? 'Creando...' : 'Crear restaurante'}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  async function createRestaurante() {
    try {
      if (!restauranteUsuarioId) {
        toast({ title: 'Usuario no asociado' });
        return;
      }
      setCreating(true);
      let imageUrl = null;

      if (imageFile) {
        setImageUploading(true);
        const ext = (imageFile.name.split('.').pop() || '').replace(/[^a-zA-Z0-9]/g, '');
        const filePath = `restaurantes/${restauranteUsuarioId}_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('Restaurantes')
          .upload(filePath, imageFile);
        setImageUploading(false);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('Restaurantes').getPublicUrl(filePath);
        imageUrl = (publicData as any)?.publicUrl || (publicData as any)?.public_url || null;
      }

      const payload: any = {
        nombre: nombre || null,
        descripcion: descripcion || null,
        telefono: telefono || null,
        direccion: direccion || null,
        imagen_url: imageUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newRest, error: insertError } = await supabase
        .from('restaurantes')
        .insert([payload])
        .select()
        .single();
      if (insertError) throw insertError;

      const newId = newRest.id;
      // asociar en usuarios_restaurante
      const { error: updErr } = await supabase
        .from('usuarios_restaurante')
        .update({ restaurante_id: newId })
        .eq('id', restauranteUsuarioId);
      if (updErr) throw updErr;

      localStorage.setItem('restaurante_id', newId);
      setRestId(newId);
      setOpenCreate(false);
      setImageFile(null);
      toast({ title: 'Restaurante creado' });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error creando restaurante:', err);
      toast({ title: 'Error creando restaurante', description: err?.message });
    } finally {
      setCreating(false);
      setImageUploading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center gap-6">
          <div className="w-full">
            <Card className="overflow-hidden">
              <div className="flex flex-col items-center p-6">
                <div className="w-48 h-48 rounded-md overflow-hidden bg-muted mb-4">
                  {imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagen_url} alt="Restaurante" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sin imagen</div>
                  )}
                </div>

                <h2 className="text-2xl font-semibold">{nombre || rest?.nombre || '-'}</h2>
                <p className="text-sm text-muted-foreground mt-2 text-center">{descripcion || rest?.descripcion || '-'}</p>

                <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/10 p-3 rounded">
                    <div className="text-xs text-muted-foreground">Teléfono</div>
                    <div className="font-medium">{telefono || rest?.telefono || '-'}</div>
                  </div>
                  <div className="bg-muted/10 p-3 rounded">
                    <div className="text-xs text-muted-foreground">Dirección</div>
                    <div className="font-medium">{direccion || rest?.direccion || '-'}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button onClick={() => setOpenEdit(true)}>Actualizar</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Modal de edición */}
        {openEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg text-black">
              <h2 className="text-xl font-semibold mb-4">Editar restaurante</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm">Nombre</label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm">Descripción</label>
                  <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm">Teléfono</label>
                    <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm">Dirección</label>
                    <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm">Imagen URL</label>
                  <Input value={imagen_url} onChange={(e) => setImagenUrl(e.target.value)} />
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
                <Button onClick={onSave}>Guardar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
