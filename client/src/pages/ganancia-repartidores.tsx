import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ChevronRight } from "lucide-react";

type RepartidorBalance = {
  id: string;
  nombre_completo: string;
  telefono?: string;
  total_ganado: number;
  total_pagado: number;
  balance: number;
};

export default function GananciaRepartidores() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Obtener balance de todos los repartidores
  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["repartidores_balance"],
    queryFn: async () => {
      // Obtener todos los repartidores
      const { data: repartidores, error: errorRep } = await supabase
        .from("repartidores")
        .select("id, nombre_completo, telefono")
        .order("nombre_completo");

      if (errorRep) throw errorRep;

      // Para cada repartidor, calcular balance
      const balancesPromises = (repartidores || []).map(async (rep) => {
        // Total ganado (de pedidos realizados)
        const { data: pedidosData, error: errorPedidos } = await supabase
          .from("pedidos_realizados_de_repartidor")
          .select("costo_envio")
          .eq("repartidor_id", rep.id);

        const totalGanado = (pedidosData || []).reduce(
          (sum, p) => sum + (p.costo_envio || 0),
          0
        );

        // Total pagado
        const { data: pagosData, error: errorPagos } = await supabase
          .from("pagos_repartidores")
          .select("monto")
          .eq("repartidor_id", rep.id);

        const totalPagado = (pagosData || []).reduce(
          (sum, p) => sum + (p.monto || 0),
          0
        );

        return {
          ...rep,
          total_ganado: totalGanado,
          total_pagado: totalPagado,
          balance: totalGanado - totalPagado,
        } as RepartidorBalance;
      });

      const balances = await Promise.all(balancesPromises);
      return balances;
    },
  });

  if (isLoading) {
    return <div className="p-6">Cargando balances...</div>;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Ganancia de Repartidores</h1>
        <p className="text-muted-foreground">
          Balance entre ganancias y pagos realizados a cada repartidor
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {balances.map((rep) => (
          <Card 
            key={rep.id} 
            className="hover:shadow-lg transition-all cursor-pointer hover:scale-105"
            onClick={() => setLocation(`/balance-repartidor/${rep.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{rep.nombre_completo}</span>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
              {rep.telefono && (
                <p className="text-sm text-muted-foreground">{rep.telefono}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Saldo actual */}
              <div
                className={`p-6 rounded-lg text-center ${
                  rep.balance > 0
                    ? "bg-orange-50 dark:bg-orange-950"
                    : rep.balance < 0
                    ? "bg-red-50 dark:bg-red-950"
                    : "bg-green-50 dark:bg-green-950"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Wallet
                    className={`h-5 w-5 ${
                      rep.balance > 0
                        ? "text-orange-600 dark:text-orange-400"
                        : rep.balance < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      rep.balance > 0
                        ? "text-orange-700 dark:text-orange-300"
                        : rep.balance < 0
                        ? "text-red-700 dark:text-red-300"
                        : "text-green-700 dark:text-green-300"
                    }`}
                  >
                    {rep.balance > 0 ? "Saldo Pendiente" : rep.balance < 0 ? "Sobrepagado" : "Saldado"}
                  </span>
                </div>
                <div
                  className={`text-3xl font-bold ${
                    rep.balance > 0
                      ? "text-orange-700 dark:text-orange-300"
                      : rep.balance < 0
                      ? "text-red-700 dark:text-red-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  ${Math.abs(rep.balance).toFixed(2)}
                </div>
              </div>

              {/* Botón para ver detalle */}
              <Button
                className="w-full"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/balance-repartidor/${rep.id}`);
                }}
              >
                Ver Balance Completo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {balances.length === 0 && !isLoading && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No hay repartidores registrados</p>
          </div>
        </Card>
      )}
    </div>
  );
}
