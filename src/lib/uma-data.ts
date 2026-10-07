export type RolUMA =
  | "Alumno"
  | "Docente"
  | "Personal Administrativo"
  | "Directivo"
  | "Personal de Apoyo"
  | "Visitante / Proveedor";

export type Estatus = "Permitido" | "Denegado" | "En espera";

export interface Persona {
  id: string;
  ci: string;
  nombres: string;
  apellidos: string;
  rol_uma: RolUMA;
  foto_url?: string | undefined;
  telefono?: string | null;
  correo?: string | null;
  creado_en: string;
}

export interface RegistroAcceso {
  id: string;
  persona_id: string;
  tipo_acceso: RolUMA;
  persona_recibe: string;
  departamento_destino: string;
  hora_ingreso: string;
  hora_salida: string | null;
  estatus: Estatus;
  creado_por?: string | null;
  creado_por_nombre?: string;
  observaciones?: string | null;
}

export const ROLES: RolUMA[] = [
  "Alumno",
  "Docente",
  "Personal Administrativo",
  "Directivo",
  "Personal de Apoyo",
  "Visitante / Proveedor",
];

export const DEPARTAMENTOS = [
  "Rectorado",
  "Vicerrectorado Académico",
  "Decanato de Ciencias Económicas",
  "Decanato de Comunicación Social",
  "Decanato de Derecho",
  "Edificio A",
  "Edificio B",
  "Biblioteca",
  "Cafetería",
  "Control de Estudios",
  "Auditorio",
  "Aula 101",
  "Aula 204",
  "Servicios Generales",
];

