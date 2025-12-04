import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  RefreshCcw,
  BarChart3,
  Settings,
  Code2,
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
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
  },
  {
    title: "Pagos",
    url: "/pagos",
    icon: CreditCard,
  },
  {
    title: "Suscripciones",
    url: "/suscripciones",
    icon: RefreshCcw,
  },
  {
    title: "Estadisticas",
    url: "/estadisticas",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center gap-3" data-testid="link-logo">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Code2 className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">Visonixro</span>
            <span className="text-xs text-muted-foreground">Panel Admin</span>
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
                const isActive = location === item.url || 
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
              <Link href="/configuracion" data-testid="link-nav-settings">
                <Settings className="h-5 w-5" />
                <span className="font-medium">Configuracion</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-4 rounded-lg bg-sidebar-accent p-3">
          <p className="text-xs text-muted-foreground">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground">Desarrollo Web Pro</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
