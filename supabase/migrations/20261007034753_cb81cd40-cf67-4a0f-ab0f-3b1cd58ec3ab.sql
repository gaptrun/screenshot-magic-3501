CREATE TYPE public.rol_uma AS ENUM ('Alumno','Docente','Personal Administrativo','Directivo','Personal de Apoyo','Visitante / Proveedor');
CREATE TYPE public.estatus_acceso AS ENUM ('Permitido','Denegado','En espera');

CREATE TABLE public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci text NOT NULL UNIQUE,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  rol_uma public.rol_uma NOT NULL DEFAULT 'Visitante / Proveedor',
  foto_url text,
  telefono text,
  correo text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.registros_acceso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  tipo_acceso public.rol_uma NOT NULL,
  persona_recibe text NOT NULL DEFAULT '—',
  departamento_destino text NOT NULL,
  hora_ingreso timestamptz NOT NULL DEFAULT now(),
  hora_salida timestamptz,
  estatus public.estatus_acceso NOT NULL DEFAULT 'En espera',
  observaciones text,
  creado_por uuid DEFAULT auth.uid(),
  creado_por_nombre text NOT NULL DEFAULT 'Recepción',
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_registros_ingreso ON public.registros_acceso(hora_ingreso DESC);
CREATE INDEX idx_registros_persona ON public.registros_acceso(persona_id);

CREATE OR REPLACE FUNCTION public.touch_actualizado() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.actualizado_en = now(); RETURN NEW; END; $$;
CREATE TRIGGER personas_touch BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.touch_actualizado();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departamentos, public.personas, public.registros_acceso TO authenticated;
GRANT ALL ON public.departamentos, public.personas, public.registros_acceso TO service_role;

ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_acceso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff all departamentos" ON public.departamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff all personas" ON public.personas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff all registros" ON public.registros_acceso FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.personas, public.registros_acceso, public.departamentos;

INSERT INTO public.departamentos (nombre) VALUES
('Rectorado'),('Vicerrectorado Académico'),('Decanato de Ciencias Económicas'),('Decanato de Comunicación Social'),('Decanato de Derecho'),('Edificio A'),('Edificio B'),('Biblioteca'),('Cafetería'),('Control de Estudios'),('Auditorio'),('Aula 101'),('Aula 204'),('Servicios Generales');

INSERT INTO public.personas (ci, nombres, apellidos, rol_uma) VALUES
('28456123','Valentina','Rodríguez Pérez','Alumno'),
('27890456','Andrés','Martínez Silva','Alumno'),
('29123789','Camila','González Rivas','Alumno'),
('30111222','Diego','Herrera Blanco','Alumno'),
('12345678','María Eugenia','Salazar','Docente'),
('10987654','José Luis','Fernández Ortega','Docente'),
('14567890','Carolina','Méndez López','Docente'),
('9876543','Ricardo','Álvarez Mora','Directivo'),
('8765432','Ana Isabel','Paredes','Directivo'),
('16543210','Luisa','Castillo Núñez','Personal Administrativo'),
('18234567','Pedro','Ramírez Díaz','Personal Administrativo'),
('20345678','Carlos','Torres Medina','Personal de Apoyo'),
('15678901','Gabriel','Rojas Suárez','Visitante / Proveedor'),
('22987123','Sofía','Linares Vega','Visitante / Proveedor');

INSERT INTO public.registros_acceso (persona_id, tipo_acceso, persona_recibe, departamento_destino, hora_ingreso, hora_salida, estatus)
SELECT p.id, p.rol_uma, v.recibe, v.destino, now() - (v.ingreso || ' minutes')::interval,
  CASE WHEN v.salida IS NULL THEN NULL ELSE now() - (v.salida || ' minutes')::interval END, v.estatus::public.estatus_acceso
FROM (VALUES
 ('28456123','—','Edificio A',150,NULL,'Permitido'),
 ('12345678','—','Decanato de Comunicación Social',120,NULL,'Permitido'),
 ('15678901','Pedro Ramírez Díaz','Servicios Generales',75,NULL,'Permitido'),
 ('22987123','Ricardo Álvarez Mora','Rectorado',6,NULL,'En espera'),
 ('27890456','—','Biblioteca',45,NULL,'Permitido'),
 ('16543210','—','Control de Estudios',200,NULL,'Permitido'),
 ('30111222','—','Edificio B',300,100,'Permitido'),
 ('29123789','—','Cafetería',20,19,'Denegado'),
 ('10987654','—','Auditorio',1500,1300,'Permitido'),
 ('15678901','Luisa Castillo Núñez','Control de Estudios',4400,4300,'Permitido'),
 ('14567890','—','Edificio A',10200,9900,'Permitido'),
 ('20345678','—','Servicios Generales',20000,19500,'Permitido'),
 ('22987123','Ana Isabel Paredes','Rectorado',30000,29950,'Denegado')
) AS v(ci, recibe, destino, ingreso, salida, estatus)
JOIN public.personas p ON p.ci = v.ci;