-- Script: Añade soporte para enviar pedidos al operador
-- Ejecutar en Supabase SQL Editor (o en psql conectado a la BD)

-- 1) Añadir columnas si no existen
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS operador_id uuid,
  ADD COLUMN IF NOT EXISTS enviado_a_operador boolean NOT NULL DEFAULT false;

-- 2) Añadir constraint FK operador_id -> auth.users(id) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'pedidos'
      AND kcu.column_name = 'operador_id'
  ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT pedidos_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES auth.users(id);
  END IF;
END
$$;

-- 3) Índices recomendados
CREATE INDEX IF NOT EXISTS idx_pedidos_enviado_a_operador ON public.pedidos (enviado_a_operador);
CREATE INDEX IF NOT EXISTS idx_pedidos_operador_id ON public.pedidos (operador_id);

-- 4) Consultas de ejemplo (comentadas)
-- Marcar pedido como enviado a operador:
-- UPDATE public.pedidos SET enviado_a_operador = true, actualizado_en = now() WHERE id = '<PEDIDO_ID>';

-- Marcar y asignar operador:
-- UPDATE public.pedidos SET enviado_a_operador = true, operador_id = '<OPERADOR_USER_ID>', actualizado_en = now() WHERE id = '<PEDIDO_ID>';

-- Listar pedidos pendientes para operadores (no asignados):
-- SELECT * FROM public.pedidos WHERE enviado_a_operador = true AND operador_id IS NULL ORDER BY creado_en ASC;

-- Operador confirma/consume pedido (asigna su id si no estaba asignado):
-- UPDATE public.pedidos SET operador_id = '<OPERADOR_USER_ID>', actualizado_en = now() WHERE id = '<PEDIDO_ID>' AND (operador_id IS NULL OR operador_id = '<OPERADOR_USER_ID>');
