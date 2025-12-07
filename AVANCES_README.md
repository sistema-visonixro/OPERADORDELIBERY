# 📊 Módulo de Avances de Proyectos

Sistema completo para gestionar y dar seguimiento a proyectos en desarrollo con características personalizables y registro de progreso.

## 🎯 Características Principales

### ✅ **Gestión de Proyectos en Desarrollo**
- Crear proyectos vinculados a clientes y contratos existentes
- Definir características/tareas personalizadas por proyecto
- Seguimiento automático del porcentaje de avance
- Estados: En Progreso, Completado, Pausado, Cancelado

### 📈 **Dashboard de Avances**
- Vista de lista con todos los proyectos
- Estadísticas en tiempo real:
  - Total de proyectos
  - Proyectos en progreso
  - Proyectos completados
  - Promedio de avance general
- Filtros por estado y búsqueda
- Cards responsivos con información resumida

### 🔍 **Vista de Detalle del Proyecto**
- Información completa del proyecto
- Gráfica de progreso visual
- Lista de características pendientes y completadas
- Registro de fechas de completado
- Botón para registrar avances

### ✏️ **Registro de Avances**
- Modal para marcar características como completadas
- Validación con contraseña de administrador
- Las características completadas **NO SE PUEDEN DESMARCAR**
- Actualización automática del porcentaje de avance
- Registro de fecha y hora de completado

## 🗄️ **Estructura de Base de Datos**

### Tabla: `avances`
```sql
- id (UUID, PK)
- cliente_id (UUID, FK → clientes)
- contrato_id (UUID, FK → contratos)
- nombre_proyecto (TEXT)
- descripcion (TEXT, nullable)
- fecha_creacion (TIMESTAMPTZ)
- fecha_actualizacion (TIMESTAMPTZ)
- total_caracteristicas (INTEGER)
- caracteristicas_completadas (INTEGER)
- porcentaje_avance (DECIMAL)
- estado (TEXT: en_progreso | completado | pausado | cancelado)
- created_at, updated_at (TIMESTAMPTZ)
```

### Tabla: `avances_caracteristicas`
```sql
- id (UUID, PK)
- avance_id (UUID, FK → avances)
- nombre (TEXT)
- descripcion (TEXT, nullable)
- completada (BOOLEAN)
- fecha_completado (TIMESTAMPTZ, nullable)
- orden (INTEGER)
- created_at, updated_at (TIMESTAMPTZ)
```

### 🔄 **Triggers Automáticos**

1. **`actualizar_porcentaje_avance`**
   - Se ejecuta cuando se inserta, actualiza o elimina una característica
   - Calcula automáticamente:
     - Total de características
     - Características completadas
     - Porcentaje de avance
   - Actualiza el estado a "completado" si llega al 100%

2. **`update_updated_at_column`**
   - Actualiza el timestamp `updated_at` en cada modificación

## 📁 **Archivos Creados**

### SQL
- `/sql/avances_table.sql` - Script completo para crear las tablas en Supabase

### TypeScript Schema
- `/shared/schema.ts` - Tipos e interfaces para Avances

### Páginas
- `/client/src/pages/avances.tsx` - Vista principal de lista de proyectos
- `/client/src/pages/avance-detalle.tsx` - Vista de detalle del proyecto

### Rutas y Navegación
- `/client/src/App.tsx` - Rutas `/avances` y `/avances/:id` agregadas
- `/client/src/components/app-sidebar.tsx` - Menú "Avances" agregado

## 🚀 **Instalación en Supabase**

1. Abre el SQL Editor en tu proyecto de Supabase
2. Copia y pega el contenido de `/sql/avances_table.sql`
3. Ejecuta el script
4. Verifica que las tablas se crearon correctamente

## 💡 **Flujo de Uso**

### Crear un Proyecto
1. Ir a **Avances** en el menú
2. Clic en **"Crear Proyecto"**
3. Seleccionar:
   - Cliente (de la lista de clientes)
   - Proyecto/Contrato (filtrado por el cliente seleccionado)
   - Nombre del proyecto
   - Descripción (opcional)
4. Agregar características (mínimo 1):
   - Nombre de la característica (ej: "Crear Login")
   - Descripción opcional
5. Clic en **"Crear Proyecto"**

### Registrar Avance
1. Clic en un proyecto de la lista
2. En la vista de detalle, clic en **"Registrar Avance"**
3. Seleccionar las características completadas (checkbox)
4. Ingresar contraseña de administrador
5. Clic en **"Confirmar Avance"**
6. Las características se marcan como completadas permanentemente
7. El porcentaje se actualiza automáticamente

### Ver Progreso
- **Lista de Proyectos**: muestra porcentaje y barra de progreso
- **Vista de Detalle**: 
  - Porcentaje grande con barra visual
  - Lista de características pendientes
  - Lista de características completadas con fecha

## 🎨 **Diseño Responsivo**

- ✅ Mobile-first design
- ✅ Grid adaptable (1 columna móvil, 2-3 columnas desktop)
- ✅ Modales responsivos con scroll interno
- ✅ Cards con hover effects
- ✅ Badges de estado con iconos
- ✅ Progress bars animadas

## 🔐 **Seguridad**

- ✅ Row Level Security (RLS) habilitado
- ✅ Validación de contraseña para registrar avances
- ✅ Características completadas son **permanentes** (no se pueden desmarcar)
- ✅ Relaciones con ON DELETE CASCADE para integridad referencial

## 📊 **Ejemplo de Características**

Para un proyecto de **Sistema de Gestión**:
- ✅ Crear login y autenticación
- ✅ Diseñar logo y branding
- ⏳ Módulo de clientes
- ⏳ Módulo de inventario
- ⏳ Reportes y estadísticas
- ⏳ Panel de administración
- ⏳ Documentación de usuario

**Avance**: 2/7 completadas = **28.57%**

## 🔧 **Tecnologías Utilizadas**

- React + TypeScript
- Tanstack Query (React Query)
- Supabase (PostgreSQL)
- Tailwind CSS
- Shadcn/ui Components
- Wouter (routing)
- Lucide Icons

---

**✨ Sistema completamente funcional y listo para producción!**
