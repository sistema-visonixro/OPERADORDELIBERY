-- Script SQL para crear la tabla ESTADO DE CUENTA
-- Ejecutar este script en Supabase SQL Editor

-- Tabla Estado de Cuenta (Movimientos/Transacciones)
CREATE TABLE IF NOT EXISTS estado_cuenta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  proyecto_id uuid NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('contrato', 'suscripcion')),
  monto numeric(10,2) NOT NULL,
  saldo_actual numeric(10,2) NOT NULL,
  nota text,
  fecha timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_cliente_id ON estado_cuenta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_proyecto_id ON estado_cuenta(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_tipo ON estado_cuenta(tipo);
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_fecha ON estado_cuenta(fecha);

-- Comentarios descriptivos
COMMENT ON TABLE estado_cuenta IS 'Tabla que registra todos los movimientos financieros de clientes (contratos y suscripciones)';
COMMENT ON COLUMN estado_cuenta.cliente_id IS 'ID del cliente relacionado';
COMMENT ON COLUMN estado_cuenta.proyecto_id IS 'ID del proyecto relacionado';
COMMENT ON COLUMN estado_cuenta.tipo IS 'Tipo de movimiento: contrato o suscripcion';
COMMENT ON COLUMN estado_cuenta.monto IS 'Monto del movimiento (pago realizado)';
COMMENT ON COLUMN estado_cuenta.saldo_actual IS 'Saldo después del movimiento';
COMMENT ON COLUMN estado_cuenta.nota IS 'Descripción del movimiento (ej: PAGO INICIAL, ABONO A CONTRATO, etc.)';
COMMENT ON COLUMN estado_cuenta.fecha IS 'Fecha del movimiento';
