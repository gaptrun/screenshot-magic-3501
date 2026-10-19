CREATE TABLE public.contactos_recepcion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 nombre text NOT NULL CHECK (length(trim(nombre)) > 0),
 nombre_clave text GENERATED ALWAYS AS (lower(regexp_replace(trim(nombre), '\s+', ' ', 'g'))) STORED UNIQUE,
 telefono text,
 creado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contactos_recepcion TO authenticated;
GRANT ALL ON public.contactos_recepcion TO service_role;
ALTER TABLE public.contactos_recepcion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all contactos" ON public.contactos_recepcion FOR ALL TO authenticated USING (true) WITH CHECK (true);
INSERT INTO public.contactos_recepcion (nombre, telefono)
SELECT DISTINCT ON (lower(regexp_replace(trim(persona_recibe), '\s+', ' ', 'g')))
 regexp_replace(trim(persona_recibe), '\s+', ' ', 'g'), nullif(telefono_recibe, '')
FROM public.registros_acceso
WHERE trim(persona_recibe) NOT IN ('', '—')
ORDER BY lower(regexp_replace(trim(persona_recibe), '\s+', ' ', 'g')), (nullif(telefono_recibe, '') IS NOT NULL) DESC, hora_ingreso DESC;