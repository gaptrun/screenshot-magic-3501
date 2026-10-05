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
  creado_por: string;
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

const now = Date.now();
const iso = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();

export const MOCK_PERSONAS: Persona[] = [
  { id: "p1", ci: "28456123", nombres: "Valentina", apellidos: "Rodríguez Pérez", rol_uma: "Alumno", creado_en: iso(90000) },
  { id: "p2", ci: "27890456", nombres: "Andrés", apellidos: "Martínez Silva", rol_uma: "Alumno", creado_en: iso(90000) },
  { id: "p3", ci: "29123789", nombres: "Camila", apellidos: "González Rivas", rol_uma: "Alumno", creado_en: iso(90000) },
  { id: "p4", ci: "30111222", nombres: "Diego", apellidos: "Herrera Blanco", rol_uma: "Alumno", creado_en: iso(90000) },
  { id: "p5", ci: "12345678", nombres: "María Eugenia", apellidos: "Salazar", rol_uma: "Docente", creado_en: iso(90000) },
  { id: "p6", ci: "10987654", nombres: "José Luis", apellidos: "Fernández Ortega", rol_uma: "Docente", creado_en: iso(90000) },
  { id: "p7", ci: "14567890", nombres: "Carolina", apellidos: "Méndez López", rol_uma: "Docente", creado_en: iso(90000) },
  { id: "p8", ci: "9876543", nombres: "Ricardo", apellidos: "Álvarez Mora", rol_uma: "Directivo", creado_en: iso(90000) },
  { id: "p9", ci: "8765432", nombres: "Ana Isabel", apellidos: "Paredes", rol_uma: "Directivo", creado_en: iso(90000) },
  { id: "p10", ci: "16543210", nombres: "Luisa", apellidos: "Castillo Núñez", rol_uma: "Personal Administrativo", creado_en: iso(90000) },
  { id: "p11", ci: "18234567", nombres: "Pedro", apellidos: "Ramírez Díaz", rol_uma: "Personal Administrativo", creado_en: iso(90000) },
  { id: "p12", ci: "20345678", nombres: "Carlos", apellidos: "Torres Medina", rol_uma: "Personal de Apoyo", creado_en: iso(90000) },
  { id: "p13", ci: "15678901", nombres: "Gabriel", apellidos: "Rojas Suárez", rol_uma: "Visitante / Proveedor", creado_en: iso(200) },
  { id: "p14", ci: "22987123", nombres: "Sofía", apellidos: "Linares Vega", rol_uma: "Visitante / Proveedor", creado_en: iso(40) },
];

export const MOCK_REGISTROS: RegistroAcceso[] = [
  { id: "r1", persona_id: "p1", tipo_acceso: "Alumno", persona_recibe: "—", departamento_destino: "Edificio A", hora_ingreso: iso(150), hora_salida: null, estatus: "Permitido", creado_por: "Recepción" },
  { id: "r2", persona_id: "p5", tipo_acceso: "Docente", persona_recibe: "—", departamento_destino: "Decanato de Comunicación Social", hora_ingreso: iso(120), hora_salida: null, estatus: "Permitido", creado_por: "Recepción" },
  { id: "r3", persona_id: "p13", tipo_acceso: "Visitante / Proveedor", persona_recibe: "Pedro Ramírez Díaz", departamento_destino: "Servicios Generales", hora_ingreso: iso(75), hora_salida: null, estatus: "Permitido", creado_por: "Recepción" },
  { id: "r4", persona_id: "p14", tipo_acceso: "Visitante / Proveedor", persona_recibe: "Ricardo Álvarez Mora", departamento_destino: "Rectorado", hora_ingreso: iso(6), hora_salida: null, estatus: "En espera", creado_por: "Recepción" },
  { id: "r5", persona_id: "p2", tipo_acceso: "Alumno", persona_recibe: "—", departamento_destino: "Biblioteca", hora_ingreso: iso(45), hora_salida: null, estatus: "Permitido", creado_por: "Recepción" },
  { id: "r6", persona_id: "p10", tipo_acceso: "Personal Administrativo", persona_recibe: "—", departamento_destino: "Control de Estudios", hora_ingreso: iso(200), hora_salida: null, estatus: "Permitido", creado_por: "Recepción" },
  { id: "r7", persona_id: "p4", tipo_acceso: "Alumno", persona_recibe: "—", departamento_destino: "Edificio B", hora_ingreso: iso(300), hora_salida: iso(100), estatus: "Permitido", creado_por: "Recepción" },
  { id: "r8", persona_id: "p3", tipo_acceso: "Alumno", persona_recibe: "—", departamento_destino: "Cafetería", hora_ingreso: iso(20), hora_salida: iso(19), estatus: "Denegado", creado_por: "Recepción" },
];
