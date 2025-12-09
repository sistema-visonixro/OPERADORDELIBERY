-- Tabla para gestionar dispositivos autorizados
CREATE TABLE IF NOT EXISTS dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  nombre TEXT,
  user_agent TEXT,
  ip_address TEXT,
  autorizado BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso TIMESTAMP WITH TIME ZONE
);

-- Índice para búsquedas rápidas por fingerprint
CREATE INDEX IF NOT EXISTS idx_dispositivos_fingerprint ON dispositivos(fingerprint);

-- Índice para dispositivos autorizados
CREATE INDEX IF NOT EXISTS idx_dispositivos_autorizado ON dispositivos(autorizado);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dispositivos_updated_at BEFORE UPDATE ON dispositivos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE dispositivos IS 'Almacena los dispositivos autorizados para acceder a la aplicación';
COMMENT ON COLUMN dispositivos.fingerprint IS 'Identificador único del dispositivo basado en características del navegador';
COMMENT ON COLUMN dispositivos.nombre IS 'Nombre descriptivo del dispositivo (opcional)';
COMMENT ON COLUMN dispositivos.user_agent IS 'User agent del navegador';
COMMENT ON COLUMN dispositivos.ip_address IS 'Dirección IP del dispositivo';
COMMENT ON COLUMN dispositivos.autorizado IS 'Indica si el dispositivo está autorizado';
COMMENT ON COLUMN dispositivos.ultimo_acceso IS 'Última vez que el dispositivo accedió a la aplicación';
