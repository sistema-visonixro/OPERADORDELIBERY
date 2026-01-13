import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function MisPlatillos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const restauranteId = typeof window !== "undefined" ? localStorage.getItem("restaurante_id") : null;

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState<string>("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: platillos, isLoading } = useQuery({
    queryKey: ["platillos", restauranteId],
    queryFn: async () => {
      if (!restauranteId) return [];
      const { data, error } = await supabase
        .from("platillos")
        .select("*")
        .eq("restaurante_id", restauranteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(restauranteId),
  });

  useEffect(() => {
    if (editing) {
      setNombre(editing.nombre || "");
      setDescripcion(editing.descripcion || "");
      setPrecio(editing.precio ? String(editing.precio) : "");
      setImagenUrl(editing.imagen_url || "");
    } else {
      setNombre("");
      setDescripcion("");
      setPrecio("");
      setImagenUrl("");
      setImageFile(null);
    }
  }, [editing]);

  async function handleSave() {
    try {
      if (!restauranteId) {
        toast({ title: "No hay restaurante asociado" });
        return;
      }
      setSaving(true);

      let publicUrl = imagenUrl || null;

      if (imageFile) {
        const ext = (imageFile.name.split(".").pop() || "").replace(/[^a-zA-Z0-9]/g, "");
        const filePath = `platos/${restauranteId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("platos").upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from("platos").getPublicUrl(filePath);
        publicUrl = (pub as any)?.publicUrl || null;
      }

      const payload: any = {
        restaurante_id: restauranteId,
        nombre: nombre || null,
        descripcion: descripcion || null,
        precio: precio ? Number(precio) : 0,
        imagen_url: publicUrl,
        updated_at: new Date().toISOString(),
      };

      if (editing && editing.id) {
        const { error } = await supabase.from("platillos").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Platillo actualizado" });
      } else {
        const { error } = await supabase.from("platillos").insert([payload]);
        if (error) throw error;
        toast({ title: "Platillo creado" });
      }

      queryClient.invalidateQueries({ queryKey: ["platillos", restauranteId] });
      setOpenForm(false);
      setEditing(null);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error guardando platillo:", err);
      toast({ title: "Error", description: err?.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar platillo?")) return;
    try {
      const { error } = await supabase.from("platillos").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Platillo eliminado" });
      queryClient.invalidateQueries({ queryKey: ["platillos", restauranteId] });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error eliminando platillo:", err);
      toast({ title: "Error eliminando", description: err?.message });
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Mis platillos</h1>
          <div>
            <Button onClick={() => { setEditing(null); setOpenForm(true); }}>Agregar platillo</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de platillos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Imagen</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Precio</th>
                    <th className="p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(platillos || []).map((p: any) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2 w-24">
                        {p.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagen_url} alt={p.nombre} className="h-16 w-16 object-cover rounded" />
                        ) : (
                          <div className="h-16 w-16 bg-muted flex items-center justify-center rounded text-sm">Sin imagen</div>
                        )}
                      </td>
                      <td className="p-2">{p.nombre}</td>
                      <td className="p-2">{p.precio}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { setEditing(p); setOpenForm(true); }}>Editar</Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)}>Eliminar</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {openForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg text-black">
              <h2 className="text-xl font-semibold mb-4">{editing ? 'Editar platillo' : 'Nuevo platillo'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm">Nombre</label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm">Descripción</label>
                  <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm">Precio</label>
                  <Input value={precio} onChange={(e) => setPrecio(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm">Imagen</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setOpenForm(false); setEditing(null); }}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
