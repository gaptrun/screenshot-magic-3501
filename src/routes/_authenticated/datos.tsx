import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Database, Plus, Pencil, Trash2, Upload, Download, RefreshCw, Search, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { adminQuery, saveAdmin, deleteAdmin, importAdmin } from "@/lib/admin-repository";
import { ADMIN_TABLES, type AdminTable, type DataRow, exportText, localDate, prepareImport, readImport } from "@/lib/admin-data";
import { refresh } from "@/lib/uma-store";

export const Route = createFileRoute("/_authenticated/datos")({
  head: () => ({ meta: [
    { title: "Administración de datos — UMA" },
    { name: "description", content: "Administración de personas, accesos, departamentos y contactos de recepción UMA, con importación y exportación." },
    { property: "og:title", content: "Administración de datos — UMA" },
    { property: "og:description", content: "Crear, modificar, eliminar, importar y exportar registros del control de acceso UMA." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: DatosPage,
});

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function errorMessage(e: unknown) {
  const message = e instanceof Error ? e.message : "No se pudo completar la operación";
  return message.includes("duplicate") ? "Ya existe un registro con esos datos" : message;
}
function DatosPage() {
  const [table, setTable] = useState<AdminTable>("personas");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ id?: string; data: DataRow } | null>(null);
  const [remove, setRemove] = useState<DataRow | null>(null);
  const [imported, setImported] = useState<{ name: string; rows: DataRow[]; errors: string[] } | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const file = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  const query = useQuery(adminQuery(table));
  const peopleQuery = useQuery(adminQuery("personas"));
  const rows = query.data ?? [];
  const people = peopleQuery.data ?? [];
  const config = ADMIN_TABLES[table];
  function personName(id: unknown) {
    const person = people.find(p => p['id'] === id);
    return person ? `${person['nombres']} ${person['apellidos']} · ${person['ci']}` : String(id ?? "—");
  }
  function cell(row: DataRow, key: string) {
    if (key === "persona_id") return personName(row[key]);
    if (key === "activo") return row[key] ? "Activo" : "Inactivo";
    if (key.startsWith("hora_") && row[key]) return new Date(String(row[key])).toLocaleString("es-VE");
    return String(row[key] ?? "—");
  }
  const filtered = rows.filter(r => !search || Object.values(r).join(" ").concat(table === "registros_acceso" ? personName(r['persona_id']) : "").toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const shown = filtered.slice(page * 25, page * 25 + 25);
  async function reload() { await client.invalidateQueries({ queryKey: ["admin-data"] }); await refresh(); }
  async function execute(fn: () => Promise<unknown>, success: string, close: () => void) {
    setBusy(true);
    try { await fn(); close(); await reload(); toast.success(success); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setBusy(false); }
  }
  function newRow() {
    const data: DataRow = {};
    for (const field of config.fields) data[field.key] = field.type === "boolean" ? true : field.options?.[0] ?? "";
    if (table === "registros_acceso") { data['hora_ingreso'] = localDate(new Date().toISOString()); data['estatus'] = "En espera"; data['persona_recibe'] = "—"; }
    setEdit({ data });
  }
  function startEdit(row: DataRow) {
    const data = { ...row };
    for (const field of config.fields) if (field.type === "datetime-local") data[field.key] = row[field.key] ? localDate(String(row[field.key])) : "";
    setEdit({ id: String(row['id']), data });
  }
  function exportRows(template = false) {
    const columns = template ? config.fields.map(f => f.key) : ["id", ...config.fields.map(f => f.key), ...Object.keys(rows[0] ?? {}).filter(k => k !== "id" && !config.fields.some(f => f.key === k))];
    download(exportText(template ? [] : filtered, template ? "csv" : format, columns), `uma-${table}${template ? "-plantilla" : ""}.${template ? "csv" : format}`, template || format === "csv" ? "text/csv;charset=utf-8" : "application/json");
  }
  async function loadFile(selected?: File) {
    if (!selected) return;
    try {
      const prepared = prepareImport(table, readImport(await selected.text(), selected.name));
      if (table === "registros_acceso") prepared.rows.forEach((r, i) => { if (!people.some(p => p['id'] === r['persona_id'])) prepared.errors.push(`Fila ${i + 1}: La persona no existe`); });
      setUpdateExisting(false); setSummary(null); setImported({ name: selected.name, ...prepared });
    } catch (e) { toast.error(errorMessage(e)); }
    if (file.current) file.current.value = "";
  }
  return <div className="min-h-screen bg-background">
    <PageHeader title="Administración de datos" subtitle="Universidad Monteávila · Recepción" />
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3"><Database className="h-6 w-6 text-primary" /><h2 className="text-xl font-semibold">Bases de datos</h2></div>
      <Tabs value={table} onValueChange={value => { setTable(value as AdminTable); setSearch(""); setPage(0); setImported(null); setSummary(null); }}>
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          {(Object.keys(ADMIN_TABLES) as AdminTable[]).map(t => <TabsTrigger key={t} value={t}>{ADMIN_TABLES[t].label}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-lg font-semibold">{config.label}</h3><p className="text-sm text-muted-foreground">{rows.length} registros · {filtered.length} resultados</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => file.current?.click()} disabled={query.isPending || busy || query.isError}><Upload />Importar</Button>
          <Select value={format} onValueChange={v => setFormat(v as "csv" | "json")}><SelectTrigger aria-label="Formato de exportación" className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="csv">CSV</SelectItem><SelectItem value="json">JSON</SelectItem></SelectContent></Select>
          <Button variant="outline" disabled={query.isPending || query.isError} onClick={() => exportRows()}><Download />Exportar</Button>
          <Button onClick={newRow} disabled={busy || query.isPending || query.isError}><Plus />Nuevo registro</Button>
        </div>
      </div>
      <input ref={file} type="file" accept=".csv,.json" className="hidden" aria-label="Archivo de importación" onChange={e => void loadFile(e.target.files?.[0])} />
      <div className="my-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar registros" className="pl-9" placeholder="Buscar registros…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
        <Button variant="ghost" size="icon" title="Actualizar datos" aria-label="Actualizar datos" disabled={query.isFetching} onClick={() => void reload()}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button>
        <Button variant="ghost" size="sm" onClick={() => exportRows(true)}><FileDown />Plantilla CSV</Button>
      </div>
      {query.isError ? <div role="alert" className="py-8 text-destructive">{errorMessage(query.error)}<Button variant="outline" className="ml-3" onClick={() => void query.refetch()}>Reintentar</Button></div> : <>
        <div className="overflow-x-auto border-y">
          <table className="w-full text-left text-sm"><thead className="bg-muted"><tr>{config.columns.map(k => <th key={k} className="whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">{config.fields.find(f => f.key === k)?.label ?? k}</th>)}<th className="px-4 py-3"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>{query.isPending ? <tr><td colSpan={config.columns.length + 1} className="py-12 text-center text-muted-foreground">Cargando…</td></tr> : shown.length ? shown.map(row => <tr key={String(row['id'])} className="border-t hover:bg-muted/40">{config.columns.map(k => <td key={k} className="max-w-xs break-words px-4 py-3">{cell(row, k)}</td>)}<td className="px-4 py-2"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title="Modificar registro" aria-label="Modificar registro" onClick={() => startEdit(row)}><Pencil /></Button><Button variant="ghost" size="icon" className="text-destructive" title="Eliminar registro" aria-label="Eliminar registro" onClick={() => setRemove(row)}><Trash2 /></Button></div></td></tr>) : <tr><td colSpan={config.columns.length + 1} className="py-12 text-center text-muted-foreground">Sin registros</td></tr>}</tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Página {page + 1} de {pages}</span><div className="flex gap-1"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={!page} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Página siguiente" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}><ChevronRight /></Button></div></div>
      </>}
      <Dialog open={!!edit} onOpenChange={open => { if (!open && !busy) setEdit(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{edit?.id ? "Modificar" : "Crear"} {config.singular}</DialogTitle><DialogDescription>{config.label} · UMA</DialogDescription></DialogHeader>
        {edit && <form onSubmit={e => { e.preventDefault(); void execute(() => saveAdmin(table, edit.data, edit.id), "Registro guardado", () => setEdit(null)); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">{config.fields.map(field => <div key={field.key} className={field.key === "persona_id" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}><Label htmlFor={`admin-${field.key}`}>{field.label}{field.required ? " *" : ""}</Label>
            {field.type === "boolean" ? <Switch id={`admin-${field.key}`} disabled={busy} checked={!!edit.data[field.key]} onCheckedChange={v => setEdit({ ...edit, data: { ...edit.data, [field.key]: v } })} /> : field.options || field.key === "persona_id" ? <Select value={String(edit.data[field.key] ?? "")} disabled={busy} onValueChange={v => setEdit({ ...edit, data: { ...edit.data, [field.key]: v } })}><SelectTrigger id={`admin-${field.key}`} className="h-auto min-h-9 whitespace-normal text-left"><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{field.key === "persona_id" ? people.map(p => <SelectItem key={String(p['id'])} value={String(p['id'])}>{personName(p['id'])}</SelectItem>) : field.options?.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select> : <Input id={`admin-${field.key}`} type={field.type ?? "text"} required={field.required} disabled={busy} value={String(edit.data[field.key] ?? "")} onChange={e => setEdit({ ...edit, data: { ...edit.data, [field.key]: e.target.value } })} />}
          </div>)}</div>
          <DialogFooter><Button type="button" variant="ghost" disabled={busy} onClick={() => setEdit(null)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button></DialogFooter>
        </form>}
      </DialogContent></Dialog>
      <Dialog open={!!remove} onOpenChange={open => { if (!open && !busy) setRemove(null); }}><DialogContent><DialogHeader><DialogTitle>¿Eliminar este registro?</DialogTitle><DialogDescription>{table === "personas" ? "Se eliminarán también todos los accesos de esta persona. Esta acción no se puede deshacer." : "Esta acción no se puede deshacer."}</DialogDescription></DialogHeader><p className="break-words text-sm">{remove && config.columns.slice(0, 3).map(k => cell(remove, k)).join(" · ")}</p><DialogFooter><Button variant="ghost" disabled={busy} onClick={() => setRemove(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => remove && void execute(() => deleteAdmin(table, String(remove['id'])), "Registro eliminado", () => setRemove(null))}>{busy ? "Eliminando…" : "Eliminar definitivamente"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!imported} onOpenChange={open => { if (!open && !busy) setImported(null); }}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{summary ? "Resultado de importación" : "Importar registros"}</DialogTitle><DialogDescription>{imported?.name} · {config.label}</DialogDescription></DialogHeader>
        {summary ? <><p className="text-sm">{summary.created} creados · {summary.updated} modificados · {summary.skipped} omitidos · {summary.errors.length} errores</p>{summary.errors.length > 0 && <div role="alert" className="max-h-48 overflow-y-auto text-sm text-destructive">{summary.errors.map(e => <p key={e}>{e}</p>)}</div>}<DialogFooter>{summary.errors.length > 0 && <Button variant="outline" onClick={() => download(summary.errors.join("\n"), "errores-importacion.txt", "text/plain")}>Descargar errores</Button>}<Button onClick={() => setImported(null)}>Cerrar</Button></DialogFooter></> : <>
          <p className="text-sm">{imported?.rows.length} registros válidos · {imported?.errors.length} errores</p>
          {!!imported?.errors.length && <div role="alert" className="max-h-48 overflow-y-auto text-sm text-destructive">{imported.errors.map(e => <p key={e}>{e}</p>)}</div>}
          <div className="max-h-48 overflow-auto border-y"><table className="w-full text-sm"><thead><tr>{config.columns.map(k => <th key={k} className="px-2 py-2 text-left">{config.fields.find(f => f.key === k)?.label}</th>)}</tr></thead><tbody>{imported?.rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t">{config.columns.map(k => <td key={k} className="max-w-40 break-words p-2">{cell(r, k)}</td>)}</tr>)}</tbody></table></div>
          <div className="flex items-center gap-3"><Switch id="update-existing" checked={updateExisting} onCheckedChange={setUpdateExisting} /><Label htmlFor="update-existing">Modificar registros existentes</Label></div>
          {updateExisting && <p className="text-sm text-warning-foreground">Se reemplazarán los campos de los registros coincidentes. Los teléfonos guardados de contactos se conservan si el archivo no trae otro.</p>}
          <DialogFooter><Button variant="ghost" onClick={() => setImported(null)} disabled={busy}>Cancelar</Button><Button disabled={busy || !imported?.rows.length || !!imported.errors.length} onClick={async () => { if (!imported) return; setBusy(true); try { const result = await importAdmin(table, imported.rows, rows, updateExisting); setSummary(result); await reload(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); } }}>{busy ? "Importando…" : "Confirmar importación"}</Button></DialogFooter>
        </>}
      </DialogContent></Dialog>
    </main>
  </div>;
}