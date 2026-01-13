import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Pedidos from "@/pages/pedidos";
import Restaurantes from "@/pages/restaurantes";
import Repartidores from "@/pages/repartidores";
import Login from "@/pages/login";
import React, { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Pedidos} />
      <Route path="/pedidos" component={Pedidos} />
      <Route path="/restaurantes" component={Restaurantes} />
      <Route path="/repartidores" component={Repartidores} />
      <Route component={Pedidos} />
    </Switch>
  );
}

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Ya no se verifica el dispositivo. Solo comprobamos la sesión local.

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

  // Mostrar loading mientras comprobamos la sesión local
  if (authed === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="text-white text-lg">Comprobando sesión...</p>
        </div>
      </div>
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
