-- Tabla de pedidos de restaurante con observaciones y estado
CREATE TABLE IF NOT EXISTS pedidos_restaurante (
  id BIGSERIAL PRIMARY KEY,
  numero_pedido TEXT NOT NULL UNIQUE,
  total DECIMAL(10, 2) DEFAULT 0.00,
  direccion_entrega TEXT,
  observaciones TEXT,
  estado_pedido TEXT DEFAULT 'pendiente' CHECK (estado_pedido IN ('pendiente', 'en_preparacion', 'enviado', 'entregado', 'cancelado')),
  enviado_a_operador BOOLEAN DEFAULT FALSE,
  restaurante_id UUID REFERENCES restaurantes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante_numero_pedido ON pedidos_restaurante(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante_estado ON pedidos_restaurante(estado_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante_restaurante ON pedidos_restaurante(restaurante_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_restaurante_created_at ON pedidos_restaurante(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_pedidos_restaurante_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pedidos_restaurante_updated_at
  BEFORE UPDATE ON pedidos_restaurante
  FOR EACH ROW
  EXECUTE FUNCTION update_pedidos_restaurante_updated_at();

-- RLS (Row Level Security) policies
-- RLS (Row Level Security) policies
-- RLS deshabilitado: este proyecto no utiliza auth, por eso
-- evitamos referencias a auth.uid() o a columnas como auth_user_id.
ALTER TABLE pedidos_restaurante DISABLE ROW LEVEL SECURITY;

-- Si en el futuro habilitas autenticación, reemplaza estas políticas
-- por checks que comparen la sesión/autenticación con la tabla restaurantes.

-- Comentarios para documentación
COMMENT ON TABLE pedidos_restaurante IS 'Tabla de pedidos realizados por los restaurantes';
COMMENT ON COLUMN pedidos_restaurante.numero_pedido IS 'Número único del pedido en formato P-{timestamp}';
COMMENT ON COLUMN pedidos_restaurante.total IS 'Monto total del pedido';
COMMENT ON COLUMN pedidos_restaurante.direccion_entrega IS 'Dirección donde se entregará el pedido';
COMMENT ON COLUMN pedidos_restaurante.observaciones IS 'Observaciones o notas adicionales del pedido';
COMMENT ON COLUMN pedidos_restaurante.estado_pedido IS 'Estado actual del pedido: pendiente, en_preparacion, enviado, entregado, cancelado';
COMMENT ON COLUMN pedidos_restaurante.enviado_a_operador IS 'Indica si el pedido fue enviado al operador';
COMMENT ON COLUMN pedidos_restaurante.restaurante_id IS 'ID del restaurante que realizó el pedido';
