/**
 * SCRIPT DE GOOGLE APPS SCRIPT PARA ENVIAR RECORDATORIOS DE COBRO
 *
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 1. Ve a https://script.google.com
 * 2. Crea un nuevo proyecto
 * 3. Pega este código
 * 4. Configura las variables en la sección CONFIGURACIÓN
 * 5. Despliega como Web App:
 *    - Ejecutar como: Tu cuenta
 *    - Acceso: Cualquiera
 * 6. Copia la URL del Web App y úsala en tu frontend
 */

// ========================================
// CONFIGURACIÓN - EDITA ESTOS VALORES
// ========================================

const CONFIG = {
  // Email del remitente (tu email de Gmail)
  EMAIL_REMITENTE: "tu-email@gmail.com",

  // Nombre de tu empresa
  NOMBRE_EMPRESA: "Visonix",

  // Información de contacto
  TELEFONO_EMPRESA: "+504 1234-5678",
  EMAIL_EMPRESA: "contacto@visonix.com",

  // Clave secreta para autenticación (cámbiala por algo único)
  API_SECRET_KEY: "tu-clave-secreta-aqui-12345",
};

// ========================================
// FUNCIÓN PRINCIPAL - WEB APP ENDPOINT
// ========================================

function doPost(e) {
  try {
    Logger.log("=== NUEVA SOLICITUD RECIBIDA ===");
    Logger.log("Timestamp: " + new Date().toISOString());
    
    // Parsear el cuerpo de la solicitud
    const data = JSON.parse(e.postData.contents);
    Logger.log("Datos recibidos: " + JSON.stringify(data));

    // Verificar autenticación
    if (data.apiKey !== CONFIG.API_SECRET_KEY) {
      Logger.log("ERROR: Autenticación fallida");
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Autenticación fallida",
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    Logger.log("✓ Autenticación exitosa");

    // Validar datos requeridos
    if (!data.clienteEmail || !data.clienteNombre || !data.proyectoNombre) {
      Logger.log("ERROR: Faltan datos requeridos");
      Logger.log("clienteEmail: " + data.clienteEmail);
      Logger.log("clienteNombre: " + data.clienteNombre);
      Logger.log("proyectoNombre: " + data.proyectoNombre);
      
      return ContentService.createTextOutput(
        JSON.stringify({
          success: false,
          error: "Faltan datos requeridos",
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    Logger.log("✓ Datos validados correctamente");

    // Enviar el correo
    const resultado = enviarRecordatorioCobro(
      data.clienteEmail,
      data.clienteNombre,
      data.proyectoNombre,
      data.mensualidad,
      data.diasAtraso,
      data.fechaVencimiento
    );

    Logger.log("Resultado del envío: " + JSON.stringify(resultado));
    Logger.log("=== FIN DE SOLICITUD ===");

    return ContentService.createTextOutput(
      JSON.stringify(resultado)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log("ERROR CRÍTICO EN doPost: " + error.toString());
    Logger.log("Stack: " + error.stack);
    
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// FUNCIÓN PARA ENVIAR EL RECORDATORIO
// ========================================

function enviarRecordatorioCobro(
  clienteEmail,
  clienteNombre,
  proyectoNombre,
  mensualidad,
  diasAtraso,
  fechaVencimiento
) {
  try {
    // Log de entrada
    Logger.log("=== INICIANDO ENVÍO DE CORREO ===");
    Logger.log("Email destino: " + clienteEmail);
    Logger.log("Cliente: " + clienteNombre);
    Logger.log("Proyecto: " + proyectoNombre);
    
    // Validar que el email existe
    if (!clienteEmail || clienteEmail.trim() === "") {
      Logger.log("ERROR: Email del cliente no proporcionado");
      return {
        success: false,
        error: "Email del cliente no configurado",
      };
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clienteEmail.trim())) {
      Logger.log("ERROR: Formato de email inválido: " + clienteEmail);
      return {
        success: false,
        error: "Formato de email inválido",
      };
    }

    // Generar el contenido del correo
    const asunto = `Recordatorio de Pago - ${proyectoNombre}`;
    Logger.log("Asunto: " + asunto);
    
    const cuerpoHTML = generarHTMLCorreo(
      clienteNombre,
      proyectoNombre,
      mensualidad,
      diasAtraso,
      fechaVencimiento
    );
    
    Logger.log("HTML generado, longitud: " + cuerpoHTML.length);

    // Verificar que CONFIG.EMAIL_REMITENTE esté configurado
    if (!CONFIG.EMAIL_REMITENTE || CONFIG.EMAIL_REMITENTE === "tu-email@gmail.com") {
      Logger.log("ERROR: EMAIL_REMITENTE no configurado en CONFIG");
      return {
        success: false,
        error: "Email del remitente no configurado. Por favor configura CONFIG.EMAIL_REMITENTE en el script.",
      };
    }

    // Enviar el correo
    Logger.log("Intentando enviar correo desde: " + CONFIG.EMAIL_REMITENTE);
    
    GmailApp.sendEmail(
      clienteEmail.trim(),
      asunto,
      `Recordatorio de Pago para ${proyectoNombre}\n\nMonto: L${mensualidad}\nDías de atraso: ${diasAtraso}\n\nPor favor contacte a ${CONFIG.EMAIL_EMPRESA}`, // Texto plano como fallback
      {
        htmlBody: cuerpoHTML,
        name: CONFIG.NOMBRE_EMPRESA,
        from: CONFIG.EMAIL_REMITENTE,
        replyTo: CONFIG.EMAIL_EMPRESA,
      }
    );

    Logger.log("✓ Correo enviado exitosamente a: " + clienteEmail);
    Logger.log("=== FIN ENVÍO EXITOSO ===");

    return {
      success: true,
      message: "Recordatorio enviado exitosamente",
      emailEnviado: clienteEmail,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    Logger.log("✗ ERROR ENVIANDO CORREO: " + error.toString());
    Logger.log("Stack trace: " + error.stack);
    Logger.log("=== FIN CON ERROR ===");
    
    return {
      success: false,
      error: "Error al enviar el correo: " + error.toString(),
      detalles: error.message,
    };
  }
}

// ========================================
// PLANTILLA HTML DEL CORREO
// ========================================

function generarHTMLCorreo(
  clienteNombre,
  proyectoNombre,
  mensualidad,
  diasAtraso,
  fechaVencimiento
) {
  const fechaFormateada = new Date(fechaVencimiento).toLocaleDateString(
    "es-HN",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Pago</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                ${CONFIG.NOMBRE_EMPRESA}
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                Recordatorio de Pago
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">
                Estimado/a <strong>${clienteNombre}</strong>,
              </p>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
                Le escribimos para recordarle que su pago correspondiente a la suscripción de 
                <strong style="color: #667eea;">${proyectoNombre}</strong> se encuentra pendiente.
              </p>
              
              <!-- Información del Pago -->
              <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="border-bottom: 1px solid #e9ecef; padding: 15px;">
                    <strong style="color: #666666; font-size: 14px;">Proyecto:</strong><br>
                    <span style="color: #333333; font-size: 16px;">${proyectoNombre}</span>
                  </td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e9ecef; padding: 15px;">
                    <strong style="color: #666666; font-size: 14px;">Monto a pagar:</strong><br>
                    <span style="color: #667eea; font-size: 20px; font-weight: bold;">L ${parseFloat(
                      mensualidad
                    ).toFixed(2)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e9ecef; padding: 15px;">
                    <strong style="color: #666666; font-size: 14px;">Fecha de vencimiento:</strong><br>
                    <span style="color: #333333; font-size: 16px;">${fechaFormateada}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px;">
                    <strong style="color: #dc3545; font-size: 14px;">Días de atraso:</strong><br>
                    <span style="color: #dc3545; font-size: 18px; font-weight: bold;">${diasAtraso} día${
    diasAtraso > 1 ? "s" : ""
  }</span>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 16px; color: #333333; line-height: 1.6; margin: 20px 0;">
                Le solicitamos amablemente que realice el pago a la brevedad posible para mantener 
                su cuenta al día y evitar la suspensión del servicio.
              </p>
              
              <!-- Botón de Contacto -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="mailto:${CONFIG.EMAIL_EMPRESA}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: #ffffff; padding: 15px 40px; text-decoration: none; 
                              border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Contactar para Pagar
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 20px 0 0 0;">
                Si ya realizó el pago, por favor ignore este mensaje y acepte nuestras disculpas.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">
                <strong>${CONFIG.NOMBRE_EMPRESA}</strong>
              </p>
              <p style="margin: 0 0 5px 0; color: #666666; font-size: 14px;">
                📞 ${CONFIG.TELEFONO_EMPRESA}
              </p>
              <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px;">
                📧 ${CONFIG.EMAIL_EMPRESA}
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} ${
    CONFIG.NOMBRE_EMPRESA
  }. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ========================================
// FUNCIONES DE PRUEBA
// ========================================

/**
 * Función de prueba simple - Envía un correo de prueba
 * Instrucciones:
 * 1. Cambia "tu-email@ejemplo.com" por tu correo real
 * 2. Asegúrate de que CONFIG.EMAIL_REMITENTE esté configurado
 * 3. Selecciona esta función en el menú y haz clic en Ejecutar (▶)
 * 4. Revisa los logs en Ver → Registros
 */
function testEnviarCorreo() {
  Logger.log("=== INICIANDO TEST DE ENVÍO ===");
  
  // IMPORTANTE: Cambia este email por uno real para probar
  const emailPrueba = "tu-email@ejemplo.com";
  
  if (emailPrueba === "tu-email@ejemplo.com") {
    Logger.log("⚠️ ADVERTENCIA: Debes cambiar el email de prueba en la función testEnviarCorreo()");
    return;
  }
  
  const resultado = enviarRecordatorioCobro(
    emailPrueba, // Email del cliente
    "Cliente de Prueba", // Nombre del cliente
    "Sistema Web Test", // Nombre del proyecto
    5000, // Mensualidad (L 5,000)
    3, // Días de atraso
    "2025-12-28" // Fecha de vencimiento
  );

  Logger.log("=== RESULTADO DEL TEST ===");
  Logger.log(JSON.stringify(resultado, null, 2));
  
  if (resultado.success) {
    Logger.log("✓ TEST EXITOSO - Revisa tu bandeja de entrada");
  } else {
    Logger.log("✗ TEST FALLIDO - Revisa el error arriba");
  }
}

/**
 * Función para verificar la configuración
 * Ejecuta esto PRIMERO antes de probar el envío
 */
function verificarConfiguracion() {
  Logger.log("=== VERIFICANDO CONFIGURACIÓN ===");
  
  Logger.log("1. EMAIL_REMITENTE: " + CONFIG.EMAIL_REMITENTE);
  if (CONFIG.EMAIL_REMITENTE === "tu-email@gmail.com") {
    Logger.log("   ✗ ERROR: Debes configurar tu email real en CONFIG.EMAIL_REMITENTE");
  } else {
    Logger.log("   ✓ Configurado");
  }
  
  Logger.log("2. NOMBRE_EMPRESA: " + CONFIG.NOMBRE_EMPRESA);
  Logger.log("   ✓ Configurado");
  
  Logger.log("3. EMAIL_EMPRESA: " + CONFIG.EMAIL_EMPRESA);
  if (CONFIG.EMAIL_EMPRESA === "contacto@visonix.com") {
    Logger.log("   ⚠️ Usando valor por defecto - considera cambiarlo");
  } else {
    Logger.log("   ✓ Configurado");
  }
  
  Logger.log("4. TELEFONO_EMPRESA: " + CONFIG.TELEFONO_EMPRESA);
  Logger.log("   ✓ Configurado");
  
  Logger.log("5. API_SECRET_KEY: " + (CONFIG.API_SECRET_KEY ? "[CONFIGURADA]" : "[NO CONFIGURADA]"));
  if (CONFIG.API_SECRET_KEY === "tu-clave-secreta-aqui-12345") {
    Logger.log("   ⚠️ ADVERTENCIA: Debes cambiar la API_SECRET_KEY por defecto");
  } else {
    Logger.log("   ✓ Configurado");
  }
  
  Logger.log("\n=== PERMISOS DE GMAIL ===");
  try {
    const threads = GmailApp.getInboxThreads(0, 1);
    Logger.log("✓ Acceso a Gmail confirmado");
  } catch (e) {
    Logger.log("✗ ERROR: No tienes permisos de Gmail");
    Logger.log("   Solución: Ejecuta testEnviarCorreo() y autoriza los permisos");
  }
  
  Logger.log("\n=== FIN DE VERIFICACIÓN ===");
}
