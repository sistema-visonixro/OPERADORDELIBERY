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
