import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertPaymentSchema, insertSubscriptionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Error fetching stats" });
    }
  });

  app.get("/api/stats/revenue", async (req, res) => {
    try {
      const revenue = await storage.getMonthlyRevenue();
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ error: "Error fetching revenue data" });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Error fetching clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Error fetching client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      // validate core client fields
      const parsed = insertClientSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid client data", details: parsed.error.errors });
      }

      // create client (storage will handle subscription/payment creation if using DbStorage)
      const client = await storage.createClient(parsed.data as any);

      // If using memory storage, create subscription/payments here based on extra fields
      if (!('createSubscription' in storage) && (req.body.paymentType === 'suscripcion')) {
        // best-effort: if MemStorage is used, create subscription and payment
        try {
          const mensualidad = req.body.mensualidad ?? req.body.totalAmount;
          const fechaPagoInicial = req.body.fechaPagoInicial ? new Date(req.body.fechaPagoInicial) : new Date();
          const pagoDeInstalacion = req.body.pagoDeInstalacion ?? null;

          if (mensualidad) {
            await storage.createSubscription({ clientId: client.id, monthlyAmount: String(mensualidad), startDate: fechaPagoInicial, isActive: true, lastPaymentDate: null, nextPaymentDate: new Date() } as any);
          }
          if (pagoDeInstalacion && Number(pagoDeInstalacion) > 0) {
            await storage.createPayment({ clientId: client.id, amount: String(pagoDeInstalacion), status: 'pendiente', dueDate: fechaPagoInicial, paidDate: null, paymentNumber: 1, notes: 'Pago de instalación' } as any);
          }
        } catch (e) {
          // ignore best-effort errors
        }
      }

      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ error: "Error creating client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Error updating client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error deleting client" });
    }
  });

  // Payments
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Error fetching payments" });
    }
  });

  app.get("/api/payments/recent", async (req, res) => {
    try {
      const payments = await storage.getRecentPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Error fetching recent payments" });
    }
  });

  app.get("/api/payments/upcoming", async (req, res) => {
    try {
      const payments = await storage.getUpcomingPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Error fetching upcoming payments" });
    }
  });

  app.get("/api/payments/client/:clientId", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByClient(req.params.clientId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Error fetching client payments" });
    }
  });

  app.patch("/api/payments/:id/paid", async (req, res) => {
    try {
      const payment = await storage.markPaymentAsPaid(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Error marking payment as paid" });
    }
  });

  // Subscriptions
  app.get("/api/subscriptions", async (req, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: "Error fetching subscriptions" });
    }
  });

  app.patch("/api/subscriptions/:id/toggle", async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }
      const subscription = await storage.toggleSubscription(req.params.id, isActive);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Error toggling subscription" });
    }
  });

  return httpServer;
}
