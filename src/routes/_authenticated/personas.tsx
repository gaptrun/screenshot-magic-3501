import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { actions, run, useUMA, type PersonaInput } from "@/lib/uma-store";
import { ROLES, type Persona, type RolUMA } from "@/lib/uma-data";

export const Route = createFileRoute("/_authenticated/personas")({
  head: () => ({
    meta: [
      { title: "Personas y departamentos — Control de Acceso UMA" },
      { name: "description", content: "Gestión de la base de datos de personas y departamentos del campus." },
      { property: "og:title", content: "Personas y departamentos — Control de Acceso UMA" },
      { property: "og:description", content: "Altas, cambios y bajas de personas y departamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PersonasPage,
});

function PersonasPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Personas y departamentos" subtitle="Universidad Monteávila · Base de datos" />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Tabs defaultValue="personas">
          <TabsList>
            <TabsTrigger value="personas">Personas</TabsTrigger>
            <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
          </TabsList>
          <TabsContent value="personas"><PersonasTab /></TabsContent>
          <TabsContent value="departamentos"><DepartamentosTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const vacia: PersonaInput = { ci: "", nombres: "", apellidos: "", rol_uma: "Alumno", telefono: "", correo: "" };

function PersonasTab() {
  const { personas, loading } = useUMA();
  const [q, setQ] = useState("");
  const [rol, setRol] = useState<RolUMA | "Todos">("Todos");
  const [edit, setEdit] = useState<{ id?: string; data: PersonaInput } | null>(null);
  const [del, setDel] = useState<Persona | null>(null);

  const lista = personas.filter(
    (p) =>
      (rol === "Todos" || p.rol_uma === rol) &&
      (!q || p.ci.includes(q) || `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q.toLowerCase())),
  );

  async function guardar() {
    if (!edit) return;
    const d = edit.data;
    if (!d.ci || !d.nombres || !d.apellidos) { toast.error("CI, nombres y apellidos son obligatorios"); return; }
    const ok = await run(() => (edit.id ? actions.actualizarPersona(edit.id, d) : actions.crearPersona(d)), (m) =>
      toast.error(m.includes("duplicate") ? "Ya existe una persona con esa CI" : m),
    );
    if (ok !== undefined) { toast.success("Guardado"); setEdit(null); }
  }

  return (
    <section className="mt-4 rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <div className="relative mr-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar CI o nombre" className="pl-9" />
        </div>
        <Select value={rol} onValueChange={(v) => setRol(v as RolUMA | "Todos")}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todas las categorías</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setEdit({ data: { ...vacia } })}><Plus /> Nueva persona</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">CI</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>}
            {!loading && lista.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Sin resultados.</td></tr>}
            {lista.map((p) => (
              <tr key={p.id} className="border-t hover:bg-muted/40">
                <td className="px-4 py-3 tabular-nums">{p.ci}</td>
                <td className="px-4 py-3 font-medium">{p.nombres} {p.apellidos}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.rol_uma}</td>
                <td className="px-4 py-3 text-muted-foreground">{[p.telefono, p.correo].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => setEdit({ id: p.id, data: { ci: p.ci, nombres: p.nombres, apellidos: p.apellidos, rol_uma: p.rol_uma, telefono: p.telefono ?? "", correo: p.correo ?? "" } })}><Pencil /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDel(p)}><Trash2 /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modificar persona" : "Nueva persona"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(["ci", "nombres", "apellidos", "telefono", "correo"] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs capitalize text-muted-foreground">{k === "ci" ? "CI *" : k === "telefono" ? "Teléfono" : k}</Label>
                  <Input value={edit.data[k] ?? ""} onChange={(e) => setEdit({ ...edit, data: { ...edit.data, [k]: k === "ci" ? e.target.value.replace(/\D/g, "") : e.target.value } })} />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <Select value={edit.data.rol_uma} onValueChange={(v) => setEdit({ ...edit, data: { ...edit.data, rol_uma: v as RolUMA } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {del?.nombres} {del?.apellidos}?</AlertDialogTitle>
            <AlertDialogDescription>También se eliminará todo su historial de accesos. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => del && void run(() => actions.eliminarPersona(del.id), toast.error).then(() => toast("Persona eliminada"))}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function DepartamentosTab() {
  const { departamentos } = useUMA();
  const [nuevo, setNuevo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  return (
    <section className="mt-4 max-w-2xl rounded-lg border bg-card shadow-sm">
      <form
        className="flex gap-2 border-b p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nuevo.trim()) return;
          const ok = await run(() => actions.crearDepartamento(nuevo.trim()), toast.error);
          if (ok !== undefined) setNuevo("");
        }}
      >
        <Input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nuevo departamento o lugar" />
        <Button type="submit"><Plus /> Agregar</Button>
      </form>
      <ul className="divide-y">
        {departamentos.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            {editId === d.id ? (
              <Input autoFocus value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void run(() => actions.actualizarDepartamento(d.id, { nombre: editNombre }), toast.error).then(() => setEditId(null));
                  if (e.key === "Escape") setEditId(null);
                }} />
            ) : (
              <span className={d.activo ? "flex-1" : "flex-1 text-muted-foreground line-through"}>{d.nombre}</span>
            )}
            <Switch checked={d.activo} title="Activo" onCheckedChange={(v) => void run(() => actions.actualizarDepartamento(d.id, { activo: v }), toast.error)} />
            <Button size="icon" variant="ghost" onClick={() => { setEditId(d.id); setEditNombre(d.nombre); }}><Pencil /></Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => confirm(`¿Eliminar ${d.nombre}?`) && void run(() => actions.eliminarDepartamento(d.id), toast.error)}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
