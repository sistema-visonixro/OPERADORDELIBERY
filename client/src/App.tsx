import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Payments from "@/pages/payments";
import Subscriptions from "@/pages/subscriptions";
import EstadoCuentas from "@/pages/estado-cuentas";
import Statistics from "@/pages/statistics";
import Proyecto from "@/pages/proyecto";
import ProyectoVentas from "@/pages/proyecto-ventas";
import ClienteDetalle from "@/pages/cliente-detalle";
import ProyectoDetalle from "@/pages/proyecto-detalle";
import ContratosActivos from "@/pages/contratos-activos";
import Configuracion from "@/pages/configuracion";
import Avances from "@/pages/avances";
import AvanceDetalle from "@/pages/avance-detalle";
import Egresos from "@/pages/egresos";
import EgresoDetalle from "@/pages/egreso-detalle";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AccesoDenegado from "@/pages/acceso-denegado";
import Dispositivos from "@/pages/dispositivos";
import React, { useEffect, useState } from "react";
import { generateDeviceFingerprint } from "@/lib/deviceFingerprint";
import { supabase } from "@/lib/supabase";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clientes/proyecto/ventas" component={ProyectoVentas} />
      <Route path="/clientes/proyecto/:id" component={ProyectoDetalle} />
      <Route path="/clientes/proyecto" component={Proyecto} />
      <Route path="/clientes/:id" component={ClienteDetalle} />
      <Route path="/clientes" component={Clients} />
      <Route path="/contratos-activos" component={ContratosActivos} />
      <Route path="/configuracion" component={Configuracion} />
      <Route path="/pagos" component={Payments} />
      <Route path="/pagos/estado-de-cuentas" component={EstadoCuentas} />
      <Route path="/suscripciones" component={Subscriptions} />
      <Route path="/estadisticas" component={Statistics} />
      <Route path="/avances/:id" component={AvanceDetalle} />
      <Route path="/avances" component={Avances} />
      <Route path="/egresos/:id" component={EgresoDetalle} />
      <Route path="/egresos" component={Egresos} />
      <Route path="/dispositivos" component={Dispositivos} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deviceAuthorized, setDeviceAuthorized] = useState<boolean | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const [checkingDevice, setCheckingDevice] = useState(true);

  // Generar fingerprint y verificar autorización del dispositivo
  useEffect(() => {
    const checkDevice = async () => {
      try {
        const fingerprint = await generateDeviceFingerprint();
        setDeviceFingerprint(fingerprint);

        // Verificar si el dispositivo está autorizado
        const { data, error } = await supabase
          .from("dispositivos")
          .select("*")
          .eq("fingerprint", fingerprint)
          .eq("autorizado", true)
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 es "not found", que es esperado para dispositivos no autorizados
          console.error("Error verificando dispositivo:", error);
        }

        if (data) {
          // Dispositivo autorizado, actualizar último acceso
          await supabase
            .from("dispositivos")
            .update({ ultimo_acceso: new Date().toISOString() })
            .eq("id", data.id);
          
          setDeviceAuthorized(true);
        } else {
          // Dispositivo no autorizado
          setDeviceAuthorized(false);
        }
      } catch (err) {
        console.error("Error generando fingerprint:", err);
        setDeviceAuthorized(false);
      } finally {
        setCheckingDevice(false);
      }
    };

    checkDevice();
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem("admon-auth");
      setAuthed(v === "true");
    } catch (e) {
      setAuthed(false);
    }
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem("admon-auth");
      setAuthed(false);
      setIsLoggingOut(false);
    }, 500);
  };

  // Mostrar loading mientras se verifica el dispositivo
  if (checkingDevice || authed === null || deviceAuthorized === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-lg">Verificando dispositivo...</p>
        </div>
      </div>
    );
  }

  // Si el dispositivo no está autorizado, mostrar pantalla de acceso denegado
  if (!deviceAuthorized) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="visonixro-theme">
          <TooltipProvider>
            <AccesoDenegado
              deviceFingerprint={deviceFingerprint}
              onAuthorized={() => setDeviceAuthorized(true)}
            />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  // Si no está autenticado, mostrar login
  if (!authed) return <Login onSuccess={() => setAuthed(true)} isLoggingOut={isLoggingOut} />;
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="visonixro-theme">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className={`flex h-screen w-full transition-opacity duration-500 ${isLoggingOut ? 'opacity-0' : 'opacity-100'}`}>
              <AppSidebar onLogout={handleLogout} />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
