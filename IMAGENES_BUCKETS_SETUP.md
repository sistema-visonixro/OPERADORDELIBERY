# Configuración de Buckets de Storage en Supabase

## Buckets Requeridos

Para que la funcionalidad de subida de imágenes funcione correctamente, necesitas crear los siguientes buckets en Supabase Storage:

### 1. Bucket: `Restaurantes` (para imágenes de restaurantes)

#### Pasos para crear el bucket:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. En el menú lateral, selecciona **Storage**
3. Haz clic en **"Create a new bucket"** o **"New bucket"**
4. Configura el bucket con los siguientes datos:
   - **Name**: `Restaurantes`
   - **Public**: ✅ **SÍ** (público para que las imágenes sean accesibles)
   - Haz clic en **"Create bucket"**

#### Políticas de Seguridad (RLS):

Después de crear el bucket, configura las políticas:

```sql
-- Política para SUBIR archivos (INSERT)
CREATE POLICY "Usuarios autenticados pueden subir imágenes de restaurantes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Restaurantes'
);

-- Política para LEER archivos (SELECT) - Pública
CREATE POLICY "Cualquiera puede ver imágenes de restaurantes"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'Restaurantes'
);

-- Política para ACTUALIZAR archivos (UPDATE)
CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de restaurantes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'Restaurantes')
WITH CHECK (bucket_id = 'Restaurantes');

-- Política para ELIMINAR archivos (DELETE)
CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de restaurantes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'Restaurantes');
```

---

### 2. Bucket: `platos` (para imágenes de platillos)

#### Pasos para crear el bucket:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. En el menú lateral, selecciona **Storage**
3. Haz clic en **"Create a new bucket"** o **"New bucket"**
4. Configura el bucket con los siguientes datos:
   - **Name**: `platos`
   - **Public**: ✅ **SÍ** (público para que las imágenes sean accesibles)
   - Haz clic en **"Create bucket"**

#### Políticas de Seguridad (RLS):

```sql
-- Política para SUBIR archivos (INSERT)
CREATE POLICY "Usuarios autenticados pueden subir imágenes de platillos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'platos'
);

-- Política para LEER archivos (SELECT) - Pública
CREATE POLICY "Cualquiera puede ver imágenes de platillos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'platos'
);

-- Política para ACTUALIZAR archivos (UPDATE)
CREATE POLICY "Usuarios autenticados pueden actualizar imágenes de platillos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'platos')
WITH CHECK (bucket_id = 'platos');

-- Política para ELIMINAR archivos (DELETE)
CREATE POLICY "Usuarios autenticados pueden eliminar imágenes de platillos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'platos');
```

---

## Configuración Recomendada

### Límites de Archivo

Para ambos buckets, se recomienda establecer:

- **File size limit**: 5 MB (suficiente para imágenes optimizadas)
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

### Estructura de Rutas

Las imágenes se guardarán con la siguiente estructura:

**Restaurantes:**

```
Restaurantes/
  ├── {restaurante-id}_{timestamp}.jpg
  ├── {restaurante-id}_{timestamp}.png
  └── ...
```

**Platillos:**

```
platos/
  ├── {restaurante-id}_{timestamp}.jpg
  ├── {platillo-id}_{timestamp}.png
  └── ...
```

Ejemplo: `550e8400-e29b-41d4-a716-446655440000_1708531200000.jpg`

---

## Verificar la Configuración

Para verificar que los buckets están configurados correctamente:

1. **Desde SQL Editor en Supabase**:

```sql
-- Verificar que los buckets existen
SELECT * FROM storage.buckets WHERE name IN ('Restaurantes', 'platos');

-- Verificar las políticas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%restaurantes%' OR policyname LIKE '%platos%';
```

2. **Desde la aplicación**:
   - Intenta subir una imagen desde la UI
   - Verifica que aparece en Storage → Restaurantes o platos
   - Intenta visualizar la imagen en la aplicación

---

## Notas Importantes

- ✅ Los buckets deben ser **PÚBLICOS** para que las imágenes sean accesibles sin autenticación
- ✅ Solo usuarios autenticados pueden subir, actualizar o eliminar imágenes
- ✅ Los archivos se nombran con ID + timestamp para evitar conflictos
- ✅ Se recomienda limitar el tamaño a 5 MB máximo
- ✅ La validación de tipo de archivo se hace en frontend
- ⚠️ Si ya existen buckets con estos nombres, verifica que estén configurados como públicos

---

## Solución de Problemas

### Problema: "Error al subir imagen"

- Verifica que el bucket existe
- Verifica que las políticas RLS están configuradas correctamente
- Verifica que el bucket es público

### Problema: "La imagen no se muestra"

- Verifica que el bucket es público
- Verifica que la URL de la imagen es correcta
- Limpia el caché del navegador

### Problema: "Error al eliminar imagen"

- Verifica que tienes la política DELETE configurada
- Verifica que estás autenticado
- Verifica que el path del archivo es correcto

---

## URL de Acceso a las Imágenes

Una vez subidas, las URLs de las imágenes serán:

**Restaurantes:**

```
https://{tu-proyecto}.supabase.co/storage/v1/object/public/Restaurantes/{nombre-archivo}
```

**Platillos:**

```
https://{tu-proyecto}.supabase.co/storage/v1/object/public/platos/{nombre-archivo}
```

La aplicación generará automáticamente estas URLs al subir los archivos.
