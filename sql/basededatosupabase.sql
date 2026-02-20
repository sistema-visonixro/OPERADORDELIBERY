-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.avisos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo character varying NOT NULL,
  mensaje text NOT NULL,
  prioridad character varying NOT NULL DEFAULT 'media'::character varying CHECK (prioridad::text = ANY (ARRAY['alta'::character varying, 'media'::character varying, 'baja'::character varying]::text[])),
  fecha_inicio timestamp with time zone,
  fecha_fin timestamp with time zone,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT avisos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bebidas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  categoria_id uuid,
  nombre character varying NOT NULL,
  descripcion text,
  imagen_url text,
  precio numeric NOT NULL,
  descuento_porcentaje integer DEFAULT 0,
  disponible boolean DEFAULT true,
  tamano character varying,
  temperatura character varying,
  con_alcohol boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bebidas_pkey PRIMARY KEY (id),
  CONSTRAINT bebidas_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id),
  CONSTRAINT bebidas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
);
CREATE TABLE public.carrito (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  platillo_id uuid NOT NULL,
  restaurante_id uuid NOT NULL,
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0 AND cantidad <= 50),
  precio_unitario numeric NOT NULL CHECK (precio_unitario >= 0::numeric),
  notas text,
  creado_en timestamp with time zone DEFAULT now(),
  actualizado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT carrito_pkey PRIMARY KEY (id),
  CONSTRAINT carrito_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id),
  CONSTRAINT carrito_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL UNIQUE,
  emoji character varying,
  color_gradiente_inicio character varying,
  color_gradiente_fin character varying,
  orden integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categorias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.detalle_pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  platillo_id uuid NOT NULL,
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario numeric NOT NULL,
  subtotal numeric NOT NULL,
  notas text,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT detalle_pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT detalle_pedidos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT detalle_pedidos_platillo_id_fkey FOREIGN KEY (platillo_id) REFERENCES public.platillos(id)
);
CREATE TABLE public.notificaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  tipo character varying NOT NULL,
  titulo character varying NOT NULL,
  mensaje text NOT NULL,
  pedido_id uuid,
  leida boolean DEFAULT false,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id),
  CONSTRAINT notificaciones_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);
CREATE TABLE public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  restaurante_id uuid NOT NULL,
  repartidor_id uuid,
  numero_pedido character varying NOT NULL UNIQUE,
  total numeric NOT NULL,
  estado character varying NOT NULL DEFAULT 'pendiente'::character varying CHECK (estado::text = ANY (ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'en_preparacion'::character varying, 'listo'::character varying, 'en_camino'::character varying, 'entregado'::character varying, 'cancelado'::character varying]::text[])),
  direccion_entrega text NOT NULL,
  latitud numeric,
  longitud numeric,
  notas_cliente text,
  notas_repartidor text,
  creado_en timestamp with time zone DEFAULT now(),
  confirmado_en timestamp with time zone,
  asignado_en timestamp with time zone,
  entregado_en timestamp with time zone,
  cancelado_en timestamp with time zone,
  actualizado_en timestamp with time zone DEFAULT now(),
  operador_id uuid,
  enviado_a_operador boolean NOT NULL DEFAULT false,
  tipo_pago text,
  costo_envio numeric NOT NULL DEFAULT 0.00,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id),
  CONSTRAINT pedidos_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES auth.users(id)
);
CREATE TABLE public.pedidos_realizados_de_repartidor (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  repartidor_id uuid,
  entregado_en timestamp with time zone NOT NULL DEFAULT now(),
  total numeric,
  numero_pedido character varying,
  restaurante_id uuid,
  registrado_en timestamp with time zone NOT NULL DEFAULT now(),
  direccion_entrega text,
  estado text,
  costo_envio numeric NOT NULL DEFAULT 0.00,
  CONSTRAINT pedidos_realizados_de_repartidor_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_realizados_de_repartidor_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);
