import type { Persona } from "./uma-data";
import { aWhatsApp } from "./whatsapp";

export interface ContactoRecepcion {
  nombre: string;
  telefono: string | null;
}

export const nombreContacto = (nombre: string) => nombre.trim().replace(/\s+/g, " ");
export const claveContacto = (nombre: string) => nombreContacto(nombre).toLowerCase();

export function datosContacto(nombre: string, telefono?: string | null, anterior?: ContactoRecepcion) {
  const limpio = nombreContacto(nombre);
  if (!limpio || limpio === "—") return null;
  const numero = telefono?.trim() ? aWhatsApp(telefono) : anterior?.telefono ?? null;
  if (telefono?.trim() && !numero) throw new Error("Teléfono inválido. Ej: 0414-1234567");
  return { nombre: limpio, telefono: numero };
}

export function contactosDisponibles(contactos: ContactoRecepcion[], personas: Persona[]) {
  const disponibles = new Map<string, ContactoRecepcion>();
  for (const p of personas) {
    if (p.rol_uma === "Visitante / Proveedor" || p.rol_uma === "Alumno") continue;
    const nombre = nombreContacto(`${p.nombres} ${p.apellidos}`);
    disponibles.set(claveContacto(nombre), { nombre, telefono: p.telefono ? aWhatsApp(p.telefono) : null });
  }
  for (const c of contactos) {
    const clave = claveContacto(c.nombre);
    disponibles.set(clave, { ...c, telefono: c.telefono ?? disponibles.get(clave)?.telefono ?? null });
  }
  return [...disponibles.values()];
}