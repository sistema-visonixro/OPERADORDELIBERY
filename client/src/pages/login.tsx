import React, { useState } from "react";
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

  async function onSubmit() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("configuracion")
        .select("clave")
        .limit(1)
        .single();
      if (error) throw error;

      const stored = data?.clave ?? null;
      if (!stored) {
        toast({ title: "No hay clave configurada" });
        return;
      }

      if (clave === stored) {
        localStorage.setItem("admon-auth", "true");
        toast({ title: "Acceso concedido" });
        onSuccess?.();
      } else {
        toast({ title: "Clave incorrecta" });
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error comprobando clave:", err);
      toast({ title: "Error comprobando clave", description: err?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-muted p-4">
      <div style={{ width: 420 }}>
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Ingreso</h2>
            <p className="text-sm text-muted-foreground mb-4">Introduce la clave de acceso para entrar en la aplicación.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Clave</label>
                <Input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={onSubmit} disabled={loading}>
                  {loading ? "Comprobando..." : "Entrar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
