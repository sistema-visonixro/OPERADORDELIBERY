# Guía de Debugging para Correos que No Llegan

## Problema
El sistema muestra "envío exitoso" pero el correo no llega a la bandeja de entrada.

## Pasos para Resolver

### 1. Verificar Configuración en Google Apps Script

Ve a https://script.google.com y abre tu proyecto de recordatorios.

#### A) Ejecutar función de verificación

1. En el menú desplegable de funciones, selecciona: **`verificarConfiguracion`**
2. Haz clic en el botón **▶ Ejecutar**
3. Ve a **Ver → Registros** (o presiona Ctrl+Enter)
4. Revisa que todos los puntos estén marcados como ✓

**Problemas comunes:**
- ❌ `EMAIL_REMITENTE: tu-email@gmail.com` → Debes cambiarlo por tu email real
- ❌ `API_SECRET_KEY` sin cambiar → Cambia la clave por defecto
- ❌ Sin permisos de Gmail → Necesitas autorizar la app (ver paso B)

#### B) Configurar EMAIL_REMITENTE correctamente

En el archivo del script, busca la sección CONFIG y edita:

```javascript
const CONFIG = {
  // Pon AQUÍ tu email de Gmail real (el que usas en Google Apps Script)
  EMAIL_REMITENTE: "tu-email-real@gmail.com",  // ← CAMBIA ESTO
  
  NOMBRE_EMPRESA: "Visonix",
  TELEFONO_EMPRESA: "+504 XXXX-XXXX",  // Pon tu teléfono real
  EMAIL_EMPRESA: "contacto@tuempresa.com",  // Email de contacto
  API_SECRET_KEY: "una-clave-segura-diferente-123",  // Cambia esto también
};
```

**IMPORTANTE:** 
- El `EMAIL_REMITENTE` debe ser el mismo email de la cuenta de Google donde está el script
- Si usas Gmail con dominio personalizado (G Suite/Workspace), usa ese email

#### C) Probar envío desde Google Apps Script

1. En el script, busca la función `testEnviarCorreo()`
2. Cambia el email de prueba por **TU EMAIL PERSONAL**:

```javascript
function testEnviarCorreo() {
  const emailPrueba = "tu-email@gmail.com";  // ← PON TU EMAIL AQUÍ
  // ... resto del código
}
```

3. Selecciona `testEnviarCorreo` en el menú desplegable
4. Haz clic en **▶ Ejecutar**
5. **Primera vez:** Te pedirá permisos:
   - Clic en "Revisar permisos"
   - Selecciona tu cuenta de Google
   - Clic en "Avanzado"
   - Clic en "Ir a [nombre del proyecto] (no seguro)"
   - Clic en "Permitir"
6. Revisa los logs: **Ver → Registros**
7. Busca tu email en:
   - Bandeja de entrada
   - **Spam/Correo no deseado** ← Muy probable la primera vez
   - Pestaña "Promociones" (si usas Gmail con pestañas)

### 2. Problemas Comunes y Soluciones

#### ❌ El correo va a Spam

**Solución:**
- Marca el correo como "No es spam"
- Agrega el EMAIL_REMITENTE a tus contactos
- Los siguientes correos llegarán a la bandeja principal

#### ❌ Error: "Email del remitente no configurado"

**Causa:** `CONFIG.EMAIL_REMITENTE` todavía dice `"tu-email@gmail.com"`

**Solución:** Edita el script y pon tu email real

#### ❌ Error: "No hay permisos de Gmail"

**Solución:**
1. Ejecuta `testEnviarCorreo()`
2. Autoriza todos los permisos cuando te lo pida
3. Intenta de nuevo

#### ❌ Error: "Invalid email address"

**Causa:** El email del cliente en la base de datos tiene formato incorrecto

**Solución:**
1. Ve a Supabase → Tabla `clientes`
2. Verifica que el email esté bien escrito
3. Formato correcto: `usuario@dominio.com`

### 3. Verificar Logs del Script en Tiempo Real

Cuando haces clic en "Recordatorio" desde la app:

1. Ve a Google Apps Script
2. Clic en **Ver → Registros** (o **Ctrl+Enter**)
3. Deberías ver logs como:

```
=== NUEVA SOLICITUD RECIBIDA ===
Timestamp: 2026-01-01T...
Datos recibidos: {...}
✓ Autenticación exitosa
✓ Datos validados correctamente
=== INICIANDO ENVÍO DE CORREO ===
Email destino: cliente@ejemplo.com
✓ Correo enviado exitosamente a: cliente@ejemplo.com
=== FIN ENVÍO EXITOSO ===
```

**Si no ves logs:**
- El script no está recibiendo la petición
- Verifica que la URL del Web App sea la correcta en `.env.local`
- Verifica que hayas desplegado el script como "Web App"

