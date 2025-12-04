import { 
  type Client, type InsertClient,
  type Payment, type InsertPayment,
  type Subscription, type InsertSubscription,
  type User, type InsertUser,
  type ClientWithPayments,
  type DashboardStats,
  type MonthlyRevenue,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clients
  getClients(): Promise<ClientWithPayments[]>;
  getClient(id: string): Promise<ClientWithPayments | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Payments
  getPayments(): Promise<(Payment & { clientName: string; projectName: string })[]>;
  getPaymentsByClient(clientId: string): Promise<Payment[]>;
  getRecentPayments(): Promise<{ payment: Payment; clientName: string }[]>;
  getUpcomingPayments(): Promise<{ payment: Payment; clientName: string }[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  markPaymentAsPaid(id: string): Promise<Payment | undefined>;
  
  // Subscriptions
  getSubscriptions(): Promise<(Subscription & { clientName: string; clientEmail: string; projectName: string })[]>;
  getSubscriptionByClient(clientId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  toggleSubscription(id: string, isActive: boolean): Promise<Subscription | undefined>;
  
  // Stats
  getDashboardStats(): Promise<DashboardStats>;
  getMonthlyRevenue(): Promise<MonthlyRevenue[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private clients: Map<string, Client>;
  private payments: Map<string, Payment>;
  private subscriptions: Map<string, Subscription>;

  constructor() {
    this.users = new Map();
    this.clients = new Map();
    this.payments = new Map();
    this.subscriptions = new Map();
    
    this.seedData();
  }

  private seedData() {
    const now = new Date();
    const getDate = (daysAgo: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return d;
    };
    const getFutureDate = (daysAhead: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysAhead);
      return d;
    };

    const clientsData: (InsertClient & { id: string })[] = [
      {
        id: "c1",
        name: "Maria Elena Rodriguez",
        email: "maria.rodriguez@email.hn",
        phone: "+504 9845-6721",
        projectName: "Boutique Elegance",
        projectDescription: "Tienda online de ropa y accesorios para dama",
        paymentType: "unico",
        totalAmount: "18000",
        numberOfPayments: 1,
      },
      {
        id: "c2",
        name: "Carlos Alberto Mejia",
        email: "carlos.mejia@empresa.hn",
        phone: "+504 9912-3456",
        projectName: "Ferreteria El Constructor",
        projectDescription: "Catalogo digital con cotizaciones online",
        paymentType: "cuotas",
        totalAmount: "25000",
        numberOfPayments: 3,
      },
      {
        id: "c3",
        name: "Ana Patricia Flores",
        email: "ana.flores@gmail.com",
        phone: "+504 8876-5432",
        projectName: "Clinica Dental Sonrisas",
        projectDescription: "Sistema de citas y pagina informativa",
        paymentType: "suscripcion",
        totalAmount: "2500",
        numberOfPayments: 1,
      },
      {
        id: "c4",
        name: "Roberto Jose Hernandez",
        email: "rjhernandez@outlook.com",
        phone: "+504 9567-8901",
        projectName: "Taller Mecanico RH",
        projectDescription: "Landing page con formulario de contacto",
        paymentType: "unico",
        totalAmount: "8500",
        numberOfPayments: 1,
      },
      {
        id: "c5",
        name: "Lucia Fernanda Castro",
        email: "lucia.castro@hotmail.com",
        phone: "+504 9234-5678",
        projectName: "Pasteleria Dulce Tentacion",
        projectDescription: "Tienda online con pedidos personalizados",
        paymentType: "cuotas",
        totalAmount: "15000",
        numberOfPayments: 2,
      },
      {
        id: "c6",
        name: "Jose Manuel Ramos",
        email: "jm.ramos@empresa.hn",
        phone: "+504 9678-1234",
        projectName: "Consultoria Legal Ramos",
        projectDescription: "Pagina corporativa con blog legal",
        paymentType: "suscripcion",
        totalAmount: "3000",
        numberOfPayments: 1,
      },
      {
        id: "c7",
        name: "Sandra Beatriz Lopez",
        email: "sandra.lopez@gmail.com",
        phone: "+504 8890-1234",
        projectName: "Salon de Belleza Glamour",
        projectDescription: "Sistema de reservas y galeria",
        paymentType: "suscripcion",
        totalAmount: "2000",
        numberOfPayments: 1,
      },
      {
        id: "c8",
        name: "Fernando David Paz",
        email: "fdpaz@yahoo.com",
        phone: "+504 9456-7890",
        projectName: "Gimnasio FitZone",
        projectDescription: "Web app con planes y suscripciones",
        paymentType: "cuotas",
        totalAmount: "22000",
        numberOfPayments: 3,
      },
      {
        id: "c9",
        name: "Gloria Patricia Avila",
        email: "g.avila@empresa.hn",
        phone: "+504 9123-4567",
        projectName: "Inmobiliaria Avila",
        projectDescription: "Portal de propiedades con filtros avanzados",
        paymentType: "suscripcion",
        totalAmount: "4000",
        numberOfPayments: 1,
      },
      {
        id: "c10",
        name: "Miguel Angel Torres",
        email: "miguel.torres@gmail.com",
        phone: "+504 8567-8901",
        projectName: "Restaurante El Sabor",
        projectDescription: "Menu digital y pedidos online",
        paymentType: "unico",
        totalAmount: "12000",
        numberOfPayments: 1,
      },
    ];

    clientsData.forEach((c) => {
      this.clients.set(c.id, {
        ...c,
        createdAt: getDate(Math.floor(Math.random() * 180)),
      });
    });

    const paymentsData: (InsertPayment & { id: string })[] = [
      { id: "p1", clientId: "c1", amount: "18000", status: "pagado", dueDate: getDate(45), paidDate: getDate(43), paymentNumber: 1, notes: null },
      
      { id: "p2", clientId: "c2", amount: "8333.33", status: "pagado", dueDate: getDate(60), paidDate: getDate(58), paymentNumber: 1, notes: null },
      { id: "p3", clientId: "c2", amount: "8333.33", status: "pagado", dueDate: getDate(30), paidDate: getDate(28), paymentNumber: 2, notes: null },
      { id: "p4", clientId: "c2", amount: "8333.34", status: "pendiente", dueDate: getFutureDate(5), paidDate: null, paymentNumber: 3, notes: null },
      
      { id: "p5", clientId: "c3", amount: "2500", status: "pagado", dueDate: getDate(30), paidDate: getDate(30), paymentNumber: 1, notes: "Suscripcion mensual" },
      { id: "p6", clientId: "c3", amount: "2500", status: "pendiente", dueDate: getFutureDate(2), paidDate: null, paymentNumber: 2, notes: "Suscripcion mensual" },
      
      { id: "p7", clientId: "c4", amount: "8500", status: "pagado", dueDate: getDate(20), paidDate: getDate(18), paymentNumber: 1, notes: null },
      
      { id: "p8", clientId: "c5", amount: "7500", status: "pagado", dueDate: getDate(40), paidDate: getDate(38), paymentNumber: 1, notes: null },
      { id: "p9", clientId: "c5", amount: "7500", status: "vencido", dueDate: getDate(5), paidDate: null, paymentNumber: 2, notes: null },
      
      { id: "p10", clientId: "c6", amount: "3000", status: "pagado", dueDate: getDate(25), paidDate: getDate(24), paymentNumber: 1, notes: "Suscripcion mensual" },
      { id: "p11", clientId: "c6", amount: "3000", status: "pendiente", dueDate: getFutureDate(7), paidDate: null, paymentNumber: 2, notes: "Suscripcion mensual" },
      
      { id: "p12", clientId: "c7", amount: "2000", status: "pagado", dueDate: getDate(15), paidDate: getDate(14), paymentNumber: 1, notes: "Suscripcion mensual" },
      { id: "p13", clientId: "c7", amount: "2000", status: "pendiente", dueDate: getFutureDate(15), paidDate: null, paymentNumber: 2, notes: "Suscripcion mensual" },
      
      { id: "p14", clientId: "c8", amount: "7333.33", status: "pagado", dueDate: getDate(50), paidDate: getDate(48), paymentNumber: 1, notes: null },
      { id: "p15", clientId: "c8", amount: "7333.33", status: "pendiente", dueDate: getFutureDate(10), paidDate: null, paymentNumber: 2, notes: null },
      { id: "p16", clientId: "c8", amount: "7333.34", status: "pendiente", dueDate: getFutureDate(40), paidDate: null, paymentNumber: 3, notes: null },
      
      { id: "p17", clientId: "c9", amount: "4000", status: "pagado", dueDate: getDate(10), paidDate: getDate(9), paymentNumber: 1, notes: "Suscripcion mensual" },
      { id: "p18", clientId: "c9", amount: "4000", status: "pendiente", dueDate: getFutureDate(20), paidDate: null, paymentNumber: 2, notes: "Suscripcion mensual" },
      
      { id: "p19", clientId: "c10", amount: "12000", status: "vencido", dueDate: getDate(3), paidDate: null, paymentNumber: 1, notes: null },
    ];

    paymentsData.forEach((p) => {
      this.payments.set(p.id, p as Payment);
    });

    const subscriptionsData: (InsertSubscription & { id: string })[] = [
      { 
        id: "s1", 
        clientId: "c3", 
        monthlyAmount: "2500", 
        startDate: getDate(60), 
        isActive: true, 
        lastPaymentDate: getDate(30), 
        nextPaymentDate: getFutureDate(2) 
      },
      { 
        id: "s2", 
        clientId: "c6", 
        monthlyAmount: "3000", 
        startDate: getDate(55), 
        isActive: true, 
        lastPaymentDate: getDate(25), 
        nextPaymentDate: getFutureDate(7) 
      },
      { 
        id: "s3", 
        clientId: "c7", 
        monthlyAmount: "2000", 
        startDate: getDate(45), 
        isActive: true, 
        lastPaymentDate: getDate(15), 
        nextPaymentDate: getFutureDate(15) 
      },
      { 
        id: "s4", 
        clientId: "c9", 
        monthlyAmount: "4000", 
        startDate: getDate(40), 
        isActive: true, 
        lastPaymentDate: getDate(10), 
        nextPaymentDate: getFutureDate(20) 
      },
    ];

    subscriptionsData.forEach((s) => {
      this.subscriptions.set(s.id, s as Subscription);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Clients
  async getClients(): Promise<ClientWithPayments[]> {
    const clients = Array.from(this.clients.values());
    return Promise.all(clients.map(async (client) => {
      const payments = await this.getPaymentsByClient(client.id);
      const subscription = await this.getSubscriptionByClient(client.id);
      
      const amountPaid = payments
        .filter(p => p.status === "pagado")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      
      const amountPending = payments
        .filter(p => p.status !== "pagado")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        ...client,
        payments,
        subscription: subscription || undefined,
        amountPaid,
        amountPending,
      };
    }));
  }

  async getClient(id: string): Promise<ClientWithPayments | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const payments = await this.getPaymentsByClient(id);
    const subscription = await this.getSubscriptionByClient(id);
    
    const amountPaid = payments
      .filter(p => p.status === "pagado")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    const amountPending = payments
      .filter(p => p.status !== "pagado")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      ...client,
      payments,
      subscription: subscription || undefined,
      amountPaid,
      amountPending,
    };
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = { 
      ...insertClient, 
      id, 
      createdAt: new Date(),
    };
    this.clients.set(id, client);

    if (insertClient.paymentType === "suscripcion") {
      const subId = randomUUID();
      const subscription: Subscription = {
        id: subId,
        clientId: id,
        monthlyAmount: insertClient.totalAmount,
        startDate: new Date(),
        isActive: true,
        lastPaymentDate: null,
        nextPaymentDate: new Date(),
      };
      this.subscriptions.set(subId, subscription);

      const paymentId = randomUUID();
      const payment: Payment = {
        id: paymentId,
        clientId: id,
        amount: insertClient.totalAmount,
        status: "pendiente",
        dueDate: new Date(),
        paidDate: null,
        paymentNumber: 1,
        notes: "Suscripcion mensual",
      };
      this.payments.set(paymentId, payment);
    } else {
      const numPayments = insertClient.numberOfPayments || 1;
      const paymentAmount = Number(insertClient.totalAmount) / numPayments;
      
      for (let i = 0; i < numPayments; i++) {
        const paymentId = randomUUID();
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const payment: Payment = {
          id: paymentId,
          clientId: id,
          amount: paymentAmount.toFixed(2),
          status: "pendiente",
          dueDate,
          paidDate: null,
          paymentNumber: i + 1,
          notes: null,
        };
        this.payments.set(paymentId, payment);
      }
    }

    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updated: Client = { ...client, ...updates };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    const client = this.clients.get(id);
    if (!client) return false;

    for (const [paymentId, payment] of this.payments) {
      if (payment.clientId === id) {
        this.payments.delete(paymentId);
      }
    }

    for (const [subId, sub] of this.subscriptions) {
      if (sub.clientId === id) {
        this.subscriptions.delete(subId);
      }
    }

    return this.clients.delete(id);
  }

  // Payments
  async getPayments(): Promise<(Payment & { clientName: string; projectName: string })[]> {
    const payments = Array.from(this.payments.values());
    return payments.map(payment => {
      const client = this.clients.get(payment.clientId);
      return {
        ...payment,
        clientName: client?.name || "Cliente Eliminado",
        projectName: client?.projectName || "",
      };
    }).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  async getPaymentsByClient(clientId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(p => p.clientId === clientId)
      .sort((a, b) => (a.paymentNumber || 0) - (b.paymentNumber || 0));
  }

  async getRecentPayments(): Promise<{ payment: Payment; clientName: string }[]> {
    const payments = Array.from(this.payments.values())
      .filter(p => p.status === "pagado" && p.paidDate)
      .sort((a, b) => new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime())
      .slice(0, 10);
    
    return payments.map(payment => {
      const client = this.clients.get(payment.clientId);
      return {
        payment,
        clientName: client?.name || "Cliente Eliminado",
      };
    });
  }

  async getUpcomingPayments(): Promise<{ payment: Payment; clientName: string }[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const payments = Array.from(this.payments.values())
      .filter(p => p.status !== "pagado")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10);
    
    return payments.map(payment => {
      const client = this.clients.get(payment.clientId);
      return {
        payment,
        clientName: client?.name || "Cliente Eliminado",
      };
    });
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = { ...insertPayment, id };
    this.payments.set(id, payment);
    return payment;
  }

  async markPaymentAsPaid(id: string): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;

    const updated: Payment = {
      ...payment,
      status: "pagado",
      paidDate: new Date(),
    };
    this.payments.set(id, updated);

    const subscription = Array.from(this.subscriptions.values())
      .find(s => s.clientId === payment.clientId);
    
    if (subscription) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      const updatedSub: Subscription = {
        ...subscription,
        lastPaymentDate: new Date(),
        nextPaymentDate: nextDate,
      };
      this.subscriptions.set(subscription.id, updatedSub);

      const newPaymentId = randomUUID();
      const newPayment: Payment = {
        id: newPaymentId,
        clientId: payment.clientId,
        amount: subscription.monthlyAmount,
        status: "pendiente",
        dueDate: nextDate,
        paidDate: null,
        paymentNumber: (payment.paymentNumber || 0) + 1,
        notes: "Suscripcion mensual",
      };
      this.payments.set(newPaymentId, newPayment);
    }

    return updated;
  }

  // Subscriptions
  async getSubscriptions(): Promise<(Subscription & { clientName: string; clientEmail: string; projectName: string })[]> {
    const subscriptions = Array.from(this.subscriptions.values());
    return subscriptions.map(sub => {
      const client = this.clients.get(sub.clientId);
      return {
        ...sub,
        clientName: client?.name || "Cliente Eliminado",
        clientEmail: client?.email || "",
        projectName: client?.projectName || "",
      };
    });
  }

  async getSubscriptionByClient(clientId: string): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(s => s.clientId === clientId);
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const subscription: Subscription = { ...insertSubscription, id };
    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async toggleSubscription(id: string, isActive: boolean): Promise<Subscription | undefined> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return undefined;

    const updated: Subscription = { ...subscription, isActive };
    this.subscriptions.set(id, updated);
    return updated;
  }

  // Stats
  async getDashboardStats(): Promise<DashboardStats> {
    const clients = Array.from(this.clients.values());
    const payments = Array.from(this.payments.values());
    const subscriptions = Array.from(this.subscriptions.values());

    const totalRevenue = payments
      .filter(p => p.status === "pagado")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingPayments = payments.filter(p => p.status === "pendiente").length;
    const overduePayments = payments.filter(p => p.status === "vencido").length;

    const activeSubscriptions = subscriptions.filter(s => s.isActive);
    const monthlyRecurringRevenue = activeSubscriptions
      .reduce((sum, s) => sum + Number(s.monthlyAmount), 0);

    return {
      totalRevenue,
      totalClients: clients.length,
      pendingPayments,
      activeSubscriptions: activeSubscriptions.length,
      monthlyRecurringRevenue,
      overduePayments,
    };
  }

  async getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
    const payments = Array.from(this.payments.values()).filter(p => p.status === "pagado" && p.paidDate);
    const months: MonthlyRevenue[] = [];
    
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthPayments = payments.filter(p => {
        const paidDate = new Date(p.paidDate!);
        return paidDate.getMonth() === month && paidDate.getFullYear() === year;
      });

      const subscriptionPayments = monthPayments.filter(p => 
        p.notes?.includes("Suscripcion") || false
      );
      const oneTimePayments = monthPayments.filter(p => 
        !p.notes?.includes("Suscripcion")
      );

      months.push({
        month: monthNames[month],
        revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        subscriptions: subscriptionPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        oneTime: oneTimePayments.reduce((sum, p) => sum + Number(p.amount), 0),
      });
    }
    
    return months;
  }
}

// If SUPABASE_URL is configured, prefer the DbStorage implementation
let storageImpl: any = new MemStorage();
try {
  if (process.env.SUPABASE_URL) {
    // lazy import to avoid circular issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dbStorage } = require('./dbStorage');
    if (dbStorage) storageImpl = dbStorage;
  }
} catch (e) {
  // fallback to in-memory storage
}

export const storage = storageImpl as IStorage;
