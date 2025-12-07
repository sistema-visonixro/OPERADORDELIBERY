-- Supabase / Postgres schema for Visonixro
-- Run this in Supabase SQL editor (or psql) to create the database schema

-- Enable extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums for payment type and status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
    CREATE TYPE payment_type AS ENUM ('unico', 'cuotas', 'suscripcion');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pagado', 'pendiente', 'vencido');
  END IF;
END$$;

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  project_name text NOT NULL,
  project_description text,
  payment_type payment_type NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  number_of_payments integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status payment_status NOT NULL,
  due_date timestamptz NOT NULL,
  paid_date timestamptz,
  payment_number integer DEFAULT 1,
  notes text
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  monthly_amount numeric(10,2) NOT NULL,
  start_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  last_payment_date timestamptz,
  next_payment_date timestamptz
);

-- Estado de Cuenta table (Movimientos/Transacciones)
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

-- Users table (for future auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password text NOT NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_cliente_id ON estado_cuenta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_proyecto_id ON estado_cuenta(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_tipo ON estado_cuenta(tipo);
CREATE INDEX IF NOT EXISTS idx_estado_cuenta_fecha ON estado_cuenta(fecha);

-- Notes:
-- - Subscription-specific fields (pago de instalacion, fecha inicial) are modeled as separate rows in payments/subscriptions
-- - You can add a payments row for "pago de instalación" with notes = 'Pago de instalación' when creating a subscription

