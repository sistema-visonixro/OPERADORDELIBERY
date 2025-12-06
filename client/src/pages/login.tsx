import React, { useEffect, useState, KeyboardEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  onSuccess?: () => void;
};

export default function Login({ onSuccess }: Props) {
  const { toast } = useToast();
  const [clave, setClave] = useState("");
  const [loading, setLoading] = useState(false);

  const CLAVE_REGEX = /(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+/;
  const isValidClave = CLAVE_REGEX.test(clave);

  // autofocus al input
  useEffect(() => {
    const el = document.getElementById("clave-input");
    el?.focus();
  }, []);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) onSubmit();
  };

  async function onSubmit() {
    if (!clave.trim()) {
      toast({ title: "Ingresa la clave", variant: "destructive" });
      return;
    }

    if (!isValidClave) {
      toast({
        title: "Clave inválida",
        description: "La clave debe contener al menos una letra mayúscula, un número y un símbolo",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("configuracion")
        .select("clave")
        .single();

      if (error) throw error;

      const stored = data?.clave;

      if (!stored) {
        toast({
          title: "No hay clave configurada",
          variant: "destructive",
        });
        return;
      }

      if (clave === stored) {
        localStorage.setItem("admon-auth", "true");
        toast({ title: "Acceso concedido", description: "Bienvenido" });
        onSuccess?.();
      } else {
        setClave("");
        toast({
          title: "Clave incorrecta",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error comprobando clave:", err);
      toast({
        title: "Error al validar",
        description: err?.message ?? "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark">
      <div className="h-screen flex items-center justify-center bg-background text-foreground p-4">
        <div className="w-[420px] max-w-full">
          <Card>
            <CardContent className="pt-6 animate-login-enter">
            <div className="flex flex-col items-center mb-4">
              <img src="/vsr.png" alt="Logo" className="h-24 mb-2" />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <label htmlFor="clave-input" className="block text-sm font-medium mb-1 text-center">
                  Clave
                </label>
                <div className="w-full">
                  <Input
                    id="clave-input"
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={loading}
                  />
                         </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={onSubmit} disabled={loading || !isValidClave}>
                  {loading ? "Validando..." : "Entrar"}
                </Button>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
