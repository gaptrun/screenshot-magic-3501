import { useSyncExternalStore } from "react";
import {
  MOCK_PERSONAS,
  MOCK_REGISTROS,
  type Estatus,
  type Persona,
  type RegistroAcceso,
} from "./uma-data";

interface State {
  personas: Persona[];
  registros: RegistroAcceso[];
}

const KEY = "uma-acceso-v1";
let state: State = { personas: MOCK_PERSONAS, registros: MOCK_REGISTROS };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    /* ignore */
  }
}

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota (fotos) */
  }
  listeners.forEach((l) => l());
}

const serverState: State = { personas: MOCK_PERSONAS, registros: MOCK_REGISTROS };

export function useUMA() {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      l();
      return () => listeners.delete(l);
    },
    () => state,
    () => serverState,
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  upsertPersona(p: Omit<Persona, "id" | "creado_en">): Persona {
    const existing = state.personas.find((x) => x.ci === p.ci);
    if (existing) {
      const updated = { ...existing, ...p, foto_url: p.foto_url ?? existing.foto_url };
      set({ ...state, personas: state.personas.map((x) => (x.id === existing.id ? updated : x)) });
      return updated;
    }
    const nuevo: Persona = { ...p, id: uid(), creado_en: new Date().toISOString() };
    set({ ...state, personas: [...state.personas, nuevo] });
    return nuevo;
  },
  registrar(r: Omit<RegistroAcceso, "id" | "hora_ingreso" | "hora_salida" | "creado_por">) {
    const reg: RegistroAcceso = {
      ...r,
      id: uid(),
      hora_ingreso: new Date().toISOString(),
      hora_salida: r.estatus === "Denegado" ? new Date().toISOString() : null,
      creado_por: "Recepción",
    };
    set({ ...state, registros: [reg, ...state.registros] });
    return reg;
  },
  setEstatus(id: string, estatus: Estatus) {
    set({
      ...state,
      registros: state.registros.map((r) =>
        r.id === id
          ? { ...r, estatus, hora_salida: estatus === "Denegado" ? new Date().toISOString() : r.hora_salida }
          : r,
      ),
    });
  },
  marcarSalida(id: string) {
    set({
      ...state,
      registros: state.registros.map((r) =>
        r.id === id ? { ...r, hora_salida: new Date().toISOString() } : r,
      ),
    });
  },
  reset() {
    set({ personas: MOCK_PERSONAS, registros: MOCK_REGISTROS });
  },
};
