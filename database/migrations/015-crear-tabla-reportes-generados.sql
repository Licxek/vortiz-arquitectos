-- ============================================================
-- 016: Tabla para Historial de Reportes Generados (Sub-Fase B)
-- ============================================================

CREATE TABLE IF NOT EXISTS reportes_generados (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  rango_desde DATE NOT NULL,
  rango_hasta DATE NOT NULL,
  archivo VARCHAR(500) NOT NULL,
  tamanio_kb INTEGER DEFAULT 0,
  destinatarios JSONB DEFAULT '[]'::jsonb,
  email_enviado BOOLEAN DEFAULT FALSE,
  generado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reportes_generados_tipo 
  ON reportes_generados(tipo);
CREATE INDEX IF NOT EXISTS idx_reportes_generados_created 
  ON reportes_generados(created_at DESC);

-- Trigger updated_at (reusa la función si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ language 'plpgsql';
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_reportes_generados_updated_at 
  ON reportes_generados;
CREATE TRIGGER update_reportes_generados_updated_at 
  BEFORE UPDATE ON reportes_generados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE reportes_generados IS 'Historial de reportes PDF generados (Sub-Fase B)';