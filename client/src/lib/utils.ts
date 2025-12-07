import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ============================================================================
 * SISTEMA DE MANEJO DE ZONA HORARIA PARA HONDURAS (UTC-6)
 * ============================================================================
 * 
 * REGLAS FUNDAMENTALES:
 * 
 * 1. SUPABASE (Base de datos):
 *    - Todas las fechas se guardan en TIMESTAMPTZ (UTC)
 *    - Ejemplo: "2025-12-07T14:00:00Z" = 2:00 PM UTC
 * 
 * 2. FRONTEND (Usuario en Honduras):
 *    - El usuario ve y trabaja en horario hondureño (UTC-6)
 *    - Ejemplo: "2025-12-07 08:00 AM" = 8:00 AM en Honduras
 * 
 * 3. CONVERSIONES:
 *    a) AL GUARDAR (Honduras → UTC): Sumar 6 horas
 *       - Usuario ingresa: "2025-12-07 08:00 AM" en Honduras
 *       - Se guarda como: "2025-12-07T14:00:00Z" en UTC
 *       - Usar: hondurasToUTC()
 * 
 *    b) AL MOSTRAR (UTC → Honduras): Restar 6 horas
 *       - Base de datos tiene: "2025-12-07T14:00:00Z" en UTC
 *       - Se muestra como: "2025-12-07 08:00 AM" en Honduras
 *       - Usar: utcToHondurasDate()
 * 
 *    c) FILTROS DE FECHA:
 *       - Para filtrar un día completo en Honduras, usar:
 *         getHondurasDayStartUTC() y getHondurasDayEndUTC()
 *       - Ejemplo: Filtrar 7 de diciembre 2025 en Honduras
 *         Inicio: "2025-12-07 00:00:00" HN → "2025-12-07T06:00:00Z" UTC
 *         Final: "2025-12-07 23:59:59" HN → "2025-12-08T05:59:59Z" UTC
 * 
 * 4. FUNCIONES DISPONIBLES:
 *    - hondurasToUTC(localDateString): Convierte fecha local a UTC para guardar
 *    - getHondurasDayStartUTC(dateString): Inicio del día en HN convertido a UTC
 *    - getHondurasDayEndUTC(dateString): Final del día en HN convertido a UTC
 *    - utcToHondurasDate(utcDate): Convierte fecha UTC a Date en horario HN
 *    - nowInHondurasAsUTC(): Obtiene la hora actual en UTC
 * 
 * ============================================================================
 */

/**
 * Convierte una fecha/hora de horario hondureño (UTC-6) a UTC para guardar en Supabase
 * @param localDateString - String de fecha en formato 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm'
 * @returns ISO string en UTC para guardar en la base de datos
 */
export function hondurasToUTC(localDateString: string): string {
  if (!localDateString) return new Date().toISOString();
  
  // Si solo es fecha (YYYY-MM-DD), agregar hora 00:00:00
  const dateStr = localDateString.includes('T') ? localDateString : `${localDateString}T00:00:00`;
  
  // Crear fecha interpretando el string como horario de Honduras (UTC-6)
  const localDate = new Date(dateStr);
  
  // Sumar 6 horas para convertir de Honduras (UTC-6) a UTC
  localDate.setHours(localDate.getHours() + 6);
  
  return localDate.toISOString();
}

/**
 * Obtiene el inicio del día en horario hondureño convertido a UTC
 * Para filtros de "desde fecha"
 */
export function getHondurasDayStartUTC(dateString: string): string {
  if (!dateString) return '';
  // Inicio del día: 00:00:00 en Honduras
  const startStr = `${dateString}T00:00:00`;
  const localDate = new Date(startStr);
  // Convertir a UTC sumando 6 horas
  localDate.setHours(localDate.getHours() + 6);
  return localDate.toISOString();
}

/**
 * Obtiene el final del día en horario hondureño convertido a UTC
 * Para filtros de "hasta fecha"
 */
export function getHondurasDayEndUTC(dateString: string): string {
  if (!dateString) return '';
  // Final del día: 23:59:59 en Honduras
  const endStr = `${dateString}T23:59:59`;
  const localDate = new Date(endStr);
  // Convertir a UTC sumando 6 horas
  localDate.setHours(localDate.getHours() + 6);
  return localDate.toISOString();
}

/**
 * Convierte una fecha UTC de Supabase a Date para mostrar en horario hondureño
 */
export function utcToHondurasDate(utcDate: Date | string | null | undefined): Date | null {
  if (!utcDate) return null;
  const d = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  if (isNaN(d.getTime())) return null;
  
  // La fecha viene en UTC, restarle 6 horas para obtener hora de Honduras
  const hondurasTime = new Date(d.getTime() - (6 * 60 * 60 * 1000));
  return hondurasTime;
}

/**
 * Obtiene la fecha/hora actual en horario hondureño como ISO string en UTC
 * Para usar en inserts con new Date().toISOString()
 */
export function nowInHondurasAsUTC(): string {
  const now = new Date();
  // La hora actual del sistema ya está en UTC, solo retornamos el ISO
  return now.toISOString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace("HNL", "L");
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  // La fecha viene en UTC, convertir a horario hondureño
  const hondurasDate = utcToHondurasDate(d);
  if (!hondurasDate) return "-";
  
  return new Intl.DateTimeFormat("es-HN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(hondurasDate);
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  // La fecha viene en UTC, convertir a horario hondureño
  const hondurasDate = utcToHondurasDate(d);
  if (!hondurasDate) return "-";
  
  return new Intl.DateTimeFormat("es-HN", {
    day: "2-digit",
    month: "short",
  }).format(hondurasDate);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  // La fecha viene en UTC, convertir a horario hondureño
  const hondurasDate = utcToHondurasDate(d);
  if (!hondurasDate) return "-";
  
  return new Intl.DateTimeFormat("es-HN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(hondurasDate);
}

export function getPaymentTypeLabel(type: string): string {
  switch (type) {
    case "unico":
      return "Pago Unico";
    case "cuotas":
      return "Cuotas";
    case "suscripcion":
      return "Suscripcion";
    default:
      return type;
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "pagado":
      return "Pagado";
    case "pendiente":
      return "Pendiente";
    case "vencido":
      return "Vencido";
    default:
      return status;
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getDaysUntilDue(dueDate: Date | string): number {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const hondurasDue = utcToHondurasDate(due);
  if (!hondurasDue) return 0;
  
  const today = new Date();
  const hondurasToday = utcToHondurasDate(today);
  if (!hondurasToday) return 0;
  
  hondurasToday.setHours(0, 0, 0, 0);
  hondurasDue.setHours(0, 0, 0, 0);
  
  const diffTime = hondurasDue.getTime() - hondurasToday.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getMonthName(monthIndex: number): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];
  return months[monthIndex];
}
