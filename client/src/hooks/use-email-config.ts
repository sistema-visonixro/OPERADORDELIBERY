/**
 * Hook de configuración para el sistema de recordatorios de cobro por email
 * 
 * IMPORTANTE: Este archivo contiene la URL y API Key del Google Apps Script.
 * Estos valores son seguros de exponer en el cliente porque:
 * - La URL del script ya es pública (desplegada como "Anyone")
 * - La API Key es solo para prevenir spam básico, no es crítica de seguridad
 * - El Google Script tiene su propia validación de permisos
 */

export function useEmailConfig() {
  return {
    // URL del Google Apps Script desplegado como Web App
    scriptUrl: "https://script.google.com/macros/s/AKfycbxPtwmP-q98N8sVaeYDmRVMo2gLE56vIqQErwBjPnoUoAZ9jholfe0Al_P9VtLCXsZ04g/exec",
    
    // API Key para autenticación básica (debe coincidir con la del Google Script)
    apiKey: "tu-clave-secreta-muy-segura-12345",
    
    // Información de contacto de la empresa (opcional, se puede personalizar)
    contactInfo: {
      telefono: "+504 1234-5678",
      email: "contacto@visonix.com",
      nombreEmpresa: "Visonix",
    },
  };
}

/**
 * Función helper para enviar recordatorio de cobro
 */
export async function enviarRecordatorioEmail(datos: {
  clienteEmail: string;
  clienteNombre: string;
  proyectoNombre: string;
  mensualidad: number;
  diasAtraso: number;
  fechaVencimiento: string;
}) {
  const config = useEmailConfig();
  
  try {
    // Construir URL GET con parámetros mínimos esperados por el Google Script
    const url = new URL(config.scriptUrl);
    url.searchParams.set("email", String(datos.clienteEmail || ""));
    url.searchParams.set("nombre", String(datos.clienteNombre || ""));
    // agregar apiKey para validación básica en el script
    if (config.apiKey) url.searchParams.set("apiKey", config.apiKey);

    // Opcional: agregar metadatos para registro en script (no obligatorios)
    if (typeof datos.proyectoNombre !== "undefined")
      url.searchParams.set("proyectoNombre", String(datos.proyectoNombre));
    if (typeof datos.mensualidad !== "undefined")
      url.searchParams.set("mensualidad", String(datos.mensualidad));
    if (typeof datos.diasAtraso !== "undefined")
      url.searchParams.set("diasAtraso", String(datos.diasAtraso));
    if (typeof datos.fechaVencimiento !== "undefined")
      url.searchParams.set("fechaVencimiento", String(datos.fechaVencimiento));

    // Usar GET con mode no-cors para evitar bloqueos CORS en Apps Script
    await fetch(url.toString(), {
      method: "GET",
      mode: "no-cors",
    });

    return {
      success: true,
      message: "Recordatorio enviado exitosamente",
      url: url.toString(),
    };
  } catch (error) {
    console.error("Error enviando recordatorio:", error);
    throw error;
  }
}
