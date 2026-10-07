import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search, UserPlus, Users, UserCheck, ShieldX, Clock, LogOut, Phone, Check, X, ScanLine, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RegistroDialog } from "@/components/RegistroDialog";
import { actions, run, useUMA } from "@/lib/uma-store";
import { AppNav } from "@/components/AppNav";
import { ROLES, type Estatus, type Persona, type RolUMA } from "@/lib/uma-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Control de Acceso — Universidad Monteávila" },
      { name: "description", content: "Panel de recepción y seguridad para el control de acceso al campus UMA." },
      { property: "og:title", content: "Control de Acceso — Universidad Monteávila" },
      { property: "og:description", content: "Registro rápido de entradas y salidas para la comunidad UMA y visitantes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const hora = (s: string) => new Date(s).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
const iniciales = (p?: Persona | undefined) => (p ? (p.nombres[0] ?? "") + (p.apellidos[0] ?? "") : "?");

function Dashboard() {
  const { personas, registros, loading } = useUMA();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<RolUMA | "Todos">("Todos");
  const [open, setOpen] = useState(false);
  const [inicial, setInicial] = useState<Persona | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const t = () => setClock(new Date().toLocaleString("es-VE", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }));
    t();
    const i = setInterval(t, 30000);
    return () => clearInterval(i);
  }, []);

  const byId = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);
  const hoy = new Date().toDateString();
  const regHoy = registros.filter((r) => new Date(r.hora_ingreso).toDateString() === hoy);
  const enCampus = registros.filter((r) => !r.hora_salida && r.estatus === "Permitido");
  const espera = registros.filter((r) => !r.hora_salida && r.estatus === "En espera");
  const visitantes = enCampus.filter((r) => r.tipo_acceso === "Visitante / Proveedor");
  const denegados = regHoy.filter((r) => r.estatus === "Denegado");
  const visibles = filtro === "Todos" ? enCampus : enCampus.filter((r) => r.tipo_acceso === filtro);

  const resultados = q.trim()
    ? personas
        .filter((p) => p.ci.includes(q.replace(/\D/g, "") || "§") || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 6)
    : [];

  function accesoRapido(p: Persona) {
    if (enCampus.some((r) => r.persona_id === p.id)) { toast.info(`${p.nombres} ya está en el campus`); return; }
    if (p.rol_uma === "Visitante / Proveedor") {
      setInicial(p);
      setOpen(true);
    } else {
      void run(() => actions.registrar({ persona_id: p.id, tipo_acceso: p.rol_uma, persona_recibe: "—", departamento_destino: "Campus", estatus: "Permitido" }), toast.error)
        .then((r) => r !== undefined && toast.success(`Acceso concedido · ${p.nombres} ${p.apellidos}`));
    }
    setQ("");
  }

  const count = (r: RolUMA) => enCampus.filter((x) => x.tipo_acceso === r).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-foreground/10 font-bold tracking-tight">UMA</div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Control de Acceso</h1>
              <p className="text-xs text-primary-foreground/70">Universidad Monteávila · Recepción principal</p>
            </div>
          </div>
          <div className="relative order-3 w-full md:order-none md:ml-6 md:flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && resultados[0] && accesoRapido(resultados[0])}
              placeholder="Buscador express: CI o nombre — Enter para conceder acceso"
              className="h-11 border-0 bg-background pl-9 text-foreground"
            />
            {resultados.length > 0 && (
              <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
                {resultados.map((p) => {
                  const dentro = enCampus.some((r) => r.persona_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted">
                      <Avatar p={p} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.nombres} {p.apellidos}</p>
                        <p className="text-xs text-muted-foreground">CI {p.ci} · {p.rol_uma}</p>
                      </div>
                      {dentro ? (
                        <Badge variant="secondary">En campus</Badge>
                      ) : (
                        <Button size="sm" variant="success" onClick={() => accesoRapido(p)}>
                          <Check /> Conceder
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs capitalize text-primary-foreground/70 xl:block">{clock}</span>
            <AppNav />
            <Button variant="secondary" onClick={() => { setInicial(null); setOpen(true); }}>
              <ScanLine /> Nuevo registro
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="En campus ahora" value={enCampus.length} tone="primary" />
          <Stat icon={UserCheck} label="Visitantes activos" value={visitantes.length} tone="success" />
          <Stat icon={Clock} label="En espera de autorización" value={espera.length} tone="warning" />
          <Stat icon={ShieldX} label="Accesos denegados hoy" value={denegados.length} tone="destructive" />
        </section>

        {/* Espera */}
        {espera.length > 0 && (
          <section className="rounded-lg border border-warning/40 bg-warning/10 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Phone className="h-4 w-4" /> Visitantes anunciados</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {espera.map((r) => {
                const p = byId.get(r.persona_id);
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-md bg-card p-3 shadow-sm">
                    <Avatar p={p} />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{p?.nombres} {p?.apellidos}</p>
                      <p className="truncate text-xs text-muted-foreground">Recibe: {r.persona_recibe} · {r.departamento_destino} · {hora(r.hora_ingreso)}</p>
                    </div>
                    <Button size="sm" variant="success" onClick={() => void run(() => actions.setEstatus(r.id, "Permitido"), toast.error).then(() => toast.success("Acceso concedido"))}><Check /> Autorizar</Button>
                    <Button size="icon" variant="outline" onClick={() => void run(() => actions.setEstatus(r.id, "Denegado"), toast.error).then(() => toast.error("Acceso denegado"))}><X /></Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tabla */}
        <section className="rounded-lg border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <h2 className="mr-auto text-sm font-semibold">Personas en instalaciones</h2>
            <Chip active={filtro === "Todos"} onClick={() => setFiltro("Todos")}>Todos · {enCampus.length}</Chip>
            {ROLES.map((r) => (
              <Chip key={r} active={filtro === r} onClick={() => setFiltro(r)}>
                {r === "Visitante / Proveedor" ? "Visitantes" : r} · {count(r)}
              </Chip>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Persona</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Destino</th>
                  <th className="px-4 py-3 font-medium">Recibe</th>
                  <th className="px-4 py-3 font-medium">Ingreso</th>
                  <th className="px-4 py-3 font-medium">Estatus</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
                )}
                {!loading && visibles.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nadie en esta categoría ahora mismo.</td></tr>
                )}
                {visibles.map((r) => {
                  const p = byId.get(r.persona_id);
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar p={p} />
                          <div>
                            <p className="font-medium">{p?.nombres} {p?.apellidos}</p>
                            <p className="text-xs text-muted-foreground">CI {p?.ci}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.tipo_acceso}</td>
                      <td className="px-4 py-3">{r.departamento_destino}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.persona_recibe}</td>
                      <td className="px-4 py-3 tabular-nums">{hora(r.hora_ingreso)}</td>
                      <td className="px-4 py-3"><EstatusBadge s={r.estatus} /></td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => void run(() => actions.marcarSalida(r.id), toast.error).then(() => toast(`Salida registrada · ${p?.nombres}`))}>
                          <LogOut /> Marcar salida
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Actividad */}
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Actividad reciente</h2>
            <ul className="divide-y">
              {registros.slice(0, 8).map((r) => {
                const p = byId.get(r.persona_id);
                return (
                  <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-12 tabular-nums text-xs text-muted-foreground">{hora(r.hora_ingreso)}</span>
                    <span className="flex-1 truncate">{p?.nombres} {p?.apellidos} <span className="text-muted-foreground">→ {r.departamento_destino}</span></span>
                    {r.hora_salida && r.estatus !== "Denegado" ? <Badge variant="outline">Salió {hora(r.hora_salida)}</Badge> : <EstatusBadge s={r.estatus} />}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-success" /> Resumen del día</h2>
            <Row k="Registros hoy" v={regHoy.length} />
            <Row k="Comunidad UMA en campus" v={enCampus.length - visitantes.length} />
            <Row k="Personas en base de datos" v={personas.length} />
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setInicial(null); setOpen(true); }}>
              <UserPlus /> Registrar visitante
            </Button>
          </div>
        </section>
      </main>

      <RegistroDialog open={open} onOpenChange={setOpen} inicial={inicial} />
    </div>
  );
}

function Avatar({ p }: { p?: Persona | undefined }) {
  return p?.foto_url ? (
    <img src={p.foto_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{iniciales(p)}</div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "primary" | "success" | "warning" | "destructive" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-5 shadow-sm">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-md", tones[tone])}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-3xl font-semibold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function EstatusBadge({ s }: { s: Estatus }) {
  const cls = {
    Permitido: "bg-success/15 text-success",
    "En espera": "bg-warning/25 text-warning-foreground",
    Denegado: "bg-destructive/10 text-destructive",
  }[s];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cls)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s}</span>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
      {children}
    </button>
  );
}

function Row({ k, v }: { k: string; v: number }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{k}</span><span className="font-semibold tabular-nums">{v}</span></div>;
}
