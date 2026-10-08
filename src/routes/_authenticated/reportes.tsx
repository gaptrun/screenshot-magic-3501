import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, format,
} from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { actions, run, useUMA } from "@/lib/uma-store";
import { ROLES, type Estatus, type RolUMA } from "@/lib/uma-data";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes de acceso — Control de Acceso UMA" },
      { name: "description", content: "Reportes diarios, semanales y mensuales de accesos al campus con filtros y exportación." },
      { property: "og:title", content: "Reportes de acceso — Control de Acceso UMA" },
      { property: "og:description", content: "Consultas diarias, semanales y mensuales de los accesos al campus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportesPage,
});

type Periodo = "dia" | "semana" | "mes" | "rango";
const ESTATUS: Estatus[] = ["Permitido", "Denegado", "En espera"];

interface Fila {
  id: string;
  persona_id: string;
  tipo_acceso: RolUMA;
  persona_recibe: string;
  departamento_destino: string;
  hora_ingreso: string;
  hora_salida: string | null;
  estatus: Estatus;
  observaciones: string | null;
  creado_por_nombre: string;
  personas: { ci: string; nombres: string; apellidos: string } | null;
}

function rango(p: Periodo, ref: Date, desde: string, hasta: string): [Date, Date] {
  if (p === "dia") return [startOfDay(ref), endOfDay(ref)];
  if (p === "semana") return [startOfWeek(ref, { weekStartsOn: 1 }), endOfWeek(ref, { weekStartsOn: 1 })];
  if (p === "mes") return [startOfMonth(ref), endOfMonth(ref)];
  return [startOfDay(new Date(desde + "T00:00")), endOfDay(new Date(hasta + "T00:00"))];
}

const fmt = (s: string | null) => (s ? format(new Date(s), "dd/MM/yyyy HH:mm") : "—");
const toLocalInput = (s: string | null) => (s ? format(new Date(s), "yyyy-MM-dd'T'HH:mm") : "");

