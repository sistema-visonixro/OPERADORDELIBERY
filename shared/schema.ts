import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Payment types
export const PAYMENT_TYPES = ["unico", "cuotas", "suscripcion"] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];

// Payment status
export const PAYMENT_STATUS = ["pagado", "pendiente", "vencido"] as const;
export type PaymentStatus = typeof PAYMENT_STATUS[number];

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  projectName: text("project_name").notNull(),
  projectDescription: text("project_description"),
  paymentType: text("payment_type").notNull().$type<PaymentType>(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  numberOfPayments: integer("number_of_payments").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().$type<PaymentStatus>(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  paymentNumber: integer("payment_number").default(1),
  notes: text("notes"),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  monthlyAmount: numeric("monthly_amount", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  isActive: boolean("is_active").default(true),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDate: timestamp("next_payment_date"),
});

// Estado de Cuenta table (Movimientos/Transacciones)
export const estadoCuenta = pgTable("estado_cuenta", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clienteId: varchar("cliente_id").notNull(),
  proyectoId: varchar("proyecto_id").notNull(),
  tipo: text("tipo").notNull().$type<'contrato' | 'suscripcion'>(),
  monto: numeric("monto", { precision: 10, scale: 2 }).notNull(),
  saldoActual: numeric("saldo_actual", { precision: 10, scale: 2 }).notNull(),
  nota: text("nota"),
  fecha: timestamp("fecha").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table (for future auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
});

export const insertEstadoCuentaSchema = createInsertSchema(estadoCuenta).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type EstadoCuenta = typeof estadoCuenta.$inferSelect;
export type InsertEstadoCuenta = z.infer<typeof insertEstadoCuentaSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Extended types for frontend
export interface ClientWithPayments extends Client {
  payments: Payment[];
  subscription?: Subscription;
  amountPaid: number;
  amountPending: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalClients: number;
  pendingPayments: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  overduePayments: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  subscriptions: number;
  oneTime: number;
}

// Avances (Project Progress) types
export const AVANCE_ESTADOS = ["en_progreso", "completado", "pausado", "cancelado"] as const;
export type AvanceEstado = typeof AVANCE_ESTADOS[number];

export interface Avance {
  id: string;
  cliente_id: string;
  contrato_id: string;
  nombre_proyecto: string;
  descripcion: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  total_caracteristicas: number;
  caracteristicas_completadas: number;
  porcentaje_avance: number;
  estado: AvanceEstado;
  created_at: string;
  updated_at: string;
}

export interface AvanceCaracteristica {
  id: string;
  avance_id: string;
  nombre: string;
  descripcion: string | null;
  completada: boolean;
  fecha_completado: string | null;
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface InsertAvance {
  cliente_id: string;
  contrato_id: string;
  nombre_proyecto: string;
  descripcion?: string | null;
}

export interface InsertAvanceCaracteristica {
  avance_id: string;
  nombre: string;
  descripcion?: string | null;
  orden?: number;
}

export interface AvanceWithDetails extends Avance {
  cliente_nombre: string;
  proyecto_nombre: string;
  caracteristicas: AvanceCaracteristica[];
}
