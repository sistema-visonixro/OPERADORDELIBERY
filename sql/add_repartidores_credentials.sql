-- Migración: agregar credenciales a la tabla `repartidores`
-- Agrega columnas: `codigo` (usuario), `clave_hash`, `clave_salt` (opcional)
-- Recomendación: usar `crypt()` + `gen_salt('bf')` (bcrypt)

BEGIN;

-- 1) Asegurarse de tener la extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Agregar columnas para credenciales
ALTER TABLE public.repartidores
  ADD COLUMN IF NOT EXISTS codigo character varying(50),
  ADD COLUMN IF NOT EXISTS clave_hash text,
  ADD COLUMN IF NOT EXISTS clave_salt text;

-- 3) Índice / unicidad para `codigo` (usuario de login)
CREATE UNIQUE INDEX IF NOT EXISTS idx_repartidores_codigo_unique ON public.repartidores (codigo);

COMMIT;

-- =========================
-- Ejemplos de uso
-- =========================

-- A) Generar códigos únicos para repartidores existentes (si codigo IS NULL)
-- El código generado tendrá prefijo 'R' seguido de 7 caracteres hex.
UPDATE public.repartidores
SET codigo = concat('R', substring(md5(gen_random_uuid()::text), 1, 7))
WHERE codigo IS NULL;

-- B) Asignar/actualizar contraseña segura para un repartidor (ejemplo con codigo='R123')
-- Genera un salt bcrypt y guarda salt + hash
WITH s AS (SELECT gen_salt('bf') AS salt)
UPDATE public.repartidores r
SET
  clave_salt = s.salt,
  clave_hash = crypt('miPasswordSegura123', s.salt)
FROM s
WHERE r.codigo = 'R123';

-- Variante: crear una nueva fila con contraseña (ejemplo)
-- NOTA: reemplaza usuario_id por un UUID válido y otros campos según necesites
WITH s AS (SELECT gen_salt('bf') AS salt)
INSERT INTO public.repartidores (usuario_id, nombre_completo, telefono, codigo, clave_salt, clave_hash, creado_en)
SELECT gen_random_uuid(), 'Repartidor Ej', '00000000', 'R999', s.salt, crypt('OtraPass123', s.salt), now()
FROM s;

-- C) Autenticación (login) usando `codigo` + `clave` ingresada:
-- Si la consulta devuelve fila => credenciales válidas
SELECT id, usuario_id, codigo, nombre_completo, telefono
FROM public.repartidores
WHERE codigo = 'R123'
  AND clave_hash = crypt('miPasswordIngresada', clave_hash);

-- D) Forzar que `codigo` no sea NULL para nuevos repartidores (opcional)
-- ALTER TABLE public.repartidores ALTER COLUMN codigo SET NOT NULL;

-- E) (Opcional) eliminar `clave_salt` si prefieres almacenar solo el hash (crypt con bcrypt
-- suele guardar el salt dentro del hash, por lo que `clave_salt` no es estrictamente necesario)
-- ALTER TABLE public.repartidores DROP COLUMN IF EXISTS clave_salt;

-- Fin del archivo
