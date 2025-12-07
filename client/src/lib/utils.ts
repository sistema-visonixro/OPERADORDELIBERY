import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte una fecha UTC a horario hondureño (UTC-6)
 */
export function toHondurasTime(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  
  // Crear una nueva fecha ajustada a UTC-6 (Honduras)
  const hondurasOffset = -6 * 60; // -6 horas en minutos
  const utcTime = d.getTime();
  const hondurasTime = new Date(utcTime + (hondurasOffset * 60 * 1000));
  
  return hondurasTime;
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
  
  // Convertir a horario hondureño para mostrar
  const hondurasDate = toHondurasTime(d);
  if (!hondurasDate) return "-";
  
  return new Intl.DateTimeFormat("es-HN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Tegucigalpa",
  }).format(hondurasDate);
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  // Convertir a horario hondureño para mostrar
  const hondurasDate = toHondurasTime(d);
  if (!hondurasDate) return "-";
  
  return new Intl.DateTimeFormat("es-HN", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Tegucigalpa",
  }).format(hondurasDate);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  
  // Convertir a horario hondureño para mostrar
  const hondurasDate = toHondurasTime(d);
  if (!hondurasDate) return "-";
  
  return new Intl.DateTimeFormat("es-HN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Tegucigalpa",
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
  const hondurasDue = toHondurasTime(due);
  if (!hondurasDue) return 0;
  
  const today = new Date();
  const hondurasToday = toHondurasTime(today);
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
