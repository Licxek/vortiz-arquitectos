-- ============================================================================
-- Tabla paginas: páginas dinámicas creadas por el admin (Política, Términos, etc.)
-- Las páginas "fijas" (Inicio, Nosotros, Proyectos, Servicios, Citas) NO viven aquí;
-- son rutas reales de Angular y su contenido se edita vía la tabla contenido_paginas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS paginas (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(150) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  imagen_destacada VARCHAR(500) NOT NULL DEFAULT '',
  categoria VARCHAR(50) NOT NULL DEFAULT 'standard',
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
  visibilidad VARCHAR(20) NOT NULL DEFAULT 'publica',
  mostrar_en_menu BOOLEAN NOT NULL DEFAULT TRUE,
  posicion_menu INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_publicacion TIMESTAMP NULL,
  bloques JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo JSONB NOT NULL DEFAULT '{"metaTitle":"","metaDescription":"","keywords":""}'::jsonb,
  permitir_comentarios BOOLEAN NOT NULL DEFAULT FALSE,
  icono VARCHAR(30) NOT NULL DEFAULT 'document',
  color VARCHAR(20) NOT NULL DEFAULT 'gray',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_estado CHECK (estado IN ('borrador', 'publicada', 'programada')),
  CONSTRAINT chk_visibilidad CHECK (visibilidad IN ('publica', 'registrados', 'contrasena'))
);

CREATE INDEX IF NOT EXISTS idx_paginas_slug ON paginas(slug);
CREATE INDEX IF NOT EXISTS idx_paginas_publicadas ON paginas(estado, visible) WHERE estado = 'publicada' AND visible = TRUE;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION trigger_paginas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS paginas_updated_at ON paginas;
CREATE TRIGGER paginas_updated_at
  BEFORE UPDATE ON paginas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_paginas_updated_at();

-- Seed: las 2 páginas que estaban hardcoded como ejemplo
INSERT INTO paginas (titulo, slug, descripcion, categoria, estado, visibilidad, mostrar_en_menu, visible, bloques, seo, icono, color)
VALUES
  (
    'Política de Privacidad',
    'privacidad',
    'Política de privacidad de Vortiz Arquitectos',
    'legal',
    'publicada',
    'publica',
    TRUE,
    TRUE,
    '[]'::jsonb,
    '{"metaTitle":"Política de Privacidad - Vortiz Arquitectos","metaDescription":"Cómo manejamos tu información personal","keywords":"privacidad,datos,vortiz"}'::jsonb,
    'document',
    'gray'
  ),
  (
    'Términos y Condiciones',
    'terminos',
    'Términos y condiciones de uso',
    'legal',
    'borrador',
    'publica',
    FALSE,
    FALSE,
    '[]'::jsonb,
    '{"metaTitle":"Términos y Condiciones","metaDescription":"Términos de uso del sitio","keywords":""}'::jsonb,
    'document',
    'gray'
  )
ON CONFLICT (slug) DO NOTHING;