-- Tabla principal de Avances de Proyectos
-- Esta tabla almacena los proyectos en creación con seguimiento de avance

CREATE TABLE IF NOT EXISTS public.avances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
      contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
        nombre_proyecto TEXT NOT NULL,
          descripcion TEXT,
            fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                total_caracteristicas INTEGER NOT NULL DEFAULT 0,
                  caracteristicas_completadas INTEGER NOT NULL DEFAULT 0,
                    porcentaje_avance DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                      estado TEXT NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completado', 'pausado', 'cancelado')),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                          );

                          -- Tabla para las características de cada proyecto
                          CREATE TABLE IF NOT EXISTS public.avances_caracteristicas (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              avance_id UUID NOT NULL REFERENCES public.avances(id) ON DELETE CASCADE,
                                nombre TEXT NOT NULL,
                                  descripcion TEXT,
                                    completada BOOLEAN NOT NULL DEFAULT FALSE,
                                      fecha_completado TIMESTAMPTZ,
                                        orden INTEGER NOT NULL DEFAULT 0,
                                          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                                            );

                                            -- Índices para mejorar el rendimiento
                                            CREATE INDEX IF NOT EXISTS idx_avances_cliente_id ON public.avances(cliente_id);
                                            CREATE INDEX IF NOT EXISTS idx_avances_contrato_id ON public.avances(contrato_id);
                                            CREATE INDEX IF NOT EXISTS idx_avances_estado ON public.avances(estado);
                                            CREATE INDEX IF NOT EXISTS idx_avances_caracteristicas_avance_id ON public.avances_caracteristicas(avance_id);
                                            CREATE INDEX IF NOT EXISTS idx_avances_caracteristicas_completada ON public.avances_caracteristicas(completada);

                                            -- Función para actualizar el timestamp de updated_at automáticamente
                                            CREATE OR REPLACE FUNCTION update_updated_at_column()
                                            RETURNS TRIGGER AS $$
                                            BEGIN
                                              NEW.updated_at = NOW();
                                                RETURN NEW;
                                                END;
                                                $$ LANGUAGE plpgsql;

                                                -- Trigger para actualizar updated_at en avances
                                                DROP TRIGGER IF EXISTS update_avances_updated_at ON public.avances;
                                                CREATE TRIGGER update_avances_updated_at
                                                  BEFORE UPDATE ON public.avances
                                                    FOR EACH ROW
                                                      EXECUTE FUNCTION update_updated_at_column();

                                                      -- Trigger para actualizar updated_at en avances_caracteristicas
                                                      DROP TRIGGER IF EXISTS update_avances_caracteristicas_updated_at ON public.avances_caracteristicas;
                                                      CREATE TRIGGER update_avances_caracteristicas_updated_at
                                                        BEFORE UPDATE ON public.avances_caracteristicas
                                                          FOR EACH ROW
                                                            EXECUTE FUNCTION update_updated_at_column();

                                                            -- Función para actualizar el porcentaje de avance automáticamente
                                                            CREATE OR REPLACE FUNCTION actualizar_porcentaje_avance()
                                                            RETURNS TRIGGER AS $$
                                                            DECLARE
                                                              v_total INTEGER;
                                                                v_completadas INTEGER;
                                                                  v_porcentaje DECIMAL(5,2);
                                                                  BEGIN
                                                                    -- Contar total de características
                                                                      SELECT COUNT(*) INTO v_total
                                                                        FROM public.avances_caracteristicas
                                                                          WHERE avance_id = COALESCE(NEW.avance_id, OLD.avance_id);

                                                                            -- Contar características completadas
                                                                              SELECT COUNT(*) INTO v_completadas
                                                                                FROM public.avances_caracteristicas
                                                                                  WHERE avance_id = COALESCE(NEW.avance_id, OLD.avance_id)
                                                                                      AND completada = TRUE;

                                                                                        -- Calcular porcentaje
                                                                                          IF v_total > 0 THEN
                                                                                              v_porcentaje := (v_completadas::DECIMAL / v_total::DECIMAL) * 100;
                                                                                                ELSE
                                                                                                    v_porcentaje := 0;
                                                                                                      END IF;

                                                                                                        -- Actualizar tabla avances
                                                                                                          UPDATE public.avances
                                                                                                            SET 
                                                                                                                total_caracteristicas = v_total,
                                                                                                                    caracteristicas_completadas = v_completadas,
                                                                                                                        porcentaje_avance = v_porcentaje,
                                                                                                                            estado = CASE 
                                                                                                                                  WHEN v_porcentaje = 100 THEN 'completado'
                                                                                                                                        WHEN estado = 'completado' AND v_porcentaje < 100 THEN 'en_progreso'
                                                                                                                                              ELSE estado
                                                                                                                                                  END,
                                                                                                                                                      fecha_actualizacion = NOW()
                                                                                                                                                        WHERE id = COALESCE(NEW.avance_id, OLD.avance_id);

                                                                                                                                                          RETURN COALESCE(NEW, OLD);
                                                                                                                                                          END;
                                                                                                                                                          $$ LANGUAGE plpgsql;

                                                                                                                                                          -- Trigger para actualizar porcentaje cuando se modifica una característica
                                                                                                                                                          DROP TRIGGER IF EXISTS trigger_actualizar_porcentaje_avance ON public.avances_caracteristicas;
                                                                                                                                                          CREATE TRIGGER trigger_actualizar_porcentaje_avance
                                                                                                                                                            AFTER INSERT OR UPDATE OR DELETE ON public.avances_caracteristicas
                                                                                                                                                              FOR EACH ROW
                                                                                                                                                                EXECUTE FUNCTION actualizar_porcentaje_avance();

                                                                                                                                                                -- Habilitar Row Level Security (RLS)
                                                                                                                                                                ALTER TABLE public.avances ENABLE ROW LEVEL SECURITY;
                                                                                                                                                                ALTER TABLE public.avances_caracteristicas ENABLE ROW LEVEL SECURITY;

                                                                                                                                                                -- Políticas de seguridad para avances (permitir todo para usuarios autenticados)
                                                                                                                                                                DROP POLICY IF EXISTS "Permitir todo acceso a avances" ON public.avances;
                                                                                                                                                                CREATE POLICY "Permitir todo acceso a avances"
                                                                                                                                                                  ON public.avances
                                                                                                                                                                    FOR ALL
                                                                                                                                                                      TO authenticated
                                                                                                                                                                        USING (true)
                                                                                                                                                                          WITH CHECK (true);

                                                                                                                                                                          -- Políticas de seguridad para avances_caracteristicas
                                                                                                                                                                          DROP POLICY IF EXISTS "Permitir todo acceso a caracteristicas" ON public.avances_caracteristicas;
                                                                                                                                                                          CREATE POLICY "Permitir todo acceso a caracteristicas"
                                                                                                                                                                            ON public.avances_caracteristicas
                                                                                                                                                                              FOR ALL
                                                                                                                                                                                TO authenticated
                                                                                                                                                                                  USING (true)
                                                                                                                                                                                    WITH CHECK (true);

                                                                                                                                                                                    -- Comentarios para documentación
                                                                                                                                                                                    COMMENT ON TABLE public.avances IS 'Proyectos en desarrollo con seguimiento de avance';
                                                                                                                                                                                    COMMENT ON TABLE public.avances_caracteristicas IS 'Características o tareas de cada proyecto';
                                                                                                                                                                                    COMMENT ON COLUMN public.avances.porcentaje_avance IS 'Porcentaje calculado automáticamente basado en características completadas';
                                                                                                                                                                                    COMMENT ON COLUMN public.avances.estado IS 'Estado del proyecto: en_progreso, completado, pausado, cancelado';
                                                                                                                                                                                    