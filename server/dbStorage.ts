import { supabase } from './supabase';
import {
  type Client,
  type InsertClient,
  type Payment,
  type InsertPayment,
  type Subscription,
  type InsertSubscription,
  type User,
  type InsertUser,
  type ClientWithPayments,
  type DashboardStats,
  type MonthlyRevenue,
} from '@shared/schema';

import { randomUUID } from 'crypto';

export class DbStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) throw error;
    return data as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).limit(1).maybeSingle();
    if (error) throw error;
    return data as User | undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const payload = { ...insertUser, id: randomUUID() } as any;
    const { data, error } = await supabase.from('users').insert(payload).select().single();
    if (error) throw error;
    return data as User;
  }

  // Clients
  async getClients(): Promise<ClientWithPayments[]> {
    const { data: clients, error } = await supabase.from('clients').select('*');
    if (error) throw error;

    const result: ClientWithPayments[] = [];

    for (const c of clients as Client[]) {
      const payments = await this.getPaymentsByClient(c.id);
      const subscription = await this.getSubscriptionByClient(c.id);

      const amountPaid = payments.filter(p => p.status === 'pagado').reduce((s, p) => s + Number(p.amount), 0);
      const amountPending = payments.filter(p => p.status !== 'pagado').reduce((s, p) => s + Number(p.amount), 0);

      result.push({ ...c, payments, subscription: subscription || undefined, amountPaid, amountPending });
    }

    return result;
  }

  async getClient(id: string): Promise<ClientWithPayments | undefined> {
    const { data: client, error } = await supabase.from('clients').select('*').eq('id', id).limit(1).maybeSingle();
    if (error) throw error;
    if (!client) return undefined;

    const payments = await this.getPaymentsByClient(id);
    const subscription = await this.getSubscriptionByClient(id);

    const amountPaid = payments.filter(p => p.status === 'pagado').reduce((s, p) => s + Number(p.amount), 0);
    const amountPending = payments.filter(p => p.status !== 'pagado').reduce((s, p) => s + Number(p.amount), 0);

    return { ...client as Client, payments, subscription: subscription || undefined, amountPaid, amountPending } as ClientWithPayments;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const payload = { ...insertClient, id: randomUUID(), created_at: new Date().toISOString() } as any;
    const { data, error } = await supabase.from('clients').insert(payload).select().single();
    if (error) throw error;
    const client = data as Client;

    // If subscription, create subscription and initial payment(s) if provided
    if ((insertClient as any).paymentType === 'suscripcion') {
      const mensualidad = (insertClient as any).mensualidad ?? insertClient.totalAmount;
      const fechaPagoInicial = (insertClient as any).fechaPagoInicial ?? new Date().toISOString();
      const pagoDeInstalacion = (insertClient as any).pagoDeInstalacion ?? null;

      if (mensualidad) {
        const subPayload: InsertSubscription = {
          clientId: client.id,
          monthlyAmount: String(mensualidad),
          startDate: new Date(fechaPagoInicial),
          isActive: true,
          lastPaymentDate: null,
          nextPaymentDate: new Date(),
        } as unknown as InsertSubscription;

        await this.createSubscription(subPayload);
      }

      if (pagoDeInstalacion && Number(pagoDeInstalacion) > 0) {
        const paymentPayload: InsertPayment = {
          clientId: client.id,
          amount: String(pagoDeInstalacion),
          status: 'pendiente',
          dueDate: new Date(fechaPagoInicial),
          paidDate: null,
          paymentNumber: 1,
          notes: 'Pago de instalación',
        } as unknown as InsertPayment;

        await this.createPayment(paymentPayload);
      }
    } else {
      // Create payments for unico or cuotas
      const numPayments = (insertClient as any).numberOfPayments || 1;
      const total = Number((insertClient as any).totalAmount || 0);
      const paymentAmount = +(total / numPayments).toFixed(2);

      for (let i = 0; i < numPayments; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        const paymentPayload: InsertPayment = {
          clientId: client.id,
          amount: String(paymentAmount),
          status: 'pendiente',
          dueDate,
          paidDate: null,
          paymentNumber: i + 1,
          notes: null,
        } as unknown as InsertPayment;

        await this.createPayment(paymentPayload);
      }
    }

    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Client;
  }

  async deleteClient(id: string): Promise<boolean> {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // Payments
  async getPayments(): Promise<(Payment & { clientName: string; projectName: string })[]> {
    const { data: payments, error } = await supabase.from('payments').select('*');
    if (error) throw error;

    const result: (Payment & { clientName: string; projectName: string })[] = [];
    for (const p of payments as Payment[]) {
      const { data: client } = await supabase.from('clients').select('name, project_name').eq('id', p.clientId).limit(1).maybeSingle();
      result.push({ ...p, clientName: client?.name || 'Cliente Eliminado', projectName: client?.project_name || '' });
    }
    return result.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  async getPaymentsByClient(clientId: string): Promise<Payment[]> {
    const { data, error } = await supabase.from('payments').select('*').eq('client_id', clientId).order('payment_number', { ascending: true });
    if (error) throw error;
    return (data as any) as Payment[];
  }

  async getRecentPayments(): Promise<{ payment: Payment; clientName: string }[]> {
    const { data, error } = await supabase.from('payments').select('*').neq('paid_date', null).eq('status', 'pagado').order('paid_date', { ascending: false }).limit(10);
    if (error) throw error;
    return (data as Payment[]).map(p => ({ payment: p, clientName: '' }));
  }

  async getUpcomingPayments(): Promise<{ payment: Payment; clientName: string }[]> {
    const { data, error } = await supabase.from('payments').select('*').neq('status', 'pagado').order('due_date', { ascending: true }).limit(10);
    if (error) throw error;
    return (data as Payment[]).map(p => ({ payment: p, clientName: '' }));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const payload = { ...payment, id: randomUUID() } as any;
    const { data, error } = await supabase.from('payments').insert(payload).select().single();
    if (error) throw error;
    return data as Payment;
  }

  async markPaymentAsPaid(id: string): Promise<Payment | undefined> {
    const paidDate = new Date().toISOString();
    const { data, error } = await supabase.from('payments').update({ status: 'pagado', paid_date: paidDate }).eq('id', id).select().single();
    if (error) throw error;

    // handle subscription renewal: find subscription for client and create next payment
    const payment = data as Payment;
    const { data: subscription } = await supabase.from('subscriptions').select('*').eq('client_id', payment.clientId).limit(1).maybeSingle();
    if (subscription) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);

      await supabase.from('subscriptions').update({ last_payment_date: new Date().toISOString(), next_payment_date: nextDate.toISOString() }).eq('id', subscription.id);

      const newPayment = {
        id: randomUUID(),
        client_id: payment.clientId,
        amount: subscription.monthly_amount,
        status: 'pendiente',
        due_date: nextDate.toISOString(),
        paid_date: null,
        payment_number: (payment.paymentNumber || 0) + 1,
        notes: 'Suscripcion mensual',
      };
      await supabase.from('payments').insert(newPayment);
    }

    return data as Payment;
  }

  // Subscriptions
  async getSubscriptions(): Promise<(Subscription & { clientName: string; clientEmail: string; projectName: string })[]> {
    const { data, error } = await supabase.from('subscriptions').select('*');
    if (error) throw error;
    const result: any[] = [];
    for (const s of data as Subscription[]) {
      const { data: client } = await supabase.from('clients').select('name, email, project_name').eq('id', s.clientId).limit(1).maybeSingle();
      result.push({ ...s, clientName: client?.name || 'Cliente Eliminado', clientEmail: client?.email || '', projectName: client?.project_name || '' });
    }
    return result;
  }

  async getSubscriptionByClient(clientId: string): Promise<Subscription | undefined> {
    const { data, error } = await supabase.from('subscriptions').select('*').eq('client_id', clientId).limit(1).maybeSingle();
    if (error) throw error;
    return data as Subscription | undefined;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const payload = { ...subscription, id: randomUUID() } as any;
    const { data, error } = await supabase.from('subscriptions').insert(payload).select().single();
    if (error) throw error;
    return data as Subscription;
  }

  async toggleSubscription(id: string, isActive: boolean): Promise<Subscription | undefined> {
    const { data, error } = await supabase.from('subscriptions').update({ is_active: isActive }).eq('id', id).select().single();
    if (error) throw error;
    return data as Subscription;
  }

  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const { data: clients } = await supabase.from('clients').select('*');
    const { data: payments } = await supabase.from('payments').select('*');
    const { data: subscriptions } = await supabase.from('subscriptions').select('*');

    const totalRevenue = (payments as Payment[]).filter(p => p.status === 'pagado').reduce((s, p) => s + Number(p.amount), 0);
    const pendingPayments = (payments as Payment[]).filter(p => p.status === 'pendiente').length;
    const overduePayments = (payments as Payment[]).filter(p => p.status === 'vencido').length;
    const activeSubscriptions = (subscriptions as Subscription[]).filter(s => s.isActive || (s as any).is_active);
    const monthlyRecurringRevenue = activeSubscriptions.reduce((s, sub) => s + Number((sub as any).monthly_amount ?? (sub as any).monthlyAmount), 0);

    return {
      totalRevenue,
      totalClients: (clients as any[]).length,
      pendingPayments,
      activeSubscriptions: activeSubscriptions.length,
      monthlyRecurringRevenue,
      overduePayments,
    } as DashboardStats;
  }

  async getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
    const { data: payments } = await supabase.from('payments').select('*').neq('paid_date', null);
    const months: MonthlyRevenue[] = [];
    const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthPayments = (payments as Payment[]).filter(p => {
        const pd = new Date(p.paidDate || (p as any).paid_date);
        return pd.getMonth() === month && pd.getFullYear() === year;
      });

      const subscriptionPayments = monthPayments.filter(p => p.notes?.includes('Suscripcion') || false);
      const oneTimePayments = monthPayments.filter(p => !p.notes?.includes('Suscripcion'));

      months.push({
        month: monthNames[month],
        revenue: monthPayments.reduce((s, p) => s + Number(p.amount), 0),
        subscriptions: subscriptionPayments.reduce((s, p) => s + Number(p.amount), 0),
        oneTime: oneTimePayments.reduce((s, p) => s + Number(p.amount), 0),
      });
    }

    return months;
  }
}

export const dbStorage = new DbStorage();
