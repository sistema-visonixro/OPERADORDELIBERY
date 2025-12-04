import { 
  DashboardStats, 
  ClientWithPayments, 
  Payment, 
  MonthlyRevenue, 
  PAYMENT_TYPES, 
  PAYMENT_STATUS 
} from "@shared/schema";

export const mockStats: DashboardStats = {
  totalRevenue: 150000,
  totalClients: 45,
  pendingPayments: 12,
  activeSubscriptions: 28,
  monthlyRecurringRevenue: 25000,
  overduePayments: 3,
};

export const mockClients: ClientWithPayments[] = [
  {
    id: "1",
    name: "Juan Perez",
    email: "juan@example.com",
    phone: "9999-9999",
    projectName: "Website E-commerce",
    projectDescription: "Tienda en linea de ropa",
    paymentType: "cuotas",
    totalAmount: "15000.00",
    numberOfPayments: 3,
    createdAt: new Date("2024-01-15"),
    amountPaid: 5000,
    amountPending: 10000,
    payments: [],
  },
  {
    id: "2",
    name: "Maria Garcia",
    email: "maria@example.com",
    phone: "8888-8888",
    projectName: "Sistema de Inventario",
    projectDescription: "Sistema para ferreteria",
    paymentType: "unico",
    totalAmount: "25000.00",
    numberOfPayments: 1,
    createdAt: new Date("2024-02-01"),
    amountPaid: 25000,
    amountPending: 0,
    payments: [],
  },
  {
    id: "3",
    name: "Carlos Rodriguez",
    email: "carlos@example.com",
    phone: "7777-7777",
    projectName: "Mantenimiento Mensual",
    projectDescription: "Soporte tecnico",
    paymentType: "suscripcion",
    totalAmount: "1000.00",
    numberOfPayments: 1,
    createdAt: new Date("2024-03-01"),
    amountPaid: 1000,
    amountPending: 0,
    payments: [],
  },
];

export const mockRecentPayments: { payment: Payment; clientName: string }[] = [
  {
    payment: {
      id: "p1",
      clientId: "1",
      amount: "5000.00",
      status: "pagado",
      dueDate: new Date("2024-03-15"),
      paidDate: new Date("2024-03-14"),
      paymentNumber: 1,
      notes: "Primer pago",
    },
    clientName: "Juan Perez",
  },
  {
    payment: {
      id: "p2",
      clientId: "2",
      amount: "25000.00",
      status: "pagado",
      dueDate: new Date("2024-02-01"),
      paidDate: new Date("2024-02-01"),
      paymentNumber: 1,
      notes: "Pago completo",
    },
    clientName: "Maria Garcia",
  },
];

export const mockUpcomingPayments: { payment: Payment; clientName: string }[] = [
  {
    payment: {
      id: "p3",
      clientId: "1",
      amount: "5000.00",
      status: "pendiente",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 2)), // Due in 2 days
      paidDate: null,
      paymentNumber: 2,
      notes: "Segundo pago",
    },
    clientName: "Juan Perez",
  },
  {
    payment: {
      id: "p4",
      clientId: "3",
      amount: "1000.00",
      status: "pendiente",
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)), // Due in 5 days
      paidDate: null,
      paymentNumber: 1,
      notes: "Suscripcion Abril",
    },
    clientName: "Carlos Rodriguez",
  },
];

export const mockMonthlyRevenue: MonthlyRevenue[] = [
  { month: "Ene", revenue: 12000, subscriptions: 5000, oneTime: 7000 },
  { month: "Feb", revenue: 18000, subscriptions: 6000, oneTime: 12000 },
  { month: "Mar", revenue: 15000, subscriptions: 7000, oneTime: 8000 },
  { month: "Abr", revenue: 22000, subscriptions: 8000, oneTime: 14000 },
  { month: "May", revenue: 25000, subscriptions: 9000, oneTime: 16000 },
  { month: "Jun", revenue: 28000, subscriptions: 10000, oneTime: 18000 },
];
