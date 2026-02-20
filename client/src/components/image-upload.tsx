import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  bucketName: "platos" | "Restaurantes";
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  label?: string;
  entityId?: string;
}

export default function ImageUpload({
  currentImageUrl,
  bucketName,
  onImageUploaded,
  onImageRemoved,
  label = "Imagen",
  entityId,
}: ImageUploadProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl || null,
  );
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 5 MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageFile) {
      toast({ title: "Selecciona una imagen primero", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Si hay una imagen anterior, eliminarla
      if (currentImageUrl) {
        await handleRemove(false); // No mostrar toast de eliminación
      }

      const ext = (imageFile.name.split(".").pop() || "jpg").replace(
        /[^a-zA-Z0-9]/g,
        "",
      );
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const filePath = `${entityId || randomStr}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      onImageUploaded(publicUrl);
      setImageFile(null);

      toast({ title: "Imagen subida correctamente" });
    } catch (error: any) {
      console.error("Error subiendo imagen:", error);
      toast({
        title: "Error al subir imagen",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (showToast = true) => {
    if (!currentImageUrl) return;

    try {
      // Extraer el path del archivo de la URL
      const urlParts = currentImageUrl.split(
        `/storage/v1/object/public/${bucketName}/`,
      );
      if (urlParts.length > 1) {
        const filePath = urlParts[1];

        const { error } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);

        if (error) {
          console.error("Error eliminando imagen:", error);
          // No lanzamos error aquí, solo lo registramos
        }
      }

      onImageRemoved();
      setPreviewUrl(null);
      setImageFile(null);

      if (showToast) {
        toast({ title: "Imagen eliminada" });
      }
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      if (showToast) {
        toast({
          title: "Error al eliminar imagen",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const clearSelection = () => {
    setImageFile(null);
    setPreviewUrl(currentImageUrl || null);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Preview de la imagen */}
      {previewUrl && (
        <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            {currentImageUrl && !imageFile && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleRemove()}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {imageFile && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Input de archivo */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90
              cursor-pointer"
            disabled={uploading}
          />
        </div>
      </div>

      {/* Botón de subir */}
      {imageFile && (
        <Button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir imagen
            </>
          )}
        </Button>
      )}

      {!previewUrl && !imageFile && (
        <div className="w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-2" />
          <p className="text-sm">No hay imagen seleccionada</p>
        </div>
      )}
    </div>
  );
}
