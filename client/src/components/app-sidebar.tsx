import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  RefreshCcw,
  BarChart3,
  Settings,
  Code2,
  ShoppingCart,
  FileText,
  TrendingUp,
  TrendingDown,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Proyecto", url: "/clientes/proyecto", icon: Code2 },
  { title: "Venta", url: "/clientes/proyecto/ventas", icon: ShoppingCart },
  { title: "Contratos Activos", url: "/contratos-activos", icon: FileText },
  { title: "Suscripciones", url: "/suscripciones", icon: RefreshCcw },
  { title: "Pagos", url: "/pagos", icon: CreditCard },
  {
    title: "Estado de cuentas",
    url: "/pagos/estado-de-cuentas",
    icon: FileText,
  },
  { title: "Avances", url: "/avances", icon: TrendingUp },
  { title: "Egresos", url: "/egresos", icon: TrendingDown },
  { title: "Estadisticas", url: "/estadisticas", icon: BarChart3 },
];

type AppSidebarProps = {
  onLogout?: () => void;
};

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // quick client-side guard: don't render sidebar if user is not authenticated
  if (typeof window !== "undefined") {
    try {
      const v = localStorage.getItem("admon-auth");
      if (v !== "true") return null;
    } catch (e) {
      return null;
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/"
          className="flex items-center gap-3"
          data-testid="link-logo"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent">
            <img
              src="/vsr.png"
              alt="Visonixro"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">Visonixro</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive =
                  location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="transition-colors"
                    >
                      <Link
                        href={item.url}
                        data-testid={`link-nav-${item.title.toLowerCase()}`}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href="/configuracion"
                data-testid="link-nav-settings"
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Configuracion</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={() => {
                  setShowLogoutDialog(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-500">Cerrar Sesión</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas cerrar sesión? Tendrás que volver a ingresar tu clave para acceder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (isMobile) setOpenMobile(false);
                onLogout?.();
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Cerrar Sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