CREATE TABLE public.pedidos_restaurante (
  id bigint NOT NULL DEFAULT nextval('pedidos_restaurante_id_seq'::regclass),
  numero_pedido text NOT NULL UNIQUE,
  total numeric DEFAULT 0.00,
  direccion_entrega text,
  observaciones text,
  estado_pedido text DEFAULT 'pendiente'::text CHECK (estado_pedido = ANY (ARRAY['pendiente'::text, 'en_preparacion'::text, 'enviado'::text, 'entregado'::text, 'cancelado'::text])),
  enviado_a_operador boolean DEFAULT false,
  restaurante_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pedidos_restaurante_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_restaurante_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);
CREATE TABLE public.perfiles_usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE,
  rol character varying NOT NULL DEFAULT 'cliente'::character varying CHECK (rol::text = ANY (ARRAY['cliente'::character varying, 'repartidor'::character varying, 'operador'::character varying, 'admin'::character varying]::text[])),
  nombre_completo character varying,
  telefono character varying,
  foto_url text,
  direccion_default text,
  latitud_default numeric,
  longitud_default numeric,
  creado_en timestamp with time zone DEFAULT now(),
  actualizado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT perfiles_usuario_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_usuario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.platillos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurante_id uuid NOT NULL,
  categoria_id uuid,
  nombre character varying NOT NULL,
  descripcion text,
  imagen_url text,
  precio numeric NOT NULL,
  descuento_porcentaje integer DEFAULT 0,
  disponible boolean DEFAULT true,
  tiempo_preparacion integer DEFAULT 15,
  calorias integer,
  es_vegetariano boolean DEFAULT false,
  es_picante boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  categoria_tipo character varying DEFAULT 'comida'::character varying CHECK (categoria_tipo::text = ANY (ARRAY['comida'::character varying, 'bebida'::character varying, 'postre'::character varying, 'mandadito'::character varying]::text[])),
  CONSTRAINT platillos_pkey PRIMARY KEY (id),
  CONSTRAINT platillos_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id),
  CONSTRAINT platillos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
);
CREATE TABLE public.repartidores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL UNIQUE,
  nombre_completo character varying NOT NULL,
  telefono character varying,
  foto_url text,
  tipo_vehiculo character varying CHECK (tipo_vehiculo::text = ANY (ARRAY['bicicleta'::character varying, 'moto'::character varying, 'auto'::character varying, 'a_pie'::character varying]::text[])),
  placa_vehiculo character varying,
  estado character varying DEFAULT 'inactivo'::character varying CHECK (estado::text = ANY (ARRAY['activo'::character varying, 'inactivo'::character varying, 'en_entrega'::character varying, 'pausado'::character varying]::text[])),
  disponible boolean DEFAULT false,
  latitud_actual numeric,
  longitud_actual numeric,
  ultima_actualizacion_ubicacion timestamp with time zone,
  total_entregas integer DEFAULT 0,
  calificacion_promedio numeric DEFAULT 0.00,
  creado_en timestamp with time zone DEFAULT now(),
  actualizado_en timestamp with time zone DEFAULT now(),
  codigo character varying,
  clave_hash text,
  clave_salt text,
  clave text,
  CONSTRAINT repartidores_pkey PRIMARY KEY (id)
);
CREATE TABLE public.restaurantes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre character varying NOT NULL,
  descripcion text,
  imagen_url text,
  color_tema character varying DEFAULT '#ff6b6b'::character varying,
  emoji character varying,
  calificacion numeric DEFAULT 0.0,
  tiempo_entrega_min integer DEFAULT 30,
  costo_envio numeric DEFAULT 0.00,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  direccion text,
  telefono text,
  usuario_id uuid,
  latitud numeric,
  longitud numeric,
  CONSTRAINT restaurantes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ubicacion_real (
  usuario_id uuid NOT NULL,
  latitud numeric NOT NULL,
  longitud numeric NOT NULL,
  velocidad numeric,
  precision_metros integer,
  heading numeric,
  actualizado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT ubicacion_real_pkey PRIMARY KEY (usuario_id)
);
CREATE TABLE public.ubicaciones_repartidor (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  repartidor_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  latitud numeric NOT NULL,
  longitud numeric NOT NULL,
  velocidad numeric,
  precision_metros integer,
  creado_en timestamp with time zone DEFAULT now(),
  CONSTRAINT ubicaciones_repartidor_pkey PRIMARY KEY (id),
  CONSTRAINT ubicaciones_repartidor_repartidor_id_fkey FOREIGN KEY (repartidor_id) REFERENCES public.repartidores(id),
  CONSTRAINT ubicaciones_repartidor_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);
