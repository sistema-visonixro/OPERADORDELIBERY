# Sistema de Autorización de Dispositivos

## Descripción
Sistema de seguridad que verifica y autoriza dispositivos antes de permitir el acceso a la aplicación.

## Características

### 1. Verificación Automática
- Al cargar la app, se genera un fingerprint único del dispositivo
- Se verifica en la base de datos si el dispositivo está autorizado
- Si no está autorizado, se muestra la pantalla de "Acceso Denegado"

### 2. Pantalla de Acceso Denegado
- Muestra un mensaje claro de que el dispositivo no está autorizado
- Muestra el ID del dispositivo (fingerprint)
- Tiene un enlace para "Autorizar este dispositivo"

### 3. Modal de Autorización
- Permite ingresar un nombre opcional para el dispositivo
- Requiere la clave de administrador (configurada en Configuración)
- Al confirmar, registra el dispositivo en la base de datos

### 4. Gestión de Dispositivos
- Accesible desde Configuración → Botón "Dispositivos"
- Lista todos los dispositivos autorizados
- Muestra información: nombre, tipo, fecha de registro, último acceso
- Permite eliminar dispositivos autorizados

## Instalación

### 1. Ejecutar el SQL en Supabase

```sql
-- Copiar y ejecutar el contenido de: sql/dispositivos_table.sql
```

Este script crea:
- Tabla `dispositivos` con todos los campos necesarios
- Índices para búsquedas rápidas
- Triggers para actualización automática de timestamps

### 2. Estructura de la Tabla

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único (generado automáticamente) |
| fingerprint | TEXT | Hash único del dispositivo (SHA-256) |
| nombre | TEXT | Nombre descriptivo del dispositivo |
| user_agent | TEXT | User agent del navegador |
| ip_address | TEXT | Dirección IP (reservado para uso futuro) |
| autorizado | BOOLEAN | Estado de autorización |
| created_at | TIMESTAMP | Fecha de registro |
| updated_at | TIMESTAMP | Última actualización |
| ultimo_acceso | TIMESTAMP | Último acceso a la app |

## Flujo de Uso

### Primera Vez (Dispositivo No Autorizado)

1. Usuario abre la aplicación
2. Sistema genera fingerprint del dispositivo
3. Verifica en la base de datos → No encontrado
4. Muestra pantalla "Acceso Denegado"
5. Usuario hace clic en "Autorizar este dispositivo"
6. Se abre modal pidiendo:
   - Nombre del dispositivo (opcional)
   - Clave de administrador (requerida)
7. Usuario ingresa la clave correcta
8. Dispositivo se registra en la base de datos
9. Usuario puede acceder a la aplicación

### Accesos Posteriores

1. Usuario abre la aplicación
2. Sistema genera fingerprint del dispositivo
3. Verifica en la base de datos → Encontrado y autorizado
4. Actualiza `ultimo_acceso`
5. Usuario accede directamente a la aplicación

### Gestión de Dispositivos

1. Administrador va a Configuración
2. Hace clic en botón "Dispositivos"
3. Ve lista de todos los dispositivos autorizados
4. Puede eliminar dispositivos:
   - Click en "Eliminar"
   - Confirma en el diálogo
   - Dispositivo eliminado de la base de datos
5. El dispositivo eliminado tendrá que volver a autorizarse

## Seguridad

### Fingerprinting
El fingerprint se genera usando múltiples características del dispositivo:
- User Agent
- Idioma del navegador
- Zona horaria
- Resolución de pantalla
- Profundidad de color
- Número de procesadores
- Plataforma
- Soporte táctil
- Canvas fingerprint
- WebGL fingerprint

Todo esto se combina y se hashea con SHA-256 para crear un identificador único y consistente.

### Protección de Clave
- La clave de administrador se valida contra la tabla `configuracion`
- Solo usuarios con la clave correcta pueden autorizar dispositivos
- La clave no se almacena en el dispositivo

## Archivos Creados

### SQL
- `sql/dispositivos_table.sql` - Script de creación de tabla

### Páginas
- `client/src/pages/acceso-denegado.tsx` - Pantalla de acceso denegado + modal
- `client/src/pages/dispositivos.tsx` - Gestión de dispositivos

### Utilidades
- `client/src/lib/deviceFingerprint.ts` - Generación de fingerprint

### Modificaciones
- `client/src/App.tsx` - Lógica de verificación de dispositivos
- `client/src/pages/configuracion.tsx` - Botón de acceso a Dispositivos

## Notas Importantes

1. **Primera Instalación**: El primer dispositivo necesitará ser autorizado. Asegúrate de tener la clave de administrador lista.

2. **Navegadores Privados**: El fingerprint puede cambiar en modo incógnito o con cada sesión privada.

3. **Actualizaciones del Navegador**: Cambios mayores en el navegador pueden modificar el fingerprint.

4. **Redes Diferentes**: El fingerprint es independiente de la red o IP, funciona por las características del navegador/dispositivo.

5. **Múltiples Usuarios**: Cada usuario en el mismo dispositivo tendrá el mismo fingerprint. Si necesitas control por usuario, considera añadir autenticación de usuarios.

## Personalización

### Modificar Componentes del Fingerprint
Edita `client/src/lib/deviceFingerprint.ts` para añadir o quitar características.

### Cambiar Diseño
- Pantalla de acceso denegado: `client/src/pages/acceso-denegado.tsx`
- Lista de dispositivos: `client/src/pages/dispositivos.tsx`

### Agregar Validaciones
Modifica la función `handleAuthorize` en `acceso-denegado.tsx` para añadir validaciones adicionales.
