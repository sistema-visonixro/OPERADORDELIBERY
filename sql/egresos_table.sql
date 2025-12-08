-- Tabla de Egresos
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS egresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monto NUMERIC(10, 2) NOT NULL,
  -- relación opcional a la tabla de categorías
  categoria_id UUID,
  motivo TEXT NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_egresos_fecha ON egresos(fecha DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_egresos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_egresos_updated_at ON egresos;
CREATE TRIGGER trigger_egresos_updated_at
  BEFORE UPDATE ON egresos
  FOR EACH ROW
  EXECUTE FUNCTION update_egresos_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE egresos ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidades de seguridad)
CREATE POLICY "Allow all operations on egresos" ON egresos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tabla de categorías para egresos
CREATE TABLE IF NOT EXISTS egreso_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egreso_categorias_nombre ON egreso_categorias(nombre);

-- FK opcional (si la tabla ya existía y no contiene la columna, se puede agregar con ALTER TABLE)
ALTER TABLE egresos
  ADD CONSTRAINT IF NOT EXISTS fk_egresos_categoria
  FOREIGN KEY (categoria_id) REFERENCES egreso_categorias(id) ON DELETE SET NULL;

-- Habilitar RLS para categorias
ALTER TABLE egreso_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on egreso_categorias" ON egreso_categorias
  FOR ALL
  USING (true)
  WITH CHECK (true);
