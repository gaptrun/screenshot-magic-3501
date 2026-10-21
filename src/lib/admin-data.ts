import Papa from "papaparse";
import { z } from "zod";
import { ROLES } from "./uma-data";
import { nombreContacto, claveContacto, datosContacto } from "./contactos";

export type AdminTable = "personas" | "registros_acceso" | "departamentos" | "contactos_recepcion";
export type DataRow = Record<string, string | boolean | number | null>;
export type Field = { key: string; label: string; required?: boolean; type?: "datetime-local" | "email" | "boolean"; options?: readonly string[] };
const statuses = ["Permitido", "Denegado", "En espera"] as const;
const optionalText = z.preprocess(v => v === "" || v == null ? null : v, z.string().nullable().optional());
const requiredText = z.string().trim().min(1, "Campo obligatorio");
const timestamp = z.string().refine(v => Number.isFinite(Date.parse(v)), "Fecha inválida").transform(v => new Date(v).toISOString());
const uuid = z.string().uuid("Identificador inválido");
const schemas = {
  personas: z.object({ ci: requiredText.regex(/^\d+$/, "CI debe contener solo números"), nombres: requiredText, apellidos: requiredText, rol_uma: z.enum(ROLES as [string, ...string[]]), telefono: optionalText, correo: z.preprocess(v => v === "" || v == null ? null : v, z.string().email("Correo inválido").nullable().optional()), foto_url: optionalText }),
  departamentos: z.object({ nombre: requiredText, activo: z.preprocess(v => v === "false" ? false : v === "true" ? true : v, z.boolean().default(true)) }),
  contactos_recepcion: z.object({ nombre: requiredText.transform(nombreContacto), telefono: optionalText }).transform(v => datosContacto(v.nombre, v.telefono) ?? v),
  registros_acceso: z.object({ persona_id: uuid, tipo_acceso: z.enum(ROLES as [string, ...string[]]), persona_recibe: z.string().default("—"), telefono_recibe: optionalText, departamento_destino: requiredText, estatus: z.enum(statuses).default("En espera"), hora_ingreso: timestamp, hora_salida: z.preprocess(v => v === "" || v == null ? null : v, timestamp.nullable().optional()), observaciones: optionalText }).refine(v => !v.hora_salida || Date.parse(v.hora_salida) >= Date.parse(v.hora_ingreso), { message: "La salida no puede ser anterior al ingreso", path: ["hora_salida"] }),
};

export const ADMIN_TABLES: Record<AdminTable, { label: string; singular: string; fields: Field[]; columns: string[] }> = {
  personas: { label: "Personas", singular: "persona", columns: ["ci", "nombres", "apellidos", "rol_uma", "telefono"], fields: [
    { key: "ci", label: "CI", required: true }, { key: "nombres", label: "Nombres", required: true }, { key: "apellidos", label: "Apellidos", required: true }, { key: "rol_uma", label: "Categoría", options: ROLES, required: true }, { key: "telefono", label: "Teléfono" }, { key: "correo", label: "Correo", type: "email" }, { key: "foto_url", label: "Foto (URL)" },
  ] },
  registros_acceso: { label: "Accesos", singular: "acceso", columns: ["persona_id", "persona_recibe", "departamento_destino", "hora_ingreso", "estatus"], fields: [
    { key: "persona_id", label: "Persona", required: true }, { key: "tipo_acceso", label: "Tipo de acceso", options: ROLES, required: true }, { key: "persona_recibe", label: "Persona que recibe" }, { key: "telefono_recibe", label: "WhatsApp de quien recibe" }, { key: "departamento_destino", label: "Departamento destino", required: true }, { key: "estatus", label: "Estatus", options: statuses, required: true }, { key: "hora_ingreso", label: "Hora de ingreso", type: "datetime-local", required: true }, { key: "hora_salida", label: "Hora de salida", type: "datetime-local" }, { key: "observaciones", label: "Observaciones" },
  ] },
  departamentos: { label: "Departamentos", singular: "departamento", columns: ["nombre", "activo"], fields: [{ key: "nombre", label: "Nombre", required: true }, { key: "activo", label: "Activo", type: "boolean" }] },
  contactos_recepcion: { label: "Contactos de recepción", singular: "contacto", columns: ["nombre", "telefono"], fields: [{ key: "nombre", label: "Nombre", required: true }, { key: "telefono", label: "WhatsApp" }] },
};

export function validateRow(table: AdminTable, row: unknown): DataRow {
  const parsed = schemas[table].safeParse(row);
  if (!parsed.success) throw new Error(parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data as DataRow;
}
export function rowKey(table: AdminTable, row: DataRow) {
  if (table === "personas") return String(row.ci ?? "");
  if (table === "contactos_recepcion") return claveContacto(String(row.nombre ?? ""));
  if (table === "departamentos") return nombreContacto(String(row.nombre ?? "")).toLowerCase();
  return String(row.id ?? "");
}
export function readImport(text: string, name: string): DataRow[] {
  let raw: unknown;
  if (name.toLowerCase().endsWith(".json")) raw = JSON.parse(text);
  else {
    const result = Papa.parse<DataRow>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy" });
    if (result.errors.length) throw new Error(`CSV inválido: ${result.errors[0]?.message}`);
    raw = result.data;
  }
  if (!Array.isArray(raw) || !raw.length || raw.some(r => !r || typeof r !== "object" || Array.isArray(r))) throw new Error("El archivo debe contener una lista de registros");
  return raw as DataRow[];
}
export function prepareImport(table: AdminTable, rows: DataRow[]) {
  const errors: string[] = [];
  const valid: DataRow[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    try {
      if (row.id && !uuid.safeParse(row.id).success) throw new Error("ID inválido");
      const payload = validateRow(table, row);
      const key = rowKey(table, { ...payload, id: row.id ?? null });
      if (key && seen.has(key)) throw new Error("Registro duplicado dentro del archivo");
      if (key) seen.add(key);
      valid.push({ ...payload, ...(row.id ? { id: String(row.id) } : {}) });
    } catch (e) { errors.push(`Fila ${index + 1}: ${e instanceof Error ? e.message : "Datos inválidos"}`); }
  });
  return { rows: valid, errors };
}
export function exportText(rows: DataRow[], format: "csv" | "json", columns: string[]) {
  return format === "json" ? JSON.stringify(rows, null, 2) : "\uFEFF" + Papa.unparse({ fields: columns, data: rows.map(r => columns.map(c => r[c] ?? "")) }, { escapeFormulae: true });
}
export function localDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}