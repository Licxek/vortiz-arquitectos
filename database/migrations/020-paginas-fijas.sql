CREATE TABLE IF NOT EXISTS paginas_fijas_config (
  slug VARCHAR(80) PRIMARY KEY,
  visible BOOLEAN NOT NULL DEFAULT true,
  actualizado_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed inicial: todas visibles
INSERT INTO paginas_fijas_config (slug, visible)
VALUES
  ('/', true),
  ('/nosotros', true),
  ('/proyectos', true),
  ('/servicios', true),
  ('/citas', true),
  ('/politica-privacidad', true)
ON CONFLICT (slug) DO NOTHING;

\q