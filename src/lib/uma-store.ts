import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Estatus, Persona, RegistroAcceso, RolUMA } from "./uma-data";

export interface Departamento {
  id: string;
  nombre: string;
  activo: boolean;
}

interface State {
  personas: Persona[];
  registros: RegistroAcceso[];
  departamentos: Departamento[];
  loading: boolean;
}

const empty: State = { personas: [], registros: [], departamentos: [], loading: true };
let state: State = empty;
let started = false;
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function toPersona(r: any): Persona {
  return { ...r, foto_url: r.foto_url ?? undefined };
}

export async function refresh() {
  const [p, r, d] = await Promise.all([
    supabase.from("personas").select("*").order("apellidos"),
    supabase.from("registros_acceso").select("*").order("hora_ingreso", { ascending: false }).limit(500),
    supabase.from("departamentos").select("id,nombre,activo").order("nombre"),
  ]);
  emit({
    personas: (p.data ?? []).map(toPersona),
    registros: (r.data ?? []) as RegistroAcceso[],
    departamentos: (d.data ?? []) as Departamento[],
    loading: false,
  });
}

let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleRefresh() {
  clearTimeout(timer);
  timer = setTimeout(refresh, 250);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  refresh();
  supabase
    .channel("uma-cambios")
    .on("postgres_changes", { event: "*", schema: "public", table: "personas" }, scheduleRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "registros_acceso" }, scheduleRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "departamentos" }, scheduleRefresh)
    .subscribe();
}

export function useUMA() {
  return useSyncExternalStore(
    (l) => {
      start();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => empty,
  );
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export type PersonaInput = {
  ci: string;
  nombres: string;
  apellidos: string;
  rol_uma: RolUMA;
  foto_url?: string | undefined;
  telefono?: string | null | undefined;
  correo?: string | null | undefined;
};

export const actions = {
  async upsertPersona(p: PersonaInput): Promise<Persona> {
    const existing = state.personas.find((x) => x.ci === p.ci);
    const payload = { ...p, foto_url: p.foto_url ?? existing?.foto_url ?? null };
    const { data, error } = await supabase.from("personas").upsert(payload as any, { onConflict: "ci" }).select().single();
    fail(error);
    await refresh();
    return toPersona(data);
  },
  async crearPersona(p: PersonaInput) {
    const { error } = await supabase.from("personas").insert({ ...p, foto_url: p.foto_url ?? null } as any);
    fail(error);
    await refresh();
  },
  async actualizarPersona(id: string, p: Partial<PersonaInput>) {
    const { error } = await supabase.from("personas").update(p as any).eq("id", id);
    fail(error);
    await refresh();
  },
  async eliminarPersona(id: string) {
    const { error } = await supabase.from("personas").delete().eq("id", id);
    fail(error);
    await refresh();
  },
  async registrar(r: { persona_id: string; tipo_acceso: RolUMA; persona_recibe: string; departamento_destino: string; estatus: Estatus }) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("registros_acceso").insert({
      ...r,
      hora_salida: r.estatus === "Denegado" ? new Date().toISOString() : null,
      creado_por_nombre: (u.user?.user_metadata?.['usuario'] as string | undefined) ?? u.user?.email?.replace("@uma.local", "") ?? "Recepción",
    });
    fail(error);
    await refresh();
  },
  async actualizarRegistro(id: string, r: Partial<Omit<RegistroAcceso, "id">>) {
    const { error } = await supabase.from("registros_acceso").update(r as any).eq("id", id);
    fail(error);
    await refresh();
  },
  async eliminarRegistro(id: string) {
    const { error } = await supabase.from("registros_acceso").delete().eq("id", id);
    fail(error);
    await refresh();
  },
  async setEstatus(id: string, estatus: Estatus) {
    const patch: { estatus: Estatus; hora_salida?: string } = { estatus };
    if (estatus === "Denegado") patch.hora_salida = new Date().toISOString();
    const { error } = await supabase.from("registros_acceso").update(patch).eq("id", id);
    fail(error);
    await refresh();
  },
  async marcarSalida(id: string) {
    const { error } = await supabase.from("registros_acceso").update({ hora_salida: new Date().toISOString() }).eq("id", id);
    fail(error);
    await refresh();
  },
  async crearDepartamento(nombre: string) {
    const { error } = await supabase.from("departamentos").insert({ nombre });
    fail(error);
    await refresh();
  },
  async actualizarDepartamento(id: string, d: Partial<Omit<Departamento, "id">>) {
    const { error } = await supabase.from("departamentos").update(d).eq("id", id);
    fail(error);
    await refresh();
  },
  async eliminarDepartamento(id: string) {
    const { error } = await supabase.from("departamentos").delete().eq("id", id);
    fail(error);
    await refresh();
  },
};

/** Wraps an async action with toast-friendly error handling. */
export async function run<T>(fn: () => Promise<T>, onError: (m: string) => void): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Error inesperado");
    return undefined;
  }
}