CREATE TABLE public.user_operador (
  codigo text NOT NULL,
  clave text NOT NULL,
  rol text NOT NULL,
  nombre text,
  CONSTRAINT user_operador_pkey PRIMARY KEY (codigo)
);
CREATE TABLE public.usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  nombre character varying NOT NULL,
  telefono character varying,
  direccion text,
  tipo_usuario character varying DEFAULT 'cliente'::character varying CHECK (tipo_usuario::text = ANY (ARRAY['cliente'::text, 'repartidor'::text, 'restaurante'::text, 'operador'::text, 'admin'::text])),
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usuarios_restaurante (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  restaurante_id uuid,
  codigo character varying NOT NULL UNIQUE,
  clave character varying NOT NULL,
  nombre character varying,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usuarios_restaurante_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_restaurante_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id)
);






-- Agregar campos precio_extra_por_km y distancia_minima_km a la tabla restaurantes

ALTER TABLE public.restaurantes
ADD COLUMN precio_extra_por_km numeric DEFAULT 0.00,
ADD COLUMN distancia_minima_km numeric DEFAULT 0.00;

COMMENT ON COLUMN public.restaurantes.precio_extra_por_km IS 'Precio adicional por kilómetro de distancia';
COMMENT ON COLUMN public.restaurantes.distancia_minima_km IS 'Distancia mínima en kilómetros para entrega';


-- Crear tabla para registrar los pagos realizados a los repartidores
-- Esto permite hacer un balance entre lo que gana el repartidor (pedidos_realizados_de_repartidor)
-- y lo que se le ha pagado (pagos_repartidores)

CREATE TABLE public.pagos_repartidores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  repartidor_id uuid NOT NULL,
  monto numeric NOT NULL CHECK (monto >= 0),
  fecha_pago timestamp with time zone NOT NULL DEFAULT now(),
  metodo_pago character varying NOT NULL DEFAULT 'efectivo'::character varying 
    CHECK (metodo_pago::text = ANY (ARRAY[
      'efectivo'::character varying, 
      'transferencia'::character varying, 
      'deposito'::character varying,
      'cheque'::character varying,
      'otro'::character varying
    ]::text[])),
  referencia character varying,
  notas text,
  operador_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pagos_repartidores_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_repartidores_repartidor_id_fkey FOREIGN KEY (repartidor_id) 
    REFERENCES public.repartidores(id) ON DELETE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_pagos_repartidores_repartidor_id ON public.pagos_repartidores(repartidor_id);
CREATE INDEX idx_pagos_repartidores_fecha_pago ON public.pagos_repartidores(fecha_pago);

-- Comentarios
COMMENT ON TABLE public.pagos_repartidores IS 'Registro de pagos realizados a los repartidores';
COMMENT ON COLUMN public.pagos_repartidores.monto IS 'Monto pagado al repartidor';
COMMENT ON COLUMN public.pagos_repartidores.metodo_pago IS 'Método de pago utilizado (efectivo, transferencia, etc)';
COMMENT ON COLUMN public.pagos_repartidores.referencia IS 'Número de referencia, comprobante o transacción';
COMMENT ON COLUMN public.pagos_repartidores.operador_id IS 'Usuario operador que registró el pago';

-- RLS (Row Level Security) - Opcional, ajustar según tus necesidades
ALTER TABLE public.pagos_repartidores ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan leer
CREATE POLICY "Permitir lectura de pagos a usuarios autenticados" 
ON public.pagos_repartidores FOR SELECT 
USING (true);

-- Política para que solo operadores puedan insertar/actualizar
-- (Ajustar según tu sistema de autenticación)
CREATE POLICY "Permitir inserción de pagos a operadores" 
ON public.pagos_repartidores FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir actualización de pagos a operadores" 
ON public.pagos_repartidores FOR UPDATE 
USING (true);





