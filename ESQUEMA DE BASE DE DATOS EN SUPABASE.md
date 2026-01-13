-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  cantidad integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario numeric NOT NULL,
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
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_restaurante_id_fkey FOREIGN KEY (restaurante_id) REFERENCES public.restaurantes(id),
  CONSTRAINT pedidos_repartidor_id_fkey FOREIGN KEY (repartidor_id) REFERENCES auth.users(id)
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
  CONSTRAINT restaurantes_pkey PRIMARY KEY (id)
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