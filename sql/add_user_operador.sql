-- Archivo: sql/add_user_operador.sql
-- Crea la tabla user_operador con las columnas solicitadas
CREATE TABLE IF NOT EXISTS user_operador (
  codigo TEXT PRIMARY KEY,
  clave TEXT NOT NULL,
  rol TEXT NOT NULL,
  nombre TEXT
);

-- Ejemplo de inserción:
-- INSERT INTO user_operador (codigo, clave, rol, nombre) VALUES ('U123','secreto','operador','Juan Pérez');
