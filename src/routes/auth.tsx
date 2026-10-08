import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Control de Acceso UMA" },
      { name: "description", content: "Acceso del personal de recepción y seguridad de la Universidad Monteávila." },
      { property: "og:title", content: "Ingresar — Control de Acceso UMA" },
      { property: "og:description", content: "Acceso del personal de recepción y seguridad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/panel" }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: "/panel" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const usuario = email.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
      toast.error("Usuario inválido: 3-30 caracteres (letras, números, . _ -)");
      return;
    }
    const correo = `${usuario}@uma.local`;
    setBusy(true);
    if (modo === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: correo, password: pass });
      if (error) toast.error("Usuario o contraseña incorrectos");
    } else {
      const { error } = await supabase.auth.signUp({ email: correo, password: pass, options: { data: { usuario } } });
      if (error) toast.error(error.message.includes("registered") ? "Ese usuario ya existe" : error.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">UMA</div>
          <h1 className="text-lg font-semibold">Control de Acceso</h1>
          <p className="text-sm text-muted-foreground">{modo === "in" ? "Ingrese con su usuario de personal" : "Cree su usuario de personal"}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="usuario">Usuario</Label>
            <Input id="usuario" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass">Contraseña</Label>
            <Input id="pass" type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} {modo === "in" ? "Ingresar" : "Crear cuenta"}
          </Button>
        </form>
        <button className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setModo(modo === "in" ? "up" : "in")}>
          {modo === "in" ? "¿No tiene cuenta? Regístrese" : "¿Ya tiene cuenta? Ingrese"}
        </button>
      </div>
    </div>
  );
}
