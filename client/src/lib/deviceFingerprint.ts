/**
 * Genera un fingerprint único del dispositivo basado en características del navegador
 * Este fingerprint se usa para identificar y autorizar dispositivos
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // User Agent
  components.push(navigator.userAgent);

  // Idioma
  components.push(navigator.language);

  // Zona horaria
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Resolución de pantalla
  components.push(`${screen.width}x${screen.height}`);

  // Profundidad de color
  components.push(String(screen.colorDepth));

  // Hardware concurrency (número de procesadores)
  components.push(String(navigator.hardwareConcurrency || "unknown"));

  // Platform
  components.push(navigator.platform);

  // Touch support
  components.push(String("ontouchstart" in window));

  // Canvas fingerprint (más robusto)
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Visonixro", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("Visonixro", 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    components.push("canvas-error");
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch (e) {
    components.push("webgl-error");
  }

  // Combinar todos los componentes
  const fingerprint = components.join("|||");

  // Generar hash SHA-256
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(fingerprint)
  );

  // Convertir a string hexadecimal
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}
