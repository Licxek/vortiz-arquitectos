-- Crea la tabla categorias y las siembra con las del sistema
-- Ejecutar en el contenedor: docker exec -i vortiz_database_prod psql -U vortiz_user -d vortiz_db < database/seeds/01-categorias.sql

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(40) NOT NULL,
  value VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  "esPersonalizada" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_tipo_value
  ON categorias (tipo, value);

INSERT INTO categorias (tipo, value, label, orden, "esPersonalizada")
VALUES
  ('servicio', 'tramites', 'Trámites', 1, false),
  ('servicio', 'gerencia', 'Gerencia', 2, false),
  ('servicio', 'diseno', 'Diseño', 3, false),
  ('servicio', 'construccion', 'Construcción', 4, false),
  ('servicio', 'especiales', 'Proyectos Especiales', 5, false),
  ('proyecto', 'corporativo', 'Corporativo', 1, false),
  ('proyecto', 'industrial', 'Industrial', 2, false),
  ('proyecto', 'comercial', 'Comercial', 3, false),
  ('proyecto', 'residencial', 'Residencial', 4, false),
  ('proyecto', 'infraestructura', 'Infraestructura', 5, false),
  ('proyecto', 'institucional', 'Institucional', 6, false)
ON CONFLICT (tipo, value) DO NOTHING;