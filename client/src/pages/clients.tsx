import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Pencil, 
  Trash2,
  ExternalLink,
  Filter,
  Grid3X3,
  List,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, getInitials, getPaymentTypeLabel, formatDate } from "@/lib/utils";
import type { ClientWithPayments, InsertClient } from "@shared/schema";

const clientFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email invalido"),
  phone: z.string().optional(),
  projectName: z.string().min(2, "El nombre del proyecto es requerido"),
  projectDescription: z.string().optional(),
  paymentType: z.enum(["unico", "cuotas", "suscripcion"]),
  totalAmount: z.string().optional(),
  numberOfPayments: z.string().optional().refine(
    (v) => v === undefined || (typeof v === "string" && /^\d+$/.test(v) && parseInt(v, 10) >= 1),
    { message: "Número de cuotas inválido" },
  ),
  pagoDeInstalacion: z.string().optional().refine(
    (v) => v === undefined || v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
    { message: "Pago de instalación inválido" },
  ),
  mensualidad: z.string().optional().refine(
    (v) => v === undefined || v === "" || (!isNaN(Number(v)) && Number(v) >= 0),
    { message: "Mensualidad inválida" },
  ),
  fechaPagoInicial: z.string().optional().refine(
    (v) => v === undefined || v === "" || !Number.isNaN(Date.parse(v)),
    { message: "Fecha inicial inválida" },
  ),
}).superRefine((data, ctx) => {
  // Si no es suscripcion, totalAmount es requerido y debe ser número > 0
  if (data.paymentType !== "suscripcion") {
    if (!data.totalAmount || data.totalAmount.trim() === "" || Number.isNaN(Number(data.totalAmount)) || Number(data.totalAmount) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["totalAmount"], message: "El monto es requerido y debe ser un número mayor a 0" });
    }
  } else {
    // Si es suscripcion, mensualidad es requerida y debe ser número > 0
    if (!data.mensualidad || data.mensualidad.trim() === "" || Number.isNaN(Number(data.mensualidad)) || Number(data.mensualidad) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mensualidad"], message: "La mensualidad es requerida y debe ser un número mayor a 0" });
    }
  }
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

