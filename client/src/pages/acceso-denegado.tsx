import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type Props = {
  deviceFingerprint: string;
  onAuthorized: () => void;
};

export default function AccesoDenegado({ deviceFingerprint, onAuthorized }: Props) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [clave, setClave] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuthorize = async () => {
    if (!clave.trim()) {
      toast({ title: "Por favor ingresa la clave", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);

      // Verificar la clave con la configuración
      const { data: configData, error: configError } = await supabase
        .from("configuracion")
        .select("clave")
        .limit(1)
        .single();

      if (configError) throw configError;

      if (clave !== configData?.clave) {
        toast({ title: "Clave incorrecta", variant: "destructive" });
        return;
      }

      // Autorizar el dispositivo
      const userAgent = navigator.userAgent;
      const nombre = deviceName.trim() || `Dispositivo ${new Date().toLocaleString()}`;

      const { error: insertError } = await supabase
        .from("dispositivos")
        .insert([
          {
            fingerprint: deviceFingerprint,
            nombre: nombre,
            user_agent: userAgent,
            autorizado: true,
            ultimo_acceso: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      toast({ title: "Dispositivo autorizado correctamente" });
      setShowModal(false);
      onAuthorized();
    } catch (err: any) {
      console.error("Error autorizando dispositivo:", err);
      toast({
        title: "Error al autorizar dispositivo",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
          
          .animate-fade-in-up {
            animation: fadeInUp 0.6s ease-out;
          }
        `}</style>

        <Card className="w-full max-w-lg bg-slate-800/90 backdrop-blur-sm border-red-500/50 shadow-2xl animate-fade-in-up">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <ShieldAlert className="h-20 w-20 text-red-500 animate-shake" />
                <div className="absolute inset-0 h-20 w-20 bg-red-500/20 rounded-full blur-xl"></div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-3">
              <p className="text-slate-300 text-lg">
                Este dispositivo no está autorizado para acceder a la aplicación
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 font-mono break-all">
                  ID del dispositivo: {deviceFingerprint.substring(0, 32)}...
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowModal(true)}
                className="w-full text-center text-blue-400 hover:text-blue-300 transition-colors duration-200 text-sm font-medium underline underline-offset-4"
              >
                Autorizar este dispositivo
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Autorizar Dispositivo
            </DialogTitle>
            <DialogDescription>
              Ingresa la clave de administrador para autorizar este dispositivo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre del dispositivo (opcional)
              </label>
              <Input
                type="text"
                placeholder="Ej: Mi Laptop Personal"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Clave de administrador *
              </label>
              <Input
                type="password"
                placeholder="Ingresa la clave"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleAuthorize();
                  }
                }}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleAuthorize} disabled={loading}>
              {loading ? "Autorizando..." : "Autorizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
