import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { refresh } from "./uma-store";
import { claveContacto, datosContacto } from "./contactos";
import { type AdminTable, type DataRow, rowKey, validateRow } from "./admin-data";

export const adminQuery = (table: AdminTable) => queryOptions({
  queryKey: ["admin-data", table],
  queryFn: async () => {
    const rows: DataRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from(table).select("*").order("id").range(offset, offset + 999);
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []) as DataRow[]);
      if (!data || data.length < 1000) break;
    }
    return rows;
  },
});

export async function saveAdmin(table: AdminTable, input: DataRow, id?: string) {
  const payload = validateRow(table, input);
  if (table === "contactos_recepcion" || table === "registros_acceso") {
    const name = String(table === "contactos_recepcion" ? payload.nombre : payload.persona_recibe ?? "—");
    const phone = table === "contactos_recepcion" ? payload.telefono : payload.telefono_recibe;
    if (name.trim() && name !== "—") {
      const { data: previous, error } = await supabase.from("contactos_recepcion").select("nombre,telefono").eq("nombre_clave", claveContacto(name)).maybeSingle();
      if (error) throw new Error(error.message);
      const contact = datosContacto(name, typeof phone === "string" ? phone : null, previous ?? undefined);
      if (contact) {
        if (table === "contactos_recepcion") Object.assign(payload, contact);
        else {
          const { error: contactError } = await supabase.from("contactos_recepcion").upsert(contact, { onConflict: "nombre_clave" });
          if (contactError) throw new Error(contactError.message);
          payload.persona_recibe = contact.nombre;
          payload.telefono_recibe = contact.telefono;
        }
      }
    }
  }
  if (table === "registros_acceso" && payload.estatus === "Denegado" && !payload.hora_salida) payload.hora_salida = payload.hora_ingreso ?? new Date().toISOString();
  const result = id
    ? await supabase.from(table).update(payload as TablesUpdate<AdminTable>).eq("id", id).select("id").single()
    : await supabase.from(table).insert(payload as TablesInsert<AdminTable>).select("id").single();
  if (result.error) throw new Error(result.error.message);
  return result.data.id;
}
export async function deleteAdmin(table: AdminTable, id: string) {
  const { error, data } = await supabase.from(table).delete().eq("id", id).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "No se eliminó el registro");
}
export async function importAdmin(table: AdminTable, rows: DataRow[], existing: DataRow[], update: boolean) {
  const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
  for (const [index, row] of rows.entries()) {
    const match = existing.find(r => (row.id && r.id === row.id) || (rowKey(table, row) && rowKey(table, r) === rowKey(table, row)));
    if (match && !update) { result.skipped++; continue; }
    try {
      await saveAdmin(table, row, match ? String(match.id) : undefined);
      if (match) result.updated++; else result.created++;
    } catch (e) { result.errors.push(`Fila ${index + 1}: ${e instanceof Error ? e.message : "Error al guardar"}`); }
  }
  await refresh();
  return result;
}