import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Trash2, Clock, Shield, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
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

type Dispositivo = {
  id: string;
  fingerprint: string;
  nombre: string | null;
  user_agent: string | null;
  ip_address: string | null;
  autorizado: boolean;
  created_at: string;
  ultimo_acceso: string | null;
};

export default function Dispositivos() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: dispositivos, isLoading } = useQuery({
    queryKey: ["dispositivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositivos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Dispositivo[];
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from("dispositivos")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({ title: "Dispositivo eliminado correctamente" });
      queryClient.invalidateQueries({ queryKey: ["dispositivos"] });
      setDeleteId(null);
    } catch (err: any) {
      console.error("Error eliminando dispositivo:", err);
      toast({
        title: "Error al eliminar dispositivo",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeviceInfo = (userAgent: string | null) => {
    if (!userAgent) return "Dispositivo desconocido";

    if (userAgent.includes("Mobile") || userAgent.includes("Android")) {
      return "Dispositivo móvil";
    } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
      return "Tablet";
    } else {
      return "Computadora";
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/configuracion")}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Dispositivos Autorizados</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los dispositivos que pueden acceder a la aplicación
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !dispositivos || dispositivos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">
                No hay dispositivos registrados
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {dispositivos.map((dispositivo) => (
              <Card key={dispositivo.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-primary/10 rounded-lg p-3">
                        <Smartphone className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {dispositivo.nombre || "Dispositivo sin nombre"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {getDeviceInfo(dispositivo.user_agent)}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            <span className="font-mono text-xs break-all">
                              {dispositivo.fingerprint.substring(0, 24)}...
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              Último acceso: {formatDate(dispositivo.ultimo_acceso)}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Registrado: {formatDate(dispositivo.created_at)}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(dispositivo.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar dispositivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Este dispositivo ya no podrá acceder a la aplicación. Tendrá que volver a
                autorizarse con la clave de administrador.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