**Si ves errores:**
- Lee el mensaje de error en los logs
- Busca el error específico en esta guía

### 4. Verificar Despliegue del Web App

1. En Google Apps Script, ve a **Implementar → Administrar implementaciones**
2. Verifica que exista una implementación activa
3. Configuración correcta:
   - **Tipo:** Aplicación web
   - **Ejecutar como:** Yo (tu email)
   - **Quién tiene acceso:** Cualquiera
4. Si no existe, crea una nueva:
   - **Implementar → Nueva implementación**
   - **Tipo:** Aplicación web
   - Copia la URL que te da
   - Actualízala en `.env.local` como `VITE_GOOGLE_SCRIPT_URL`

### 5. Verificar Variables de Entorno en el Frontend

Archivo: `.env.local`

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/TU_ID_AQUI/exec
VITE_GOOGLE_SCRIPT_API_KEY=la-misma-clave-que-en-CONFIG
```

**Verificaciones:**
- ✓ La URL termina en `/exec`
- ✓ La `API_KEY` es **EXACTAMENTE** igual a la de `CONFIG.API_SECRET_KEY`
- ✓ El archivo está en la **raíz del proyecto**
- ✓ Reiniciaste el servidor después de cambiar el `.env.local`

### 6. Test End-to-End

#### Paso 1: Probar desde Google Apps Script
```javascript
// En el script, ejecuta:
verificarConfiguracion()  // Debe mostrar todo ✓
testEnviarCorreo()        // Debe enviar correo a tu email
```

#### Paso 2: Verificar que llegó el correo de prueba
- Revisa bandeja de entrada
- Revisa spam
- Si llegó → El script funciona ✓

#### Paso 3: Probar desde la app
1. Ve a Suscripciones
2. Encuentra una con 2+ días de atraso
3. Verifica que el cliente tenga email en la DB
4. Clic en "Recordatorio"
5. Abre Google Apps Script → Ver Logs
6. Deberías ver la petición y el envío

### 7. Checklist de Verificación Rápida

Marca cada punto:

**En Google Apps Script:**
- [ ] CONFIG.EMAIL_REMITENTE configurado con email real
- [ ] CONFIG.API_SECRET_KEY cambiada (no la default)
- [ ] Permisos de Gmail autorizados
- [ ] Web App desplegada correctamente
- [ ] testEnviarCorreo() ejecutado y correo recibido

**En el Frontend:**
- [ ] .env.local existe en la raíz
- [ ] VITE_GOOGLE_SCRIPT_URL con URL correcta
- [ ] VITE_GOOGLE_SCRIPT_API_KEY igual a la del script
- [ ] Servidor reiniciado después de cambiar .env

**En Supabase:**
- [ ] Tabla clientes tiene columna email
- [ ] Clientes tienen emails válidos
- [ ] Tabla suscripciones tiene ultimo_recordatorio_cobro

## Logs de Ejemplo Exitoso

```
=== NUEVA SOLICITUD RECIBIDA ===
Timestamp: 2026-01-01T12:00:00.000Z
Datos recibidos: {
  "apiKey":"...",
  "clienteEmail":"cliente@empresa.com",
  "clienteNombre":"Juan Pérez",
  "proyectoNombre":"Sistema Web",
  "mensualidad":5000,
  "diasAtraso":3,
  "fechaVencimiento":"2025-12-28"
}
✓ Autenticación exitosa
✓ Datos validados correctamente
=== INICIANDO ENVÍO DE CORREO ===
Email destino: cliente@empresa.com
Cliente: Juan Pérez
Proyecto: Sistema Web
Asunto: Recordatorio de Pago - Sistema Web
HTML generado, longitud: 8234
Intentando enviar correo desde: tu-email@gmail.com
✓ Correo enviado exitosamente a: cliente@empresa.com
=== FIN ENVÍO EXITOSO ===
Resultado del envío: {
  "success":true,
  "message":"Recordatorio enviado exitosamente",
  "emailEnviado":"cliente@empresa.com",
  "timestamp":"2026-01-01T12:00:00.000Z"
}
=== FIN DE SOLICITUD ===
```

## Contacto

Si después de seguir todos estos pasos aún no funciona:

1. Copia los logs completos de Google Apps Script
2. Copia el contenido de tu CONFIG (sin la API_SECRET_KEY)
3. Indica qué paso específico falla

## Notas Importantes

- **Primer correo siempre va a Spam:** Es normal, márcalo como "No es spam"
- **Gmail tiene límites:** 100 emails/día para cuentas gratuitas
- **Espera 1-2 minutos:** A veces Gmail tarda en entregar
- **Revisa todas las carpetas:** Promociones, Social, etc.