function ClientCard({ client, onEdit, onDelete }: { 
  client: ClientWithPayments; 
  onEdit: (client: ClientWithPayments) => void;
  onDelete: (id: string) => void;
}) {
  const paymentTypeColors = {
    unico: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cuotas: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    suscripcion: "bg-green-500/10 text-green-600 dark:text-green-400",
  };

  const hasDebt = client.amountPending > 0;

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-client-${client.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{client.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{client.projectName}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-client-menu-${client.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(client)} data-testid="menu-edit-client">
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-view-details">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive" 
                onClick={() => onDelete(client.id)}
                data-testid="menu-delete-client"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{client.email}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Badge 
              variant="secondary" 
              className={paymentTypeColors[client.paymentType as keyof typeof paymentTypeColors]}
            >
              {getPaymentTypeLabel(client.paymentType)}
            </Badge>
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(Number(client.totalAmount))}</p>
              {hasDebt && (
                <p className="text-xs text-red-500 font-medium">
                  Debe: {formatCurrency(client.amountPending)}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientRow({ client, onEdit, onDelete }: { 
  client: ClientWithPayments; 
  onEdit: (client: ClientWithPayments) => void;
  onDelete: (id: string) => void;
}) {
  const paymentTypeColors = {
    unico: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    cuotas: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    suscripcion: "bg-green-500/10 text-green-600 dark:text-green-400",
  };

  const hasDebt = client.amountPending > 0;

  return (
    <div 
      className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover-elevate"
      data-testid={`row-client-${client.id}`}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {getInitials(client.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
        <div className="min-w-0">
          <p className="font-medium truncate">{client.name}</p>
          <p className="text-sm text-muted-foreground truncate">{client.email}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm truncate">{client.projectName}</p>
          <p className="text-xs text-muted-foreground">
            Creado: {formatDate(client.createdAt)}
          </p>
        </div>
        <div>
          <Badge 
            variant="secondary" 
            className={paymentTypeColors[client.paymentType as keyof typeof paymentTypeColors]}
          >
            {getPaymentTypeLabel(client.paymentType)}
          </Badge>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(Number(client.totalAmount))}</p>
          {hasDebt && (
            <p className="text-xs text-red-500 font-medium">
              Debe: {formatCurrency(client.amountPending)}
            </p>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(client)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver detalles
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive" 
            onClick={() => onDelete(client.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ClientFormDialog({ 
  open, 
  onOpenChange, 
  editingClient 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  editingClient?: ClientWithPayments | null;
}) {
  const { toast } = useToast();
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: editingClient ? {
      name: editingClient.name,
      email: editingClient.email,
      phone: editingClient.phone || "",
      projectName: editingClient.projectName,
      projectDescription: editingClient.projectDescription || "",
      paymentType: editingClient.paymentType as "unico" | "cuotas" | "suscripcion",
      totalAmount: String(editingClient.totalAmount),
      numberOfPayments: String(editingClient.numberOfPayments || 1),
      pagoDeInstalacion: "",
      mensualidad: "",
      fechaPagoInicial: "",
    } : {
      name: "",
      email: "",
      phone: "",
      projectName: "",
      projectDescription: "",
      paymentType: "unico",
      totalAmount: "",
      numberOfPayments: "1",
      pagoDeInstalacion: "",
      mensualidad: "",
      fechaPagoInicial: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Cliente creado exitosamente" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error al crear cliente", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertClient & { id: string }) => {
      return apiRequest("PATCH", `/api/clients/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Cliente actualizado exitosamente" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error al actualizar cliente", variant: "destructive" });
    },
  });

  const onSubmit = (values: ClientFormValues) => {
    const totalAmountToSend = values.paymentType === "suscripcion"
      ? (values.mensualidad && values.mensualidad !== "" ? values.mensualidad : values.totalAmount)
      : values.totalAmount;

    const data: InsertClient = {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      projectName: values.projectName,
      projectDescription: values.projectDescription || null,
      paymentType: values.paymentType,
      totalAmount: totalAmountToSend ?? "0",
      numberOfPayments: values.paymentType === "cuotas" ? parseInt(values.numberOfPayments || "1") : 1,
    };

    // attach optional subscription fields to the payload so they can be handled by the backend
    const extendedPayload = {
      ...data,
      pagoDeInstalacion: values.pagoDeInstalacion || null,
      mensualidad: values.mensualidad || null,
      fechaPagoInicial: values.fechaPagoInicial || null,
    } as unknown as InsertClient;

    if (editingClient) {
      updateMutation.mutate({ ...data, id: editingClient.id });
    } else {
      createMutation.mutate(extendedPayload);
    }
  };

  const watchPaymentType = form.watch("paymentType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
          <DialogDescription>
            {editingClient 
              ? "Modifica la informacion del cliente" 
              : "Completa la informacion para agregar un nuevo cliente"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Perez" {...field} data-testid="input-client-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="juan@email.com" {...field} data-testid="input-client-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+504 9999-9999" {...field} data-testid="input-client-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Proyecto</FormLabel>
                  <FormControl>
                    <Input placeholder="Tienda Online" {...field} data-testid="input-project-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripcion breve del proyecto..." 
                      {...field} 
                      data-testid="input-project-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-type">
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unico">Pago Unico</SelectItem>
                        <SelectItem value="cuotas">Cuotas</SelectItem>
                        <SelectItem value="suscripcion">Suscripcion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchPaymentType !== "suscripcion" && (
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Total (L)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15000" 
                          {...field} 
                          data-testid="input-total-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {watchPaymentType === "cuotas" && (
              <FormField
                control={form.control}
                name="numberOfPayments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero de Cuotas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="Ej: 3"
                        {...field}
                        data-testid="input-num-payments"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchPaymentType === "suscripcion" && (
              <>
                <FormField
                  control={form.control}
                  name="pagoDeInstalacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pago de instalación</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Ej: 1500"
                          {...field}
                          data-testid="input-pago-instalacion"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mensualidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensualidad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Ej: 2500"
                          {...field}
                          data-testid="input-mensualidad"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fechaPagoInicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de pago inicial</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-fecha-pago-inicial"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-client"
              >
                {createMutation.isPending || updateMutation.isPending 
                  ? "Guardando..." 
                  : editingClient 
                    ? "Guardar Cambios" 
                    : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithPayments | null>(null);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<ClientWithPayments[]>({
    queryKey: ["/api/clients"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Cliente eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar cliente", variant: "destructive" });
    },
  });

  const filteredClients = clients?.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || client.paymentType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (client: ClientWithPayments) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Esta seguro de eliminar este cliente?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingClient(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus clientes y proyectos</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-client">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, email o proyecto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unico">Pago Unico</SelectItem>
              <SelectItem value="cuotas">Cuotas</SelectItem>
              <SelectItem value="suscripcion">Suscripcion</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={viewMode === "grid" 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-0"
        }>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients && filteredClients.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <ClientCard 
                key={client.id} 
                client={client} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {filteredClients.map((client) => (
                <ClientRow 
                  key={client.id} 
                  client={client} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay clientes</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== "all" 
                ? "No se encontraron clientes con esos criterios" 
                : "Comienza agregando tu primer cliente"}
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-client">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Cliente
            </Button>
          </CardContent>
        </Card>
      )}

      <ClientFormDialog 
        open={dialogOpen} 
        onOpenChange={handleDialogClose}
        editingClient={editingClient}
      />
    </div>
  );
}
