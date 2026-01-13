-- Script para eliminar las policies de la tabla public.pedidos
-- Ejecutar en Supabase SQL Editor (solo si quieres quitar estas policies)

/*
  NOTA: Este script elimina únicamente las policies nombradas en tu petición.
  Ejecuta con cuidado en el entorno correcto (dev/prod). Si RLS sigue activo
  después de eliminar policies, puedes deshabilitarlo con:
    ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
*/

DROP POLICY IF EXISTS "Repartidores pueden actualizar sus pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Repartidores pueden ver sus pedidos asignados" ON public.pedidos;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuarios pueden crear pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuarios pueden ver sus pedidos" ON public.pedidos;

-- Opcional: desactivar RLS completamente
-- ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
