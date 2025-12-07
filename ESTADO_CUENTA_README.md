# Estado de Cuenta - Documentación de Implementación

## Tabla: `estado_cuenta`

### Estructura de la Tabla

```sql
CREATE TABLE estado_cuenta (
  id uuid PRIMARY KEY,
  cliente_id uuid NOT NULL,
  proyecto_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('contrato', 'suscripcion')),
  monto numeric(10,2) NOT NULL,
  saldo_actual numeric(10,2) NOT NULL,
  nota text,
  fecha timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

### Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | Identificador único del registro |
| `cliente_id` | uuid | ID del cliente (referencia a tabla `clientes`) |
| `proyecto_id` | uuid | ID del proyecto (referencia a tabla `proyectos`) |
| `tipo` | text | Tipo de movimiento: 'contrato' o 'suscripcion' |
| `monto` | numeric(10,2) | Monto del movimiento/pago |
| `saldo_actual` | numeric(10,2) | Saldo después del movimiento |
| `nota` | text | Descripción del movimiento |
| `fecha` | timestamptz | Fecha del movimiento |
| `created_at` | timestamptz | Fecha de creación del registro |

## Flujo de Registros

### 1. VENTA TIPO CONTRATO

Cuando se realiza una venta de tipo CONTRATO, se registran **2 movimientos**:

#### Movimiento 1: Contrato Adquirido
```javascript
{
  cliente_id: [ID del cliente],
  proyecto_id: [ID del proyecto],
  tipo: "contrato",
  monto: [PAGO TOTAL],
  saldo_actual: [PAGO TOTAL],
  nota: "CONTRATO ADQUIRIDO"
}
```

#### Movimiento 2: Pago Inicial
```javascript
{
  cliente_id: [ID del cliente],
  proyecto_id: [ID del proyecto],
  tipo: "contrato",
  monto: [PAGO INICIAL],
  saldo_actual: [PAGO TOTAL - PAGO INICIAL],
  nota: "PAGO INICIAL"
}
```

### 2. VENTA TIPO SUSCRIPCIÓN

Cuando se realiza una venta de tipo SUSCRIPCIÓN, se registra **1 movimiento**:

#### Movimiento: Pago Inicial
```javascript
{
  cliente_id: [ID del cliente],
  proyecto_id: [ID del proyecto],
  tipo: "suscripcion",
  monto: [PAGO INICIAL],
  saldo_actual: [PAGO INICIAL],
  nota: "PAGO INICIAL"
}
```

### 3. COBRO TIPO CONTRATO

Cuando se realiza un cobro de tipo CONTRATO, se registra **1 movimiento**:

#### Movimiento: Abono a Contrato
```javascript
{
  cliente_id: [ID del cliente],
  proyecto_id: [ID del proyecto],
  tipo: "contrato",
  monto: [Monto a cobrar],
  saldo_actual: [Valor restante - Monto a cobrar],
  nota: "ABONO A CONTRATO"
}
```

### 4. COBRO TIPO SUSCRIPCIÓN

Cuando se realiza un cobro de tipo SUSCRIPCIÓN, se registra **1 movimiento**:

#### Movimiento: Pago de Suscripción
```javascript
{
  cliente_id: [ID del cliente],
  proyecto_id: [ID del proyecto],
  tipo: "suscripcion",
  monto: [Monto a cobrar],
  saldo_actual: [Mensualidad - Monto a cobrar],
  nota: "PAGO DE SUSCRIPCIÓN"
}
```

## Vista: Estado de Cuentas

La vista en `client/src/pages/estado-cuentas.tsx` muestra los registros de la tabla con los siguientes filtros:

### Filtros Disponibles
- **RTN / Cliente**: Búsqueda por RTN o nombre del cliente
- **Tipo**: Todos, Suscripción o Contrato
- **Proyecto**: Proyectos asociados al cliente seleccionado
- **Fecha desde**: Filtro por fecha inicial
- **Fecha hasta**: Filtro por fecha final

### Columnas Mostradas
1. Cliente
2. RTN
3. Tipo (contrato/suscripción)
4. Proyecto
5. Fecha
6. Monto
7. Saldo Actual
8. Nota

## Instalación

### 1. Ejecutar SQL en Supabase

Ejecuta el archivo `/workspaces/Admon/sql/estado_cuenta_table.sql` en el editor SQL de Supabase.

### 2. Archivos Modificados

Los siguientes archivos han sido actualizados con la nueva funcionalidad:

- ✅ `sql/supabase_schema.sql` - Actualizado con la nueva tabla
- ✅ `sql/estado_cuenta_table.sql` - Script SQL independiente para crear la tabla
- ✅ `shared/schema.ts` - Agregado schema TypeScript para `estadoCuenta`
- ✅ `client/src/pages/estado-cuentas.tsx` - Vista actualizada con conexión a la tabla
- ✅ `client/src/components/proyecto-venta-form.tsx` - Lógica para registrar ventas
- ✅ `client/src/components/cobro-form.tsx` - Lógica para registrar cobros

## Notas Importantes

1. **Saldo Actual en Contratos**: Representa el monto restante por pagar
2. **Saldo Actual en Suscripciones**: Representa la diferencia entre la mensualidad y el monto pagado
3. **Notas Estándar**: 
   - "CONTRATO ADQUIRIDO"
   - "PAGO INICIAL"
   - "ABONO A CONTRATO"
   - "PAGO DE SUSCRIPCIÓN"
4. **Manejo de Errores**: Los registros en `estado_cuenta` no bloquean las operaciones principales (ventas/cobros)
5. **Índices**: Se crearon índices en `cliente_id`, `proyecto_id`, `tipo` y `fecha` para mejorar el rendimiento

## Ejemplos de Consulta

### Ver todos los movimientos de un cliente
```sql
SELECT * FROM estado_cuenta 
WHERE cliente_id = '[uuid-del-cliente]'
ORDER BY fecha DESC;
```

### Ver saldo actual de un contrato
```sql
SELECT saldo_actual FROM estado_cuenta 
WHERE cliente_id = '[uuid]' 
  AND proyecto_id = '[uuid]' 
  AND tipo = 'contrato'
ORDER BY fecha DESC 
LIMIT 1;
```

### Ver histórico de pagos de suscripción
```sql
SELECT * FROM estado_cuenta 
WHERE tipo = 'suscripcion' 
  AND nota = 'PAGO DE SUSCRIPCIÓN'
ORDER BY fecha DESC;
```
