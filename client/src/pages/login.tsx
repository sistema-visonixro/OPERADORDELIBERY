import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type Props = {
  onSuccess?: () => void;
  isLoggingOut?: boolean;
};

export default function Login({ onSuccess, isLoggingOut = false }: Props) {
  const { toast } = useToast();
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const [isEntering, setIsEntering] = useState(true);
  const [isSuccessAnimating, setIsSuccessAnimating] = useState(false);

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 100);
    return () => clearTimeout(timer);
  }, []);

  async function onSubmit() {
    try {
      setLoading(true);
      // Buscar usuario operador por código en la tabla `user_operador`
      const { data, error } = await supabase
        .from("user_operador")
        .select("codigo, clave, rol, nombre")
        .eq("codigo", codigo)
        .limit(1)
        .single();
      if (error) throw error;

      const stored = data?.clave ?? null;
      if (!data || !stored) {
        toast({ title: "Código o clave inválidos" });
        setLoading(false);
        return;
      }

      // Verificar rol: sólo permitir acceso si el rol es 'operador'
      const role = data.rol ?? "";
      if (role !== "operador") {
        toast({ title: "Acceso denegado: rol no autorizado" });
        setLoading(false);
        return;
      }

      // Comparación de clave (si almacenas hash, reemplaza esta comparación)
      if (clave === stored) {
        // Activar animación de éxito
        setIsSuccessAnimating(true);
        
        // Esperar a que termine la animación antes de continuar
        setTimeout(() => {
          localStorage.setItem("admon-auth", "true");
          // Guardar datos del operador
          try {
            localStorage.setItem("operador_codigo", data.codigo);
            localStorage.setItem("operador_rol", data.rol ?? "");
            if (data.nombre) {
              localStorage.setItem("operador_nombre", data.nombre);
            }
          } catch (e) {}
          toast({ title: "Acceso concedido" });
          onSuccess?.();
          // redirect to dashboard
          try {
            setLocation("/");
          } catch (e) {
            // fallback
            window.location.href = "/";
          }
        }, 800);
      } else {
        toast({ title: "Clave incorrecta" });
        setLoading(false);
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error comprobando clave:", err);
      toast({ title: "Error comprobando clave", description: err?.message });
      setLoading(false);
    }
  }

  return (
    <div className={`h-screen flex items-center justify-center bg-slate-900 p-4 transition-opacity duration-500 ${
      isLoggingOut ? 'animate-fade-out' : ''
    }`}>
      <style>{`
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes successPulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        .animate-slide-up-fade-in {
          animation: slideUpFadeIn 0.6s ease-out forwards;
        }
        
        .animate-success {
          animation: successPulse 0.8s ease-out forwards;
        }
        
        .animate-fade-out {
          animation: fadeOut 0.5s ease-out forwards;
        }
        
        .success-bg {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      `}</style>
      
      <div 
        className={`w-full max-w-md ${
          isEntering ? 'opacity-0 translate-y-8' : 'animate-slide-up-fade-in'
        } ${
          isSuccessAnimating ? 'animate-success' : ''
        }`}
      >
        <Card className={`text-white border-transparent transition-all duration-500 ${
          isSuccessAnimating ? 'success-bg shadow-2xl' : 'bg-slate-800'
        }`}>
          <CardContent>
            <div className={`flex flex-col items-center transition-transform duration-300 ${
              isSuccessAnimating ? 'scale-110' : 'scale-100'
            }`}>
              <img
                src="/vsr.png"
                alt="Visonixro"
                className="h-16 w-16 object-contain mb-3"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-center">Código</label>
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      onSubmit();
                    }
                  }}
                  className="text-black placeholder:text-gray-400 bg-white"
                  style={{ color: '#000' }}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-center">Clave</label>
                <Input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) {
                      onSubmit();
                    }
                  }}
                  className="text-black placeholder:text-gray-400 bg-white"
                  style={{ color: '#000' }}
                  disabled={loading}
                />
              </div>

              <div className="flex justify-center">
                <Button 
                  onClick={onSubmit} 
                  disabled={loading} 
                  className={`w-40 transition-all duration-300 ${
                    isSuccessAnimating ? 'bg-white text-purple-600' : ''
                  }`}
                >
                  {loading ? "Comprobando..." : isSuccessAnimating ? "✓ Éxito" : "Entrar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