function ReportesPage() {
  const { departamentos } = useUMA();
  const hoy = format(new Date(), "yyyy-MM-dd");
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [ref, setRef] = useState(new Date());
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [rol, setRol] = useState<string>("Todos");
  const [estatus, setEstatus] = useState<string>("Todos");
  const [depto, setDepto] = useState<string>("Todos");
  const [q, setQ] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [edit, setEdit] = useState<Fila | null>(null);
  const [del, setDel] = useState<Fila | null>(null);

  const [ini, fin] = rango(periodo, ref, desde, hasta);

  const cargar = useCallback(async () => {
    setCargando(true);
    let query = supabase
      .from("registros_acceso")
      .select("*, personas(ci,nombres,apellidos)")
      .gte("hora_ingreso", ini.toISOString())
      .lte("hora_ingreso", fin.toISOString())
      .order("hora_ingreso", { ascending: false })
      .limit(5000);
    if (rol !== "Todos") query = query.eq("tipo_acceso", rol as RolUMA);
    if (estatus !== "Todos") query = query.eq("estatus", estatus as Estatus);
    if (depto !== "Todos") query = query.eq("departamento_destino", depto);
    const { data, error } = await query;
    setCargando(false);
    if (error) return toast.error(error.message);
    setFilas((data ?? []) as unknown as Fila[]);
  }, [ini.getTime(), fin.getTime(), rol, estatus, depto]);

  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return filas;
    return filas.filter((f) =>
      `${f.personas?.ci} ${f.personas?.nombres} ${f.personas?.apellidos} ${f.persona_recibe}`.toLowerCase().includes(t),
    );
  }, [filas, q]);

  const resumen = useMemo(() => {
    const c = { total: visibles.length, Permitido: 0, Denegado: 0, "En espera": 0, dentro: 0 };
    const porRol: Record<string, number> = {};
    const porDepto: Record<string, number> = {};
    for (const f of visibles) {
      c[f.estatus]++;
      if (f.estatus === "Permitido" && !f.hora_salida) c.dentro++;
      porRol[f.tipo_acceso] = (porRol[f.tipo_acceso] ?? 0) + 1;
      porDepto[f.departamento_destino] = (porDepto[f.departamento_destino] ?? 0) + 1;
    }
    const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { c, porRol: top(porRol), porDepto: top(porDepto) };
  }, [visibles]);

  const mover = (dir: number) =>
    setRef((d) => (periodo === "dia" ? addDays(d, dir) : periodo === "semana" ? addWeeks(d, dir) : addMonths(d, dir)));

  const etiqueta =
    periodo === "dia" ? format(ini, "EEEE d 'de' MMMM yyyy", { locale: es })
    : periodo === "mes" ? format(ini, "MMMM yyyy", { locale: es })
    : `${format(ini, "dd/MM/yyyy")} – ${format(fin, "dd/MM/yyyy")}`;

  const exportar = () => {
    const head = ["Fecha ingreso", "Fecha salida", "Cédula", "Nombres", "Apellidos", "Categoría", "Departamento", "Recibe", "Estatus", "Registrado por", "Observaciones"];
    const rows = visibles.map((f) => [
      fmt(f.hora_ingreso), fmt(f.hora_salida), f.personas?.ci ?? "", f.personas?.nombres ?? "", f.personas?.apellidos ?? "",
      f.tipo_acceso, f.departamento_destino, f.persona_recibe, f.estatus, f.creado_por_nombre, f.observaciones ?? "",
    ]);
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-accesos-${format(ini, "yyyyMMdd")}-${format(fin, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Reportes de acceso" subtitle="Universidad Monteávila · Consultas" />
      <main className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
                <TabsList>
                  <TabsTrigger value="dia">Diario</TabsTrigger>
                  <TabsTrigger value="semana">Semanal</TabsTrigger>
                  <TabsTrigger value="mes">Mensual</TabsTrigger>
                  <TabsTrigger value="rango">Rango</TabsTrigger>
                </TabsList>
              </Tabs>
              {periodo === "rango" ? (
                <div className="flex items-center gap-2">
                  <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-40" />
                  <span className="text-sm text-muted-foreground">a</span>
                  <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-40" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => mover(-1)}><ChevronLeft /></Button>
                  <span className="min-w-56 text-center text-sm font-medium capitalize">{etiqueta}</span>
                  <Button variant="outline" size="icon" onClick={() => mover(1)}><ChevronRight /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setRef(new Date())}>Hoy</Button>
                </div>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={cargar} disabled={cargando}><RefreshCw className={cargando ? "animate-spin" : ""} />Actualizar</Button>
                <Button onClick={exportar} disabled={!visibles.length}><Download />Exportar a Excel</Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input placeholder="Buscar cédula, nombre o quien recibe…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Filtro valor={rol} set={setRol} opciones={ROLES} placeholder="Categoría" />
              <Filtro valor={estatus} set={setEstatus} opciones={ESTATUS} placeholder="Estatus" />
              <Filtro valor={depto} set={setDepto} opciones={departamentos.map((d) => d.nombre)} placeholder="Departamento" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total" v={resumen.c.total} />
          <Stat label="Permitidos" v={resumen.c.Permitido} />
          <Stat label="Denegados" v={resumen.c.Denegado} />
          <Stat label="En espera" v={resumen.c["En espera"]} />
          <Stat label="Aún dentro" v={resumen.c.dentro} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Desglose titulo="Por categoría" datos={resumen.porRol} total={resumen.c.total} />
          <Desglose titulo="Por departamento" datos={resumen.porDepto} total={resumen.c.total} />
        </div>

        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  {["Ingreso", "Salida", "Persona", "Categoría", "Departamento", "Recibe", "Estatus", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-2">{fmt(f.hora_ingreso)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmt(f.hora_salida)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{f.personas ? `${f.personas.nombres} ${f.personas.apellidos}` : "—"}</div>
                      <div className="text-xs text-muted-foreground">{f.personas?.ci}</div>
                    </td>
                    <td className="px-3 py-2">{f.tipo_acceso}</td>
                    <td className="px-3 py-2">{f.departamento_destino}</td>
                    <td className="px-3 py-2">{f.persona_recibe}</td>
                    <td className="px-3 py-2">
                      <Badge variant={f.estatus === "Denegado" ? "destructive" : f.estatus === "Permitido" ? "default" : "secondary"}>{f.estatus}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => setEdit(f)}><Pencil /></Button>
                      <Button variant="ghost" size="icon" title="Eliminar" onClick={() => setDel(f)}><Trash2 /></Button>
                    </td>
                  </tr>
                ))}
                {!visibles.length && (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">{cargando ? "Cargando…" : "No hay registros para este período y filtros."}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </main>

      {edit && <EditarRegistro fila={edit} deptos={departamentos.map((d) => d.nombre)} onClose={() => setEdit(null)} onSaved={cargar} />}

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará el acceso de {del?.personas?.nombres} {del?.personas?.apellidos} del {fmt(del?.hora_ingreso ?? null)}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!del) return;
                let ok = true;
                await run(() => actions.eliminarRegistro(del.id), (m) => { ok = false; toast.error(m); });
                if (ok) { toast.success("Registro eliminado"); cargar(); }
                setDel(null);
              }}
            >Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Filtro({ valor, set, opciones, placeholder }: { valor: string; set: (v: string) => void; opciones: readonly string[]; placeholder: string }) {
  return (
    <Select value={valor} onValueChange={set}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="Todos">{placeholder}: todos</SelectItem>
        {opciones.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{v}</div>
    </CardContent></Card>
  );
}

function Desglose({ titulo, datos, total }: { titulo: string; datos: [string, number][]; total: number }) {
  return (
    <Card><CardContent className="space-y-2 pt-5">
      <div className="text-sm font-semibold">{titulo}</div>
      {datos.length === 0 && <div className="text-sm text-muted-foreground">Sin datos</div>}
      {datos.map(([k, n]) => (
        <div key={k} className="space-y-1">
          <div className="flex justify-between text-sm"><span>{k}</span><span className="text-muted-foreground">{n}</span></div>
          <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
        </div>
      ))}
    </CardContent></Card>
  );
}

function EditarRegistro({ fila, deptos, onClose, onSaved }: { fila: Fila; deptos: string[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    tipo_acceso: fila.tipo_acceso,
    departamento_destino: fila.departamento_destino,
    persona_recibe: fila.persona_recibe,
    estatus: fila.estatus,
    hora_ingreso: toLocalInput(fila.hora_ingreso),
    hora_salida: toLocalInput(fila.hora_salida),
    observaciones: fila.observaciones ?? "",
  });
  const [saving, setSaving] = useState(false);
  const opcionesDepto = deptos.includes(f.departamento_destino) ? deptos : [f.departamento_destino, ...deptos];

  const guardar = async () => {
    setSaving(true);
    let ok = true;
    await run(
      () => actions.actualizarRegistro(fila.id, {
        tipo_acceso: f.tipo_acceso,
        departamento_destino: f.departamento_destino,
        persona_recibe: f.persona_recibe || "—",
        estatus: f.estatus,
        hora_ingreso: new Date(f.hora_ingreso).toISOString(),
        hora_salida: f.hora_salida ? new Date(f.hora_salida).toISOString() : null,
        observaciones: f.observaciones || null,
      }),
      (m) => { ok = false; toast.error(m); },
    );
    setSaving(false);
    if (ok) { toast.success("Registro actualizado"); onSaved(); onClose(); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar registro — {fila.personas?.nombres} {fila.personas?.apellidos}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Categoría</Label>
            <Select value={f.tipo_acceso} onValueChange={(v) => setF({ ...f, tipo_acceso: v as RolUMA })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Estatus</Label>
            <Select value={f.estatus} onValueChange={(v) => setF({ ...f, estatus: v as Estatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTATUS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Departamento</Label>
            <Select value={f.departamento_destino} onValueChange={(v) => setF({ ...f, departamento_destino: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{opcionesDepto.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Persona que recibe</Label>
            <Input value={f.persona_recibe} onChange={(e) => setF({ ...f, persona_recibe: e.target.value })} />
          </div>
          <div className="space-y-1"><Label>Hora de ingreso</Label>
            <Input type="datetime-local" value={f.hora_ingreso} onChange={(e) => setF({ ...f, hora_ingreso: e.target.value })} />
          </div>
          <div className="space-y-1"><Label>Hora de salida</Label>
            <Input type="datetime-local" value={f.hora_salida} onChange={(e) => setF({ ...f, hora_salida: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2"><Label>Observaciones</Label>
            <Textarea value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={saving || !f.hora_ingreso}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
